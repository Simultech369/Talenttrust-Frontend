'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  parseMilestonesTableUrlState,
  buildMilestonesTableQueryString,
  isMilestonesTableUrlInSync,
  nextSortDir,
  type MilestoneSortColumn,
  type MilestonesTableViewState,
} from '@/lib/milestonesTableModel';

export const URL_DEBOUNCE_MS = 200;

export function useMilestonesTableViewState() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView] = useState<MilestonesTableViewState>(() =>
    parseMilestonesTableUrlState((k) => searchParams.get(k))
  );

  const [searchInput, setSearchInput] = useState<string>(view.search);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state from URL when external searchParams change
  useEffect(() => {
    const fromUrl = parseMilestonesTableUrlState((k) => searchParams.get(k));
    setView((current) => {
      if (
        current.search === fromUrl.search &&
        current.status === fromUrl.status &&
        current.sort === fromUrl.sort &&
        current.dir === fromUrl.dir &&
        current.page === fromUrl.page
      ) {
        return current;
      }
      return fromUrl;
    });
    setSearchInput(fromUrl.search);
  }, [searchParams]);

  // Synchronize state changes to URL query string
  const syncToUrl = useCallback(
    (nextState: MilestonesTableViewState) => {
      const isAlreadyInSync = isMilestonesTableUrlInSync(
        (k) => searchParams.get(k),
        nextState
      );
      if (isAlreadyInSync) return;

      const queryString = buildMilestonesTableQueryString(
        searchParams.toString(),
        nextState
      );
      router.replace(queryString ? `?${queryString}` : '?');
    },
    [router, searchParams]
  );

  const update = useCallback(
    (patch: Partial<MilestonesTableViewState>) => {
      if (patch.search !== undefined) {
        setSearchInput(patch.search);
      }
      setView((prev) => {
        const next: MilestonesTableViewState = {
          ...prev,
          ...patch,
          // Reset page to 1 on filter/search change unless page is explicitly patched
          page:
            patch.page !== undefined
              ? patch.page
              : patch.search !== undefined || patch.status !== undefined
                ? 1
                : prev.page,
        };
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl]
  );

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearchInput(newSearch);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        update({ search: newSearch });
      }, URL_DEBOUNCE_MS);
    },
    [update]
  );

  const cycleSort = useCallback(
    (column: MilestoneSortColumn) => {
      setView((prev) => {
        const isSameColumn = prev.sort === column;
        const nextDir = isSameColumn ? nextSortDir(prev.dir) : 'asc';
        const next: MilestonesTableViewState = {
          ...prev,
          sort: column,
          dir: nextDir,
        };
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl]
  );

  const setPage = useCallback(
    (page: number) => {
      update({ page });
    },
    [update]
  );

  const setStatus = useCallback(
    (status: string) => {
      update({ status });
    },
    [update]
  );

  return {
    view,
    update,
    searchInput,
    setSearchInput: handleSearchChange,
    cycleSort,
    setPage,
    setStatus,
  };
}
