import { describe, it, expect } from 'vitest';
import { evalueazaReguli, RegulaRepartizare } from '@/lib/repartizare';

// The rule engine decides where an incoming cerere is routed. It must be
// order-sensitive (first match wins), AND across conditions, tolerant of
// missing/disabled rules, and return null when nothing matches (so the
// request stays unassigned - the backward-compatible default).

const rule = (r: Partial<RegulaRepartizare>): RegulaRepartizare => ({
  match: {},
  assign: { departmentId: 'd', departmentName: 'Dept', userId: null, userName: null },
  ...r,
});

describe('evalueazaReguli', () => {
  it('returns null with no rules (unassigned, as before)', () => {
    expect(evalueazaReguli(undefined, { tipCerere: 'x' })).toBeNull();
    expect(evalueazaReguli([], { tipCerere: 'x' })).toBeNull();
  });

  it('matches on tipCerere', () => {
    const reguli = [
      rule({ match: { tipCerere: 'adeverinta-apia' }, assign: { departmentId: 'agri', departmentName: 'Agricol', userId: 'u1', userName: 'Ana' } }),
    ];
    const hit = evalueazaReguli(reguli, { tipCerere: 'adeverinta-apia', category: 'adeverinte' });
    expect(hit?.departmentName).toBe('Agricol');
    expect(hit?.userName).toBe('Ana');
    expect(evalueazaReguli(reguli, { tipCerere: 'cerere-generala' })).toBeNull();
  });

  it('first matching rule wins (order matters)', () => {
    const reguli = [
      rule({ match: { category: 'adeverinte' }, assign: { departmentId: 'a', departmentName: 'Prima', userId: null, userName: null } }),
      rule({ match: { tipCerere: 'adeverinta-apia' }, assign: { departmentId: 'b', departmentName: 'A doua', userId: null, userName: null } }),
    ];
    expect(evalueazaReguli(reguli, { tipCerere: 'adeverinta-apia', category: 'adeverinte' })?.departmentName).toBe('Prima');
  });

  it('requires ALL specified conditions to match (AND)', () => {
    const reguli = [
      rule({ match: { tipCerere: 'adeverinta-apia', category: 'greșit' } }),
    ];
    expect(evalueazaReguli(reguli, { tipCerere: 'adeverinta-apia', category: 'adeverinte' })).toBeNull();
  });

  it('an empty match is a catch-all (useful as last rule)', () => {
    const reguli = [
      rule({ match: { tipCerere: 'ceva-anume' }, assign: { departmentId: 'a', departmentName: 'Special', userId: null, userName: null } }),
      rule({ match: {}, assign: { departmentId: 'reg', departmentName: 'Registratură', userId: null, userName: null } }),
    ];
    expect(evalueazaReguli(reguli, { tipCerere: 'orice-altceva' })?.departmentName).toBe('Registratură');
  });

  it('skips disabled rules', () => {
    const reguli = [
      rule({ match: { tipCerere: 'x' }, activa: false, assign: { departmentId: 'a', departmentName: 'Dezactivat', userId: null, userName: null } }),
      rule({ match: { tipCerere: 'x' }, assign: { departmentId: 'b', departmentName: 'Activ', userId: null, userName: null } }),
    ];
    expect(evalueazaReguli(reguli, { tipCerere: 'x' })?.departmentName).toBe('Activ');
  });
});
