import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MilestonesPage from '../page';
import * as repository from '@/lib/repository';
import * as safeStorage from '@/lib/safeStorage';

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(),
  saveMilestone: jest.fn(),
}));

describe('MilestonesPage fetch state machine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('empty result -> empty state only', async () => {
    (repository.listMilestones as jest.Mock).mockReturnValue([]);
    jest.spyOn(safeStorage, 'getItem').mockReturnValue('true');

    render(<MilestonesPage />);

    expect(screen.getAllByText('No milestones tracked')[0]).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Phase 1')).not.toBeInTheDocument();
  });

  it('error -> error + retry only', async () => {
    (repository.listMilestones as jest.Mock).mockImplementation(() => {
      throw new Error('Repository failure');
    });

    render(<MilestonesPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByText('Unable to load milestones')[0]).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
  });

  it('success -> content only', async () => {
    (repository.listMilestones as jest.Mock).mockReturnValue([
      { id: '1', title: 'Phase 1', status: 'Pending', payout: 100, currency: 'USD' }
    ]);

    render(<MilestonesPage />);

    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('retry -> returns to loading then resolves', async () => {
    (repository.listMilestones as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Transient failure');
    });

    render(<MilestonesPage />);

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    (repository.listMilestones as jest.Mock).mockReturnValue([
      { id: '1', title: 'Phase 2', status: 'Pending', payout: 100, currency: 'USD' }
    ]);

    const user = userEvent.setup();
    await user.click(retryBtn);

    // After clicking retry, it sets loading state and queues a microtask
    // act() will wait for the microtask to finish, so it will go straight to success.
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
