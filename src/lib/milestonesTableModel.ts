import type { Milestone } from '@/types/domain';

export type MilestoneSortColumn = 'title' | 'status' | 'payout' | 'dueDate';
export type MilestoneSortDir = 'asc' | 'desc' | 'none';

export const SORT_COLUMNS: readonly MilestoneSortColumn[] = [
  'title',
  'status',
  'payout',
  'dueDate',
] as const;

export const COLUMN_LABELS: Record<MilestoneSortColumn, string> = {
  title: 'Title',
  status: 'Status',
  payout: 'Payout',
  dueDate: 'Due Date',
};

export interface MilestonesTableViewState {
  search: string;
  status: string;
  sort: MilestoneSortColumn;
  dir: MilestoneSortDir;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 5;
export const DEFAULT_VIEW_STATE: MilestonesTableViewState = {
  search: '',
  status: 'All',
  sort: 'dueDate',
  dir: 'none',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export const SEARCH_PARAM = 'q';
export const STATUS_PARAM = 'status';
export const SORT_PARAM = 'sort';
export const DIR_PARAM = 'dir';
export const PAGE_PARAM = 'page';
export const PAGE_SIZE_PARAM = 'pageSize';

export function nextSortDir(current: MilestoneSortDir): MilestoneSortDir {
  if (current === 'none') return 'asc';
  if (current === 'asc') return 'desc';
  return 'none';
}

export function ariaSortValue(
  dir: MilestoneSortDir
): 'ascending' | 'descending' | 'none' {
  if (dir === 'asc') return 'ascending';
  if (dir === 'desc') return 'descending';
  return 'none';
}

export interface DerivedMilestonesTable {
  rows: Milestone[];
  totalFiltered: number;
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

export function applyMilestonesTableView(
  milestones: readonly Milestone[],
  view: MilestonesTableViewState
): DerivedMilestonesTable {
  const totalCount = milestones.length;

  // 1. Text filter (case-insensitive substring match in title)
  let filtered = [...milestones];
  const q = view.search.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((m) => m.title.toLowerCase().includes(q));
  }

  // 2. Status filter
  if (view.status && view.status !== 'All') {
    filtered = filtered.filter(
      (m) => m.status.toLowerCase() === view.status.toLowerCase()
    );
  }

  const totalFiltered = filtered.length;

  // 3. Sorting with deterministic tie-breaking on equal keys
  if (view.dir !== 'none') {
    const mult = view.dir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (view.sort) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'payout':
          comparison = Number(a.payout || 0) - Number(b.payout || 0);
          break;
        case 'dueDate': {
          const aTime = a.dueDate ? Date.parse(a.dueDate) : 0;
          const bTime = b.dueDate ? Date.parse(b.dueDate) : 0;
          const aVal = Number.isNaN(aTime) ? 0 : aTime;
          const bVal = Number.isNaN(bTime) ? 0 : bTime;
          comparison = aVal - bVal;
          break;
        }
      }
      if (comparison !== 0) return comparison * mult;
      // Stable tie-breaker: fallback to unique milestone id
      return a.id.localeCompare(b.id);
    });
  }

  // 4. Pagination & Boundary Clamping
  const pageSize = Math.max(1, view.pageSize || DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const page = Math.min(Math.max(1, view.page), totalPages);

  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  return {
    rows,
    totalFiltered,
    totalCount,
    page,
    totalPages,
    pageSize,
  };
}

export function parseMilestonesTableUrlState(
  getParam: (key: string) => string | null
): MilestonesTableViewState {
  const search = getParam(SEARCH_PARAM) || '';
  const status = getParam(STATUS_PARAM) || 'All';
  const rawSort = getParam(SORT_PARAM);
  const sort: MilestoneSortColumn = SORT_COLUMNS.includes(rawSort as any)
    ? (rawSort as MilestoneSortColumn)
    : 'dueDate';

  const rawDir = getParam(DIR_PARAM);
  const dir: MilestoneSortDir =
    rawDir === 'asc' || rawDir === 'desc' || rawDir === 'none'
      ? rawDir
      : 'none';

  const rawPage = parseInt(getParam(PAGE_PARAM) || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawPageSize = parseInt(
    getParam(PAGE_SIZE_PARAM) || String(DEFAULT_PAGE_SIZE),
    10
  );
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? rawPageSize
      : DEFAULT_PAGE_SIZE;

  return {
    search,
    status,
    sort,
    dir,
    page,
    pageSize,
  };
}

export function buildMilestonesTableQueryString(
  current: { toString(): string } | URLSearchParams | string,
  state: MilestonesTableViewState
): string {
  const params = new URLSearchParams(
    typeof current === 'string' ? current : current.toString()
  );

  if (state.search.trim()) {
    params.set(SEARCH_PARAM, state.search.trim());
  } else {
    params.delete(SEARCH_PARAM);
  }

  if (state.status && state.status !== 'All') {
    params.set(STATUS_PARAM, state.status);
  } else {
    params.delete(STATUS_PARAM);
  }

  if (state.sort !== 'dueDate' || state.dir !== 'none') {
    params.set(SORT_PARAM, state.sort);
    params.set(DIR_PARAM, state.dir);
  } else {
    params.delete(SORT_PARAM);
    params.delete(DIR_PARAM);
  }

  if (state.page > 1) {
    params.set(PAGE_PARAM, String(state.page));
  } else {
    params.delete(PAGE_PARAM);
  }

  if (state.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set(PAGE_SIZE_PARAM, String(state.pageSize));
  } else {
    params.delete(PAGE_SIZE_PARAM);
  }

  return params.toString();
}

export function isMilestonesTableUrlInSync(
  getParam: (key: string) => string | null,
  state: MilestonesTableViewState
): boolean {
  const parsed = parseMilestonesTableUrlState(getParam);
  return (
    parsed.search === state.search &&
    parsed.status === state.status &&
    parsed.sort === state.sort &&
    parsed.dir === state.dir &&
    parsed.page === state.page &&
    parsed.pageSize === state.pageSize
  );
}

export function distinctMilestoneStatuses(
  milestones: readonly Milestone[]
): string[] {
  const set = new Set<string>();
  for (const m of milestones) {
    if (m.status) set.add(m.status);
  }
  return Array.from(set).sort();
}
