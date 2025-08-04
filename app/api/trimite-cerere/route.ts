// Locație: /app/api/trimite-cerere/route.ts
// Versiune care funcționează cu Resend în modul test

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Resend } from 'resend';
import { generatePDF, RequestData } from '@/lib/simple-pdf-generator';

// 1. Inițializare Firebase (înainte de orice)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // 2. Citim JSON-ul direct
    const data = await request.json();
    console.log('Received data:', data);

    // 3. Validări
    if (!data.numeComplet || !data.cnp || !data.localitate || !data.tipCerere || !data.scopulCererii) {
      return NextResponse.json({ success: false, error: 'Date incomplete' }, { status: 400 });
    }
    if (!/^\d{13}$/.test(data.cnp)) {
      return NextResponse.json({ success: false, error: 'CNP invalid' }, { status: 400 });
    }

    // 4. Pregătim datele pentru PDF în formatul nou
    const pdfData: RequestData = {
      // Date personale
      nume: data.nume || data.numeComplet.split(' ')[0] || '',
      prenume: data.prenume || data.numeComplet.split(' ').slice(1).join(' ') || '',
      numeComplet: data.numeComplet,
      cnp: data.cnp,
      
      // Contact
      email: data.email,
      telefonMobil: data.telefonMobil || '',
      telefonFix: data.telefonFix || '',
      telefon: data.telefon || data.telefonMobil || data.telefonFix || '',
      
      // Domiciliu
      judet: data.judet || 'Bacău',
      localitate: data.localitate,
      strada: data.strada || 'Principală',
      numar: data.numar || '',
      bloc: data.bloc || '',
      scara: data.scara || '',
      etaj: data.etaj || '',
      apartament: data.apartament || '',
      adresa: data.adresa || `Str. ${data.strada || 'Principală'}`,
      
      // Date cerere
      tipCerere: data.tipCerere,
      scopulCererii: data.scopulCererii,
      documente: data.documente || [],
      fisiere: data.fisiere || [],
      fileUrls: data.fileUrls || [],
      
      // Câmpuri adiționale (dacă există)
      ...(data.numeFirma && { numeFirma: data.numeFirma }),
      ...(data.cui && { cui: data.cui }),
      ...(data.nrRegistruComert && { nrRegistruComert: data.nrRegistruComert }),
      ...(data.reprezentantLegal && { reprezentantLegal: data.reprezentantLegal }),
      ...(data.suprafataTeren && { suprafataTeren: data.suprafataTeren }),
      ...(data.nrCadastral && { nrCadastral: data.nrCadastral }),
      ...(data.tipConstructie && { tipConstructie: data.tipConstructie }),
      ...(data.suprafataConstructie && { suprafataConstructie: data.suprafataConstructie }),
      ...(data.anConstructie && { anConstructie: data.anConstructie }),
      ...(data.marcaAuto && { marcaAuto: data.marcaAuto }),
      ...(data.serieSasiu && { serieSasiu: data.serieSasiu }),
      ...(data.anFabricatie && { anFabricatie: data.anFabricatie }),
      ...(data.capacitateCilindrica && { capacitateCilindrica: data.capacitateCilindrica }),
      ...(data.masaMaxima && { masaMaxima: data.masaMaxima }),
      ...(data.nrInmatriculare && { nrInmatriculare: data.nrInmatriculare }),
    };

    // 5. Generăm PDF-ul
    console.log('Generating PDF...');
    const pdfBlob = await generatePDF(pdfData);
    console.log('PDF generated successfully');

    // 6. Email - MODIFICAT PENTRU TEST MODE
    const tipCerereText = data.tipCerere.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const subject = `Cerere nouă – ${tipCerereText} – ${data.numeComplet}`;
    
    // HTML mai detaliat pentru email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #003087; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Cerere nouă – Comuna Filipești</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f5f5f5;">
          <h2 style="color: #333;">Date solicitant:</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nume:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.numeComplet}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>CNP:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.cnp}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Telefon:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.telefon || data.telefonMobil || data.telefonFix || 'Nespecificat'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Adresa:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.localitate}, ${data.adresa}</td>
            </tr>
          </table>
          
          <h2 style="color: #333; margin-top: 20px;">Detalii cerere:</h2>
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p><strong>Tip cerere:</strong> ${tipCerereText}</p>
            <p><strong>Motivul cererii:</strong></p>
            <p style="padding: 10px; background-color: #f0f0f0; border-left: 4px solid #003087;">
              ${data.scopulCererii}
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>Cerere trimisă la: ${new Date().toLocaleString('ro-RO')}</p>
            <p>Acest email a fost generat automat de platforma online a Primăriei Filipești</p>
          </div>
        </div>
      </div>
    `;

    // Pentru test mode, trimitem doar către email-ul verificat
    let emailId = null;
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Comuna Filipești <onboarding@resend.dev>',
        to: ['petrutasd@gmail.com'], // În modul test, trimitem doar către tine
        subject,
        html,
        attachments: [
          {
            filename: `Cerere_${data.tipCerere}_${data.numeComplet.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            content: Buffer.from(await pdfBlob.arrayBuffer()).toString('base64'),
          },
        ],
      });

      if (emailError) {
        console.error('Email error:', emailError);
        throw emailError;
      }

      emailId = emailData?.id || null;
      console.log('Email sent successfully:', emailData);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continuăm chiar dacă email-ul eșuează
    }

    // 7. Salvare în Firestore
    console.log('Saving to Firestore...');
    const docRef = await addDoc(collection(db, 'cereri_online'), {
      // Salvăm toate datele
      ...data,
      ...pdfData,
      status: 'trimisa',
      createdAt: new Date(),
      emailId: emailId,
    });
    console.log('Saved to Firestore with ID:', docRef.id);

    return NextResponse.json({
      success: true,
      message: 'Cererea a fost trimisă cu succes!',
      documentId: docRef.id,
      note: 'În modul test, email-ul a fost trimis doar către adresa verificată.'
    });
  } catch (error: any) {
    console.error('Error in /api/trimite-cerere:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Eroare internă' },
      { status: 500 }
    );
  }
}