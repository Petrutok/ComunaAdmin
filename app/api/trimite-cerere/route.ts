import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Resend } from 'resend';
import { generatePDF, RequestData } from '@/lib/simple-pdf-generator';

// Inițializare Firebase Admin
if (!getApps().length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(serviceAccount as any),
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase admin initialization error:', error);
    initializeApp();
  }
}

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();
const resend = new Resend(process.env.RESEND_API_KEY);

// Verifică dacă Resend API key există
console.log('🔑 Resend API Key exists:', !!process.env.RESEND_API_KEY);
console.log('📧 Primarie email:', process.env.PRIMARIE_EMAIL || 'contact@primariafilipesti.ro');

export async function POST(request: NextRequest) {
  console.log('📨 Processing new request...');
  
  try {
    // Parse JSON body
    const data = await request.json();
    console.log('📝 Request data received for:', data.tipCerere, 'from:', data.email);
    
    // Procesează fișierele pentru PDF (fără Firebase Storage)
    const attachments: Array<{ filename: string; content: string }> = [];
    const attachmentUrls: string[] = [];
    const attachmentNames: string[] = [];
    const attachmentBuffers: Array<{ name: string; buffer: Buffer; type: string }> = [];
    
    if (data.fisiere && data.fisiere.length > 0) {
      console.log(`📎 Processing ${data.fisiere.length} attachments`);
      
      for (const file of data.fisiere) {
        try {
          // Convertește Base64 înapoi în Buffer
          const buffer = Buffer.from(file.content, 'base64');
          
          // Skip Firebase Storage pentru moment - nu este configurat
          // ... cod comentat ...
          
          // Salvează pentru PDF și email
          attachmentNames.push(file.name);
          attachments.push({
            filename: file.name,
            content: file.content
          });
          
          // IMPORTANT: Salvează buffer-ul pentru PDF
          attachmentBuffers.push({
            name: file.name,
            buffer: buffer,
            type: file.type
          });
          
          console.log(`✅ File processed: ${file.name} (${file.type})`);
        } catch (error) {
          console.error(`❌ Error processing file ${file.name}:`, error);
        }
      }
      
      console.log(`📦 Total files ready for PDF: ${attachmentBuffers.length}`);
    }
    
    // Generează PDF cu atașamente
    console.log('🔨 Generating PDF with attachments...');
    console.log('📎 Attachments to include in PDF:', attachmentBuffers.length);
    
    const requestData: RequestData = {
      numeComplet: data.numeComplet,
      nume: data.nume,
      prenume: data.prenume,
      cnp: data.cnp,
      email: data.email,
      telefon: data.telefon,
      telefonMobil: data.telefonMobil || '',
      telefonFix: data.telefonFix || '',
      judet: data.judet,
      localitate: data.localitate,
      strada: data.strada || '',
      numar: data.numar || '',
      bloc: data.bloc || '',
      scara: data.scara || '',
      etaj: data.etaj || '',
      apartament: data.apartament || '',
      adresa: data.adresa,
      tipCerere: data.tipCerere,
      scopulCererii: data.scopulCererii,
      // Trimite buffer-urile către generatorul PDF - asigură-te că sunt în formatul corect
      fisiere: attachmentBuffers.map(file => ({
        name: file.name,
        buffer: file.buffer,
        type: file.type
      })),
      attachmentUrls: attachmentUrls, // URL-urile pentru referință
      
      // Câmpuri adiționale
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
    
    const pdfBlob = await generatePDF(requestData);
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
    console.log('✅ PDF generated successfully with attachments');
    
    // Salvează în Firestore cu URL-urile atașamentelor
    console.log('💾 Saving to Firestore...');
    const docRef = await db.collection('cereri').add({
      numeComplet: data.numeComplet,
      cnp: data.cnp,
      email: data.email,
      telefon: data.telefon,
      localitate: data.localitate,
      adresa: data.adresa,
      tipCerere: data.tipCerere,
      scopulCererii: data.scopulCererii,
      attachmentNames: attachmentNames,
      attachmentUrls: attachmentUrls, // Salvăm și URL-urile
      status: 'în așteptare',
      dataInregistrare: new Date().toISOString(),
      timestamp: new Date(),
      // Salvăm și câmpurile adiționale dacă există
      ...(data.numeFirma && { numeFirma: data.numeFirma }),
      ...(data.cui && { cui: data.cui }),
      ...(data.reprezentantLegal && { reprezentantLegal: data.reprezentantLegal }),
      ...(data.suprafataTeren && { suprafataTeren: data.suprafataTeren }),
      ...(data.nrCadastral && { nrCadastral: data.nrCadastral }),
      ...(data.marcaAuto && { marcaAuto: data.marcaAuto }),
      ...(data.nrInmatriculare && { nrInmatriculare: data.nrInmatriculare }),
    });
    console.log('✅ Saved to Firestore with ID:', docRef.id);
    
    // Mode development - trimite toate email-urile către developer
    const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
    const DEV_EMAIL = 'petrutasd@gmail.com';
    
    // Pregătește lista de atașamente pentru email - doar PDF-ul cu tot conținutul
    const emailAttachments = [
      {
        filename: `cerere_${data.tipCerere}_completa.pdf`,
        content: pdfBuffer.toString('base64')
      }
    ];
    
    // Trimite email către solicitant
    console.log('📧 Sending email to applicant:', data.email);
    try {
      const emailToApplicant = await resend.emails.send({
        from: 'Primăria Filipești <onboarding@resend.dev>',
        to: IS_DEVELOPMENT ? DEV_EMAIL : data.email,
        subject: `Confirmare cerere - ${data.tipCerere}${IS_DEVELOPMENT ? ' [TEST pentru: ' + data.email + ']' : ''}`,
        html: `
          <h2>Cererea dvs. a fost înregistrată cu succes!</h2>
          <p>Număr înregistrare: <strong>${docRef.id}</strong></p>
          <p>Tip cerere: ${data.tipCerere}</p>
          <p>Data: ${new Date().toLocaleDateString('ro-RO')}</p>
          <br>
          <p>Cererea dvs. va fi procesată în maxim 30 de zile lucrătoare.</p>
          ${attachmentNames.length > 0 ? `
            <p><strong>Documente incluse în cerere:</strong></p>
            <ul>
              ${attachmentNames.map(name => `<li>${name}</li>`).join('')}
            </ul>
            <p><em>Toate documentele au fost incluse în PDF-ul atașat.</em></p>
          ` : ''}
          <br>
          <p>Cu stimă,<br>Primăria Comunei Filipești</p>
        `,
        attachments: emailAttachments
      });
      console.log('✅ Email sent to applicant. Response:', emailToApplicant);
    } catch (emailError) {
      console.error('❌ Error sending email to applicant:', emailError);
    }
    
    // Trimite notificare către primărie
    const primarieEmail = process.env.PRIMARIE_EMAIL || 'contact@primariafilipesti.ro';
    console.log('📧 Sending notification to primarie:', primarieEmail);
    try {
      const emailToPrimarie = await resend.emails.send({
        from: 'Sistem Cereri <onboarding@resend.dev>',
        to: IS_DEVELOPMENT ? DEV_EMAIL : primarieEmail,
        subject: `Cerere nouă - ${data.tipCerere} - ${data.numeComplet}${IS_DEVELOPMENT ? ' [TEST]' : ''}`,
        html: `
          <h2>Cerere nouă înregistrată</h2>
          <p><strong>Număr:</strong> ${docRef.id}</p>
          <p><strong>Tip:</strong> ${data.tipCerere}</p>
          <p><strong>Solicitant:</strong> ${data.numeComplet}</p>
          <p><strong>CNP:</strong> ${data.cnp}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Telefon:</strong> ${data.telefon}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleDateString('ro-RO')}</p>
          <br>
          <h3>Conținut cerere:</h3>
          <p>${data.scopulCererii}</p>
          ${attachmentNames.length > 0 ? `
            <br>
            <p><strong>Documente atașate (incluse în PDF):</strong></p>
            <ul>
              ${attachmentNames.map(name => `<li>${name}</li>`).join('')}
            </ul>
          ` : ''}
          <br>
          <p><em>PDF-ul atașat conține cererea completă cu toate documentele incluse.</em></p>
        `,
        attachments: emailAttachments
      });
      console.log('✅ Email sent to primarie. Response:', emailToPrimarie);
    } catch (emailError) {
      console.error('❌ Error sending email to primarie:', emailError);
    }
    
    console.log('🎉 Request processed successfully!');
    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      message: 'Cererea a fost trimisă cu succes!'
    });
    
  } catch (error) {
    console.error('❌ Error processing request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Eroare la procesarea cererii' 
      },
      { status: 500 }
    );
  }
}