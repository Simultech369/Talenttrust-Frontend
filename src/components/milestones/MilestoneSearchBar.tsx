'use client';

import React from 'react';
import type { MilestonesSearchStatus } from '@/hooks/useDebouncedMilestonesSearch';

export interface MilestoneSearchBarProps {
  /** Current controlled search query. */
  query: string;
  /** Called whenever the user types or updates the query. */
  onChange: (value: string) => void;
  /** Called to clear the search input. */
  onClear: () => void;
  /** Current search state machine status. */
  status: MilestonesSearchStatus;
  /** Number of results currently matching. */
  resultCount: number;
}

/**
 * Accessible search bar for the milestones board.
 * Includes search input, clear button, loading indicator, and polite aria-live announcer.
 */
export const MilestoneSearchBar: React.FC<MilestoneSearchBarProps> = ({
  query,
  onChange,
  onClear,
  status,
  resultCount,
}) => {
  const isLoading = status === 'loading';

  return (
    <div className="relative flex-1 min-w-[240px] max-w-md" role="search">
      <label htmlFor="milestones-search-input" className="sr-only">
        Search milestones
      </label>
      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className="absolute left-3 text-slate-400 select-none pointer-events-none text-sm"
        >
          🔍
        </span>
        <input
          id="milestones-search-input"
          type="search"
          role="searchbox"
          aria-label="Search milestones"
          aria-describedby="milestones-search-live-status"
          placeholder="Search milestones..."
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClear();
            }
          }}
          className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-16 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && (
            <span
              data-testid="milestones-search-spinner"
              aria-label="Searching"
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
            />
          )}

          {query && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              data-testid="clear-milestones-search-btn"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <span aria-hidden="true" className="text-xs font-bold leading-none block px-1">
                ✕
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Screen-reader accessible announcement region */}
      <div
        id="milestones-search-live-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isLoading
          ? 'Searching milestones...'
          : status === 'empty'
            ? `No milestones match your search for "${query}"`
            : status === 'error'
              ? 'An error occurred while searching milestones.'
              : query
                ? `${resultCount} milestone${resultCount === 1 ? '' : 's'} found`
                : ''}
      </div>
    </div>
  );
};

export default MilestoneSearchBar;
