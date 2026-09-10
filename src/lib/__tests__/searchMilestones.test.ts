import {
  searchMilestones,
  normalizeSearchQuery,
  MilestonesSearchError,
} from '../searchMilestones';
import type { Milestone } from '@/types/domain';

const mockMilestones: Milestone[] = [
  {
    id: 'ms-1',
    title: 'Project Kickoff & Requirements',
    status: 'Completed',
    payout: 2500,
    currency: 'USD',
    dueDate: '2026-03-15',
  },
  {
    id: 'ms-2',
    title: 'Frontend UI Implementation',
    status: 'Pending',
    payout: 4000,
    currency: 'USD',
    dueDate: '2026-04-01',
  },
  {
    id: 'ms-3',
    title: 'Smart Contract Audit & Deployment',
    status: 'Disputed',
    payout: 6000,
    currency: 'EUR',
    dueDate: '2026-04-15',
  },
];

describe('searchMilestones unit tests', () => {
  describe('normalizeSearchQuery', () => {
    it('returns empty string for null, undefined, or empty query', () => {
      expect(normalizeSearchQuery('')).toBe('');
      expect(normalizeSearchQuery('   ')).toBe('');
      expect(normalizeSearchQuery(null as any)).toBe('');
    });

    it('trims leading/trailing whitespace and normalizes spaces', () => {
      expect(normalizeSearchQuery('   frontend   ui   ')).toBe('frontend ui');
      expect(normalizeSearchQuery('\t\n  Audit   \r')).toBe('audit');
    });

    it('converts to lowercase', () => {
      expect(normalizeSearchQuery('Smart CONTRACT')).toBe('smart contract');
    });
  });

  describe('searchMilestones functionality', () => {
    it('returns all items when query is empty', async () => {
      const result = await searchMilestones(mockMilestones, '');
      expect(result.items).toHaveLength(3);
      expect(result.query).toBe('');
    });

    it('matches by title case-insensitively', async () => {
      const result = await searchMilestones(mockMilestones, 'KICKOFF');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('ms-1');
    });

    it('matches by dueDate', async () => {
      const result = await searchMilestones(mockMilestones, '2026-03');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('ms-1');
    });

    it('matches by status', async () => {
      const result = await searchMilestones(mockMilestones, 'disputed');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('ms-3');
    });

    it('matches by payout and currency', async () => {
      const result = await searchMilestones(mockMilestones, '4000');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('ms-2');

      const eurResult = await searchMilestones(mockMilestones, 'eur');
      expect(eurResult.items).toHaveLength(1);
      expect(eurResult.items[0].id).toBe('ms-3');
    });

    it('returns empty array when no matches are found', async () => {
      const result = await searchMilestones(mockMilestones, 'nonexistent query 12345');
      expect(result.items).toHaveLength(0);
      expect(result.query).toBe('nonexistent query 12345');
    });

    it('preserves request token in the result', async () => {
      const result = await searchMilestones(mockMilestones, 'ui', { token: 42 });
      expect(result.token).toBe(42);
    });

    it('aborts immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        searchMilestones(mockMilestones, 'frontend', { signal: controller.signal }),
      ).rejects.toThrow('The search request was cancelled.');
    });

    it('aborts during async delay when signal triggers', async () => {
      const controller = new AbortController();
      const searchPromise = searchMilestones(mockMilestones, 'frontend', {
        signal: controller.signal,
        delayMs: 100,
      });

      // Abort after 20ms
      setTimeout(() => controller.abort(), 20);

      await expect(searchPromise).rejects.toThrow('The search request was cancelled.');
    });
  });

  describe('MilestonesSearchError', () => {
    it('constructs structured error with code and message', () => {
      const err = new MilestonesSearchError('SEARCH_TIMEOUT', 'Request took too long');
      expect(err.code).toBe('SEARCH_TIMEOUT');
      expect(err.message).toBe('Request took too long');
      expect(err.name).toBe('MilestonesSearchError');
      expect(err instanceof Error).toBe(true);
      expect(err instanceof MilestonesSearchError).toBe(true);
    });
  });
});
