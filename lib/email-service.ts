// email-service.ts - Updated to use imapflow
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';

interface EmailMessage {
  from: string;
  to?: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  messageId?: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    size: number;
  }>;
}

export class EmailService {
  private client: ImapFlow | null = null;

  constructor() {
    // Constructor is now empty, initialization happens in connect()
  }

  async connect(): Promise<void> {
    this.client = new ImapFlow({
      host: process.env.EMAIL_HOST!,
      port: parseInt(process.env.EMAIL_PORT!, 10),
      secure: process.env.EMAIL_TLS === 'true',
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASSWORD!,
      },
      logger: false, // Set to console for debugging
      tls: {
        rejectUnauthorized: false,
      },
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
  }

  async fetchNewEmails(): Promise<EmailMessage[]> {
    if (!this.client) {
      throw new Error('Email client not connected');
    }

    // Open INBOX mailbox
    await this.client.mailboxOpen('INBOX');

    // Search for unseen emails from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messages = await this.client.search({
      unseen: true,
      since: yesterday,
    });

    const emails: EmailMessage[] = [];

    for await (const uid of messages) {
      try {
        // Fetch message with full body
        const message = await this.client.fetchOne(uid.toString(), {
          source: true, // Get full raw email
        });

        if (!message.source) continue;

        // Parse the email
        const parsed = await simpleParser(message.source);

        const email: EmailMessage = {
          from: getAddressText(parsed.from),
          to: getAddressText(parsed.to),
          subject: parsed.subject || '',
          body: parsed.text || '',
          bodyHtml: parsed.html || '',
          date: parsed.date || new Date(),
          messageId: parsed.messageId,
          attachments: (parsed.attachments || []).map((att) => ({
            filename: att.filename || 'untitled',
            content: att.content,
            contentType: att.contentType,
            size: att.size,
          })),
        };

        emails.push(email);

        // Mark as seen
        await this.client.messageFlagsAdd(uid.toString(), ['\\Seen']);
      } catch (error) {
        console.error(`Error processing email UID ${uid}:`, error);
        // Continue processing other emails
      }
    }

    return emails;
  }

  async fetchUnseenEmails(limit: number = 50): Promise<EmailMessage[]> {
    if (!this.client) {
      throw new Error('Email client not connected');
    }

    await this.client.mailboxOpen('INBOX');

    // Search for unseen emails
    const messages = await this.client.search({
      unseen: true,
    });

    const emails: EmailMessage[] = [];
    const messagesToProcess = messages.slice(0, limit);

    for await (const uid of messagesToProcess) {
      try {
        const message = await this.client.fetchOne(uid.toString(), {
          source: true,
        });

        if (!message.source) continue;

        const parsed = await simpleParser(message.source);

        const email: EmailMessage = {
          from: getAddressText(parsed.from),
          to: getAddressText(parsed.to),
          subject: parsed.subject || '',
          body: parsed.text || '',
          bodyHtml: parsed.html || '',
          date: parsed.date || new Date(),
          messageId: parsed.messageId,
          attachments: (parsed.attachments || []).map((att) => ({
            filename: att.filename || 'untitled',
            content: att.content,
            contentType: att.contentType,
            size: att.size,
          })),
        };

        emails.push(email);

        // Mark as seen
        await this.client.messageFlagsAdd(uid.toString(), ['\\Seen']);
      } catch (error) {
        console.error(`Error processing email UID ${uid}:`, error);
      }
    }

    return emails;
  }
}

/* ---------- Spam Filter ---------- */

const SPAM_KEYWORDS = [
  // Promotional keywords
  'promo', 'promotion', 'discount', 'sale', 'offer', 'deal', 'free',
  'win', 'winner', 'prize', 'lottery', 'congratulations', 'click here',

  // Newsletter keywords
  'newsletter', 'unsubscribe', 'subscription', 'mailing list',

  // Marketing keywords
  'limited time', 'act now', 'urgent', 'expire', 'bonus',
  'cash', 'credit', 'income', 'investment', 'opportunity',

  // Suspicious patterns
  'viagra', 'pharmacy', 'cialis', 'weight loss',
  'work from home', 'make money', 'earn money',

  // Common spam Romanian keywords
  'reducere', 'oferta', 'gratuit', 'castiga', 'premiu',
  'abonament', 'dezaboneaza', 'promovare', 'reduceri',
];

const SPAM_PHRASES = [
  'click aici',
  'apasa aici',
  'oferta limitata',
  'timp limitat',
  'nu rata',
  'ultima sansa',
  'garantat',
  'fara risc',
  'bani rapid',
];

/**
 * Simple spam filter using keyword matching
 * Returns true if the email is likely spam
 */
export function isSpam(subject: string, body: string): boolean {
  const textToCheck = `${subject} ${body}`.toLowerCase();

  // Check for spam keywords
  const keywordMatches = SPAM_KEYWORDS.filter(keyword =>
    textToCheck.includes(keyword.toLowerCase())
  ).length;

  // Check for spam phrases
  const phraseMatches = SPAM_PHRASES.filter(phrase =>
    textToCheck.includes(phrase.toLowerCase())
  ).length;

  // If we have 3+ keyword matches or 2+ phrase matches, likely spam
  if (keywordMatches >= 3 || phraseMatches >= 2) {
    return true;
  }

  // Check for excessive capitalization (common in spam)
  const capitalRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
  if (capitalRatio > 0.5 && subject.length > 10) {
    return true;
  }

  // Check for excessive exclamation marks
  const exclamationCount = (subject.match(/!/g) || []).length;
  if (exclamationCount >= 3) {
    return true;
  }

  return false;
}

/* ---------- Helpers ---------- */

function getAddressText(addr?: AddressObject | AddressObject[]): string {
  if (!addr) return '';
  if (Array.isArray(addr)) return addr.map((a) => a.text).join(', ');
  return addr.text || '';
}
