import { z } from 'zod';

const baseSchema = z.object({
  numeComplet: z.string().min(3),
  cnp: z.string().regex(/^\d{13}$/, 'CNP invalid'),
  localitate: z.string().min(2),
  adresa: z.string().min(5),
  telefon: z.string().min(10),
  email: z.string().email(),
  scopulCererii: z.string().min(10),
  fisiere: z.array(z.instanceof(File)).max(3),
});

export function getSchema(formType: string) {
  switch (formType) {
    case 'autorizatie-construire':
    case 'certificat-urbanism':
      return baseSchema.extend({
        suprafataTeren: z.string().optional(),
        nrCadastral: z.string().optional(),
        tipConstructie: z.string().optional(),
        suprafataConstructie: z.string().optional(),
      });
    case 'certificat-fiscal-pj':
      return baseSchema.extend({
        numeFirma: z.string().min(2),
        cui: z.string().min(2),
        nrRegistruComert: z.string().optional(),
        reprezentantLegal: z.string().optional(),
      });
    case 'radiere-auto':
    case 'declaratie-auto':
      return baseSchema.extend({
        marcaAuto: z.string().optional(),
        serieSasiu: z.string().optional(),
        nrInmatriculare: z.string().optional(),
        anFabricatie: z.string().optional(),
        capacitateCilindrica: z.string().optional(),
      });
    default:
      return baseSchema;
  }
}

export type RequestFormData = z.infer<ReturnType<typeof getSchema>>;
