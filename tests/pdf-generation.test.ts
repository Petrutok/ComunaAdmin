import { describe, it, expect } from 'vitest';
import { generatePDF } from '@/lib/simple-pdf-generator';
import type { RequestData } from '@/lib/request-configs';
import { generateAdeverintaPDF } from '@/lib/pdf/generateAdeverintaPDF';
import { generateRaspunsPDF } from '@/lib/pdf/generateRaspunsPDF';

// Smoke tests: every PDF generator must produce a real PDF document.
// Guards jsPDF upgrades (the 3->4 bump happened for critical CVEs) -
// these fail loudly if an API we rely on changes shape.

// 1x1 PNG, stands in for the verification QR code
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const sampleCerere: RequestData = {
  numeComplet: 'Ion Popescu',
  nume: 'Popescu',
  prenume: 'Ion',
  cnp: '1900101040018',
  email: 'ion.popescu@example.com',
  telefon: '0740000000',
  judet: 'Bacău',
  localitate: 'Filipești',
  adresa: 'Str. Principală nr. 10',
  tipCerere: 'cerere-generala',
  scopulCererii: 'Solicitare adeverință pentru dosar — cu diacritice: ășțîâ',
};

describe('generatePDF (cerere, client-side)', () => {
  it('produces a valid PDF blob', async () => {
    const blob = await generatePDF(sampleCerere);
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('handles an unknown tipCerere via the fallback config', async () => {
    const blob = await generatePDF({ ...sampleCerere, tipCerere: 'tip-inexistent' });
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('generateAdeverintaPDF (server-side)', () => {
  it('produces a valid PDF buffer with QR and no signature', () => {
    const buffer = generateAdeverintaPDF({
      numarIesire: 'REG-2026-000042',
      dataEmiterii: new Date('2026-07-12'),
      tipLabel: 'Adeverință de rol agricol',
      body: 'Se adeverește prin prezenta că domnul Ion Popescu figurează în registrul agricol.',
      numeComplet: 'Ion Popescu',
      primarNume: 'Primar Test',
      localitate: 'PRIMĂRIA COMUNEI FILIPEȘTI',
      judet: 'Județul Bacău',
      semnaturaPngDataUrl: null,
      qrPngDataUrl: TINY_PNG,
      verifyUrl: 'https://primaria.digital/verifica?nr=REG-2026-000042&c=secret',
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('renders all three signature blocks (primar, secretar, intocmit)', () => {
    const buffer = generateAdeverintaPDF({
      numarIesire: 'REG-2026-000042',
      dataEmiterii: new Date('2026-07-12'),
      tipLabel: 'Adeverință de rol agricol',
      body: 'Text adeverință.',
      numeComplet: 'Ion Popescu',
      primarNume: 'Primar Test',
      localitate: 'PRIMĂRIA COMUNEI FILIPEȘTI',
      judet: 'Județul Bacău',
      semnaturaPngDataUrl: TINY_PNG,
      secretar: { nume: 'Maria Secretar', semnaturaPngDataUrl: TINY_PNG },
      intocmit: { nume: 'Vasile Responsabil', semnaturaPngDataUrl: TINY_PNG },
      qrPngDataUrl: TINY_PNG,
      verifyUrl: 'https://primaria.digital/verifica?nr=REG-2026-000042&c=secret',
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    // jsPDF standard fonts keep page text as readable strings in the stream
    const raw = buffer.toString('latin1');
    expect(raw).toContain('SECRETAR GENERAL');
    expect(raw).toContain('Intocmit: Vasile Responsabil');
  });
});

describe('generateRaspunsPDF (server-side)', () => {
  it('produces a valid PDF buffer', () => {
    const buffer = generateRaspunsPDF({
      numarIesire: 'REG-2026-000043',
      dataEmiterii: new Date('2026-07-12'),
      numarCerere: 'REG-2026-000005',
      body: 'Ca răspuns la cererea dumneavoastră, vă comunicăm următoarele: solicitarea a fost soluționată favorabil.',
      primarNume: 'Primar Test',
      localitate: 'PRIMĂRIA COMUNEI FILIPEȘTI',
      judet: 'Județul Bacău',
      semnaturaPngDataUrl: null,
      qrPngDataUrl: TINY_PNG,
      verifyUrl: 'https://primaria.digital/verifica?nr=REG-2026-000043&c=secret',
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
