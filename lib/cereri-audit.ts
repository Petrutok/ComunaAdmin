// Per-cerere audit trail, mirroring the registratura activity journal:
// every meaningful mutation writes an immutable entry to the `istoric`
// subcollection of form_submissions/{id}. Server routes (emitere raspuns/
// adeverinta, completare) write their own entries via the Admin SDK.

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type IstoricTip =
  | 'creare'
  | 'status'
  | 'atribuire'
  | 'raspuns'
  | 'adeverinta'
  | 'completare';

export interface IstoricEntry {
  id: string;
  tip: IstoricTip;
  mesaj: string;
  autorId: string;
  autorNume: string;
  createdAt: Timestamp;
}

interface LogInput {
  cerereId: string;
  tip: IstoricTip;
  mesaj: string;
  autorId: string;
  autorNume: string;
}

/** Best-effort: a failed journal write must never block the action itself. */
export async function logIstoric({ cerereId, tip, mesaj, autorId, autorNume }: LogInput): Promise<void> {
  try {
    await addDoc(collection(db, 'form_submissions', cerereId, 'istoric'), {
      tip,
      mesaj,
      autorId,
      autorNume,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[cereri-audit] Failed to log istoric:', error);
  }
}

export async function fetchIstoric(cerereId: string): Promise<IstoricEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'form_submissions', cerereId, 'istoric'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as IstoricEntry));
}
