'use server';

import { RegistraturaService } from '@/lib/registratura-service';

export async function processDocumentsAction(
  emailId: string,
  registrationNumber: string,
  dateReceived: string,
  senderName: string,
  senderEmail: string,
  departmentName?: string
) {
  try {
    console.log('[PROCESS-DOCUMENTS] Server action called for', registrationNumber);

    const service = new RegistraturaService();

    const result = await service.processEmailAttachments(
      emailId,
      registrationNumber,
      new Date(dateReceived),
      senderName,
      senderEmail,
      departmentName
    );

    console.log('[PROCESS-DOCUMENTS] Result:', result);

    return {
      success: result.success,
      processedCount: result.processedCount,
      totalCount: result.totalCount,
      errors: result.errors,
      downloadURL: result.downloadURL,
    };
  } catch (error) {
    console.error('[PROCESS-DOCUMENTS] Server action error:', error);
    return {
      success: false,
      processedCount: 0,
      totalCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
