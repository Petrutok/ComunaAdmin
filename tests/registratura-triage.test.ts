import { describe, it, expect } from 'vitest';
import { normalizeTriajResult } from '@/lib/registratura/ai-triage';

const DEPARTAMENTE = ['Urbanism', 'Taxe și impozite', 'Asistență socială'];

describe('normalizeTriajResult', () => {
  it('accepts a valid official classification with routing suggestions', () => {
    const result = normalizeTriajResult(
      {
        clasificare: 'oficial',
        motiv: 'Cerere de la cetățean',
        rezumat: 'Solicitare certificat de urbanism.',
        departamentSugerat: 'Urbanism',
        prioritateSugerata: 'normal',
        etichete: ['urbanism', 'certificat'],
      },
      DEPARTAMENTE
    );
    expect(result).toEqual({
      clasificare: 'oficial',
      motiv: 'Cerere de la cetățean',
      rezumat: 'Solicitare certificat de urbanism.',
      departamentSugerat: 'Urbanism',
      prioritateSugerata: 'normal',
      etichete: ['urbanism', 'certificat'],
    });
  });

  it('accepts spam and reclama classifications', () => {
    expect(normalizeTriajResult({ clasificare: 'spam', motiv: 'x' }, [])?.clasificare).toBe('spam');
    expect(normalizeTriajResult({ clasificare: 'reclama', motiv: 'x' }, [])?.clasificare).toBe('reclama');
  });

  it('rejects an unknown classification (falls back to heuristic)', () => {
    expect(normalizeTriajResult({ clasificare: 'poate', motiv: 'x' }, [])).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(normalizeTriajResult('nope', [])).toBeNull();
    expect(normalizeTriajResult(null, [])).toBeNull();
    expect(normalizeTriajResult(42, [])).toBeNull();
  });

  it('drops a suggested department that does not exist for this tenant', () => {
    const result = normalizeTriajResult(
      { clasificare: 'oficial', departamentSugerat: 'Departament Inexistent', prioritateSugerata: 'normal' },
      DEPARTAMENTE
    );
    expect(result?.departamentSugerat).toBeNull();
  });

  it('defaults an invalid priority to normal', () => {
    const result = normalizeTriajResult(
      { clasificare: 'oficial', prioritateSugerata: 'foarte-urgent' },
      DEPARTAMENTE
    );
    expect(result?.prioritateSugerata).toBe('normal');
  });

  it('caps tags at 3, lowercases and trims them', () => {
    const result = normalizeTriajResult(
      { clasificare: 'oficial', etichete: ['  Urbanism ', 'APIA', 'Taxe', 'Extra', ''] },
      DEPARTAMENTE
    );
    expect(result?.etichete).toEqual(['urbanism', 'apia', 'taxe']);
  });

  it('tolerates missing optional fields', () => {
    const result = normalizeTriajResult({ clasificare: 'oficial' }, DEPARTAMENTE);
    expect(result).toMatchObject({
      clasificare: 'oficial',
      motiv: '',
      rezumat: '',
      departamentSugerat: null,
      prioritateSugerata: 'normal',
      etichete: [],
    });
  });
});
