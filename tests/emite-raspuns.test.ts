import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildRaspunsBody } from '@/lib/raspuns';

// The route runs on mocked Firebase so tests never touch production
// (a real issue burns an official outgoing registry number)
const savedFiles: { path: string; buffer: Buffer; contentType?: string }[] = [];
const added: Record<string, any[]> = {};
const updates: Record<string, any[]> = {};
let cerereData: any;
let registruData: any;

const mockBucket = {
  file: (path: string) => ({
    save: async (buffer: Buffer, opts?: { contentType?: string }) => {
      savedFiles.push({ path, buffer, contentType: opts?.contentType });
    },
    download: async () => {
      throw new Error('no signature configured');
    },
  }),
};

const mockDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data = name === 'registru_general' ? registruData : cerereData;
        return {
          exists: data != null,
          data: () => data,
          ref: {
            update: async (patch: any) => {
              (updates[`${name}/${id}`] ||= []).push(patch);
            },
          },
        };
      },
      update: async (patch: any) => {
        (updates[`${name}/${id}`] ||= []).push(patch);
      },
    }),
    add: async (data: any) => {
      (added[name] ||= []).push(data);
      return { id: `${name}-added` };
    },
  }),
  doc: (path: string) => ({
    get: async () => ({ data: () => ({}) }),
  }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => mockDb,
  getAdminBucket: () => mockBucket,
}));
vi.mock('@/lib/generateRegistruNumberAdmin', () => ({
  generateRegistruNumberAdmin: async () => 'REG-2026-000099',
}));
vi.mock('@/lib/api-auth', () => ({
  verifyStaffRequest: async () => ({ authorized: true, uid: 'admin-1', email: 'primar@test.ro' }),
}));
vi.mock('firebase-admin/storage', () => ({
  getDownloadURL: async () => 'https://storage.example/raspuns.pdf?token=abc',
}));
const sentEmails: any[] = [];
vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: any) => {
    sentEmails.push(opts);
    return true;
  },
}));

import { POST } from '@/app/api/emite-raspuns/route';

function makeRequest(body: any) {
  return new Request('http://localhost/api/emite-raspuns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  savedFiles.length = 0;
  sentEmails.length = 0;
  for (const k of Object.keys(added)) delete added[k];
  for (const k of Object.keys(updates)) delete updates[k];
  registruData = null;
  cerereData = {
    numeComplet: 'Ion Popescu',
    email: 'ion@example.com',
    tipCerere: 'cerere-generala',
    numarInregistrare: 'REG-2026-000010',
    registruDocId: 'registru-intrare-1',
    citizenUid: 'citizen-1',
  };
});

