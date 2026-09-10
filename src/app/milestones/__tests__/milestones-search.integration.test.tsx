import { render, screen, fireEvent, act } from '@testing-library/react';
import MilestonesPage from '../page';
import * as repository from '@/lib/repository';
import * as searchMilestonesModule from '@/lib/searchMilestones';
import type { Milestone } from '@/types/domain';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSearchParamsGet = jest.fn((_key: string) => null);

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsGet(key),
    toString: () => '',
  }),
}));

jest.mock('@/lib/safeStorage', () => ({
  getItem: jest.fn(() => 'true'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  listMilestones: jest.fn(),
}));

const mockMilestonesData: Milestone[] = [
  {
    id: 'ms-1',
    title: 'Alpha Kickoff Spec',
    status: 'Completed',
    payout: 2500,
    currency: 'USD',
    dueDate: '2026-03-15',
  },
  {
    id: 'ms-2',
    title: 'Beta UI Implementation',
    status: 'Pending',
    payout: 4000,
    currency: 'USD',
    dueDate: '2026-04-01',
  },
  {
    id: 'ms-3',
    title: 'Gamma Smart Contract Audit',
    status: 'Disputed',
    payout: 6000,
    currency: 'EUR',
    dueDate: '2026-04-15',
  },
];

describe('Milestones Board Search Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet.mockImplementation(() => null);
    (repository.listMilestones as jest.Mock).mockReturnValue(mockMilestonesData);
  });

  it('renders search bar with searchbox role and accessible labels', () => {
    render(<MilestonesPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search milestones...');
  });

  it('filters displayed milestones when typing query after debounce pause', async () => {
    jest.useFakeTimers();
    render(<MilestonesPage />);

    // Initially all 3 milestones are visible
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();
    expect(screen.getByText('Beta UI Implementation')).toBeInTheDocument();
    expect(screen.getByText('Gamma Smart Contract Audit')).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });

    // Rapid typing
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
    });

    // Before debounce fires: all 3 still visible
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();

    // Advance debounce timer (300ms)
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Only Beta milestone remains
    expect(screen.getByText('Beta UI Implementation')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Kickoff Spec')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Smart Contract Audit')).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it('renders distinct empty state when no milestones match query and clears via action button', async () => {
    jest.useFakeTimers();
    render(<MilestonesPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'NonexistentSearchTerm' } });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Verify empty state is rendered
    expect(screen.getByText('No milestones match your search')).toBeInTheDocument();
    expect(
      screen.getByText(/We couldn't find any milestones matching "NonexistentSearchTerm"/i),
    ).toBeInTheDocument();

    // Clear search using the empty state action button
    const clearBtns = screen.getAllByRole('button', { name: /clear search/i });
    act(() => {
      fireEvent.click(clearBtns[clearBtns.length - 1]);
    });

    // Restores original milestones
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();
    expect(screen.getByText('Beta UI Implementation')).toBeInTheDocument();
    expect(screen.getByText('Gamma Smart Contract Audit')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('clears query and restores results when clicking the clear button in search input', async () => {
    jest.useFakeTimers();
    render(<MilestonesPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Beta UI Implementation')).not.toBeInTheDocument();

    // Click the inline clear button
    const clearInputBtn = screen.getByTestId('clear-milestones-search-btn');
    expect(clearInputBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(clearInputBtn);
    });

    expect((searchInput as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();
    expect(screen.getByText('Beta UI Implementation')).toBeInTheDocument();
    expect(screen.getByText('Gamma Smart Contract Audit')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('clears query when pressing Escape key inside the searchbox', async () => {
    jest.useFakeTimers();
    render(<MilestonesPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Beta UI Implementation')).not.toBeInTheDocument();

    // Press Escape
    act(() => {
      fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });
    });

    expect((searchInput as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Beta UI Implementation')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('combines search query with status filter', async () => {
    jest.useFakeTimers();
    // Simulate active status filter 'Completed' in URL
    mockSearchParamsGet.mockImplementation((key) => (key === 'status' ? 'Completed' : null));

    render(<MilestonesPage />);

    // Only 'Alpha Kickoff Spec' has status Completed
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();
    expect(screen.queryByText('Beta UI Implementation')).not.toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });

    // Search for 'Alpha' (matches Completed item)
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();

    // Search for 'Beta' (Beta is Pending, not Completed, so intersection is empty)
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Beta' } });
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByText('No milestones match this filter')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('displays search error banner with retry button on search failure', async () => {
    jest.useFakeTimers();
    const spy = jest
      .spyOn(searchMilestonesModule, 'searchMilestones')
      .mockRejectedValueOnce(
        new searchMilestonesModule.MilestonesSearchError('NETWORK_FAULT', 'Search engine disconnected'),
      )
      .mockResolvedValueOnce({
        items: [mockMilestonesData[0]],
        token: 2,
        query: 'alpha',
      });

    render(<MilestonesPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search milestones/i });

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'alpha' } });
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Error banner should appear
    const errorBanner = screen.getByTestId('milestones-search-error-banner');
    expect(errorBanner).toBeInTheDocument();
    expect(errorBanner).toHaveAttribute('role', 'alert');
    expect(screen.getByText('Search engine disconnected')).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByTestId('retry-milestones-search-btn');
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // Error banner is cleared and results are rendered
    expect(screen.queryByTestId('milestones-search-error-banner')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha Kickoff Spec')).toBeInTheDocument();

    spy.mockRestore();
    jest.useRealTimers();
  });
});
