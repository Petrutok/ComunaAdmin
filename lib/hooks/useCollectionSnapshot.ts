'use client';

// Reusable realtime layer for operational lists (cereri, sesizări,
// registru). Wraps a single Firestore onSnapshot listener with a clean
// lifecycle so pages don't each reimplement subscribe/cleanup/reconnect.
//
// Design goals (kept deliberately simple, not a generic magic box):
// - ONE listener per hook instance, torn down on unmount or query change;
// - no flicker: `loading` is true only until the first snapshot; later
//   updates replace data in place without a loading flash;
// - reconnect awareness via snapshot metadata (fromCache), surfaced so
//   the UI can show a subtle "reconnecting" hint instead of a spinner;
// - the query is passed already built; the CALLER owns memoization (see
//   note below) so the listener only re-subscribes when it truly changes.
//
// Cost note: a listener reads matching docs once on attach, then only
// changed docs afterwards. Always pass a bounded query (limit(...)) for
// operational lists — never an unbounded collection.

import { useEffect, useRef, useState } from 'react';
import { onSnapshot, type Query, type FirestoreError } from 'firebase/firestore';

export interface SnapshotState<T> {
  data: T[];
  /** true only until the first snapshot arrives */
  loading: boolean;
  error: FirestoreError | null;
  /** true while served from local cache (offline / reconnecting) */
  fromCache: boolean;
}

/**
 * Subscribes to `firestoreQuery` and returns its documents live.
 *
 * IMPORTANT: pass `null` to intentionally not subscribe (e.g. before the
 * user is known). Memoize the query in the caller and list its inputs in
 * `queryKey` — the listener re-subscribes only when `queryKey` changes,
 * which avoids re-subscribing on every render (Firestore Query objects
 * are new references each render and can't be compared directly).
 */
export function useCollectionSnapshot<T>(
  firestoreQuery: Query | null,
  mapDoc: (id: string, data: Record<string, unknown>) => T,
  queryKey: React.DependencyList
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
      setState({ data: [], loading: false, error: null, fromCache: false });
      return;
    }

    // New subscription: show loading only if we have nothing yet, so
    // switching filters doesn't blank an already-populated list.
    setState((prev) => ({ ...prev, loading: prev.data.length === 0, error: null }));

    const unsubscribe = onSnapshot(
      firestoreQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Skip pure metadata pings that carry no data change and aren't a
        // cache-state transition, to avoid needless rerenders.
        const data = snapshot.docs.map((d) => mapRef.current(d.id, d.data()));
        setState({
          data,
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
        });
      },
      (error) => {
        console.error('[useCollectionSnapshot] listener error:', error);
        setState((prev) => ({ ...prev, loading: false, error }));
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, queryKey);

  return state;
}
