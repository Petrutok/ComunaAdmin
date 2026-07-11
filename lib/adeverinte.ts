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
  /** Registry number of the citizen's request (intrare) - referenced in the
   *  certificate preamble, as official documents do */
  numarCerere?: string;
  /** Date the request was registered (already formatted, dd.mm.yyyy) */
  dataCerere?: string;
}

/**
 * Addresses arriving from online forms often contain empty segments
 * ("Nr. -, Bl. -, Sc. -, Et. -, Ap. -"). Strip them so the certificate
 * reads cleanly: "Str. Principală, Nr. 10, Filipești".
 */
export function cleanAdresa(adresa: string): string {
  return adresa
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^(Nr|Bl|Sc|Et|Ap)\.?\s*[-–]?$/i.test(part))
    .join(', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Default certificate body per type, in formal Romanian administrative
 * style: preamble referencing the registered request and the legal basis,
 * the attestation itself, then the standard closing formulas. The clerk
 * completes the [ ... ] placeholders from the official records (registrul
 * agricol, rolul fiscal) and can edit freely before issuing.
 */
export function buildAdeverintaBody(tip: AdeverintaType, c: CitizenData): string {
  const adresa = cleanAdresa(c.adresa);

  // Preamble: reference to the registered request + legal basis per type
  const cerereRef = c.numarCerere
    ? `cererea înregistrată sub nr. ${c.numarCerere}${c.dataCerere ? ` din data de ${c.dataCerere}` : ''}`
    : 'cererea depusă de solicitant';

  const TEMEI: Record<AdeverintaType, string> = {
    'adeverinta-rol-agricol':
      'în temeiul prevederilor Ordonanței Guvernului nr. 28/2008 privind registrul agricol, cu modificările și completările ulterioare',
    'adeverinta-apia':
      'în temeiul prevederilor Ordonanței Guvernului nr. 28/2008 privind registrul agricol, cu modificările și completările ulterioare',
    'adeverinta-domiciliu':
      'pe baza datelor din registrul agricol și din evidențele aflate la dispoziția autorității publice locale',
    'adeverinta-ajutor-social':
      'în temeiul prevederilor Legii nr. 196/2016 privind venitul minim de incluziune, cu modificările și completările ulterioare',
    'adeverinta-fara-datorii':
      'în temeiul prevederilor art. 159 din Legea nr. 207/2015 privind Codul de procedură fiscală, pe baza evidențelor fiscale locale',
  };

  const preambul = `Având în vedere ${cerereRef}, ${TEMEI[tip]},\n\n`;
  const intro = `SE ADEVEREȘTE prin prezenta că domnul/doamna ${c.numeComplet}, CNP ${c.cnp}, cu domiciliul în ${adresa},`;

  const scop = c.scopulCererii
    ? `Prezenta adeverință se eliberează pentru: ${c.scopulCererii}`
    : 'Prezenta adeverință se eliberează la cererea solicitantului, spre a-i servi la nevoie';

  const raspundere = 'Ne asumăm răspunderea pentru exactitatea datelor înscrise în prezenta adeverință.';

  switch (tip) {
    case 'adeverinta-rol-agricol':
      return (
        preambul +
        `${intro} figurează înscris(ă) în registrul agricol al comunei, ` +
        `volumul [ ... ], poziția de rol nr. [ ... ], cu următoarele bunuri:\n\n` +
        `- teren agricol în suprafață totală de [ ... ] ha, din care arabil [ ... ] ha;\n` +
        `- animale: [ ... ].\n\n` +
        `${scop}, fiind valabilă 30 de zile de la data emiterii.\n\n${raspundere}`
      );
    case 'adeverinta-apia':
      return (
        preambul +
        `${intro} figurează înscris(ă) în registrul agricol al comunei cu ` +
        `suprafața totală de [ ... ] ha teren agricol situat pe raza comunei, după cum urmează:\n\n` +
        `- parcela [ ... ]: [ ... ] ha, categoria de folosință [ ... ].\n\n` +
        `Prezenta adeverință se eliberează pentru a servi la întocmirea dosarului de ` +
        `subvenții APIA, campania ${new Date().getFullYear()}, fiind valabilă 30 de zile de la data emiterii.\n\n${raspundere}`
      );
    case 'adeverinta-domiciliu':
      return (
        preambul +
        `${intro} are domiciliul pe raza comunei.\n\n` +
        `Potrivit evidențelor, gospodăria este compusă din următoarele persoane:\n` +
        `- [ nume și prenume, CNP, calitatea în gospodărie ].\n\n` +
        `${scop}.\n\n${raspundere}`
      );
    case 'adeverinta-ajutor-social':
      return (
        preambul +
        `${intro} [ beneficiază / nu beneficiază ] de venit minim de incluziune, ` +
        `[ detalii beneficiu: componenta (ajutor de incluziune / ajutor pentru familia cu copii), cuantum lunar, perioada ].\n\n` +
        `${scop}.\n\n${raspundere}`
      );
    case 'adeverinta-fara-datorii':
      return (
        preambul +
        `${intro} NU figurează în evidențele fiscale ale comunei cu obligații ` +
        `de plată restante către bugetul local (impozite, taxe locale, amenzi sau alte creanțe), ` +
        `la data eliberării prezentei.\n\n` +
        `${scop}, fiind valabilă 30 de zile de la data emiterii.\n\n${raspundere}`
      );
  }
}
