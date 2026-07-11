import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocked Firebase: tests never touch production data
const savedFiles: { path: string; buffer: Buffer }[] = [];
const updates: Record<string, any[]> = {};
let cerereData: any;
let currentUid: string | null = 'citizen-1';

const mockBucket = {
  file: (path: string) => ({
    save: async (buffer: Buffer) => {
      savedFiles.push({ path, buffer });
    },
  }),
};

const mockDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => ({
        exists: cerereData != null,
        data: () => cerereData,
      }),
      update: async (patch: any) => {
        (updates[`${name}/${id}`] ||= []).push(patch);
      },
    }),
  }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => mockDb,
  getAdminBucket: () => mockBucket,
}));
vi.mock('@/lib/api-auth', () => ({
  getOptionalCitizenUid: async () => currentUid,
}));

import { POST } from '@/app/api/completeaza-cerere/route';

const file = { name: 'buletin.pdf', type: 'application/pdf', content: Buffer.from('pdf').toString('base64') };

function makeRequest(body: any) {
  return new Request('http://localhost/api/completeaza-cerere', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.1.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  savedFiles.length = 0;
  for (const k of Object.keys(updates)) delete updates[k];
  currentUid = 'citizen-1';
  cerereData = {
    citizenUid: 'citizen-1',
    status: 'necesita_completare',
    registruDocId: 'registru-1',
    fisiere: [{ name: 'existent.pdf', type: 'application/pdf', size: 10, storagePath: 'cereri/c1/1_existent.pdf' }],
  };
});

describe('POST /api/completeaza-cerere', () => {
  it('appends the documents, resumes processing and restarts the legal deadline', async () => {
    const res = await POST(makeRequest({ cerereId: 'c1', fisiere: [file] }));
    expect(res.status).toBe(200);

    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].path).toMatch(/^cereri\/c1\/completare_\d+_1_buletin\.pdf$/);

    const patch = updates['form_submissions/c1'][0];
    expect(patch.status).toBe('in_lucru');
    expect(patch.fisiere).toHaveLength(2);
    expect(patch.fisiere[0].name).toBe('existent.pdf');
    expect(patch.fisiere[1].name).toBe('buletin.pdf');
    expect(patch.fisiere[1].storagePath).toBe(savedFiles[0].path);

    const registruPatch = updates['registru_general/registru-1'][0];
    expect(registruPatch.status).toBe('in_lucru');
    // deadline restarted: ~30 days from now
    const days = (registruPatch.termen.toMillis() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('requires authentication', async () => {
    currentUid = null;
    const res = await POST(makeRequest({ cerereId: 'c1', fisiere: [file] }));
    expect(res.status).toBe(401);
    expect(savedFiles).toHaveLength(0);
  });

  it('refuses another citizen\'s cerere', async () => {
    currentUid = 'citizen-2';
    const res = await POST(makeRequest({ cerereId: 'c1', fisiere: [file] }));
    expect(res.status).toBe(403);
    expect(savedFiles).toHaveLength(0);
  });

  it('refuses a cerere that is not waiting for documents', async () => {
    cerereData.status = 'in_lucru';
    const res = await POST(makeRequest({ cerereId: 'c1', fisiere: [file] }));
    expect(res.status).toBe(409);
  });

  it('requires at least one file', async () => {
    const res = await POST(makeRequest({ cerereId: 'c1', fisiere: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects disallowed file types', async () => {
    const res = await POST(
      makeRequest({ cerereId: 'c1', fisiere: [{ name: 'x.exe', type: 'application/x-msdownload', content: 'YQ==' }] })
    );
    expect(res.status).toBe(400);
  });
});
