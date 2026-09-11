import {
  applyMilestonesTableView,
  parseMilestonesTableUrlState,
  buildMilestonesTableQueryString,
  isMilestonesTableUrlInSync,
  nextSortDir,
  ariaSortValue,
  DEFAULT_VIEW_STATE,
} from '../milestonesTableModel';
import type { Milestone } from '@/types/domain';

describe('milestonesTableModel Pure Tests (#1098)', () => {
  const sampleMilestones: Milestone[] = [
    {
      id: 'm-1',
      title: 'Design Wireframes',
      status: 'Completed',
      payout: 500,
      currency: 'USDC',
      dueDate: '2026-09-01T00:00:00Z',
    },
    {
      id: 'm-2',
      title: 'Smart Contract Escrow',
      status: 'Pending',
      payout: 1500,
      currency: 'USDC',
      dueDate: '2026-09-15T00:00:00Z',
    },
    {
      id: 'm-3',
      title: 'Security Audit',
      status: 'Pending',
      payout: 1500, // Same payout as m-2 to test tie-breaking
      currency: 'USDC',
      dueDate: '2026-09-20T00:00:00Z',
    },
    {
      id: 'm-4',
      title: 'Mainnet Deployment',
      status: 'Paid',
      payout: 2000,
      currency: 'USDC',
      dueDate: '2026-09-30T00:00:00Z',
    },
  ];

  it('cycles sort directions correctly', () => {
    expect(nextSortDir('none')).toBe('asc');
    expect(nextSortDir('asc')).toBe('desc');
    expect(nextSortDir('desc')).toBe('none');

    expect(ariaSortValue('asc')).toBe('ascending');
    expect(ariaSortValue('desc')).toBe('descending');
    expect(ariaSortValue('none')).toBe('none');
  });

  it('sorts columns in asc and desc directions', () => {
    // Sort by title asc
    const byTitleAsc = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      sort: 'title',
      dir: 'asc',
      pageSize: 10,
    });
    expect(byTitleAsc.rows[0].title).toBe('Design Wireframes');
    expect(byTitleAsc.rows[3].title).toBe('Smart Contract Escrow');

    // Sort by title desc
    const byTitleDesc = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      sort: 'title',
      dir: 'desc',
      pageSize: 10,
    });
    expect(byTitleDesc.rows[0].title).toBe('Smart Contract Escrow');
    expect(byTitleDesc.rows[3].title).toBe('Design Wireframes');

    // Sort by payout desc
    const byPayoutDesc = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      sort: 'payout',
      dir: 'desc',
      pageSize: 10,
    });
    expect(byPayoutDesc.rows[0].payout).toBe(2000);
    expect(byPayoutDesc.rows[3].payout).toBe(500);
  });

  it('provides stable sorting with deterministic tie-breaking for equal keys', () => {
    // m-2 and m-3 have payout: 1500
    const res = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      sort: 'payout',
      dir: 'asc',
      pageSize: 10,
    });

    const equalPayoutRows = res.rows.filter((r) => r.payout === 1500);
    expect(equalPayoutRows).toHaveLength(2);
    // m-2 comes before m-3 because 'm-2'.localeCompare('m-3') < 0
    expect(equalPayoutRows[0].id).toBe('m-2');
    expect(equalPayoutRows[1].id).toBe('m-3');
  });

  it('filters by search term and status enum', () => {
    // Filter by text search
    const searchRes = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      search: 'audit',
      pageSize: 10,
    });
    expect(searchRes.rows).toHaveLength(1);
    expect(searchRes.rows[0].title).toBe('Security Audit');

    // Filter by status
    const statusRes = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      status: 'Pending',
      pageSize: 10,
    });
    expect(statusRes.rows).toHaveLength(2);
    expect(statusRes.rows.every((r) => r.status === 'Pending')).toBe(true);

    // Empty result when filter yields no matches
    const noMatchRes = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      search: 'Nonexistent milestone keyword',
      pageSize: 10,
    });
    expect(noMatchRes.totalFiltered).toBe(0);
    expect(noMatchRes.rows).toHaveLength(0);
    expect(noMatchRes.totalCount).toBe(4);
  });

  it('paginates rows and clamps page within valid bounds', () => {
    // Page 1 with pageSize: 2
    const page1 = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      page: 1,
      pageSize: 2,
    });
    expect(page1.totalPages).toBe(2);
    expect(page1.rows).toHaveLength(2);

    // Clamps page exceeding totalPages
    const clampedHigh = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      page: 99,
      pageSize: 2,
    });
    expect(clampedHigh.page).toBe(2);
    expect(clampedHigh.rows).toHaveLength(2);

    // Clamps page below 1
    const clampedLow = applyMilestonesTableView(sampleMilestones, {
      ...DEFAULT_VIEW_STATE,
      page: 0,
      pageSize: 2,
    });
    expect(clampedLow.page).toBe(1);
  });

  it('parses and serializes URL query parameters', () => {
    const params = new URLSearchParams('q=contract&status=Pending&sort=payout&dir=desc&page=2');
    const parsed = parseMilestonesTableUrlState((k) => params.get(k));

    expect(parsed.search).toBe('contract');
    expect(parsed.status).toBe('Pending');
    expect(parsed.sort).toBe('payout');
    expect(parsed.dir).toBe('desc');
    expect(parsed.page).toBe(2);

    // Build query string back
    const qs = buildMilestonesTableQueryString('', parsed);
    expect(qs).toContain('q=contract');
    expect(qs).toContain('status=Pending');
    expect(qs).toContain('sort=payout');
    expect(qs).toContain('dir=desc');
    expect(qs).toContain('page=2');

    expect(isMilestonesTableUrlInSync((k) => params.get(k), parsed)).toBe(true);
  });
});
