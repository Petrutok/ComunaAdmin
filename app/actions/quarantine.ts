'use server';

// Server actions for the registratura quarantine (spam/ads held back from
// the official registry). Runs with Admin SDK privileges.

import { RegistraturaService } from '@/lib/registratura-service';

export async function listQuarantineAction() {
  try {
    const service = new RegistraturaService();
    const items = await service.getQuarantine();
    // Serialize timestamps for the client
    return {
      success: true as const,
      items: items.map((q: any) => ({
        id: q.id,
        from: q.from,
        subject: q.subject,
        body: q.body,
        clasificare: q.clasificare,
        motiv: q.motiv,
        attachmentNames: q.attachmentNames || [],
        dateReceived: q.dateReceived?.toDate?.()?.toISOString() || null,
      })),
    };
  } catch (error) {
    console.error('[quarantine] list failed:', error);
    return { success: false as const, items: [], message: error instanceof Error ? error.message : 'Eroare' };
  }
}

export async function registerFromQuarantineAction(quarantineId: string) {
  try {
    const service = new RegistraturaService();
    const subject = await service.registerFromQuarantine(quarantineId);
    return { success: true as const, subject };
  } catch (error) {
    console.error('[quarantine] register failed:', error);
    return { success: false as const, message: error instanceof Error ? error.message : 'Eroare' };
  }
}

export async function deleteFromQuarantineAction(quarantineId: string) {
  try {
    const service = new RegistraturaService();
    await service.deleteFromQuarantine(quarantineId);
    return { success: true as const };
  } catch (error) {
    console.error('[quarantine] delete failed:', error);
    return { success: false as const, message: error instanceof Error ? error.message : 'Eroare' };
  }
}
