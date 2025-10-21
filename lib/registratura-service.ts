import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { RegistraturaEmail, EmailStatus } from '@/types/registratura';
import { generateRegistrationNumber } from '@/lib/generateRegistrationNumber';
import { processAndMergeDocuments, generateTrackingUrl } from '@/lib/services/document-processor';

const COLLECTION_NAME = 'registratura_emails';

export class RegistraturaService {
  // Generare număr de înregistrare unic
  // Now uses the shared utility function
  async generateRegistrationNumber(): Promise<string> {
    return generateRegistrationNumber();
  }

  // Salvare atașament în Firebase Storage
  async uploadAttachment(
    file: Buffer,
    filename: string,
    registrationNumber: string,
    contentType?: string
  ): Promise<{
    fileName: string;
    downloadURL: string;
    fileSize: number;
    fileType: string;
    uploadedAt: Timestamp;
  }> {
    try {
      // Sanitize filename to prevent path traversal and special characters
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `registratura/${registrationNumber}/attachments/${safeName}`;
      const storageRef = ref(storage, storagePath);

      // Upload with metadata
      const metadata = contentType ? { contentType } : undefined;
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log(`[REGISTRATURA] Uploaded attachment: ${filename} (${file.length} bytes) -> ${downloadURL}`);

      return {
        fileName: filename, // Keep original filename for display
        downloadURL,
        fileSize: file.length,
        fileType: snapshot.metadata.contentType || contentType || 'application/octet-stream',
        uploadedAt: Timestamp.now(),
      };
    } catch (error) {
      console.error(`[REGISTRATURA] Failed to upload attachment ${filename}:`, error);
      throw new Error(`Failed to upload attachment: ${filename}`);
    }
  }

  // Verifică dacă email-ul există deja (evită duplicate)
  async emailExists(messageId: string): Promise<boolean> {
    if (!messageId) return false;
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('messageId', '==', messageId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  // Creează înregistrare nouă
  async createEmailRecord(emailData: Partial<RegistraturaEmail>): Promise<string> {
    // Use provided registration number or generate a new one
    const numarInregistrare = emailData.numarInregistrare || await this.generateRegistrationNumber();

    const docData: Omit<RegistraturaEmail, 'id'> = {
      numarInregistrare,
      from: emailData.from || '',
      to: emailData.to,
      subject: emailData.subject || '',
      body: emailData.body || '',
      bodyHtml: emailData.bodyHtml,
      dateReceived: emailData.dateReceived || Timestamp.now(),
      attachments: emailData.attachments || [],
      status: 'nou',
      messageId: emailData.messageId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    console.log(`[REGISTRATURA] Created record ${numarInregistrare} with ${docData.attachments.length} attachment(s)`);
    return docRef.id;
  }

  // Obține toate email-urile cu filtrare opțională
  async getEmails(status?: EmailStatus): Promise<RegistraturaEmail[]> {
    let q = query(
      collection(db, COLLECTION_NAME),
      orderBy('dateReceived', 'desc')
    );
    
    if (status) {
      q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', status),
        orderBy('dateReceived', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RegistraturaEmail));
  }

  // Actualizează status și observații
  async updateEmailStatus(
    emailId: string, 
    status: EmailStatus, 
    observatii?: string,
    assignedTo?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: Timestamp.now()
    };
    
    if (observatii !== undefined) {
      updateData.observatii = observatii;
    }
    
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo;
    }
    
    await updateDoc(doc(db, COLLECTION_NAME, emailId), updateData);
  }

  // Șterge email
  async deleteEmail(emailId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, emailId));
  }

  // Process email attachments - creates a single merged and stamped official document
  async processEmailAttachments(
    emailId: string,
    registrationNumber: string,
    dateReceived: Date,
    senderName: string,
    senderEmail: string,
    departmentName?: string
  ): Promise<{
    success: boolean;
    processedCount: number;
    totalCount: number;
    errors: string[];
    downloadURL?: string;
  }> {
    try {
      // Get email document
      const emailDoc = await getDoc(doc(db, COLLECTION_NAME, emailId));
      if (!emailDoc.exists()) {
        return {
          success: false,
          processedCount: 0,
          totalCount: 0,
          errors: ['Email not found'],
        };
      }

      const email = { id: emailDoc.id, ...emailDoc.data() } as RegistraturaEmail;

      if (!email.attachments || email.attachments.length === 0) {
        console.log(`[REGISTRATURA] No attachments to process for ${registrationNumber}`);
        return {
          success: true,
          processedCount: 0,
          totalCount: 0,
          errors: [],
        };
      }

      console.log(`[REGISTRATURA] Processing ${email.attachments.length} attachments for ${registrationNumber}`);

      // Fetch all attachment buffers from Firebase Storage
      const files: Array<{ buffer: Buffer; fileName: string; fileType: string }> = [];

      for (const attachment of email.attachments) {
        try {
          console.log(`[REGISTRATURA] Fetching ${attachment.fileName} from Storage`);
          const response = await fetch(attachment.downloadURL);
          if (!response.ok) {
            console.error(`[REGISTRATURA] Failed to fetch ${attachment.fileName}: ${response.statusText}`);
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          files.push({
            buffer: Buffer.from(arrayBuffer),
            fileName: attachment.fileName,
            fileType: attachment.fileType,
          });
        } catch (error) {
          console.error(`[REGISTRATURA] Error fetching ${attachment.fileName}:`, error);
        }
      }

      if (files.length === 0) {
        return {
          success: false,
          processedCount: 0,
          totalCount: email.attachments.length,
          errors: ['Failed to fetch any attachments from storage'],
        };
      }

      console.log(`[REGISTRATURA] Successfully fetched ${files.length}/${email.attachments.length} files`);

      // Process and merge all documents into a single official PDF
      const result = await processAndMergeDocuments(files, {
        registrationNumber,
        dateReceived,
        organizationName: 'PRIMĂRIA DIGITALĂ',
        departmentName,
        senderName,
        senderEmail,
        trackingUrl: undefined, // No QR code
        uploadToStorage: true,
      });

      if (!result.success) {
        return {
          success: false,
          processedCount: 0,
          totalCount: email.attachments.length,
          errors: [result.error || 'Unknown processing error'],
        };
      }

      // Update Firestore document with official document
      await updateDoc(doc(db, COLLECTION_NAME, emailId), {
        officialDocument: {
          fileName: 'document-oficial.pdf',
          downloadURL: result.downloadURL!,
          fileSize: result.fileSize!,
          pageCount: result.pageCount,
          sourceFileCount: files.length,
          processedAt: Timestamp.now(),
          storagePath: result.storagePath,
        },
        lastProcessed: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`[REGISTRATURA] ✓ Created official document for ${registrationNumber}`);

      return {
        success: true,
        processedCount: files.length,
        totalCount: email.attachments.length,
        errors: [],
        downloadURL: result.downloadURL,
      };
    } catch (error) {
      console.error('[REGISTRATURA] Error in processEmailAttachments:', error);
      return {
        success: false,
        processedCount: 0,
        totalCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}