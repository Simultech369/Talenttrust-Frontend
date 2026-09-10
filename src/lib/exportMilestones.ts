/**
 * exportMilestones.ts
 *
 * Client-side CSV and JSON export for milestones.
 * Includes RFC 4180 compliant escaping and formula-injection (CSV Injection / CWE-1236)
 * neutralization for leading '=', '+', '-', '@', '\t', and '\r'.
 */

import type { Milestone } from '@/types/domain';

/**
 * Characters that spreadsheet software (Excel, Google Sheets, LibreOffice)
 * may interpret as formula starters or macro execution commands.
 */
export const FORMULA_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'] as const;

/**
 * Neutralizes formula injection vulnerabilities in CSV cells.
 * If a value starts with '=', '+', '-', '@', or whitespace control characters,
 * it is prefixed with a single quote (') to force spreadsheets to treat the cell
 * as literal text rather than an executable formula.
 *
 * @param value - The raw cell value.
 * @returns The neutralized string.
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.length === 0) {
    return '';
  }

  // Neutralize if leading character or leading character after whitespace triggers formula execution
  const trimmedLeading = str.trimStart();
  if (
    FORMULA_INJECTION_PREFIXES.some(
      (prefix) => str.startsWith(prefix) || trimmedLeading.startsWith(prefix),
    )
  ) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escapes a single cell value for CSV output according to RFC 4180:
 * - Neutralizes formula injection characters.
 * - Wraps the value in double quotes if it contains commas, double quotes, or newlines.
 * - Escapes existing double quotes by doubling them ("").
 *
 * @param value - The raw cell value.
 * @returns RFC 4180 compliant CSV string representation.
 */
export function escapeCSV(value: unknown): string {
  const sanitized = sanitizeCsvField(value);
  if (
    sanitized.includes(',') ||
    sanitized.includes('"') ||
    sanitized.includes('\n') ||
    sanitized.includes('\r')
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export const escapeCSVCell = escapeCSV;

/**
 * Standard CSV column headers for milestone export.
 */
export const MILESTONE_CSV_HEADERS = [
  'ID',
  'Title',
  'Status',
  'Payout',
  'Currency',
  'Due Date',
  'Contract ID',
] as const;

/**
 * Converts an array of milestones to an RFC 4180 CSV string with safe escaping.
 * Returns headers only if the milestones array is empty.
 *
 * @param milestones - Array of milestones to export.
 * @returns Formatted CSV string.
 */
export function milestonesToCSV(milestones: Milestone[]): string {
  const headerRow = MILESTONE_CSV_HEADERS.join(',');
  if (!milestones || milestones.length === 0) {
    return headerRow;
  }

  const rows = milestones.map((m) =>
    [
      escapeCSV(m.id),
      escapeCSV(m.title),
      escapeCSV(m.status),
      escapeCSV(m.payout),
      escapeCSV(m.currency),
      escapeCSV(m.dueDate ?? ''),
      escapeCSV(m.contractId ?? ''),
    ].join(','),
  );

  return [headerRow, ...rows].join('\n');
}

export const toCSV = milestonesToCSV;

/**
 * Formats milestones as a pretty-printed JSON string.
 *
 * @param milestones - Array of milestones to export.
 * @returns JSON string representing the milestones array.
 */
export function milestonesToJSON(milestones: Milestone[]): string {
  return JSON.stringify(milestones ?? [], null, 2);
}

export const toJSON = milestonesToJSON;

/**
 * Creates an in-memory Blob and triggers a browser download.
 *
 * @param content - File content to download.
 * @param filename - Name for the downloaded file.
 * @param mimeType - MIME type for the Blob.
 */
export function triggerDownload(
  content: string,
  filename: string,
  mimeType: string,
): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download of the given milestones as a CSV file.
 *
 * @param milestones - The filtered/sorted milestones to export.
 * @param filename - Suggested download filename (defaults to "milestones.csv").
 */
export function exportMilestonesToCSV(
  milestones: Milestone[],
  filename = 'milestones.csv',
): void {
  const csv = milestonesToCSV(milestones);
  triggerDownload(csv, filename, 'text/csv;charset=utf-8;');
}

/**
 * Triggers a browser download of the given milestones as a JSON file.
 *
 * @param milestones - The filtered/sorted milestones to export.
 * @param filename - Suggested download filename (defaults to "milestones.json").
 */
export function exportMilestonesToJSON(
  milestones: Milestone[],
  filename = 'milestones.json',
): void {
  const json = milestonesToJSON(milestones);
  triggerDownload(json, filename, 'application/json;charset=utf-8;');
}
