import {
  validateRequired,
  validateMaxLength,
  validatePositiveNumber,
  validateDecimalPlaces,
  validateAllowedValues,
  validateDueDate,
} from './fieldValidators';

import {
  MAX_MILESTONE_TITLE_LENGTH,
  MAX_PAYOUT_VALUE,
  MAX_PAYOUT_DECIMAL_PLACES,
  ALLOWED_CURRENCIES,
  ALLOWED_STATUSES,
} from './validateMilestone';

export interface FieldSchema {
  name: string;
  fieldId: string;
  type: 'text' | 'number' | 'select' | 'date';
  required: boolean;
  validators: Array<(value: string) => string | null>;
}

export const MILESTONE_FORM_SCHEMA: FieldSchema[] = [
  {
    name: 'title',
    fieldId: 'milestone-title',
    type: 'text',
    required: true,
    validators: [
      validateRequired('Title'),
      validateMaxLength('Title', MAX_MILESTONE_TITLE_LENGTH),
    ],
  },
  {
    name: 'payout',
    fieldId: 'milestone-payout',
    type: 'number',
    required: true,
    validators: [
      validateRequired('Payout amount'),
      validatePositiveNumber('Payout'),
      (value: string) => {
        if (!value.trim()) return null;
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed > MAX_PAYOUT_VALUE) {
          return `Payout must be no more than ${MAX_PAYOUT_VALUE.toLocaleString()}`;
        }
        return null;
      },
      validateDecimalPlaces('Payout', MAX_PAYOUT_DECIMAL_PLACES),
    ],
  },
  {
    name: 'currency',
    fieldId: 'milestone-currency',
    type: 'select',
    required: true,
    validators: [
      validateRequired('Currency'),
      validateAllowedValues('Currency', ALLOWED_CURRENCIES as readonly string[]),
    ],
  },
  {
    name: 'dueDate',
    fieldId: 'milestone-dueDate',
    type: 'date',
    required: false,
    validators: [
      validateDueDate(),
    ],
  },
  {
    name: 'status',
    fieldId: 'milestone-status',
    type: 'select',
    required: false,
    validators: [
      (value: string) => {
        if (!value.trim()) return null;
        return validateAllowedValues('Status', ALLOWED_STATUSES as readonly string[])(value);
      }
    ],
  },
];
