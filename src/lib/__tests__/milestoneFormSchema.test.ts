import { MILESTONE_FORM_SCHEMA } from '../milestoneFormSchema';

describe('MILESTONE_FORM_SCHEMA', () => {
  it('covers all 5 fields', () => {
    const fieldNames = MILESTONE_FORM_SCHEMA.map((field) => field.name);
    expect(fieldNames).toEqual(['title', 'payout', 'currency', 'dueDate', 'status']);
  });

  it('has correct validators for each field', () => {
    MILESTONE_FORM_SCHEMA.forEach((field) => {
      expect(Array.isArray(field.validators)).toBe(true);
      expect(field.validators.length).toBeGreaterThan(0);
      field.validators.forEach((validator) => {
        expect(typeof validator).toBe('function');
      });
    });
  });
});
