import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
      credential: cert(serviceAccount as any)
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase admin initialization error:', error);
    initializeApp();
  }
}

const db = getFirestore();
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
    
    // Procesează fișierele din Base64
    const attachments: Array<{ filename: string; content: string }> = [];
    const attachmentNames: string[] = [];
    
    if (data.fisiere && data.fisiere.length > 0) {
      for (const file of data.fisiere) {
        attachments.push({
          filename: file.name,
          content: file.content // Deja este Base64
        });
        attachmentNames.push(file.name);
      }
      console.log(`📎 Processing ${attachmentNames.length} attachments`);
    }
    
    // Generează PDF
    console.log('🔨 Generating PDF...');
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
      // Adaugă informații despre fișierele atașate pentru PDF
      fisiere: attachmentNames.map(name => ({ name } as File)),
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
    console.log('✅ PDF generated successfully');
    
    // Salvează în Firestore
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
      status: 'în așteptare',
      dataInregistrare: new Date().toISOString(),
      timestamp: new Date()
    });
    console.log('✅ Saved to Firestore with ID:', docRef.id);
    
    // Pregătește lista de atașamente pentru email
    const emailAttachments = [
      {
        filename: `cerere_${data.tipCerere}.pdf`,
        content: pdfBuffer.toString('base64')
      },
      ...attachments
    ];
    
    // Trimite email către solicitant
    console.log('📧 Sending email to applicant:', data.email);
    try {
      const emailToApplicant = await resend.emails.send({
        from: 'Primăria Filipești <onboarding@resend.dev>',
        to: data.email,
        subject: `Confirmare cerere - ${data.tipCerere}`,
        html: `
          <h2>Cererea dvs. a fost înregistrată cu succes!</h2>
          <p>Număr înregistrare: <strong>${docRef.id}</strong></p>
          <p>Tip cerere: ${data.tipCerere}</p>
          <p>Data: ${new Date().toLocaleDateString('ro-RO')}</p>
          <br>
          <p>Cererea dvs. va fi procesată în maxim 30 de zile lucrătoare.</p>
          ${attachmentNames.length > 0 ? `
            <p><strong>Documente atașate:</strong></p>
            <ul>
              ${attachmentNames.map(name => `<li>${name}</li>`).join('')}
            </ul>
          ` : ''}
          <br>
          <p>Cu stimă,<br>Primăria Comunei Filipești</p>
        `,
        attachments: emailAttachments
      });
      console.log('✅ Email sent to applicant. Response:', emailToApplicant);
    } catch (emailError) {
      console.error('❌ Error sending email to applicant:', emailError);
      // Continuă execuția chiar dacă email-ul eșuează
    }
    
    // Trimite notificare către primărie
    const primarieEmail = process.env.PRIMARIE_EMAIL || 'contact@primariafilipesti.ro';
    console.log('📧 Sending notification to primarie:', primarieEmail);
    try {
      const emailToPrimarie = await resend.emails.send({
        from: 'Sistem Cereri <onboarding@resend.dev>',
        to: primarieEmail,
        subject: `Cerere nouă - ${data.tipCerere} - ${data.numeComplet}`,
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
            <p><strong>Documente atașate:</strong></p>
            <ul>
              ${attachmentNames.map(name => `<li>${name}</li>`).join('')}
            </ul>
          ` : ''}
        `,
        attachments: emailAttachments
      });
      console.log('✅ Email sent to primarie. Response:', emailToPrimarie);
    } catch (emailError) {
      console.error('❌ Error sending email to primarie:', emailError);
      // Continuă execuția chiar dacă email-ul eșuează
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