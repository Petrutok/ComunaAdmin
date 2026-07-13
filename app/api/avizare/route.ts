import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyStaffRequest } from '@/lib/api-auth';
import { isAdeverintaType, ADEVERINTA_LABELS } from '@/lib/adeverinte';
import { sendPushToUid } from '@/lib/push';

/**
 * Avizare circuit for issued documents (adeverinte + raspunsuri oficiale),
 * mirroring the real paper flow in a town hall:
 *
 *   responsabil (Intocmit) -> secretar general (Avizat) -> primar (Semnat)
 *
 * Actions:
 * - creeaza:   responsabil drafts the document text and sends it for avizare.
 *              Goes to the secretar if one is designated in settings,
 *              straight to the primar otherwise.
 * - avizeaza:  secretar approves -> waits for the primar's signature.
 * - returneaza: secretar/primar sends the draft back with a reason.
 *
 * The final step (primar signs) happens in /api/emite-adeverinta or
 * /api/emite-raspuns called with { avizareId } - that is where the PDF,
 * outgoing number and all signature blocks are produced.
 *
 * Drafts live in the `avizari` collection; the target doc (cerere or
 * registru entry) carries a small `avizare: { id, stadiu }` marker so
 * lists can show the state without extra reads.
 *
 * Admins can always act in place of the designated secretar/primar
 * (the "supapa" - delegation or paper-signed documents).
 */

type Stadiu = 'la_secretar' | 'la_primar' | 'returnat' | 'emis';

const ACTIVE_STADII: Stadiu[] = ['la_secretar', 'la_primar'];

