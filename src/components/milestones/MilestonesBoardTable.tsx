'use client';

import React, { useMemo } from 'react';
import EmptyState from '@/components/EmptyState';
import StatusBadge, { type StatusType } from '@/components/StatusBadge';
import {
  applyMilestonesTableView,
  ariaSortValue,
  COLUMN_LABELS,
  SORT_COLUMNS,
} from '@/lib/milestonesTableModel';
import { useMilestonesTableViewState } from '@/hooks/useMilestonesTableViewState';
import type { Milestone } from '@/types/domain';

export interface MilestonesBoardTableProps {
  milestones: Milestone[];
  onAddMilestone?: () => void;
  onSelectMilestone?: (milestone: Milestone) => void;
  pageSize?: number;
}

const VALID_STATUSES = ['All', 'Pending', 'Completed', 'Paid', 'Disputed'] as const;

export const MilestonesBoardTable: React.FC<MilestonesBoardTableProps> = ({
  milestones,
  onAddMilestone,
  onSelectMilestone,
  pageSize = 5,
}) => {
  const {
    view,
    update,
    searchInput,
    setSearchInput,
    cycleSort,
    setPage,
    setStatus,
  } = useMilestonesTableViewState();

  // Memoize derived rows so unrelated parent re-renders don't recompute
  const derived = useMemo(() => {
    return applyMilestonesTableView(milestones, {
      ...view,
      pageSize,
    });
  }, [milestones, view, pageSize]);

  return (
    <section aria-labelledby="milestones-board-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="milestones-board-heading" className="text-lg font-semibold tracking-tight text-slate-900">
          Milestones Board
        </h2>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only">Search milestones</span>
            <input
              type="search"
              aria-label="Filter milestones by title"
              placeholder="Search by title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium text-slate-700">Status</span>
            <select
              aria-label="Filter milestones by status"
              value={view.status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {VALID_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Empty State: 0 total milestones */}
      {derived.totalCount === 0 ? (
        <EmptyState
          illustration="milestones"
          title="No milestones tracked"
          description="Track your progress by adding milestones to your contracts. Milestones help you stay organized and ensure timely delivery."
          actionLabel={onAddMilestone ? 'Add Milestone' : undefined}
          onAction={onAddMilestone}
        />
      ) : derived.totalFiltered === 0 ? (
        /* Filtered Empty State: filters match 0 results */
        <EmptyState
          illustration="milestones"
          title="No milestones match this filter"
          description="Try a different search term or status filter."
          actionLabel="Reset filters"
          onAction={() => update({ search: '', status: 'All', page: 1 })}
        />
      ) : (
        /* Data Table */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table role="table" className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Milestones board table. Column headers are sortable.
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  {SORT_COLUMNS.map((column) => {
                    const active = view.sort === column && view.dir !== 'none';
                    return (
                      <th
                        key={column}
                        scope="col"
                        aria-sort={view.sort === column ? ariaSortValue(view.dir) : 'none'}
                        className="px-4 py-3 font-semibold"
                      >
                        <button
                          type="button"
                          onClick={() => cycleSort(column)}
                          aria-label={`Sort by ${COLUMN_LABELS[column]}`}
                          className="group inline-flex items-center gap-1.5 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        >
                          {COLUMN_LABELS[column]}
                          <span
                            aria-hidden="true"
                            className={`text-xs ${
                              active ? 'text-blue-600 font-bold' : 'text-slate-400 opacity-50 group-hover:opacity-100'
                            }`}
                          >
                            {view.sort === column && view.dir === 'asc'
                              ? '↑'
                              : view.sort === column && view.dir === 'desc'
                                ? '↓'
                                : '↕'}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  {onSelectMilestone && (
                    <th scope="col" className="px-4 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {derived.rows.map((m) => {
                  const formattedDate = m.dueDate
                    ? new Date(m.dueDate).toLocaleDateString()
                    : 'No due date';
                  return (
                    <tr
                      key={m.id}
                      data-testid={`milestone-row-${m.id}`}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{m.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status as StatusType} />
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">
                        {Number(m.payout).toLocaleString()} {m.currency}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formattedDate}</td>
                      {onSelectMilestone && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectMilestone(m)}
                            aria-label={`View milestone ${m.title}`}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Navigation */}
          <nav
            aria-label="Milestones pagination"
            className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6"
          >
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-900">{(derived.page - 1) * derived.pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(derived.page * derived.pageSize, derived.totalFiltered)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{derived.totalFiltered}</span> milestones
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage(derived.page - 1)}
                disabled={derived.page <= 1}
                aria-label="Previous page"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Previous
              </button>
              <span aria-live="polite" className="text-xs font-medium text-slate-600">
                Page {derived.page} of {derived.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(derived.page + 1)}
                disabled={derived.page >= derived.totalPages}
                aria-label="Next page"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                Next
              </button>
            </div>
          </nav>
        </div>
      )}
    </section>
  );
};

export default MilestonesBoardTable;
