import { renderHook, act } from '@testing-library/react';
import { useDebouncedMilestonesSearch } from '../useDebouncedMilestonesSearch';
import type { Milestone } from '@/types/domain';
import { searchMilestones, MilestonesSearchError } from '@/lib/searchMilestones';

const mockMilestones: Milestone[] = [
  {
    id: 'ms-1',
    title: 'Alpha Release',
    status: 'Completed',
    payout: 1000,
    currency: 'USD',
  },
  {
    id: 'ms-2',
    title: 'Beta Release',
    status: 'Pending',
    payout: 2000,
    currency: 'USD',
  },
  {
    id: 'ms-3',
    title: 'Gamma Release',
    status: 'Paid',
    payout: 3000,
    currency: 'EUR',
  },
];

describe('useDebouncedMilestonesSearch hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('initializes with idle status, empty query, and all milestones', () => {
    const { result } = renderHook(() => useDebouncedMilestonesSearch(mockMilestones));

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('typing quickly: executes only one query after the pause (debouncing)', async () => {
    const customSearch = jest.fn(searchMilestones);
    const { result } = renderHook(() =>
      useDebouncedMilestonesSearch(mockMilestones, { debounceMs: 300, searchFn: customSearch }),
    );

    // Rapid keystrokes: 'a', 'al', 'alp', 'alpha' within 100ms
    act(() => {
      result.current.setQuery('a');
    });
    jest.advanceTimersByTime(50);

    act(() => {
      result.current.setQuery('al');
    });
    jest.advanceTimersByTime(50);

    act(() => {
      result.current.setQuery('alp');
    });
    jest.advanceTimersByTime(50);

    act(() => {
      result.current.setQuery('alpha');
    });

    // Before debounce fires: searchFn has not been called yet
    expect(customSearch).not.toHaveBeenCalled();

    // Advance past debounce pause (300ms)
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Exactly one search query dispatched
    expect(customSearch).toHaveBeenCalledTimes(1);
    expect(result.current.query).toBe('alpha');
    expect(result.current.debouncedQuery).toBe('alpha');
    expect(result.current.status).toBe('success');
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('ms-1');
  });

  it('fast then slow response: newest result wins (out-of-order race guard)', async () => {
    let resolveFirst: (val: any) => void;
    let resolveSecond: (val: any) => void;

    const mockSearchFn = jest.fn()
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveFirst = res;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveSecond = res;
          }),
      );

    const { result } = renderHook(() =>
      useDebouncedMilestonesSearch(mockMilestones, { debounceMs: 100, searchFn: mockSearchFn }),
    );

    // User types 'alpha'
    act(() => {
      result.current.setQuery('alpha');
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.status).toBe('loading');

    // User types 'beta' before 'alpha' resolved
    act(() => {
      result.current.setQuery('beta');
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now resolve the SECOND request ('beta') FIRST (fast network)
    await act(async () => {
      resolveSecond({
        items: [mockMilestones[1]],
        query: 'beta',
        token: 2,
      });
    });

    expect(result.current.status).toBe('success');
    expect(result.current.results[0].title).toBe('Beta Release');

    // Now resolve the FIRST request ('alpha') LATER (slow out-of-order response)
    await act(async () => {
      resolveFirst({
        items: [mockMilestones[0]],
        query: 'alpha',
        token: 1,
      });
    });

    // Stale response from first request must be ignored! Newest ('beta') remains!
    expect(result.current.status).toBe('success');
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Beta Release');
    expect(result.current.debouncedQuery).toBe('beta');
  });

  it('no matches: enters distinct empty state', async () => {
    const { result } = renderHook(() =>
      useDebouncedMilestonesSearch(mockMilestones, { debounceMs: 100 }),
    );

    act(() => {
      result.current.setQuery('NonexistentMilestoneXYZ');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.status).toBe('empty');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('cleared input: resets results immediately and aborts in-flight search', async () => {
    const { result } = renderHook(() =>
      useDebouncedMilestonesSearch(mockMilestones, { debounceMs: 100 }),
    );

    act(() => {
      result.current.setQuery('gamma');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current.results).toHaveLength(1);

    // Now clear input
    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.debouncedQuery).toBe('');
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('error: enters error state and allows retry', async () => {
    const failingSearch = jest
      .fn()
      .mockRejectedValueOnce(new MilestonesSearchError('SERVER_UNAVAILABLE', 'Backend error occurred'))
      .mockResolvedValueOnce({
        items: [mockMilestones[2]],
        query: 'gamma',
        token: 2,
      });

    const { result } = renderHook(() =>
      useDebouncedMilestonesSearch(mockMilestones, { debounceMs: 100, searchFn: failingSearch }),
    );

    act(() => {
      result.current.setQuery('gamma');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // In error state
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual({
      code: 'SERVER_UNAVAILABLE',
      message: 'Backend error occurred',
    });

    // Call retry
    await act(async () => {
      result.current.retry();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].title).toBe('Gamma Release');
    expect(result.current.error).toBeNull();
  });
});
