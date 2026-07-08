// Server-only service: runs in API routes and server actions, so it uses the
// Firebase Admin SDK (security rules do not apply to it).
import { Timestamp } from 'firebase-admin/firestore';
import { getDownloadURL } from 'firebase-admin/storage';
import { getAdminDb, getAdminBucket } from '@/lib/firebase-admin';
import { RegistraturaEmail, EmailStatus } from '@/types/registratura';
import { generateRegistruNumberAdmin } from '@/lib/generateRegistruNumberAdmin';
import { TENANT } from '@/lib/tenant';
import { processAndMergeDocuments, generateTrackingUrl } from '@/lib/services/document-processor';

const COLLECTION_NAME = 'registratura_emails';

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');
  return db;
}

export class RegistraturaService {
  // Generare număr de înregistrare unic
  // Unified registry: emails draw from the same counter as manual entries
  // and online submissions (registru_counters), so one REG- sequence exists
  async generateRegistrationNumber(): Promise<string> {
    return generateRegistruNumberAdmin();
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
      const bucket = getAdminBucket();
      if (!bucket) throw new Error('Firebase Admin Storage not initialized');

      // Sanitize filename to prevent path traversal and special characters
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `registratura/${registrationNumber}/attachments/${safeName}`;
      const fileRef = bucket.file(storagePath);

      await fileRef.save(file, {
        contentType: contentType || 'application/octet-stream',
      });
      const downloadURL = await getDownloadURL(fileRef);

      console.log(`[REGISTRATURA] Uploaded attachment: ${filename} (${file.length} bytes) -> ${downloadURL}`);

      return {
        fileName: filename, // Keep original filename for display
        downloadURL,
        fileSize: file.length,
        fileType: contentType || 'application/octet-stream',
        uploadedAt: Timestamp.now(),
      };
    } catch (error) {
      console.error(`[REGISTRATURA] Failed to upload attachment ${filename}:`, error);
      throw new Error(`Failed to upload attachment: ${filename}`);
    }
  }

  /** Department names for AI triage suggestions. */
  async getDepartmentNames(): Promise<string[]> {
    try {
      const snap = await requireDb().collection('departments').get();
      return snap.docs.map((d) => d.data().name).filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Quarantine instead of silently dropping: spam/ads never consume a
   * registration number, but stay reviewable in the admin UI, from where
   * staff can register a false positive with one click.
   */
  async quarantineEmail(
    email: {
      from: string;
      subject: string;
      body: string;
      date: Date;
      messageId?: string;
      attachments?: Array<{ filename: string }>;
    },
    clasificare: 'spam' | 'reclama',
    motiv: string
  ): Promise<void> {
    await requireDb().collection('registratura_quarantine').add({
      from: email.from,
      subject: email.subject || '(fără subiect)',
      body: (email.body || '').slice(0, 2000),
      dateReceived: Timestamp.fromDate(email.date),
      clasificare,
      motiv,
      attachmentNames: (email.attachments || []).map((a) => a.filename),
      messageId: email.messageId || null,
      createdAt: Timestamp.now(),
    });
  }

  /** Duplicate check must cover quarantine too, otherwise a quarantined
   *  message reappears at every sync. */
  async quarantineExists(messageId: string): Promise<boolean> {
    if (!messageId) return false;
    const snap = await requireDb()
      .collection('registratura_quarantine')
      .where('messageId', '==', messageId)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async getQuarantine(): Promise<any[]> {
    const snap = await requireDb()
      .collection('registratura_quarantine')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /**
   * False positive recovery: register a quarantined email into the real
   * registry (gets a proper number + registru index) and remove it from
   * quarantine. Attachments were not stored, so only the text is carried
   * over - the clerk can request the sender re-send documents if needed.
   */
  async registerFromQuarantine(quarantineId: string): Promise<string> {
    const ref = requireDb().collection('registratura_quarantine').doc(quarantineId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Emailul din carantină nu mai există');
    const q = snap.data()!;

    await this.createEmailRecord({
      from: q.from,
      subject: q.subject,
      body: q.body + (q.attachmentNames?.length
        ? `\n\n[Atașamente în emailul original: ${q.attachmentNames.join(', ')}]`
        : ''),
      dateReceived: q.dateReceived,
      attachments: [],
      messageId: q.messageId || undefined,
    });

    await ref.delete();
    return q.subject;
  }

  async deleteFromQuarantine(quarantineId: string): Promise<void> {
    await requireDb().collection('registratura_quarantine').doc(quarantineId).delete();
  }

  // Verifică dacă email-ul există deja (evită duplicate)
  async emailExists(messageId: string): Promise<boolean> {
    if (!messageId) return false;

    const snapshot = await requireDb()
      .collection(COLLECTION_NAME)
      .where('messageId', '==', messageId)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  // Creează înregistrare nouă
  async createEmailRecord(emailData: Partial<RegistraturaEmail>): Promise<string> {
    // Use provided registration number or generate a new one
    const numarInregistrare = emailData.numarInregistrare || await this.generateRegistrationNumber();

    const attachments = emailData.attachments || [];
    const docData: Omit<RegistraturaEmail, 'id'> = {
      numarInregistrare,
      from: emailData.from || '',
      to: emailData.to,
      subject: emailData.subject || '',
      body: emailData.body || '',
      bodyHtml: emailData.bodyHtml,
      dateReceived: emailData.dateReceived || Timestamp.now(),
      attachments,
      status: 'nou',
      messageId: emailData.messageId,
      // Assignment defaults: unassigned, normal priority, no deadline yet
      assignedToUserId: emailData.assignedToUserId ?? null,
      assignedToUserName: emailData.assignedToUserName ?? null,
      departmentId: emailData.departmentId ?? null,
      departmentName: emailData.departmentName ?? null,
      priority: emailData.priority ?? 'normal',
      deadline: emailData.deadline ?? null,
      // AI triage: tags pre-applied, suggestions advisory (clerk confirms)
      ...(emailData.etichete?.length ? { etichete: emailData.etichete } : {}),
      ...(emailData.aiTriaj ? { aiTriaj: emailData.aiTriaj } : {}),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await requireDb().collection(COLLECTION_NAME).add(docData);
    console.log(`[REGISTRATURA] Created record ${numarInregistrare} with ${attachments.length} attachment(s)`);

    // Unified registry: every email also gets an index entry in
    // registru_general, so staff find all documents in one place
    try {
      await requireDb().collection('registru_general').add({
        numarInregistrare,
        tipDocument: 'adresa',
        dataInregistrare: docData.dateReceived,
        emitent: docData.from,
        emailEmitent: docData.from,
        destinatar: 'Primăria',
        continut: docData.subject || '(fără subiect)',
        status: 'nou',
        sursa: 'email',
        directie: 'intrare',
        // OG 27/2002: default 30-day legal response deadline
        termen: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
        emailId: docRef.id,
        creatDe: 'sistem',
        creatDeNume: 'Registratură email',
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      // Index failure must not lose the email itself
      console.error('[REGISTRATURA] Failed to create registru_general index entry:', error);
    }

    return docRef.id;
  }

  // Obține toate email-urile cu filtrare opțională
  async getEmails(status?: EmailStatus): Promise<RegistraturaEmail[]> {
    let query = requireDb()
      .collection(COLLECTION_NAME)
      .orderBy('dateReceived', 'desc');

    if (status) {
      query = requireDb()
        .collection(COLLECTION_NAME)
        .where('status', '==', status)
        .orderBy('dateReceived', 'desc');
    }

    const snapshot = await query.get();
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

    await requireDb().collection(COLLECTION_NAME).doc(emailId).update(updateData);
  }

  // Șterge email
  async deleteEmail(emailId: string): Promise<void> {
    await requireDb().collection(COLLECTION_NAME).doc(emailId).delete();
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
      const emailDoc = await requireDb().collection(COLLECTION_NAME).doc(emailId).get();
      if (!emailDoc.exists) {
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
        organizationName: TENANT.antetOficial,
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
      await requireDb().collection(COLLECTION_NAME).doc(emailId).update({
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