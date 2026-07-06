// lib/adeverinte.ts
// Shared definitions for digitally issued certificates (adeverinte):
// which form types are certificates and the default legal body text the
// clerk starts from when issuing one.

export const ADEVERINTA_TYPES = [
  'adeverinta-rol-agricol',
  'adeverinta-apia',
  'adeverinta-domiciliu',
  'adeverinta-ajutor-social',
  'adeverinta-fara-datorii',
] as const;

export type AdeverintaType = (typeof ADEVERINTA_TYPES)[number];

export function isAdeverintaType(tipCerere: string): tipCerere is AdeverintaType {
  return (ADEVERINTA_TYPES as readonly string[]).includes(tipCerere);
}

export const ADEVERINTA_LABELS: Record<AdeverintaType, string> = {
  'adeverinta-rol-agricol': 'Adeverință de rol agricol',
  'adeverinta-apia': 'Adeverință pentru APIA',
  'adeverinta-domiciliu': 'Adeverință de domiciliu / componență familie',
  'adeverinta-ajutor-social': 'Adeverință ajutor social / alocație',
  'adeverinta-fara-datorii': 'Adeverință fără datorii la bugetul local',
};

interface CitizenData {
  numeComplet: string;
  cnp: string;
  adresa: string;
  scopulCererii?: string;
}

/**
 * Default certificate body per type. The clerk sees this text prefilled in
 * the issuing dialog, completes the [ ... ] placeholders with data from the
 * official records (registrul agricol, rol fiscal) and can edit freely
 * before issuing.
 */
export function buildAdeverintaBody(tip: AdeverintaType, c: CitizenData): string {
  const intro = `Se adeverește prin prezenta că domnul/doamna ${c.numeComplet}, CNP ${c.cnp}, cu domiciliul în ${c.adresa},`;
  const scop = c.scopulCererii
    ? `\n\nPrezenta adeverință se eliberează pentru: ${c.scopulCererii}.`
    : '\n\nPrezenta adeverință se eliberează la cererea solicitantului, pentru a-i servi la nevoie.';

  switch (tip) {
    case 'adeverinta-rol-agricol':
      return (
        `${intro} figurează înscris(ă) în registrul agricol al comunei, ` +
        `volumul [ ... ], poziția de rol nr. [ ... ], cu următoarele bunuri:\n\n` +
        `- Teren agricol: [ ... ] ha, din care arabil [ ... ] ha\n` +
        `- Animale: [ ... ]${scop}`
      );
    case 'adeverinta-apia':
      return (
        `${intro} figurează înscris(ă) în registrul agricol al comunei cu ` +
        `suprafața totală de [ ... ] ha teren agricol, situat pe raza comunei, ` +
        `după cum urmează:\n\n- Parcela [ ... ]: [ ... ] ha, categoria de folosință [ ... ]\n\n` +
        `Prezenta adeverință se eliberează pentru dosarul de subvenții APIA, campania ${new Date().getFullYear()}.`
      );
    case 'adeverinta-domiciliu':
      return (
        `${intro} are domiciliul stabil pe raza comunei.\n\n` +
        `Gospodăria este compusă din următoarele persoane:\n- [ nume, CNP, calitate ]${scop}`
      );
    case 'adeverinta-ajutor-social':
      return (
        `${intro} [ beneficiază / nu beneficiază ] de ajutor social conform ` +
        `Legii nr. 416/2001, [ detalii beneficiu: tip, cuantum, perioada ].${scop}`
      );
    case 'adeverinta-fara-datorii':
      return (
        `${intro} nu figurează cu debite restante (impozite, taxe locale sau ` +
        `alte obligații) la bugetul local al comunei, la data eliberării prezentei.${scop}`
      );
  }
}