export async function POST(request: NextRequest) {
  const auth = await verifyStaffRequest(request, ['admin', 'employee']);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action as 'creeaza' | 'avizeaza' | 'returneaza';

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    const settings = (await db.doc('config/adeverinta_settings').get()).data() || {};
    const hasSecretar = !!(settings.secretarNume && settings.secretarUserId);
    const isAdmin = auth.role === 'admin';

    // Display name for audit entries
    const actorSnap = await db.collection('users').doc(auth.uid!).get();
    const actorNume = actorSnap.data()?.fullName || auth.email || 'Staff';

    // Best-effort audit entry on the cerere
    const logIstoric = async (cerereId: string | null, mesaj: string) => {
      if (!cerereId) return;
      try {
        await db.collection('form_submissions').doc(cerereId).collection('istoric').add({
          tip: 'avizare',
          mesaj,
          autorId: auth.uid || 'sistem',
          autorNume: actorNume,
          createdAt: Timestamp.now(),
        });
      } catch {}
    };

    const notify = (uid: string | null | undefined, title: string, bodyText: string) => {
      if (!uid) return;
      sendPushToUid(db, uid, {
        title,
        body: bodyText,
        url: '/admin/cereri',
        tag: 'avizare',
      }).catch(() => {});
    };

    // ---------------------------------------------------------- creeaza
    if (action === 'creeaza') {
      const { tipDocument, cerereId, registruDocId, continut, raspunsStatus } = body;

      if (!['adeverinta', 'raspuns'].includes(tipDocument) || !continut?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Missing tipDocument or continut' },
          { status: 400 }
        );
      }
      if (!cerereId && !registruDocId) {
        return NextResponse.json(
          { success: false, error: 'Missing cerereId/registruDocId' },
          { status: 400 }
        );
      }

      // Validate the target and build display info
      let referinta: Record<string, string | null> = {};
      if (cerereId) {
        const snap = await db.collection('form_submissions').doc(cerereId).get();
        if (!snap.exists) {
          return NextResponse.json({ success: false, error: 'Cerere not found' }, { status: 404 });
        }
        const cerere = snap.data()!;
        if (tipDocument === 'adeverinta' && !isAdeverintaType(cerere.tipCerere)) {
          return NextResponse.json(
            { success: false, error: 'Cererea nu este o solicitare de adeverință' },
            { status: 400 }
          );
        }
        if (cerere.adeverinta?.downloadURL || cerere.raspuns?.downloadURL) {
          return NextResponse.json(
            { success: false, error: 'Un document a fost deja emis pentru această cerere' },
            { status: 409 }
          );
        }
        if (cerere.avizare?.id && ACTIVE_STADII.includes(cerere.avizare.stadiu)) {
          return NextResponse.json(
            { success: false, error: 'Există deja un document în avizare pentru această cerere' },
            { status: 409 }
          );
        }
        referinta = {
          numarInregistrare: cerere.numarInregistrare || null,
          numeComplet: cerere.numeComplet || null,
          tipCerere: cerere.tipCerere || null,
          tipLabel:
            tipDocument === 'adeverinta'
              ? ADEVERINTA_LABELS[cerere.tipCerere as keyof typeof ADEVERINTA_LABELS] || 'Adeverință'
              : 'Răspuns oficial',
        };
      } else {
        const snap = await db.collection('registru_general').doc(registruDocId).get();
        if (!snap.exists) {
          return NextResponse.json(
            { success: false, error: 'Registry entry not found' },
            { status: 404 }
          );
        }
        const entry = snap.data()!;
        if (tipDocument !== 'raspuns') {
          return NextResponse.json(
            { success: false, error: 'Pentru documente din registru se emit doar răspunsuri' },
            { status: 400 }
          );
        }
        if (entry.directie === 'iesire' || entry.raspunsNumar) {
          return NextResponse.json(
            { success: false, error: 'Documentul nu (mai) poate primi răspuns' },
            { status: 400 }
          );
        }
        if (entry.avizare?.id && ACTIVE_STADII.includes(entry.avizare.stadiu)) {
          return NextResponse.json(
            { success: false, error: 'Există deja un document în avizare pentru această intrare' },
            { status: 409 }
          );
        }
        referinta = {
          numarInregistrare: entry.numarInregistrare || null,
          numeComplet: entry.emitent || null,
          tipCerere: null,
          tipLabel: 'Răspuns oficial',
        };
      }

      const stadiu: Stadiu = hasSecretar ? 'la_secretar' : 'la_primar';
      const avizareRef = await db.collection('avizari').add({
        tipDocument,
        cerereId: cerereId || null,
        registruDocId: registruDocId || null,
        continut: continut.trim(),
        raspunsStatus: raspunsStatus === 'respins' ? 'respins' : 'rezolvat',
        stadiu,
        referinta,
        intocmitDe: { uid: auth.uid, nume: actorNume, la: Timestamp.now() },
        avizatDe: null,
        motivReturnare: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const marker = { avizare: { id: avizareRef.id, stadiu }, updatedAt: Timestamp.now() };
      if (cerereId) {
        await db.collection('form_submissions').doc(cerereId).update(marker);
      } else {
        await db.collection('registru_general').doc(registruDocId).update(marker);
      }

      await logIstoric(
        cerereId || null,
        `Document trimis la avizare (${referinta.tipLabel}) — ${
          stadiu === 'la_secretar' ? 'așteaptă avizul secretarului' : 'așteaptă semnătura primarului'
        }`
      );

      const nextUid = stadiu === 'la_secretar' ? settings.secretarUserId : settings.primarUserId;
      notify(
        nextUid,
        stadiu === 'la_secretar' ? 'Document de avizat' : 'Document de semnat',
        `${referinta.tipLabel} pentru ${referinta.numeComplet || 'petent'} așteaptă ${
          stadiu === 'la_secretar' ? 'avizul tău' : 'semnătura ta'
        }`
      );

      return NextResponse.json({ success: true, avizareId: avizareRef.id, stadiu });
    }

    // ------------------------------------------- avizeaza / returneaza
    const { avizareId, motiv } = body;
    if (!avizareId) {
      return NextResponse.json({ success: false, error: 'Missing avizareId' }, { status: 400 });
    }
    const avizareRef = db.collection('avizari').doc(avizareId);
    const avizareSnap = await avizareRef.get();
    if (!avizareSnap.exists) {
      return NextResponse.json({ success: false, error: 'Avizare not found' }, { status: 404 });
    }
    const avizare = avizareSnap.data()!;

    const updateMarker = async (stadiu: Stadiu, extra: Record<string, unknown> = {}) => {
      const marker = {
        avizare: { id: avizareId, stadiu, ...extra },
        updatedAt: Timestamp.now(),
      };
      if (avizare.cerereId) {
        await db.collection('form_submissions').doc(avizare.cerereId).update(marker);
      } else if (avizare.registruDocId) {
        await db.collection('registru_general').doc(avizare.registruDocId).update(marker);
      }
    };

    if (action === 'avizeaza') {
      if (avizare.stadiu !== 'la_secretar') {
        return NextResponse.json(
          { success: false, error: 'Documentul nu așteaptă avizul secretarului' },
          { status: 409 }
        );
      }
      if (!isAdmin && auth.uid !== settings.secretarUserId) {
        return NextResponse.json(
          { success: false, error: 'Doar secretarul desemnat (sau un admin) poate aviza' },
          { status: 403 }
        );
      }

      await avizareRef.update({
        stadiu: 'la_primar',
        avizatDe: { uid: auth.uid, nume: actorNume, la: Timestamp.now() },
        updatedAt: Timestamp.now(),
      });
      await updateMarker('la_primar');
      await logIstoric(
        avizare.cerereId,
        `Document avizat de ${actorNume} — așteaptă semnătura primarului`
      );
      notify(
        settings.primarUserId,
        'Document de semnat',
        `${avizare.referinta?.tipLabel || 'Document'} pentru ${
          avizare.referinta?.numeComplet || 'petent'
        } a fost avizat și așteaptă semnătura ta`
      );
      return NextResponse.json({ success: true, stadiu: 'la_primar' });
    }

    if (action === 'returneaza') {
      if (!ACTIVE_STADII.includes(avizare.stadiu)) {
        return NextResponse.json(
          { success: false, error: 'Documentul nu mai este în avizare' },
          { status: 409 }
        );
      }
      const allowed =
        isAdmin ||
        (avizare.stadiu === 'la_secretar' && auth.uid === settings.secretarUserId) ||
        (avizare.stadiu === 'la_primar' && auth.uid === settings.primarUserId);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Nu ai dreptul să returnezi acest document' },
          { status: 403 }
        );
      }

      await avizareRef.update({
        stadiu: 'returnat',
        motivReturnare: motiv?.trim() || null,
        returnatDe: { uid: auth.uid, nume: actorNume, la: Timestamp.now() },
        updatedAt: Timestamp.now(),
      });
      await updateMarker('returnat', motiv?.trim() ? { motiv: motiv.trim() } : {});
      await logIstoric(
        avizare.cerereId,
        `Document returnat de ${actorNume}${motiv?.trim() ? `: ${motiv.trim()}` : ''}`
      );
      notify(
        avizare.intocmitDe?.uid,
        'Document returnat',
        `${avizare.referinta?.tipLabel || 'Documentul'} a fost returnat${
          motiv?.trim() ? `: ${motiv.trim()}` : ' pentru corecturi'
        }`
      );
      return NextResponse.json({ success: true, stadiu: 'returnat' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[avizare] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
