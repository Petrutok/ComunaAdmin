// Server-only email sending via Resend, shared by confirmation emails,
// status notifications and official response delivery.
//
// Best-effort by design: callers must never fail a request because an
// email could not be sent, so this returns false instead of throwing.

import { Resend } from 'resend';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_REGEX.test(value);
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !isValidEmail(options.to)) {
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Primăria Digitală <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      ...(options.attachments?.length
        ? {
            attachments: options.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            })),
          }
        : {}),
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[email] Send failed:', error);
    return false;
  }
}
