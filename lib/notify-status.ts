// Server-only: notifies a citizen that the status of their cerere or
// sesizare changed - web push to their devices (matched by citizenUid)
// plus email fallback, with the issued PDF attached on closing statuses.
//
// Called directly from the API routes that PERFORM the change
// (/api/schimba-status, /api/emite-adeverinta, /api/emite-raspuns), so
// delivery no longer depends on the clerk's browser staying open.
// Best-effort by design: a notification failure must never undo the
// change itself - callers fire-and-forget with .catch.

import type { Firestore } from 'firebase-admin/firestore';
import { getAdminBucket } from '@/lib/firebase-admin';
import { sendEmail, isValidEmail, EmailAttachment } from '@/lib/email';
import { sendPushToUid } from '@/lib/push';

export type NotifiableCollection = 'form_submissions' | 'reported_issues';

export const STATUS_LABELS: Record<string, string> = {
  noua: 'În așteptare',
  nou: 'Înregistrată',
  in_analiza: 'În analiză',
  repartizata: 'Repartizată',
  in_lucru: 'În lucru',
  in_asteptare: 'În așteptare',
  necesita_completare: 'Necesită completare — adăugați documentele solicitate din Dosarul meu',
  prelungit: 'Termen prelungit cu 15 zile (OG 27/2002)',
  redirectionat: 'Redirecționată către instituția competentă',
  rezolvat: 'Soluționată',
  rezolvata: 'Rezolvată',
  respins: 'Respinsă',
  respinsa: 'Respinsă',
  clasat: 'Clasată',
  arhivat: 'Arhivată',
};

export async function notifyCitizenStatusChange(
  db: Firestore,
  params: { collection: NotifiableCollection; docId: string; newStatus: string }
): Promise<{ push: number; email: boolean }> {
  const { collection, docId, newStatus } = params;

  const docSnap = await db.collection(collection).doc(docId).get();
  if (!docSnap.exists) {
    return { push: 0, email: false };
  }
  const data = docSnap.data()!;

  const isCerere = collection === 'form_submissions';
  const reference = isCerere
    ? data.numarInregistrare || 'cererea ta'
    : data.reportId || 'sesizarea ta';
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;
  const title = isCerere ? 'Actualizare cerere' : 'Actualizare sesizare';
  const message = `${isCerere ? 'Cererea' : 'Sesizarea'} ${reference} este acum: ${statusLabel}`;

  const results = { push: 0, email: false };

  // --- Web push to the citizen's devices (only for account-linked docs)
  if (data.citizenUid) {
    results.push = await sendPushToUid(db, data.citizenUid, {
      title,
      body: message,
      url: '/dosarul-meu',
      tag: `status-${docId}`,
    });
  }

  // --- Email fallback (reaches citizens without the app installed).
  // When the status closes the cerere and a document was issued
  // (raspuns oficial / adeverinta), attach its PDF so the citizen gets
  // it directly, without needing the app.
  const citizenEmail = data.email || data.reporterContact;

  if (isValidEmail(citizenEmail)) {
    const attachments: EmailAttachment[] = [];
    if (isCerere && ['rezolvat', 'respins'].includes(newStatus)) {
      const bucket = getAdminBucket();
      if (bucket) {
        for (const emis of [data.raspuns, data.adeverinta]) {
          if (!emis?.storagePath || !emis?.numarIesire) continue;
          try {
            const [buf] = await bucket.file(emis.storagePath).download();
            attachments.push({ filename: `${emis.numarIesire}.pdf`, content: buf });
          } catch {
            console.warn('[notify-status] Could not attach PDF:', emis.storagePath);
          }
        }
      }
    }

    results.email = await sendEmail({
      to: citizenEmail,
      subject: `${title}: ${reference} — ${statusLabel}`,
      text:
        `Bună ziua,\n\n${message}.\n\n` +
        (attachments.length
          ? `Documentul emis de primărie este atașat acestui email.\n\n`
          : '') +
        `Puteți vedea detaliile în aplicație, în secțiunea „Dosarul meu":\n` +
        `${process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital'}/dosarul-meu\n\n` +
        `Acest mesaj a fost trimis automat, vă rugăm să nu răspundeți.`,
      attachments,
    });
  }

  return results;
}
