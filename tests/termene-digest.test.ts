import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// Mocked Firebase: tests never touch production data
let registruDocs: any[] = [];
let userDocs: any[] = [];

const mockDb = {
  collection: (name: string) => ({
    where: () => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ docs: registruDocs.map((d) => ({ data: () => d })) }),
        }),
      }),
      get: async () => ({ docs: userDocs.map((d) => ({ data: () => d })) }),
    }),
  }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => mockDb,
}));
vi.mock('@/lib/api-auth', () => ({
  verifyStaffRequest: async () => ({ authorized: false }),
}));
const sentEmails: any[] = [];
vi.mock('@/lib/email', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/email')>();
  return {
    isValidEmail: original.isValidEmail,
    sendEmail: async (opts: any) => {
      sentEmails.push(opts);
      return true;
    },
  };
});

import { GET } from '@/app/api/termene-digest/route';

const DAY = 24 * 60 * 60 * 1000;

function entry(daysFromNow: number, extra: any = {}) {
  return {
    numarInregistrare: `REG-2026-0000${Math.floor(Math.random() * 90) + 10}`,
    emitent: 'Ion Popescu',
    continut: 'Cerere online: cerere-generala',
    status: 'nou',
    directie: 'intrare',
    termen: Timestamp.fromMillis(Date.now() + daysFromNow * DAY),
    ...extra,
  };
}

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/termene-digest', { headers }) as any;
}

beforeEach(() => {
  sentEmails.length = 0;
  registruDocs = [];
  userDocs = [
    { email: 'secretar@primarie.ro', active: true },
    { email: 'not-an-email', active: true },
  ];
  process.env.CRON_SECRET = 'test-cron-secret';
});

describe('GET /api/termene-digest', () => {
  const authed = { authorization: 'Bearer test-cron-secret' };

  it('rejects unauthorized calls', async () => {
    const res = await GET(makeRequest({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('accepts the Vercel cron header', async () => {
    const res = await GET(makeRequest({ 'x-vercel-cron': '1' }));
    expect(res.status).toBe(200);
  });

  it('sends the digest to valid staff emails, split into overdue and upcoming', async () => {
    registruDocs = [
      entry(-3, { numarInregistrare: 'REG-2026-000001' }),
      entry(2, { numarInregistrare: 'REG-2026-000002' }),
      entry(5, { numarInregistrare: 'REG-2026-000003', status: 'finalizat' }), // excluded
      entry(1, { numarInregistrare: 'REG-2026-000004', directie: 'iesire' }),  // excluded
    ];
    const res = await GET(makeRequest(authed));
    const json = await res.json();
    expect(json).toMatchObject({ success: true, sent: 1, depasite: 1, apropiate: 1 });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('secretar@primarie.ro');
    expect(sentEmails[0].subject).toContain('1 depășite');
    expect(sentEmails[0].text).toContain('REG-2026-000001');
    expect(sentEmails[0].text).toContain('DEPĂȘIT cu 3 zile');
    expect(sentEmails[0].text).toContain('REG-2026-000002');
    expect(sentEmails[0].text).not.toContain('REG-2026-000003');
    expect(sentEmails[0].text).not.toContain('REG-2026-000004');
  });

  it('sends nothing when there are no deadlines to report', async () => {
    registruDocs = [entry(3, { status: 'finalizat' })];
    const res = await GET(makeRequest(authed));
    const json = await res.json();
    expect(json).toMatchObject({ success: true, sent: 0 });
    expect(sentEmails).toHaveLength(0);
  });
});