describe('POST /api/emite-raspuns', () => {
  it('issues the response: PDF in Storage, links, registry iesire linked to intrare', async () => {
    const res = await POST(makeRequest({ cerereId: 'c1', continut: 'Vă comunicăm soluționarea.' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.numarIesire).toBe('REG-2026-000099');

    // PDF uploaded
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0].path).toBe('raspunsuri/c1/REG-2026-000099.pdf');
    expect(savedFiles[0].contentType).toBe('application/pdf');
    expect(savedFiles[0].buffer.subarray(0, 4).toString()).toBe('%PDF');

    // verification record reuses the /verifica flow
    const verif = added['adeverinte_emise'][0];
    expect(verif.numarIesire).toBe('REG-2026-000099');
    expect(verif.tip).toBe('raspuns-oficial');
    expect(verif.cod).toMatch(/^[0-9a-f]{16}$/);

    // cerere resolved + raspuns linked
    const cererePatch = updates['form_submissions/c1'][0];
    expect(cererePatch.status).toBe('rezolvat');
    expect(cererePatch.raspuns.numarIesire).toBe('REG-2026-000099');
    expect(cererePatch.raspuns.downloadURL).toContain('token=abc');

    // registry: iesire entry linked to the intrare, intrare closed
    const iesire = added['registru_general'][0];
    expect(iesire.directie).toBe('iesire');
    expect(iesire.sursa).toBe('raspuns');
    expect(iesire.raspunsLaDocId).toBe('registru-intrare-1');
    expect(iesire.raspunsLaNumar).toBe('REG-2026-000010');
    const intrarePatch = updates['registru_general/registru-intrare-1'][0];
    expect(intrarePatch.status).toBe('finalizat');
    expect(intrarePatch.raspunsNumar).toBe('REG-2026-000099');
  });

  it('supports a motivated rejection (status respins)', async () => {
    const res = await POST(
      makeRequest({ cerereId: 'c1', continut: 'Cererea se respinge motivat.', status: 'respins' })
    );
    expect((await res.json()).status).toBe('respins');
    expect(updates['form_submissions/c1'][0].status).toBe('respins');
  });

  it('refuses a second response for the same cerere', async () => {
    cerereData.raspuns = { downloadURL: 'https://exists' };
    const res = await POST(makeRequest({ cerereId: 'c1', continut: 'alt răspuns' }));
    expect(res.status).toBe(409);
    expect(savedFiles).toHaveLength(0);
  });

  it('rejects empty content', async () => {
    const res = await POST(makeRequest({ cerereId: 'c1', continut: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing cerere', async () => {
    cerereData = null;
    const res = await POST(makeRequest({ cerereId: 'nope', continut: 'text' }));
    expect(res.status).toBe(404);
  });

  it('does not email directly for cereri (notify-status-change handles delivery)', async () => {
    const res = await POST(makeRequest({ cerereId: 'c1', continut: 'Răspuns.' }));
    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(0);
  });
});

describe('POST /api/emite-raspuns for registry entries (email/manual)', () => {
  beforeEach(() => {
    registruData = {
      numarInregistrare: 'REG-2026-000020',
      directie: 'intrare',
      emitent: 'Maria Ionescu',
      adresaEmitent: 'Str. Teiului 5, Filipești',
      emailEmitent: 'maria@example.com',
      emailId: 'email-imap-1',
      sursa: 'email',
    };
  });

  it('issues the response and emails the PDF to the sender', async () => {
    const res = await POST(makeRequest({ registruDocId: 'r1', continut: 'Vă răspundem.' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.numarIesire).toBe('REG-2026-000099');
    expect(json.emailSent).toBe(true);

    // PDF stored under the registry path
    expect(savedFiles[0].path).toBe('raspunsuri/registru/r1/REG-2026-000099.pdf');

    // emailed with the PDF attached
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('maria@example.com');
    expect(sentEmails[0].attachments[0].filename).toBe('REG-2026-000099.pdf');
    expect(sentEmails[0].attachments[0].content.subarray(0, 4).toString()).toBe('%PDF');

    // iesire linked to the intrare; intrare closed
    const iesire = added['registru_general'][0];
    expect(iesire.raspunsLaDocId).toBe('r1');
    expect(iesire.raspunsLaNumar).toBe('REG-2026-000020');
    expect(iesire.destinatar).toBe('Maria Ionescu');
    expect(updates['registru_general/r1'][0].raspunsNumar).toBe('REG-2026-000099');

    // IMAP email doc marked resolved
    expect(updates['registratura_emails/email-imap-1'][0].status).toBe('rezolvat');
  });

  it('refuses a second response for the same entry', async () => {
    registruData.raspunsNumar = 'REG-2026-000050';
    const res = await POST(makeRequest({ registruDocId: 'r1', continut: 'alt răspuns' }));
    expect(res.status).toBe(409);
  });

  it('refuses iesire entries', async () => {
    registruData.directie = 'iesire';
    const res = await POST(makeRequest({ registruDocId: 'r1', continut: 'text' }));
    expect(res.status).toBe(400);
  });

  it('redirects online cereri entries to the cereri flow', async () => {
    registruData.cerereId = 'c1';
    const res = await POST(makeRequest({ registruDocId: 'r1', continut: 'text' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Admin → Cereri');
  });
});

describe('buildRaspunsBody', () => {
  it('references the incoming number, date and subject', () => {
    const body = buildRaspunsBody({
      numeComplet: 'Ion Popescu',
      adresa: 'Str. Principală 1, Filipești',
      numarCerere: 'REG-2026-000010',
      dataCerere: '01.07.2026',
      tipCerere: 'Cerere generală',
    });
    expect(body).toContain('Către: Ion Popescu');
    expect(body).toContain('nr. REG-2026-000010 din data de 01.07.2026');
    expect(body).toContain('având ca obiect Cerere generală');
    expect(body).toContain('[ Completați răspunsul instituției ]');
    expect(body).toContain('Ordonanței Guvernului nr. 27/2002');
  });

  it('degrades gracefully without optional data', () => {
    const body = buildRaspunsBody({ numeComplet: 'Ion Popescu' });
    expect(body).toContain('Ca urmare a cererii dumneavoastră,');
    expect(body).not.toContain('Adresa:');
  });
});
