import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// Mocked Firebase: tests never touch production data
let registruDocs: any[] = [];
let userDocs: any[] = [];
// source docs holding the assignment: form_submissions / registratura_emails
let sourceDocs: Record<string, any> = {};

const mockDb = {
  collection: (name: string) => ({
    where: () => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ docs: registruDocs.map((d) => ({ data: () => d })) }),
        }),
      }),
      get: async () => ({
        docs: userDocs.map((d) => ({ id: d.id, data: () => d })),
      }),
    }),
    doc: (id: string) => ({ __key: `${name}/${id}` }),
  }),
  getAll: async (...refs: any[]) =>
    refs.map((r) => ({
      exists: sourceDocs[r.__key] != null,
      data: () => sourceDocs[r.__key],
    })),
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
  sourceDocs = {};
  userDocs = [
    { id: 'u-admin', email: 'secretar@primarie.ro', role: 'admin', active: true },
    { id: 'u-emp', email: 'angajat@primarie.ro', role: 'employee', active: true },
    { id: 'u-bad', email: 'not-an-email', role: 'employee', active: true },
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

  it('admins get everything; employees only their assignments', async () => {
    registruDocs = [
      entry(-3, { numarInregistrare: 'REG-2026-000001', cerereId: 'c1' }),
      entry(2, { numarInregistrare: 'REG-2026-000002', emailId: 'e1' }),
      entry(5, { numarInregistrare: 'REG-2026-000003', status: 'finalizat' }), // excluded
      entry(1, { numarInregistrare: 'REG-2026-000004', directie: 'iesire' }),  // excluded
    ];
    // the cerere is assigned to the employee; the email to nobody
    sourceDocs['form_submissions/c1'] = { assignedToUserId: 'u-emp' };
    sourceDocs['registratura_emails/e1'] = { assignedToUserId: null };

    const res = await GET(makeRequest(authed));
    const json = await res.json();
    expect(json).toMatchObject({ success: true, sent: 2, depasite: 1, apropiate: 1 });

    const adminEmail = sentEmails.find((e) => e.to === 'secretar@primarie.ro');
    expect(adminEmail.subject).toContain('1 depășite');
    expect(adminEmail.text).toContain('REG-2026-000001');
    expect(adminEmail.text).toContain('DEPĂȘIT cu 3 zile');
    expect(adminEmail.text).toContain('REG-2026-000002');
    expect(adminEmail.text).not.toContain('REG-2026-000003');
    expect(adminEmail.text).not.toContain('REG-2026-000004');

    const empEmail = sentEmails.find((e) => e.to === 'angajat@primarie.ro');
    expect(empEmail.text).toContain('repartizate ție');
    expect(empEmail.text).toContain('REG-2026-000001');
    expect(empEmail.text).not.toContain('REG-2026-000002');
  });

  it('employees with nothing assigned get no email', async () => {
    registruDocs = [entry(2, { numarInregistrare: 'REG-2026-000010' })];
    const res = await GET(makeRequest(authed));
    const json = await res.json();
    expect(json.sent).toBe(1); // only the admin
    expect(sentEmails.map((e) => e.to)).toEqual(['secretar@primarie.ro']);
  });

  it('sends nothing when there are no deadlines to report', async () => {
    registruDocs = [entry(3, { status: 'finalizat' })];
    const res = await GET(makeRequest(authed));
    const json = await res.json();
    expect(json).toMatchObject({ success: true, sent: 0 });
    expect(sentEmails).toHaveLength(0);
  });
});
