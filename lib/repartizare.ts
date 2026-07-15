// Auto-repartizare: minimal, extensible rule engine for routing incoming
// cereri to a department/responsabil at creation time.
//
// Client-safe (pure logic + types). Rules live in Firestore at
// config/reguli_repartizare ({ reguli: RegulaRepartizare[] }), managed in
// Admin -> Departamente, and are applied server-side by /api/trimite-cerere.
//
// Engine contract, designed so it can grow WITHOUT structural changes:
// - rules are evaluated in array order; the FIRST rule whose every
//   specified condition matches wins;
// - a condition is any key of `match` - matchers are generic, so adding
//   a new matchable field later (e.g. `emitentDomain` for registratura
//   emails) only means adding it to the context, not rewriting the engine;
// - a rule with an empty `match` matches everything (usable as fallback,
//   placed last).

export interface RegulaRepartizare {
  /** All specified conditions must match (AND). Empty = matches all. */
  match: {
    tipCerere?: string;
    category?: string;
    [key: string]: string | undefined;
  };
  assign: {
    departmentId: string | null;
    departmentName: string | null;
    userId?: string | null;
    userName?: string | null;
  };
  /** Rules can be kept but disabled */
  activa?: boolean;
}

export type RepartizareContext = Record<string, string | undefined>;

export const REGULI_REPARTIZARE_DOC = 'config/reguli_repartizare';

/**
 * Returns the assignment of the first active rule whose every specified
 * `match` condition equals the corresponding context value, or null when
 * no rule applies.
 */
export function evalueazaReguli(
  reguli: RegulaRepartizare[] | undefined | null,
  context: RepartizareContext
): RegulaRepartizare['assign'] | null {
  if (!Array.isArray(reguli)) return null;

  for (const regula of reguli) {
    if (regula?.activa === false) continue;
    const conditii = Object.entries(regula?.match || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    );
    const matches = conditii.every(([key, value]) => context[key] === value);
    if (matches && regula.assign) {
      return regula.assign;
    }
  }
  return null;
}
