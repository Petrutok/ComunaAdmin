import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { generateRegistruNumberAdmin } from '@/lib/generateRegistruNumberAdmin';
import { getOptionalCitizenUid } from '@/lib/api-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateAndDecodeFiles } from '@/lib/cereri-files';
import { sendEmail } from '@/lib/email';

interface CerereRequest {
  numeComplet: string;
  cnp: string;
  localitate: string;
  strada: string;
  numar?: string;
  bloc?: string;
  scara?: string;
  etaj?: string;
  apartament?: string;
  adresa: string;
  telefon?: string;
  email: string;
  tipCerere: string;
  scopulCererii: string;
  nume: string;
  prenume: string;
  judet: string;
  telefonMobil?: string;
  telefonFix?: string;
  fisiere?: { name: string; type: string; size?: number; content: string }[];
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  // Public endpoint: limit to 5 submissions per hour per IP
  const limit = rateLimit(`trimite-cerere:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Prea multe cereri trimise. Încercați din nou mai târziu.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    // Parse request body
    const body: CerereRequest = await request.json();

    // Attachments are validated separately (they are large by nature);
    // everything else keeps the tight cap
    const fisiereInput = Array.isArray(body.fisiere) ? body.fisiere : [];
    delete body.fisiere;

    // Reject oversized payloads: the route stores unknown extra fields,
    // so cap the overall size before anything reaches Firestore
    if (JSON.stringify(body).length > 100_000 || Object.keys(body).length > 60) {
      return NextResponse.json(
        { success: false, error: 'Payload too large' },
        { status: 413 }
      );
    }

    // Validate and decode attachments before touching Firestore
    const decodeResult = validateAndDecodeFiles(fisiereInput);
    if (!decodeResult.ok) {
      return NextResponse.json(
        { success: false, error: decodeResult.error },
        { status: decodeResult.status }
      );
    }
    const decodedFiles = decodeResult.files;

    // Validate required fields
    const requiredFields = ['numeComplet', 'cnp', 'email', 'localitate', 'strada', 'tipCerere'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate CNP (should be 13 digits)
    if (!/^\d{13}$/.test(body.cnp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid CNP format (must be 13 digits)' },
        { status: 400 }
      );
    }

    // Prepare submission document
    const submissionData = {
      // Personal info
      numeComplet: body.numeComplet,
      nume: body.nume,
      prenume: body.prenume,
      cnp: body.cnp,

      // Contact
      email: body.email,
      telefon: body.telefon || body.telefonMobil || body.telefonFix,
      telefonMobil: body.telefonMobil,
      telefonFix: body.telefonFix,

      // Address
      judet: body.judet,
      localitate: body.localitate,
      strada: body.strada,
      numar: body.numar,
      bloc: body.bloc,
      scara: body.scara,
      etaj: body.etaj,
      apartament: body.apartament,
      adresa: body.adresa,

      // Request details
      tipCerere: body.tipCerere,
      scopulCererii: body.scopulCererii,

      // Additional fields (store any other fields provided)
      ...Object.keys(body).reduce((acc, key) => {
        if (![
          'numeComplet', 'cnp', 'localitate', 'strada', 'numar', 'bloc',
          'scara', 'etaj', 'apartament', 'adresa', 'telefon', 'email',
          'tipCerere', 'scopulCererii', 'nume', 'prenume', 'judet',
          'telefonMobil', 'telefonFix', 'fisiere'
        ].includes(key)) {
          acc[key] = body[key];
        }
        return acc;
      }, {} as Record<string, any>),

      // Metadata
      status: 'noua',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Upload attachments to Storage under the submission's future id,
    // BEFORE generating the registry number so a failed upload doesn't
    // burn an official number. Staff read access via storage.rules.
    const submissionRef = db.collection('form_submissions').doc();
    let fisiere: { name: string; type: string; size: number; storagePath: string }[] = [];
    if (decodedFiles.length > 0) {
      const bucket = getAdminBucket();
      if (!bucket) {
        throw new Error('Firebase Storage not initialized');
      }
      fisiere = await Promise.all(
        decodedFiles.map(async (f, i) => {
          const storagePath = `cereri/${submissionRef.id}/${i + 1}_${f.name}`;
          await bucket.file(storagePath).save(f.buffer, { contentType: f.type });
          return { name: f.name, type: f.type, size: f.buffer.length, storagePath };
        })
      );
    }

    // Register the request in the general registry: every online submission
    // gets an official registration number, sequential with the manual
    // registry entries made from the admin panel
    const numarInregistrare = await generateRegistruNumberAdmin();

    const isAdeverinta = String(body.tipCerere).startsWith('adeverinta-');
    const registruDoc = {
      numarInregistrare,
      tipDocument: 'cerere',
      dataInregistrare: Timestamp.now(),
      emitent: body.numeComplet,
      adresaEmitent: body.adresa || `${body.strada} ${body.numar || ''}, ${body.localitate}`.trim(),
      emailEmitent: body.email,
      destinatar: 'Primăria',
      continut: `Cerere online: ${body.tipCerere}${body.scopulCererii ? ` — ${body.scopulCererii}` : ''}`,
      status: 'nou',
      sursa: isAdeverinta ? 'adeverinta' : 'cerere_online',
      directie: 'intrare',
      // OG 27/2002: default 30-day legal response deadline
      termen: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      creatDe: 'sistem',
      creatDeNume: 'Depunere online',
      createdAt: Timestamp.now(),
    };
    const registruRef = await db.collection('registru_general').add(registruDoc);

    // Logged-in citizens get the submission linked to their account
    // so it shows up in "Dosarul meu"
    const citizenUid = await getOptionalCitizenUid(request);

    // Save the submission with its registration number and registry link
    await submissionRef.set({
      ...submissionData,
      fisiere,
      numarInregistrare,
      registruDocId: registruRef.id,
      ...(citizenUid ? { citizenUid } : {}),
    });

    // Backlink so the registry entry can open the full submission
    await registruRef.update({ cerereId: submissionRef.id });

    // OG 27/2002: confirm the registration to the petitioner. Best effort -
    // the submission is already recorded, an email failure must not undo it
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital';
    const dataDepunerii = new Date().toLocaleDateString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    await sendEmail({
      to: body.email,
      subject: `Confirmare înregistrare cerere — ${numarInregistrare}`,
      text:
        `Bună ziua, ${body.numeComplet},\n\n` +
        `Cererea dumneavoastră („${body.tipCerere}") a fost înregistrată la primărie.\n\n` +
        `Număr de înregistrare: ${numarInregistrare}\n` +
        `Data înregistrării: ${dataDepunerii}\n` +
        `Fișiere atașate: ${fisiere.length}\n\n` +
        `Conform OG 27/2002, veți primi un răspuns în cel mult 30 de zile.\n\n` +
        `Puteți urmări stadiul cererii în aplicație, în secțiunea „Dosarul meu":\n` +
        `${baseUrl}/dosarul-meu\n\n` +
        `Păstrați numărul de înregistrare pentru orice corespondență cu primăria.\n\n` +
        `Acest mesaj a fost trimis automat, vă rugăm să nu răspundeți.`,
    });

    return NextResponse.json(
      {
        success: true,
        id: submissionRef.id,
        numarInregistrare,
        message: 'Cerere trimisă cu succes'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing form submission:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process form submission'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
