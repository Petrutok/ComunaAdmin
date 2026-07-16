// lib/pdf/antet.ts
// Shared official letterhead (antet) for generated PDFs: the state coat of
// arms (stema) on the left + the institution identity lines from lib/tenant.ts.
// Used by cereri, adeverinte and raspunsuri so every official document that
// leaves the town hall carries the same header.

import type { jsPDF } from 'jspdf';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { TENANT } from '@/lib/tenant';

function clean(str: string): string {
  return str
    .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/ș/g, 's').replace(/ş/g, 's').replace(/ț/g, 't').replace(/ţ/g, 't')
    .replace(/Ă/g, 'A').replace(/Â/g, 'A').replace(/Î/g, 'I')
    .replace(/Ș/g, 'S').replace(/Ş/g, 'S').replace(/Ț/g, 'T').replace(/Ţ/g, 'T');
}

// Cache the encoded stema across invocations in the same server instance.
// `undefined` = not tried yet, `null` = tried and unavailable.
let cachedStema: string | null | undefined;

/**
 * Loads the coat of arms (public/stema.png) as a base64 data URL for jsPDF.
 * Tries the bundled file first (works locally and when traced into the
 * serverless function), then falls back to fetching the served asset.
 * Returns null if the image isn't available - the letterhead then renders
 * text-only, and the document is still valid.
 */
export async function loadStemaDataUrl(): Promise<string | null> {
  if (cachedStema !== undefined) return cachedStema;

  // 1. Bundled file on disk
  try {
    const buf = await readFile(join(process.cwd(), 'public', 'stema.png'));
    cachedStema = `data:image/png;base64,${buf.toString('base64')}`;
    return cachedStema;
  } catch {
    // fall through to fetch
  }

  // 2. Served static asset (reliable on Vercel even without file tracing)
  try {
    const res = await fetch(`${TENANT.siteUrl}/stema.png`);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      cachedStema = `data:image/png;base64,${buf.toString('base64')}`;
      return cachedStema;
    }
  } catch {
    // ignore
  }

  cachedStema = null;
  return cachedStema;
}

export interface AntetOptions {
  pageWidth: number;
  margin: number;
  stemaDataUrl?: string | null;
  /** Institution lines; default to the tenant identity. */
  antetOficial?: string;
  judet?: string;
}

/**
 * Draws the official letterhead at the top of the page and returns the Y
 * coordinate just below it (after the separator line).
 */
export function drawAntet(pdf: jsPDF, opts: AntetOptions): number {
  const { pageWidth, margin } = opts;
  const antetOficial = opts.antetOficial || TENANT.antetOficial;
  const judet = opts.judet || TENANT.judet;
  const centerX = pageWidth / 2;
  const top = margin;

  // Coat of arms on the left, vertically aligned with the text block
  if (opts.stemaDataUrl) {
    try {
      pdf.addImage(opts.stemaDataUrl, 'PNG', margin, top, 22, 22);
    } catch (error) {
      console.error('[antet] Failed to embed stema:', error);
    }
  }

  let y = top + 4;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(clean('ROMANIA'), centerX, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(11);
  pdf.text(clean(judet.toUpperCase()), centerX, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(12);
  pdf.text(clean(antetOficial.toUpperCase()), centerX, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(9);
  pdf.text(clean(`${TENANT.numeComuna.toUpperCase()}, ${judet.toUpperCase()}`), centerX, y, { align: 'center' });

  // Contact lines
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  y += 4.5;
  pdf.text(clean(`E-mail: ${TENANT.email}`), centerX, y, { align: 'center' });
  y += 4;
  const telLine = TENANT.fax
    ? `Tel: ${TENANT.telefon}; Fax: ${TENANT.fax}`
    : `Tel: ${TENANT.telefon}`;
  pdf.text(clean(telLine), centerX, y, { align: 'center' });

  // Separator, at least below the coat of arms
  y = Math.max(y + 4, top + 24);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  return y + 8;
}
