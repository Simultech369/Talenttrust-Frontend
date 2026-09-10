'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Milestone } from '@/types/domain';
import {
  searchMilestones,
  normalizeSearchQuery,
  type MilestonesSearchResult,
} from '@/lib/searchMilestones';

export type MilestonesSearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface UseDebouncedMilestonesSearchOptions {
  /** Debounce delay in milliseconds before dispatching query. Default is 300ms. */
  debounceMs?: number;
  /** Custom search implementation for testing or remote API delegating. */
  searchFn?: (
    milestones: readonly Milestone[],
    query: string,
    options?: { signal?: AbortSignal; token?: number; delayMs?: number },
  ) => Promise<MilestonesSearchResult>;
}

export interface UseDebouncedMilestonesSearchResult {
  /** Immediate, controlled search input value. */
  query: string;
  /** Normalized, debounced query string currently applied to results. */
  debouncedQuery: string;
  /** Current list of matching milestones (or all milestones when query is empty). */
  results: Milestone[];
  /** State machine status: idle | loading | success | empty | error */
  status: MilestonesSearchStatus;
  /** Structured error object when status is 'error', null otherwise. */
  error: { code: string; message: string } | null;
  /** Update the search query (triggers debounced execution). */
  setQuery: (query: string) => void;
  /** Clears the query, resets results to full milestone list, and cancels in-flight requests. */
  clear: () => void;
  /** Re-executes the search with the latest query immediately. */
  retry: () => void;
}

/**
 * Custom hook for resilient, debounced milestones search with request cancellation.
 *
 * Guarantees:
 * 1. Debounced execution (drops rapid keystroke spam).
 * 2. Superceded request cancellation via `AbortController`.
 * 3. Monotonic token tracking — newest request always wins, stale/out-of-order responses dropped.
 * 4. Distinct states: idle, loading, success, empty, and error with retry.
 */
export function useDebouncedMilestonesSearch(
  milestones: readonly Milestone[],
  options?: UseDebouncedMilestonesSearchOptions,
): UseDebouncedMilestonesSearchResult {
  const debounceMs = options?.debounceMs ?? 300;
  const searchFn = options?.searchFn ?? searchMilestones;

  const [query, setQueryState] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [results, setResults] = useState<Milestone[]>([...milestones]);
  const [status, setStatus] = useState<MilestonesSearchStatus>('idle');
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  // Monotonic request sequence token
  const requestIdRef = useRef<number>(0);
  // Active AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  // Debounce timer ID
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to track the latest query string
  const queryRef = useRef<string>(query);
  queryRef.current = query;
  // Ref to track the latest milestones
  const milestonesRef = useRef<readonly Milestone[]>(milestones);
  milestonesRef.current = milestones;

  // Cleanup helper
  const cancelInFlight = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelInFlight();
    };
  }, [cancelInFlight]);

  // If underlying milestones change while idle/empty query, keep results in sync
  useEffect(() => {
    if (!normalizeSearchQuery(queryRef.current)) {
      setResults([...milestones]);
    }
  }, [milestones]);

  const executeSearch = useCallback(
    async (targetQuery: string) => {
      // Cancel previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentToken = ++requestIdRef.current;

      const normalized = normalizeSearchQuery(targetQuery);

      if (!normalized) {
        setResults([...milestonesRef.current]);
        setDebouncedQuery('');
        setStatus('idle');
        setError(null);
        return;
      }

      setStatus('loading');
      setError(null);

      try {
        const searchResult = await searchFn(milestonesRef.current, normalized, {
          signal: controller.signal,
          token: currentToken,
        });

        // Guard: Check if superseded by a newer request or aborted
        if (currentToken !== requestIdRef.current || controller.signal.aborted) {
          return; // Drop stale out-of-order response
        }

        setResults(searchResult.items);
        setDebouncedQuery(normalized);
        setStatus(searchResult.items.length === 0 ? 'empty' : 'success');
        setError(null);
      } catch (err: any) {
        // Guard: Check if superseded or aborted
        if (currentToken !== requestIdRef.current || controller.signal.aborted || err?.name === 'AbortError') {
          return; // Ignore aborted requests
        }

        setStatus('error');
        setError({
          code: err?.code || 'SEARCH_EXECUTION_FAILED',
          message: err?.message || 'Unable to perform milestone search. Please try again.',
        });
      }
    },
    [searchFn],
  );

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const trimmed = newQuery.trim();
      if (!trimmed) {
        // If input is cleared, cancel in-flight search and reset immediately
        cancelInFlight();
        setResults([...milestonesRef.current]);
        setDebouncedQuery('');
        setStatus('idle');
        setError(null);
        return;
      }

      // Schedule debounced search execution
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(newQuery);
      }, debounceMs);
    },
    [debounceMs, executeSearch, cancelInFlight],
  );

  const clear = useCallback(() => {
    cancelInFlight();
    setQueryState('');
    setDebouncedQuery('');
    setResults([...milestonesRef.current]);
    setStatus('idle');
    setError(null);
  }, [cancelInFlight]);

  const retry = useCallback(() => {
    cancelInFlight();
    executeSearch(queryRef.current);
  }, [cancelInFlight, executeSearch]);

  return {
    query,
    debouncedQuery,
    results,
    status,
    error,
    setQuery,
    clear,
    retry,
  };
}
