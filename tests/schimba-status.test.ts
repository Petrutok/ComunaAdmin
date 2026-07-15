import { describe, it, expect, vi, beforeEach } from 'vitest';

// /api/schimba-status is the single persistent event for staff status
// changes: update + registry sync + audit entry + citizen notification,
// all server-side. These tests pin that contract.

const updates: Record<string, any[]> = {};
const istoricEntries: any[] = [];
let cerereData: any;
let issueData: any;
let registruData: any;

const mockDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data =
          name === 'form_submissions'
            ? cerereData
            : name === 'reported_issues'
            ? issueData
            : name === 'registru_general'
            ? registruData
            : name === 'users'
            ? { fullName: 'Ana Funcționar' }
            : null;
        return { exists: data != null, data: () => data };
      },
      update: async (patch: any) => {
        (updates[`${name}/${id}`] ||= []).push(patch);
      },
      collection: (sub: string) => ({
        add: async (entry: any) => {
          if (sub === 'istoric') istoricEntries.push(entry);
          return { id: 'sub-added' };
        },
      }),
    }),
  }),
  doc: () => ({ get: async () => ({ data: () => ({}) }) }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => mockDb,
  getAdminBucket: () => null,
}));
vi.mock('@/lib/api-auth', () => ({
  verifyStaffRequest: async () => ({
    authorized: true,
    uid: 'staff-1',
    email: 'ana@primarie.ro',
    role: 'employee',
  }),
}));
const sentEmails: any[] = [];
vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: any) => {
    sentEmails.push(opts);
    return true;
  },
  isValidEmail: (e: string) => typeof e === 'string' && e.includes('@'),
}));

import { POST } from '@/app/api/schimba-status/route';

function makeRequest(body: any) {
  return new Request('http://localhost/api/schimba-status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  for (const k of Object.keys(updates)) delete updates[k];
  istoricEntries.length = 0;
  sentEmails.length = 0;
  registruData = { termen: null, status: 'nou' };
  cerereData = {
    status: 'in_lucru',
    numeComplet: 'Ion Popescu',
    email: 'ion@example.com',
    numarInregistrare: 'REG-2026-000010',
    registruDocId: 'reg-1',
  };
  issueData = {
    status: 'noua',
    reporterName: 'Maria',
    reporterContact: 'maria@example.com',
    reportId: 'RAPORT-2026-0005',
  };
});

describe('POST /api/schimba-status (cereri)', () => {
  it('updates status, finalizes the registry entry, logs istoric and emails the citizen', async () => {
    const res = await POST(
      makeRequest({
        collection: 'form_submissions',
        docId: 'c1',
        newStatus: 'rezolvat',
        observatii: 'Soluționat la ghișeu',
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const patch = updates['form_submissions/c1'][0];
    expect(patch.status).toBe('rezolvat');
    expect(patch.observatii).toBe('Soluționat la ghișeu');

    // closed status finalizes the linked registry entry
    expect(updates['registru_general/reg-1'][0].status).toBe('finalizat');

    // audit entry with actor + old->new labels
    expect(istoricEntries).toHaveLength(1);
    expect(istoricEntries[0].autorNume).toBe('Ana Funcționar');
    expect(istoricEntries[0].mesaj).toContain('→');
    expect(istoricEntries[0].mesaj).toContain('Soluționat la ghișeu');

    // notification sent server-side
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('ion@example.com');
  });

  it('suspends the legal deadline on necesita_completare', async () => {
    await POST(
      makeRequest({ collection: 'form_submissions', docId: 'c1', newStatus: 'necesita_completare' })
    );
    const regPatch = updates['registru_general/reg-1'][0];
    expect(regPatch.termen).toBeNull();
    expect(regPatch.status).toBe('in_lucru');
  });

  it('requires the target institution for redirectionat', async () => {
    const res = await POST(
      makeRequest({ collection: 'form_submissions', docId: 'c1', newStatus: 'redirectionat' })
    );
    expect(res.status).toBe(400);
    expect(updates['form_submissions/c1']).toBeUndefined();
  });

  it('rejects statuses that do not exist for the collection', async () => {
    const res = await POST(
      makeRequest({ collection: 'form_submissions', docId: 'c1', newStatus: 'rezolvata' })
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/schimba-status (sesizări)', () => {
  it('sets resolvedAt on rezolvata and notifies the reporter', async () => {
    const res = await POST(
      makeRequest({ collection: 'reported_issues', docId: 'i1', newStatus: 'rezolvata' })
    );
    expect(res.status).toBe(200);
    const patch = updates['reported_issues/i1'][0];
    expect(patch.status).toBe('rezolvata');
    expect(patch.resolvedAt).toBeTruthy();
    // issues have no istoric subcollection
    expect(istoricEntries).toHaveLength(0);
    expect(sentEmails[0].to).toBe('maria@example.com');
    expect(sentEmails[0].subject).toContain('RAPORT-2026-0005');
  });

  it('returns 404 for a missing document', async () => {
    issueData = null;
    const res = await POST(
      makeRequest({ collection: 'reported_issues', docId: 'nope', newStatus: 'in_lucru' })
    );
    expect(res.status).toBe(404);
  });
});
