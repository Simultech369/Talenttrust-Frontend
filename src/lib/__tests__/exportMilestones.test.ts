import {
  escapeCSV,
  sanitizeCsvField,
  milestonesToCSV,
  milestonesToJSON,
  exportMilestonesToCSV,
  exportMilestonesToJSON,
  triggerDownload,
  MILESTONE_CSV_HEADERS,
} from '../exportMilestones';
import type { Milestone } from '@/types/domain';

const sampleMilestone: Milestone = {
  id: 'ms-1',
  title: 'Design Wireframes',
  status: 'Completed',
  payout: 1200,
  currency: 'USD',
  dueDate: '2026-10-15',
  contractId: 'contract-42',
};

const formulaMilestone: Milestone = {
  id: 'ms-2',
  title: '=SUM(A1:B10)',
  status: 'Pending',
  payout: 500,
  currency: 'USD',
  dueDate: '2026-11-01',
  contractId: 'contract-42',
};

describe('exportMilestones - CSV Formula Injection & Escaping', () => {
  describe('sanitizeCsvField', () => {
    it('neutralizes cell starting with =', () => {
      expect(sanitizeCsvField('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvField('=SUM(A1:B1)')).toBe("'=SUM(A1:B1)");
      expect(sanitizeCsvField('=cmd|"/C calc"!A0')).toBe("'=cmd|\"/C calc\"!A0");
    });

    it('neutralizes cell starting with +', () => {
      expect(sanitizeCsvField('+12345')).toBe("'+12345");
      expect(sanitizeCsvField('+cmd')).toBe("'+cmd");
    });

    it('neutralizes cell starting with -', () => {
      expect(sanitizeCsvField('-calc')).toBe("'-calc");
      expect(sanitizeCsvField('-50')).toBe("'-50");
    });

    it('neutralizes cell starting with @', () => {
      expect(sanitizeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
    });

    it('neutralizes cell starting with leading tab or carriage return', () => {
      expect(sanitizeCsvField('\t=1+1')).toBe("'\t=1+1");
      expect(sanitizeCsvField('\r=1+1')).toBe("'\r=1+1");
    });

    it('neutralizes cell starting with whitespace followed by formula character', () => {
      expect(sanitizeCsvField('   =SUM(A1)')).toBe("'   =SUM(A1)");
    });

    it('leaves benign string unchanged', () => {
      expect(sanitizeCsvField('Design Wireframes')).toBe('Design Wireframes');
      expect(sanitizeCsvField('Phase 2 Delivery')).toBe('Phase 2 Delivery');
    });

    it('handles null and undefined gracefully', () => {
      expect(sanitizeCsvField(null)).toBe('');
      expect(sanitizeCsvField(undefined)).toBe('');
    });
  });

  describe('escapeCSV', () => {
    it('escapes cells with commas by wrapping in double quotes', () => {
      expect(escapeCSV('Design, Architecture, Testing')).toBe(
        '"Design, Architecture, Testing"',
      );
    });

    it('escapes cells with quotes by doubling internal quotes and wrapping', () => {
      expect(escapeCSV('Phase "Alpha" Build')).toBe('"Phase ""Alpha"" Build"');
    });

    it('escapes cells with newlines by wrapping in double quotes', () => {
      expect(escapeCSV('Phase 1\nPhase 2')).toBe('"Phase 1\nPhase 2"');
      expect(escapeCSV('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"');
    });

    it('neutralizes formula injection AND escapes commas/quotes properly', () => {
      expect(escapeCSV('=SUM(A1, B1)')).toBe('"\'=SUM(A1, B1)"');
      expect(escapeCSV('=HYPERLINK("http://evil.com","Click")')).toBe(
        '"\'=HYPERLINK(""http://evil.com"",""Click"")"',
      );
    });

    it('returns empty string for null and undefined', () => {
      expect(escapeCSV(null)).toBe('');
      expect(escapeCSV(undefined)).toBe('');
    });
  });

  describe('milestonesToCSV', () => {
    it('produces valid CSV with header and data rows', () => {
      const csv = milestonesToCSV([sampleMilestone]);
      const lines = csv.split('\n');

      expect(lines[0]).toBe(MILESTONE_CSV_HEADERS.join(','));
      expect(lines[1]).toBe('ms-1,Design Wireframes,Completed,1200,USD,2026-10-15,contract-42');
    });

    it('neutralizes cell starting with = in the generated CSV', () => {
      const csv = milestonesToCSV([formulaMilestone]);
      expect(csv).toContain("'=SUM(A1:B10)");
      expect(csv).not.toContain(',=SUM(A1:B10),');
    });

    it('handles empty view and returns headers only', () => {
      const csv = milestonesToCSV([]);
      expect(csv).toBe('ID,Title,Status,Payout,Currency,Due Date,Contract ID');
      expect(csv.split('\n')).toHaveLength(1);
    });

    it('handles missing optional fields (dueDate, contractId) defensively', () => {
      const partialMilestone: Milestone = {
        id: 'ms-sparse',
        title: 'Minimal Milestone',
        status: 'Pending',
        payout: 100,
        currency: 'USD',
      };
      const csv = milestonesToCSV([partialMilestone]);
      expect(csv).toContain('ms-sparse,Minimal Milestone,Pending,100,USD,,');
    });

    it('correctly handles multiple milestones', () => {
      const ms3: Milestone = {
        id: 'ms-3',
        title: 'Deployment & QA',
        status: 'Paid',
        payout: 2500,
        currency: 'XLM',
        dueDate: '2026-12-01',
        contractId: 'contract-99',
      };
      const csv = milestonesToCSV([sampleMilestone, formulaMilestone, ms3]);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[1]).toContain('Design Wireframes');
      expect(lines[2]).toContain("'=SUM(A1:B10)");
      expect(lines[3]).toContain('Deployment & QA');
    });
  });

  describe('milestonesToJSON & round-trip', () => {
    it('JSON export round-trips correctly', () => {
      const milestones: Milestone[] = [sampleMilestone, formulaMilestone];
      const json = milestonesToJSON(milestones);
      const roundTripped = JSON.parse(json);

      expect(roundTripped).toEqual(milestones);
      expect(roundTripped[0].title).toBe('Design Wireframes');
      expect(roundTripped[1].title).toBe('=SUM(A1:B10)');
    });

    it('handles empty view -> valid empty export (empty array JSON)', () => {
      const json = milestonesToJSON([]);
      expect(json).toBe('[]');
      expect(JSON.parse(json)).toEqual([]);
    });

    it('formats pretty-printed JSON with indentation', () => {
      const json = milestonesToJSON([sampleMilestone]);
      expect(json).toContain('\n  ');
    });
  });

  describe('triggerDownload & export wrappers', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = global.URL.createObjectURL;
      originalRevokeObjectURL = global.URL.revokeObjectURL;
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      jest.spyOn(document.body, 'appendChild').mockImplementation((el: Node) => el);
      jest.spyOn(document.body, 'removeChild').mockImplementation((el: Node) => el);
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
      jest.restoreAllMocks();
    });

    it('triggerDownload creates a blob, appends anchor, clicks it, and revokes URL', () => {
      triggerDownload('test-content', 'test.csv', 'text/csv');
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('exportMilestonesToCSV triggers download with custom or default filename', () => {
      exportMilestonesToCSV([sampleMilestone]);
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

      exportMilestonesToCSV([sampleMilestone], 'custom-milestones.csv');
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
    });

    it('exportMilestonesToJSON triggers download with custom or default filename', () => {
      exportMilestonesToJSON([sampleMilestone]);
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

      exportMilestonesToJSON([sampleMilestone], 'custom-milestones.json');
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
    });

    it('handles empty view without crashing on download trigger', () => {
      expect(() => exportMilestonesToCSV([])).not.toThrow();
      expect(() => exportMilestonesToJSON([])).not.toThrow();
    });
  });
});
