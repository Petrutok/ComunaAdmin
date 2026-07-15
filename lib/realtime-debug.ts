// Observability for the realtime layer. Two jobs:
//  1. Track how many Firestore listeners are ACTIVE right now (a leak
//     shows up as a count that doesn't return toward 0 when leaving
//     operational pages).
//  2. Optionally log subscribe / first-snapshot latency / doc counts, so a
//     slow or chatty listener is visible in production.
//
// Debug logging is OFF by default (no console noise in prod). Turn it on
// per-session from the browser console:
//     localStorage.setItem('rt_debug', '1')   // then reload
// or build-wide with NEXT_PUBLIC_RT_DEBUG=1.
//
// Live inspection in any environment (no flag needed):
//     window.__realtime            // { active, peak, byLabel, events[] }

export interface RealtimeStats {
  /** listeners attached right now */
  active: number;
  /** highest concurrent count seen this session */
  peak: number;
  /** active count per label (page/collection) */
  byLabel: Record<string, number>;
  /** rolling log of the last N lifecycle events (dev aid) */
  events: Array<{ t: number; kind: string; label: string; detail?: string }>;
}

const stats: RealtimeStats = {
  active: 0,
  peak: 0,
  byLabel: {},
  events: [],
};

const MAX_EVENTS = 50;

function debugOn(): boolean {
  if (process.env.NEXT_PUBLIC_RT_DEBUG === '1') return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('rt_debug') === '1';
  } catch {
    return false;
  }
}

function expose() {
  if (typeof window !== 'undefined') {
    (window as unknown as { __realtime: RealtimeStats }).__realtime = stats;
  }
}

function record(kind: string, label: string, detail?: string) {
  stats.events.push({ t: Date.now(), kind, label, detail });
  if (stats.events.length > MAX_EVENTS) stats.events.shift();
  if (debugOn()) {
    console.debug(`[realtime] ${kind} · ${label}${detail ? ` · ${detail}` : ''} · active=${stats.active}`);
  }
}

/** Call when a listener attaches. Returns a handle to report first snapshot. */
export function trackSubscribe(label: string) {
  stats.active += 1;
  stats.peak = Math.max(stats.peak, stats.active);
  stats.byLabel[label] = (stats.byLabel[label] || 0) + 1;
  expose();
  const startedAt = Date.now();
  record('subscribe', label);
  let firstReported = false;
  return {
    /** report the first snapshot arrival (attach latency) */
    firstSnapshot(docCount: number) {
      if (firstReported) return;
      firstReported = true;
      record('first-snapshot', label, `${docCount} docs · ${Date.now() - startedAt}ms`);
    },
    unsubscribe() {
      stats.active -= 1;
      stats.byLabel[label] = Math.max(0, (stats.byLabel[label] || 1) - 1);
      expose();
      record('unsubscribe', label);
    },
  };
}

/** Test/inspection helper. */
export function getRealtimeStats(): RealtimeStats {
  return stats;
}
