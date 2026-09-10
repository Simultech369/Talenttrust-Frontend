import { validateFormBySchema, getFieldError } from '../schemaValidator';
import type { FieldSchema } from '../milestoneFormSchema';

describe('schemaValidator', () => {
  const dummySchema: FieldSchema[] = [
    {
      name: 'title',
      fieldId: 'milestone-title',
      type: 'text',
      required: true,
      validators: [
        (value: string) => (!value ? 'Title is required' : null),
        (value: string) => (value.length > 5 ? 'Title is too long' : null),
      ],
    },
    {
      name: 'payout',
      fieldId: 'milestone-payout',
      type: 'number',
      required: true,
      validators: [
        (value: string) => (!value ? 'Payout is required' : null),
        (value: string) => (parseFloat(value) < 0 ? 'Payout must be positive' : null),
      ],
    },
  ];

  describe('validateFormBySchema', () => {
    it('returns empty errors for valid values', () => {
      const values = { title: 'Test', payout: '100' };
      const errors = validateFormBySchema(dummySchema, values);
      expect(errors).toEqual([]);
    });

    it('returns errors for empty required fields', () => {
      const values = { title: '', payout: '' };
      const errors = validateFormBySchema(dummySchema, values);
      expect(errors).toEqual([
        { fieldId: 'milestone-title', message: 'Title is required' },
        { fieldId: 'milestone-payout', message: 'Payout is required' },
      ]);
    });

    it('returns correct error message for invalid payout', () => {
      const values = { title: 'Test', payout: '-10' };
      const errors = validateFormBySchema(dummySchema, values);
      expect(errors).toEqual([
        { fieldId: 'milestone-payout', message: 'Payout must be positive' },
      ]);
    });

    it('stops at first error per field', () => {
      // both missing title (triggers required) and we only want the first error
      // wait, the required validator returns 'Title is required'. length > 5 won't be hit for ''.
      // Let's trigger length > 5
      const values = { title: 'TooLongTitle', payout: '100' };
      const errors = validateFormBySchema(dummySchema, values);
      expect(errors).toEqual([
        { fieldId: 'milestone-title', message: 'Title is too long' },
      ]);
    });
  });

  describe('getFieldError', () => {
    it('returns the error message if field has an error', () => {
      const errors = [{ fieldId: 'milestone-title', message: 'Title is required' }];
      expect(getFieldError(errors, 'milestone-title')).toBe('Title is required');
    });

    it('returns undefined if field has no error', () => {
      const errors = [{ fieldId: 'milestone-title', message: 'Title is required' }];
      expect(getFieldError(errors, 'milestone-payout')).toBeUndefined();
    });
  });
});
