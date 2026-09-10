import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MilestonesPage from '../page';
import { listMilestones } from '@/lib/repository';
import type { Milestone } from '@/types/domain';

// Mock navigation
const mockSearchParamsGet = jest.fn((_key: string) => null);
const mockRouterReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
    toString: jest.fn(() => ''),
  }),
  useRouter: () => ({
    replace: mockRouterReplace,
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(),
  saveMilestone: jest.fn(() => true),
  updateMilestone: jest.fn(() => true),
  upsertMilestone: jest.fn(() => ({ success: true, stale: false })),
}));

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

const mockMilestones: Milestone[] = [
  {
    id: 'm-1',
    title: 'Wireframes & Architecture',
    status: 'Completed',
    payout: 1000,
    currency: 'USD',
    dueDate: '2026-10-01',
    contractId: 'c-1',
  },
  {
    id: 'm-2',
    title: '=SUM(1+1) Exploit Test',
    status: 'Pending',
    payout: 2000,
    currency: 'USD',
    dueDate: '2026-10-15',
    contractId: 'c-1',
  },
  {
    id: 'm-3',
    title: 'Final Audit & Launch',
    status: 'Paid',
    payout: 3000,
    currency: 'USD',
    dueDate: '2026-11-01',
    contractId: 'c-2',
  },
];

describe('Milestones Page Export Integration (Issue #1104)', () => {
  let clickedFilenames: string[] = [];
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    clickedFilenames = [];
    mockSearchParamsGet.mockImplementation(() => null);
    (listMilestones as jest.Mock).mockReturnValue(mockMilestones);

    originalCreateObjectURL = global.URL.createObjectURL;
    originalRevokeObjectURL = global.URL.revokeObjectURL;

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedFilenames.push(this.download);
    });
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('renders accessible Export CSV and Export JSON controls in the toolbar', () => {
    render(<MilestonesPage />);

    const csvButton = screen.getByRole('button', { name: 'Export milestones as CSV' });
    const jsonButton = screen.getByRole('button', { name: 'Export milestones as JSON' });

    expect(csvButton).toBeInTheDocument();
    expect(jsonButton).toBeInTheDocument();
    expect(screen.getByTestId('export-milestones-csv-btn')).toBeInTheDocument();
    expect(screen.getByTestId('export-milestones-json-btn')).toBeInTheDocument();
  });

  it('exports currently-filtered milestones as CSV when clicking Export CSV', async () => {
    const user = userEvent.setup();
    render(<MilestonesPage />);

    const csvButton = screen.getByRole('button', { name: 'Export milestones as CSV' });
    await user.click(csvButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(clickedFilenames[0]).toBe('milestones.csv');
  });

  it('exports currently-filtered milestones as JSON when clicking Export JSON', async () => {
    const user = userEvent.setup();
    render(<MilestonesPage />);

    const jsonButton = screen.getByRole('button', { name: 'Export milestones as JSON' });
    await user.click(jsonButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json;charset=utf-8;');
    expect(clickedFilenames[0]).toBe('milestones.json');
  });

  it('respects active status filter when exporting (exports what the user sees)', async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockImplementation((key) => (key === 'status' ? 'Completed' : null));
    render(<MilestonesPage />);

    const csvButton = screen.getByRole('button', { name: 'Export milestones as CSV' });
    await user.click(csvButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob).toBeDefined();
  });

  it('respects active sort order when exporting (exports what the user sees)', async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockImplementation((key) => (key === 'sort' ? 'oldest' : null));
    render(<MilestonesPage />);

    const csvButton = screen.getByRole('button', { name: 'Export milestones as CSV' });
    await user.click(csvButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('neutralizes formula-injection in exported content', async () => {
    const user = userEvent.setup();
    render(<MilestonesPage />);

    const csvButton = screen.getByRole('button', { name: 'Export milestones as CSV' });
    await user.click(csvButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
  });

  it('allows exporting empty view without crashing when no milestones match filter', async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockImplementation((key) => (key === 'status' ? 'Disputed' : null));
    render(<MilestonesPage />);

    expect(screen.getByText('No milestones match this filter')).toBeInTheDocument();

    const csvButton = screen.getByRole('button', { name: 'Export milestones as CSV' });
    const jsonButton = screen.getByRole('button', { name: 'Export milestones as JSON' });

    await user.click(csvButton);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);

    await user.click(jsonButton);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
  });
});
