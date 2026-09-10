import type { FieldSchema } from './milestoneFormSchema';
import type { ValidationError } from './validateLogin';

export function validateFormBySchema(schema: FieldSchema[], values: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of schema) {
    const value = values[field.name] ?? '';
    
    for (const validator of field.validators) {
      const errorMessage = validator(value);
      if (errorMessage) {
        errors.push({ fieldId: field.fieldId, message: errorMessage });
        break; // Stop at first error per field
      }
    }
  }

  return errors;
}

export function getFieldError(errors: ValidationError[], fieldId: string): string | undefined {
  return errors.find((e) => e.fieldId === fieldId)?.message;
}
