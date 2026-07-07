// lib/tenant.ts
// Single source of truth for the commune identity (multi-tenancy).
//
// Architecture: each commune runs its own isolated deployment (own Firebase
// project + own Vercel project + own domain) built from THIS shared codebase.
// Everything commune-specific comes from NEXT_PUBLIC_TENANT_* env vars set
// per Vercel project; the values below are the Filipești defaults so local
// dev keeps working without extra setup.
//
// NEXT_PUBLIC_* vars are inlined at build time, so they're available in both
// server and client code. Onboarding a new commune = new env values + assets
// (logo), zero code changes. See docs/TENANT_ONBOARDING.md.

export const TENANT = {
  /** "Comuna X" - shown under the app title on the homepage */
  numeComuna: process.env.NEXT_PUBLIC_TENANT_COMUNA || 'Comuna Filipești',

  /** "Primăria X" - shown in footers, emails, metadata */
  numePrimarie: process.env.NEXT_PUBLIC_TENANT_PRIMARIE || 'Primăria Filipești',

  /** Official letterhead line for PDFs: "PRIMĂRIA COMUNEI X" */
  antetOficial: process.env.NEXT_PUBLIC_TENANT_ANTET || 'PRIMĂRIA COMUNEI FILIPEȘTI',

  /** "Județul X" - letterhead second line */
  judet: process.env.NEXT_PUBLIC_TENANT_JUDET || 'Județul Bacău',

  /** Public contact shown on documents and pages */
  telefon: process.env.NEXT_PUBLIC_TENANT_TELEFON || '0234/256.789',
  email: process.env.NEXT_PUBLIC_TENANT_EMAIL || 'contact@primariafilipesti.ro',

  /** Production URL of this tenant's deployment */
  siteUrl: process.env.NEXT_PUBLIC_API_URL || 'https://primaria.digital',

  /** Commune coat of arms / logo. Absolute URL (e.g. Firebase Storage) or
   *  repo asset path; defaults to the bundled logo for local dev. */
  logoUrl: process.env.NEXT_PUBLIC_TENANT_LOGO_URL || '/logo.jpg',
} as const;

/**
 * Fallback admin emails for the client-side login gate ONLY.
 * Real authorization lives in the `users` collection (checked by API routes
 * and Firestore rules). Comma-separated in NEXT_PUBLIC_FALLBACK_ADMIN_EMAILS.
 */
export const FALLBACK_ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_FALLBACK_ADMIN_EMAILS || 'admin@primaria.ro,primar@filipesti.ro'
)
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
