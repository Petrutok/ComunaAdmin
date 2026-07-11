import { describe, it, expect, vi, beforeEach } from 'vitest';

// The route runs entirely on mocked Firebase so tests never touch
// production data (a real submission burns an official registry number)
const savedFiles: { path: string; buffer: Buffer; contentType?: string }[] = [];
const firestoreDocs: Record<string, any> = {};

const mockBucket = {
  file: (path: string) => ({
    save: async (buffer: Buffer, opts?: { contentType?: string }) => {
      savedFiles.push({ path, buffer, contentType: opts?.contentType });
    },
  }),
};

const mockDb = {
  collection: (name: string) => ({
    doc: () => {
      const id = `${name}-id`;
      return {
        id,
        set: async (data: any) => {
          firestoreDocs[id] = data;
        },
      };
    },
    add: async (data: any) => {
      const id = `${name}-added`;
      firestoreDocs[id] = data;
      return {
        id,
        update: async (patch: any) => {
          Object.assign(firestoreDocs[id], patch);
        },
      };
    },
  }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => mockDb,
  getAdminBucket: () => mockBucket,
}));
vi.mock('@/lib/generateRegistruNumberAdmin', () => ({
  generateRegistruNumberAdmin: async () => 'REG-2026-000001',
}));
vi.mock('@/lib/api-auth', () => ({
  getOptionalCitizenUid: async () => null,
}));

import { POST } from '@/app/api/trimite-cerere/route';

const validBody = {
  numeComplet: 'Ion Popescu',
  nume: 'Ion',
  prenume: 'Popescu',
  cnp: '1900101223344',
  email: 'ion@example.com',
  judet: 'Bacău',
  localitate: 'Filipești',
  strada: 'Principală',
  adresa: 'Str. Principală',
  tipCerere: 'cerere-generala',
  scopulCererii: 'test',
};

function makeRequest(body: any) {
  return new Request('http://localhost/api/trimite-cerere', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // unique IP per call so the 5/hour rate limit never trips across tests
      'x-forwarded-for': `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  savedFiles.length = 0;
  for (const key of Object.keys(firestoreDocs)) delete firestoreDocs[key];
});

describe('POST /api/trimite-cerere attachments', () => {
  it('uploads attachments to Storage and stores their paths on the submission', async () => {
    const content = Buffer.from('fake pdf content');
    const res = await POST(
      makeRequest({
        ...validBody,
        fisiere: [
          { name: 'act identitate.pdf', type: 'application/pdf', content: content.toString('base64') },
        ],
      })
    );
    expect(res.status).toBe(201);

    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].path).toBe('cereri/form_submissions-id/1_act identitate.pdf');
    expect(savedFiles[0].buffer.equals(content)).toBe(true);
    expect(savedFiles[0].contentType).toBe('application/pdf');

    const submission = firestoreDocs['form_submissions-id'];
    expect(submission.fisiere).toEqual([
      {
        name: 'act identitate.pdf',
        type: 'application/pdf',
        size: content.length,
        storagePath: 'cereri/form_submissions-id/1_act identitate.pdf',
      },
    ]);
    expect(submission.numarInregistrare).toBe('REG-2026-000001');
  });

  it('accepts submissions without attachments', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    expect(savedFiles).toHaveLength(0);
    expect(firestoreDocs['form_submissions-id'].fisiere).toEqual([]);
  });

  it('sanitizes path characters out of file names', async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        fisiere: [
          { name: '../../etc/passwd', type: 'image/png', content: Buffer.from('x').toString('base64') },
        ],
      })
    );
    expect(res.status).toBe(201);
    expect(savedFiles[0].path).toBe('cereri/form_submissions-id/1_passwd');
  });

  it('rejects disallowed file types', async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        fisiere: [
          { name: 'virus.exe', type: 'application/x-msdownload', content: Buffer.from('x').toString('base64') },
        ],
      })
    );
    expect(res.status).toBe(400);
    expect(savedFiles).toHaveLength(0);
    expect(Object.keys(firestoreDocs)).toHaveLength(0);
  });

  it('rejects more than 3 attachments', async () => {
    const file = { name: 'a.pdf', type: 'application/pdf', content: Buffer.from('x').toString('base64') };
    const res = await POST(makeRequest({ ...validBody, fisiere: [file, file, file, file] }));
    expect(res.status).toBe(400);
    expect(savedFiles).toHaveLength(0);
  });

  it('rejects attachments over 3MB in total', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024, 1).toString('base64');
    const res = await POST(
      makeRequest({
        ...validBody,
        fisiere: [
          { name: 'a.pdf', type: 'application/pdf', content: big },
          { name: 'b.pdf', type: 'application/pdf', content: big },
        ],
      })
    );
    expect(res.status).toBe(413);
    expect(savedFiles).toHaveLength(0);
    expect(Object.keys(firestoreDocs)).toHaveLength(0);
  });

  it('still caps the non-file payload at 100KB', async () => {
    const res = await POST(makeRequest({ ...validBody, extra: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
  });
});
