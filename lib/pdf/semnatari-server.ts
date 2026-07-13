// lib/pdf/semnatari-server.ts
// Server-only helper: resolves the signature blocks for an issued PDF
// (primar / secretar general / intocmit) from settings + user profiles.
// Used by /api/emite-adeverinta and /api/emite-raspuns.

import type { Firestore } from 'firebase-admin/firestore';
import type { getAdminBucket } from '@/lib/firebase-admin';
import type { SemnatarInfo } from './semnatari';

type Bucket = NonNullable<ReturnType<typeof getAdminBucket>>;

async function downloadPngDataUrl(bucket: Bucket, path?: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const [buf] = await bucket.file(path).download();
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    // Missing image never blocks issuing - the block renders name-only
    return null;
  }
}

export interface ResolvedSemnatari {
  /** Primar signature image (legacy field on the PDF inputs) */
  semnaturaPngDataUrl: string | null;
  secretar: SemnatarInfo | null;
  intocmit: SemnatarInfo | null;
}

/**
 * @param settings   config/adeverinta_settings data
 * @param intocmitUid staff uid for the "Intocmit" block (responsabil); omitted -> no block
 * @param includeSecretar render the SECRETAR GENERAL block (document was avizat,
 *                        or emitere rapida with a configured secretar)
 */
export async function resolveSemnatari(
  db: Firestore,
  bucket: Bucket,
  settings: FirebaseFirestore.DocumentData,
  opts: { intocmitUid?: string | null; includeSecretar: boolean }
): Promise<ResolvedSemnatari> {
  const semnaturaPngDataUrl = await downloadPngDataUrl(bucket, settings.semnaturaPath);

  let secretar: SemnatarInfo | null = null;
  if (opts.includeSecretar && settings.secretarNume) {
    secretar = {
      nume: settings.secretarNume,
      semnaturaPngDataUrl: await downloadPngDataUrl(bucket, settings.secretarSemnaturaPath),
    };
  }

  let intocmit: SemnatarInfo | null = null;
  if (opts.intocmitUid) {
    try {
      const userSnap = await db.collection('users').doc(opts.intocmitUid).get();
      const user = userSnap.data();
      if (user?.fullName) {
        intocmit = {
          nume: user.fullName,
          semnaturaPngDataUrl: await downloadPngDataUrl(bucket, user.semnaturaPath),
        };
      }
    } catch {
      // best effort - document issues without the intocmit block
    }
  }

  return { semnaturaPngDataUrl, secretar, intocmit };
}
