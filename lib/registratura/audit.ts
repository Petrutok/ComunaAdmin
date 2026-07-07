// lib/registratura/audit.ts
// Per-document activity journal: every meaningful mutation (status change,
// assignment, tags, internal comments, document processing) writes an entry
// to the `activity` subcollection of registratura_emails/{id}. The detail
// sheet renders it as a unified timeline - audit log and internal comments
// live in the same stream, ordered by time.

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityEntry } from '@/types/registratura';

interface LogInput {
  emailId: string;
  tip: ActivityEntry['tip'];
  mesaj: string;
  autorId: string;
  autorNume: string;
}

/** Best-effort: a failed journal write must never block the action itself. */
export async function logActivity({ emailId, tip, mesaj, autorId, autorNume }: LogInput): Promise<void> {
  try {
    await addDoc(collection(db, 'registratura_emails', emailId, 'activity'), {
      tip,
      mesaj,
      autorId,
      autorNume,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('[registratura/audit] Failed to log activity:', error);
  }
}

export async function fetchActivity(emailId: string): Promise<ActivityEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'registratura_emails', emailId, 'activity'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry));
}
