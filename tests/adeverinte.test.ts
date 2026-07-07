import { describe, it, expect } from 'vitest';
import {
  isAdeverintaType,
  buildAdeverintaBody,
  ADEVERINTA_TYPES,
  ADEVERINTA_LABELS,
} from '@/lib/adeverinte';

const citizen = {
  numeComplet: 'Ion Popescu',
  cnp: '1234567890123',
  adresa: 'Str. Principală nr. 10, Filipești',
  scopulCererii: 'pentru notariat',
};

describe('isAdeverintaType', () => {
  it('recognizes all certificate types', () => {
    for (const tip of ADEVERINTA_TYPES) {
      expect(isAdeverintaType(tip)).toBe(true);
    }
  });

  it('rejects other request types', () => {
    expect(isAdeverintaType('cerere-generala')).toBe(false);
    expect(isAdeverintaType('certificat-urbanism')).toBe(false);
    expect(isAdeverintaType('')).toBe(false);
  });
});

describe('buildAdeverintaBody', () => {
  it('every type produces a body containing the citizen identity', () => {
    for (const tip of ADEVERINTA_TYPES) {
      const body = buildAdeverintaBody(tip, citizen);
      expect(body).toContain(citizen.numeComplet);
      expect(body).toContain(citizen.cnp);
      expect(body).toContain(citizen.adresa);
    }
  });

  it('includes the stated purpose when provided', () => {
    const body = buildAdeverintaBody('adeverinta-rol-agricol', citizen);
    expect(body).toContain('pentru notariat');
  });

  it('falls back to a generic purpose when none is given', () => {
    const body = buildAdeverintaBody('adeverinta-rol-agricol', { ...citizen, scopulCererii: undefined });
    expect(body).toContain('pentru a-i servi la nevoie');
  });

  it('templates with record data leave [ ... ] placeholders for the clerk', () => {
    expect(buildAdeverintaBody('adeverinta-rol-agricol', citizen)).toContain('[ ... ]');
    expect(buildAdeverintaBody('adeverinta-apia', citizen)).toContain('[ ... ]');
  });

  it('every type has a label', () => {
    for (const tip of ADEVERINTA_TYPES) {
      expect(ADEVERINTA_LABELS[tip]).toBeTruthy();
    }
  });
});
