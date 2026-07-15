import { describe, it, expect, beforeEach } from 'vitest';
import { computeNextState, type SnapshotState } from '@/lib/hooks/useCollectionSnapshot';
import { trackSubscribe, getRealtimeStats } from '@/lib/realtime-debug';

// The realtime layer's two testable-without-React pieces:
//  - computeNextState: the rerender-avoidance guard (a snapshot that
//    carries no doc change and no cache flip must return the SAME state
//    object, so React bails out of the rerender).
//  - realtime-debug: the active-listener registry used to spot leaks.

function state<T>(over: Partial<SnapshotState<T>> = {}): SnapshotState<T> {
  return { data: [], loading: false, error: null, fromCache: false, ...over };
}

describe('computeNextState (rerender guard)', () => {
  it('maps data on the first snapshot (loading -> loaded)', () => {
    const prev = state<number>({ loading: true });
    let mapped = 0;
    const next = computeNextState(prev, {
      docsChanged: false, // first snapshot may report no docChanges
      fromCache: false,
      mapData: () => {
        mapped++;
        return [1, 2, 3];
      },
    });
    expect(next.loading).toBe(false);
    expect(next.data).toEqual([1, 2, 3]);
    expect(mapped).toBe(1);
    expect(next).not.toBe(prev);
  });

  it('returns the SAME object on a pure metadata ping (no rerender)', () => {
    const prev = state<number>({ data: [1, 2], loading: false, fromCache: false });
    let mapped = 0;
    const next = computeNextState(prev, {
      docsChanged: false,
      fromCache: false,
      mapData: () => {
        mapped++;
        return [9];
      },
    });
    expect(next).toBe(prev); // React skips the rerender
    expect(mapped).toBe(0); // and we didn't even re-map
  });

  it('re-maps when documents changed', () => {
    const prev = state<number>({ data: [1], loading: false });
    const next = computeNextState(prev, {
      docsChanged: true,
      fromCache: false,
      mapData: () => [1, 2],
    });
    expect(next).not.toBe(prev);
    expect(next.data).toEqual([1, 2]);
  });

  it('updates on a cache/offline flip but reuses the data array', () => {
    const data = [1, 2];
    const prev = state<number>({ data, loading: false, fromCache: false });
    const next = computeNextState(prev, {
      docsChanged: false,
      fromCache: true, // went offline / reconnecting
      mapData: () => [9, 9, 9],
    });
    expect(next).not.toBe(prev);
    expect(next.fromCache).toBe(true);
    expect(next.data).toBe(data); // same reference: list rows don't rerender
  });
});

describe('realtime-debug (leak detection registry)', () => {
  beforeEach(() => {
    // Reset counters between tests
    const s = getRealtimeStats();
    s.active = 0;
    s.byLabel = {};
    s.events = [];
  });

  it('increments on subscribe and returns to zero on unsubscribe', () => {
    const a = trackSubscribe('cereri');
    const b = trackSubscribe('issues');
    expect(getRealtimeStats().active).toBe(2);
    expect(getRealtimeStats().byLabel).toEqual({ cereri: 1, issues: 1 });
    a.unsubscribe();
    b.unsubscribe();
    expect(getRealtimeStats().active).toBe(0); // no leak
    expect(getRealtimeStats().byLabel.cereri).toBe(0);
  });

  it('tracks the concurrent peak', () => {
    const subs = ['a', 'b', 'c'].map((l) => trackSubscribe(l));
    expect(getRealtimeStats().peak).toBeGreaterThanOrEqual(3);
    subs.forEach((s) => s.unsubscribe());
    expect(getRealtimeStats().active).toBe(0);
  });

  it('records first-snapshot only once per listener', () => {
    const t = trackSubscribe('registru');
    t.firstSnapshot(100);
    t.firstSnapshot(100); // ignored
    const firsts = getRealtimeStats().events.filter((e) => e.kind === 'first-snapshot');
    expect(firsts).toHaveLength(1);
    expect(firsts[0].detail).toContain('100 docs');
    t.unsubscribe();
  });
});
