import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MilestonesBoardTable } from '../MilestonesBoardTable';
import type { Milestone } from '@/types/domain';

let mockParams = new URLSearchParams();
const mockReplace = jest.fn((url: string) => {
  mockParams = new URLSearchParams(url.startsWith('?') ? url.slice(1) : url);
});

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}));

describe('MilestonesBoardTable Component (#1098)', () => {
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
      title: 'Mainnet Deployment',
      status: 'Paid',
      payout: 2000,
      currency: 'USDC',
      dueDate: '2026-09-30T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the data table with sortable column headers', () => {
    render(<MilestonesBoardTable milestones={sampleMilestones} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Title/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Payout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Due Date/i })).toBeInTheDocument();

    expect(screen.getByText('Design Wireframes')).toBeInTheDocument();
    expect(screen.getByText('Smart Contract Escrow')).toBeInTheDocument();
    expect(screen.getByText('Mainnet Deployment')).toBeInTheDocument();
  });

  it('shows distinct empty state when no milestones exist', () => {
    const onAdd = jest.fn();
    render(<MilestonesBoardTable milestones={[]} onAddMilestone={onAdd} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No milestones tracked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('shows distinct filtered-empty state when filters match zero milestones', () => {
    render(<MilestonesBoardTable milestones={sampleMilestones} />);

    const searchInput = screen.getByLabelText(/Filter milestones by title/i);
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Nonexistent query 12345' } });
      jest.advanceTimersByTime(250);
    });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No milestones match this filter')).toBeInTheDocument();
  });

  it('handles interactive column sort toggle', () => {
    render(<MilestonesBoardTable milestones={sampleMilestones} />);

    const titleSortBtn = screen.getByRole('button', { name: /Sort by Title/i });
    act(() => {
      fireEvent.click(titleSortBtn);
    });

    expect(mockReplace).toHaveBeenCalledWith('?sort=title&dir=asc');
  });

  it('renders pagination controls and handles page navigation', () => {
    render(<MilestonesBoardTable milestones={sampleMilestones} pageSize={1} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /Previous page/i });
    const nextBtn = screen.getByRole('button', { name: /Next page/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    act(() => {
      fireEvent.click(nextBtn);
    });
    expect(mockReplace).toHaveBeenCalledWith('?page=2');
  });
});
