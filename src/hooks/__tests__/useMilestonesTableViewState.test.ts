import { renderHook, act } from '@testing-library/react';
import {
  useMilestonesTableViewState,
  URL_DEBOUNCE_MS,
} from '../useMilestonesTableViewState';
import { useSearchParams, useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

describe('useMilestonesTableViewState Hook (#1098)', () => {
  const replaceMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: replaceMock });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes default state when URL search params are empty', () => {
    const { result } = renderHook(() => useMilestonesTableViewState());

    expect(result.current.view.search).toBe('');
    expect(result.current.view.status).toBe('All');
    expect(result.current.view.sort).toBe('dueDate');
    expect(result.current.view.dir).toBe('none');
    expect(result.current.view.page).toBe(1);
  });

  it('restores state from URL search params on mount', () => {
    const params = new URLSearchParams('q=contract&status=Pending&sort=payout&dir=desc&page=3');
    (useSearchParams as jest.Mock).mockReturnValue(params);

    const { result } = renderHook(() => useMilestonesTableViewState());

    expect(result.current.view.search).toBe('contract');
    expect(result.current.searchInput).toBe('contract');
    expect(result.current.view.status).toBe('Pending');
    expect(result.current.view.sort).toBe('payout');
    expect(result.current.view.dir).toBe('desc');
    expect(result.current.view.page).toBe(3);
  });

  it('debounces search text input before pushing to URL', () => {
    const { result } = renderHook(() => useMilestonesTableViewState());

    act(() => {
      result.current.setSearchInput('escrow');
    });

    // Input updates immediately for responsive UI
    expect(result.current.searchInput).toBe('escrow');
    expect(replaceMock).not.toHaveBeenCalled();

    // Advance debounce timer
    act(() => {
      jest.advanceTimersByTime(URL_DEBOUNCE_MS);
    });

    expect(replaceMock).toHaveBeenCalledWith('?q=escrow');
    expect(result.current.view.search).toBe('escrow');
  });

  it('cycles sort direction and syncs to URL', () => {
    const { result } = renderHook(() => useMilestonesTableViewState());

    // Cycle 'title': none -> asc
    act(() => {
      result.current.cycleSort('title');
    });
    expect(result.current.view.sort).toBe('title');
    expect(result.current.view.dir).toBe('asc');
    expect(replaceMock).toHaveBeenCalledWith('?sort=title&dir=asc');

    // Cycle 'title' again: asc -> desc
    act(() => {
      result.current.cycleSort('title');
    });
    expect(result.current.view.dir).toBe('desc');
    expect(replaceMock).toHaveBeenCalledWith('?sort=title&dir=desc');

    // Cycle 'title' again: desc -> none
    act(() => {
      result.current.cycleSort('title');
    });
    expect(result.current.view.dir).toBe('none');
  });

  it('updates status and resets page to 1', () => {
    const params = new URLSearchParams('page=4');
    (useSearchParams as jest.Mock).mockReturnValue(params);

    const { result } = renderHook(() => useMilestonesTableViewState());

    act(() => {
      result.current.setStatus('Completed');
    });

    expect(result.current.view.status).toBe('Completed');
    expect(result.current.view.page).toBe(1);
    expect(replaceMock).toHaveBeenCalledWith('?status=Completed');
  });

  it('updates page number cleanly', () => {
    const { result } = renderHook(() => useMilestonesTableViewState());

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.view.page).toBe(2);
    expect(replaceMock).toHaveBeenCalledWith('?page=2');
  });
});
