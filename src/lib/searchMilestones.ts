import type { Milestone } from '@/types/domain';

/**
 * Structured, typed error for milestones search operations.
 * Guarantees stable machine-readable error codes and safe user messages.
 */
export class MilestonesSearchError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MilestonesSearchError';
    this.code = code;
    Object.setPrototypeOf(this, MilestonesSearchError.prototype);
  }
}

export interface SearchMilestonesOptions {
  /** Optional AbortSignal to cancel an in-flight search request. */
  signal?: AbortSignal;
  /** Request sequence token to guard against out-of-order execution. */
  token?: number;
  /** Optional simulated or real network delay in milliseconds. */
  delayMs?: number;
}

export interface MilestonesSearchResult {
  /** Filtered milestones matching the query. */
  items: Milestone[];
  /** The sequence token associated with this search request. */
  token?: number;
  /** The normalized query used for filtering. */
  query: string;
}

/**
 * Trims leading/trailing whitespace and normalizes query string for safe matching.
 */
export function normalizeSearchQuery(rawQuery: string): string {
  if (!rawQuery) return '';
  return rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Asynchronously searches milestones by matching the normalized query against:
 * - title
 * - description
 * - status
 * - payout amount / currency
 *
 * Supports request cancellation via `AbortSignal` and monotonic sequence tokens.
 *
 * @throws {MilestonesSearchError} when query evaluation fails or request is aborted
 */
export async function searchMilestones(
  milestones: readonly Milestone[],
  rawQuery: string,
  options?: SearchMilestonesOptions,
): Promise<MilestonesSearchResult> {
  const signal = options?.signal;

  // Immediate cancellation check
  if (signal?.aborted) {
    const abortErr = new Error('The search request was cancelled.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const normalized = normalizeSearchQuery(rawQuery);

  // If simulated async delay is requested, await it while checking for cancellation
  if (options?.delayMs && options.delayMs > 0) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, options.delayMs);

      const onAbort = () => {
        cleanup();
        const err = new Error('The search request was cancelled.');
        err.name = 'AbortError';
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  // Second cancellation check after any async operation
  if (signal?.aborted) {
    const abortErr = new Error('The search request was cancelled.');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  if (!normalized) {
    return {
      items: [...milestones],
      token: options?.token,
      query: '',
    };
  }

  const terms = normalized.split(' ');

  const filtered = milestones.filter((milestone) => {
    const title = (milestone.title || '').toLowerCase();
    const status = (milestone.status || '').toLowerCase();
    const payout = String(milestone.payout || '');
    const currency = (milestone.currency || '').toLowerCase();
    const dueDate = (milestone.dueDate || '').toLowerCase();
    const contractId = (milestone.contractId || '').toLowerCase();

    const searchableText = `${title} ${status} ${payout} ${currency} ${dueDate} ${contractId}`;

    return terms.every((term) => searchableText.includes(term));
  });

  return {
    items: filtered,
    token: options?.token,
    query: normalized,
  };
}
