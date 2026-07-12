// Server-only web push helpers, shared by status notifications (citizens)
// and assignment notifications (staff).
//
// push_subscriptions docs carry the verified uid of the subscriber in the
// (historically named) `citizenUid` field - staff accounts subscribe
// through the same flow, so the field holds any Firebase Auth uid.

import webpush from 'web-push';
import type { Firestore } from 'firebase-admin/firestore';

let vapidConfigured = false;

export function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@primaria.ro',
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/**
 * Sends a push notification to every subscription of the given account.
 * Best-effort: returns the number of successful deliveries and silently
 * cleans up expired subscriptions.
 */
export async function sendPushToUid(
  db: Firestore,
  uid: string,
  payload: PushPayload
): Promise<number> {
  if (!uid || !ensureVapidConfigured()) return 0;

  const subs = await db
    .collection('push_subscriptions')
    .where('citizenUid', '==', uid)
    .get();

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    data: { url: payload.url, timestamp: new Date().toISOString() },
  });

  let delivered = 0;
  for (const subDoc of subs.docs) {
    const sub = subDoc.data();
    if (!sub.endpoint || !sub.keys) continue;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, message);
      delivered++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // Expired subscription: clean it up
      if (msg.includes('410') || msg.includes('404')) {
        await subDoc.ref.delete().catch(() => {});
      }
    }
  }
  return delivered;
}
