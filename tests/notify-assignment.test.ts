import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocked Firebase + push: tests never touch production data
let docData: any;

const mockDb = {
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: docData != null, data: () => docData }),
    }),
  }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => mockDb,
}));
vi.mock('@/lib/api-auth', () => ({
  verifyStaffRequest: async () => ({ authorized: true, uid: 'u-primar', role: 'admin' }),
}));
const pushes: { uid: string; payload: any }[] = [];
vi.mock('@/lib/push', () => ({
  sendPushToUid: async (_db: any, uid: string, payload: any) => {
    pushes.push({ uid, payload });
    return 1;
  },
}));

import { POST } from '@/app/api/notify-assignment/route';

function makeRequest(body: any) {
  return new Request('http://localhost/api/notify-assignment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  pushes.length = 0;
  docData = {
    numarInregistrare: 'REG-2026-000030',
    tipCerere: 'cerere-generala',
    subject: 'Sesizare drum',
  };
});

describe('POST /api/notify-assignment', () => {
  it('pushes to the assigned employee with the cerere reference', async () => {
    const res = await POST(
      makeRequest({ collection: 'form_submissions', docId: 'c1', assignedToUserId: 'u-emp' })
    );
    expect(res.status).toBe(200);
    expect(pushes).toHaveLength(1);
    expect(pushes[0].uid).toBe('u-emp');
    expect(pushes[0].payload.title).toBe('Cerere repartizată ție');
    expect(pushes[0].payload.body).toContain('REG-2026-000030');
    expect(pushes[0].payload.url).toBe('/admin/cereri');
  });

  it('uses the email subject and registratura URL for emails', async () => {
    const res = await POST(
      makeRequest({ collection: 'registratura_emails', docId: 'e1', assignedToUserId: 'u-emp' })
    );
    expect(res.status).toBe(200);
    expect(pushes[0].payload.title).toBe('Email repartizat ție');
    expect(pushes[0].payload.body).toContain('Sesizare drum');
    expect(pushes[0].payload.url).toBe('/admin/registratura');
  });

  it('skips self-assignment', async () => {
    const res = await POST(
      makeRequest({ collection: 'form_submissions', docId: 'c1', assignedToUserId: 'u-primar' })
    );
    expect((await res.json()).skipped).toBe('self-assignment');
    expect(pushes).toHaveLength(0);
  });

  it('rejects unknown collections', async () => {
    const res = await POST(
      makeRequest({ collection: 'users', docId: 'x', assignedToUserId: 'u-emp' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing document', async () => {
    docData = null;
    const res = await POST(
      makeRequest({ collection: 'form_submissions', docId: 'gone', assignedToUserId: 'u-emp' })
    );
    expect(res.status).toBe(404);
  });
});
