import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generatePDF } from '@/lib/pdf-generator';
import { RequestData, REQUEST_TYPES } from '@/lib/types/request-types';

// Inițializare Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const data: RequestData = await request.json();
    
    // Validare date
    if (!data.numeComplet || !data.cnp || !data.localitate || !data.tipCerere || !data.scopulCererii) {
      return NextResponse.json(
        { success: false, error: 'Date incomplete' },
        { status: 400 }
      );
    }

    // Validare CNP (13 cifre)
    if (!/^\d{13}$/.test(data.cnp)) {
      return NextResponse.json(
        { success: false, error: 'CNP invalid' },
        { status: 400 }
      );
    }

    console.log('[TrimitereCerere] Generare PDF pentru:', data.tipCerere);

    // Generează PDF
    const pdfBuffer = await generatePDF(data);
    
    // Pregătește email
    const emailSubject = `Cerere nouă - ${REQUEST_TYPES[data.tipCerere]} - ${data.numeComplet}`;
    
    const emailContent = `
      <h2>Cerere nouă primită prin aplicația Comuna</h2>
      
      <h3>Detalii solicitant:</h3>
      <ul>
        <li><strong>Nume:</strong> ${data.numeComplet}</li>
        <li><strong>CNP:</strong> ${data.cnp}</li>
        <li><strong>Localitate:</strong> ${data.localitate}</li>
        <li><strong>Adresă:</strong> ${data.adresa}</li>
        <li><strong>Telefon:</strong> ${data.telefon}</li>
        <li><strong>Email:</strong> ${data.email}</li>
      </ul>
      
      <h3>Detalii cerere:</h3>
      <ul>
        <li><strong>Tip cerere:</strong> ${REQUEST_TYPES[data.tipCerere]}</li>
        <li><strong>Scop:</strong> ${data.scopulCererii}</li>
      </ul>
      
      <p><em>Cererea completă se află în documentul PDF atașat.</em></p>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        Acest email a fost generat automat de aplicația Comuna. 
        Data: ${new Date().toLocaleString('ro-RO')}
      </p>
    `;

    // Trimite email cu Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Comuna App <onboarding@resend.dev>', // În producție: 'Comuna App <cereri@primaria-comuna.ro>'
      to: ['petrutasd@gmail.com'], // Destinatar principal
      cc: [data.email], // Copie la solicitant
      subject: emailSubject,
      html: emailContent,
      attachments: [
        {
          filename: `Cerere_${data.tipCerere}_${data.numeComplet.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer.toString('base64'),
        }
      ],
    });

    if (emailError) {
      console.error('[TrimitereCerere] Eroare email:', emailError);
      return NextResponse.json(
        { success: false, error: 'Eroare la trimiterea email-ului' },
        { status: 500 }
      );
    }

    console.log('[TrimitereCerere] Email trimis:', emailData?.id);

    // Salvează în baza de date (opțional)
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      await addDoc(collection(db, 'cereri_online'), {
        ...data,
        status: 'trimisa',
        createdAt: new Date(),
        emailId: emailData?.id,
      });
    } catch (dbError) {
      console.error('[TrimitereCerere] Eroare salvare DB:', dbError);
      // Nu blocăm dacă salvarea în DB eșuează
    }

    return NextResponse.json({
      success: true,
      message: 'Cererea a fost trimisă cu succes!',
      emailId: emailData?.id
    });

  } catch (error: any) {
    console.error('[TrimitereCerere] Eroare:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Eroare la procesarea cererii: ' + error.message 
      },
      { status: 500 }
    );
  }
}