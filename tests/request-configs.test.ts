import { describe, it, expect } from 'vitest';
import { REQUEST_CONFIGS } from '@/lib/request-configs';
import { generatePDF } from '@/lib/simple-pdf-generator';
import type { RequestData } from '@/lib/request-configs';

// Every request type must be fully described: the generated petition PDF
// relies on `obiect` for its formal wording, and the admin/citizen UIs on
// title + category. Guards the "new form types go in three places" rule
// at least for the config side.

const VALID_CATEGORIES = [
  'adeverinte',
  'general',
  'urbanism',
  'asistenta-sociala',
  'registru-agricol',
  'taxe-impozite',
  'spclep',
];

describe('REQUEST_CONFIGS', () => {
  const entries = Object.entries(REQUEST_CONFIGS);

  it('has a reasonable number of request types', () => {
    expect(entries.length).toBeGreaterThanOrEqual(40);
  });

  it.each(entries)('%s is fully described', (_key, config) => {
    expect(config.title, 'title missing').toBeTruthy();
    expect(VALID_CATEGORIES, `unknown category ${config.category}`).toContain(config.category);
    expect(config.obiect, 'obiect (formal request wording) missing').toBeTruthy();
    // Formal object phrases flow after "vă solicit respectuos ..." -
    // they must not start with a capital letter or end with punctuation
    expect(config.obiect[0]).toBe(config.obiect[0].toLowerCase());
    expect(config.obiect.endsWith('.')).toBe(false);
  });
});

describe('generatePDF with the formal petition layout', () => {
  const base: RequestData = {
    numeComplet: 'Maria Ionescu',
    nume: 'Ionescu',
    prenume: 'Maria',
    cnp: '2900101040011',
    email: 'maria@example.com',
    telefon: '0740000001',
    judet: 'Bacău',
    localitate: 'Filipești',
    adresa: 'Str. Principală nr. 5',
    tipCerere: 'atestat-producator',
    scopulCererii: 'Comercializez legume din grădina proprie în piața din Bacău.',
  };

  it('renders a new request type end-to-end', async () => {
    const blob = await generatePDF(base);
    const bytes = Buffer.from(await blob.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const raw = bytes.toString('latin1');
    expect(raw).toContain('DOMNULE PRIMAR');
    expect(raw).toContain('va solicit respectuos');
  });

  it('renders every configured type without crashing', async () => {
    for (const tipCerere of Object.keys(REQUEST_CONFIGS)) {
      const blob = await generatePDF({ ...base, tipCerere });
      expect(blob.size).toBeGreaterThan(1000);
    }
  });
});
