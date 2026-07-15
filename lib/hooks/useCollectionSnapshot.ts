'use client';

// Reusable realtime layer for operational lists (cereri, sesizări,
// registru). Wraps a single Firestore onSnapshot listener with a clean
// lifecycle so pages don't each reimplement subscribe/cleanup/reconnect.
//
// Design goals (kept deliberately simple, not a generic magic box):
// - ONE listener per hook instance, torn down on unmount or query change;
// - no flicker: `loading` is true only until the first snapshot; later
//   updates replace data in place without a loading flash;
// - NO wasted rerenders: with includeMetadataChanges we also get pure
//   metadata pings (e.g. hasPendingWrites). computeNextState skips those
//   (returns the previous state object, so React bails out) unless the
//   documents actually changed or the cache/offline state flipped;
// - reconnect awareness via snapshot metadata (fromCache), surfaced so
//   the UI can show a subtle "reconnecting" hint instead of a spinner;
// - the query is passed already built; the CALLER owns memoization (see
//   note below) so the listener only re-subscribes when it truly changes;
// - observability: every listener is registered in lib/realtime-debug so
//   active-listener count and first-snapshot latency are inspectable.
//
// Cost note: a listener reads matching docs once on attach, then only
// changed docs afterwards. Always pass a bounded query (limit(...)) for
// operational lists — never an unbounded collection.

import { useEffect, useRef, useState } from 'react';
import { onSnapshot, type Query, type FirestoreError } from 'firebase/firestore';
import { trackSubscribe } from '@/lib/realtime-debug';

export interface SnapshotState<T> {
  data: T[];
  /** true only until the first snapshot arrives */
  loading: boolean;
  error: FirestoreError | null;
  /** true while served from local cache (offline / reconnecting) */
  fromCache: boolean;
}

/**
 * Pure reducer for a snapshot event. Extracted so the rerender-avoidance
 * logic is unit-testable without React or a live Firestore. Returns the
 * SAME `prev` reference (React skips the rerender) when the event carries
 * no document change and no cache-state transition.
 */
export function computeNextState<T>(
  prev: SnapshotState<T>,
  opts: { docsChanged: boolean; fromCache: boolean; mapData: () => T[] }
): SnapshotState<T> {
  const first = prev.loading;
  const cacheChanged = opts.fromCache !== prev.fromCache;
  if (!first && !opts.docsChanged && !cacheChanged) {
    return prev; // no-op: identical result set, no rerender
  }
  // Re-map documents only when they actually changed (or on first load);
  // otherwise reuse the previous array reference so list rows don't rerender.
  const data = first || opts.docsChanged ? opts.mapData() : prev.data;
  return { data, loading: false, error: null, fromCache: opts.fromCache };
}

/**
 * Subscribes to `firestoreQuery` and returns its documents live.
 *
 * IMPORTANT: pass `null` to intentionally not subscribe (e.g. before the
 * user is known). Memoize the query in the caller and list its inputs in
 * `queryKey` — the listener re-subscribes only when `queryKey` changes,
 * which avoids re-subscribing on every render (Firestore Query objects
 * are new references each render and can't be compared directly).
 *
 * @param label short name for observability (page/collection), e.g. 'cereri'
 */
export function useCollectionSnapshot<T>(
  firestoreQuery: Query | null,
  mapDoc: (id: string, data: Record<string, unknown>) => T,
  queryKey: React.DependencyList,
  label = 'anon'
): SnapshotState<T> {
  const [state, setState] = useState<SnapshotState<T>>({
    data: [],
    loading: true,
    error: null,
    fromCache: false,
  });

  // Keep the latest mapper without making it part of the subscribe deps
  // (callers usually pass an inline function - we don't want to resubscribe
  // when its identity changes, only when the query key does).
  const mapRef = useRef(mapDoc);
  mapRef.current = mapDoc;

  useEffect(() => {
    if (!firestoreQuery) {
      setState((prev) =>
        prev.loading || prev.data.length
          ? { data: [], loading: false, error: null, fromCache: false }
          : prev
      );
      return;
    }

    // New subscription: show loading only if we have nothing yet, so
    // switching filters doesn't blank an already-populated list.
    setState((prev) => ({ ...prev, loading: prev.data.length === 0, error: null }));

    const tracker = trackSubscribe(label);

    const unsubscribe = onSnapshot(
      firestoreQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        tracker.firstSnapshot(snapshot.size);
        // docChanges() excludes metadata-only events, so it's empty on a
        // pure metadata ping - computeNextState turns that into a no-op.
        const docsChanged = snapshot.docChanges().length > 0;
        setState((prev) =>
          computeNextState(prev, {
            docsChanged,
            fromCache: snapshot.metadata.fromCache,
            mapData: () => snapshot.docs.map((d) => mapRef.current(d.id, d.data())),
          })
        );
      },
      (error) => {
        console.error(`[useCollectionSnapshot:${label}] listener error:`, error);
        setState((prev) => ({ ...prev, loading: false, error }));
      }
    );

    return () => {
      unsubscribe();
      tracker.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, queryKey);

  return state;
}
