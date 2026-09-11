import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MilestonesPage from '../page';
import { ToastProvider } from '@/components/toast/toast-provider';
import type { Milestone } from '@/types/domain';

let mockUrlSearchParams = new URLSearchParams();
const mockReplace = jest.fn((url: string) => {
  mockUrlSearchParams = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url);
});

const stableSearchParams = {
  get: (key: string) => mockUrlSearchParams.get(key),
  toString: () => mockUrlSearchParams.toString(),
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => stableSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

const mockMilestones: Milestone[] = [
  {
    id: 'm-beta',
    title: 'Beta Testing Phase',
    status: 'Pending',
    payout: 1000,
    currency: 'USDC',
    dueDate: '2026-10-15T00:00:00Z',
  },
  {
    id: 'm-alpha',
    title: 'Alpha Prototype',
    status: 'Completed',
    payout: 1000, // Equal payout to test stable sorting
    currency: 'USDC',
    dueDate: '2026-09-01T00:00:00Z',
  },
  {
    id: 'm-gamma',
    title: 'Gamma Release',
    status: 'Paid',
    payout: 2500,
    currency: 'USDC',
    dueDate: '2026-12-01T00:00:00Z',
  },
];

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(() => mockMilestones),
  saveMilestone: jest.fn(),
}));

jest.mock('@/lib/safeStorage', () => ({
  getItem: jest.fn(() => 'true'),
  setItem: jest.fn(),
}));

describe('Milestones Board Table Integration (#1098)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUrlSearchParams = new URLSearchParams('view=table');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderPage = () => {
    return render(
      <ToastProvider>
        <MilestonesPage />
      </ToastProvider>
    );
  };

  it('Edge case 1: sort a column -> rows reorder and URL updates', () => {
    renderPage();

    expect(screen.getByRole('table')).toBeInTheDocument();

    const titleSortBtn = screen.getByRole('button', { name: /Sort by Title/i });
    act(() => {
      fireEvent.click(titleSortBtn);
    });

    expect(mockReplace).toHaveBeenCalledWith('?view=table&sort=title&dir=asc');

    const cells = screen.getAllByRole('cell');
    const renderedTitles = cells
      .filter((c) => ['Alpha Prototype', 'Beta Testing Phase', 'Gamma Release'].includes(c.textContent || ''))
      .map((c) => c.textContent);

    expect(renderedTitles).toEqual([
      'Alpha Prototype',
      'Beta Testing Phase',
      'Gamma Release',
    ]);
  });

  it('Edge case 2: filter -> rows narrow and URL updates with debounce', () => {
    renderPage();

    const searchInput = screen.getByLabelText(/Filter milestones by title/i);
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Prototype' } });
      jest.advanceTimersByTime(250);
    });

    expect(mockReplace).toHaveBeenCalledWith('?view=table&q=Prototype');
    expect(screen.getByText('Alpha Prototype')).toBeInTheDocument();
    expect(screen.queryByText('Beta Testing Phase')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Release')).not.toBeInTheDocument();
  });

  it('Edge case 3: reload with query params -> state restored from URL', () => {
    mockUrlSearchParams = new URLSearchParams('view=table&sort=payout&dir=desc&status=Pending');

    renderPage();

    expect(screen.getByRole('table')).toBeInTheDocument();

    const statusSelect = screen.getByLabelText(/Filter milestones by status/i) as HTMLSelectElement;
    expect(statusSelect.value).toBe('Pending');

    expect(screen.getByText('Beta Testing Phase')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Prototype')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Release')).not.toBeInTheDocument();
  });

  it('Edge case 4: filtered to empty -> distinct empty state with reset button', () => {
    renderPage();

    const searchInput = screen.getByLabelText(/Filter milestones by title/i);
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Zebra Nonexistent' } });
      jest.advanceTimersByTime(250);
    });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No milestones match this filter')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term or status filter.')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset filters/i });
    act(() => {
      fireEvent.click(resetBtn);
    });

    expect(mockReplace).toHaveBeenLastCalledWith('?view=table');
  });

  it('Edge case 5: sort is stable for equal keys with deterministic tie-breaking', () => {
    renderPage();

    const payoutSortBtn = screen.getByRole('button', { name: /Sort by Payout/i });
    act(() => {
      fireEvent.click(payoutSortBtn);
    });

    expect(mockReplace).toHaveBeenCalledWith('?view=table&sort=payout&dir=asc');

    const cells = screen.getAllByRole('cell');
    const renderedTitles = cells
      .filter((c) => ['Alpha Prototype', 'Beta Testing Phase', 'Gamma Release'].includes(c.textContent || ''))
      .map((c) => c.textContent);

    expect(renderedTitles[0]).toBe('Alpha Prototype');
    expect(renderedTitles[1]).toBe('Beta Testing Phase');
    expect(renderedTitles[2]).toBe('Gamma Release');
  });

  it('View switcher toggles between Cards and Table views cleanly', () => {
    mockUrlSearchParams = new URLSearchParams('');
    renderPage();

    const tableToggleBtn = screen.getByRole('button', { name: 'Table' });
    const cardsToggleBtn = screen.getByRole('button', { name: 'Cards' });

    expect(cardsToggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tableToggleBtn).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      fireEvent.click(tableToggleBtn);
    });

    expect(mockReplace).toHaveBeenCalledWith('?view=table');
  });
});
