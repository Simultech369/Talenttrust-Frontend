import { useState, useCallback, useMemo } from 'react';
import type { FieldSchema } from '../lib/milestoneFormSchema';
import { validateFormBySchema, getFieldError } from '../lib/schemaValidator';
import type { ValidationError } from '../lib/validateLogin';
import { combineValidators } from '../lib/fieldValidators';

export interface UseSchemaFormOptions {
  schema: FieldSchema[];
  initialValues: Record<string, string>;
}

export interface UseSchemaFormReturn {
  values: Record<string, string>;
  errors: ValidationError[];
  touched: Record<string, boolean>;
  isValid: boolean;
  setValue: (field: string, value: string) => void;
  setTouched: (field: string) => void;
  validate: () => ValidationError[];
  getFieldError: (fieldId: string) => string | undefined;
  getFieldProps: (fieldName: string) => { value: string; error?: string; validate: (value: string) => string | null };
  resetForm: () => void;
  firstInvalidFieldId: string | null;
}

export function useSchemaForm({ schema, initialValues }: UseSchemaFormOptions): UseSchemaFormReturn {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isValid = errors.length === 0;

  const firstInvalidFieldId = useMemo(() => {
    return errors.length > 0 ? errors[0].fieldId : null;
  }, [errors]);

  const setValue = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    
    // Find the field schema to clear its error
    const fieldSchema = schema.find((s) => s.name === field);
    if (fieldSchema) {
      setErrors((prev) => prev.filter((e) => e.fieldId !== fieldSchema.fieldId));
    }
  }, [schema]);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = validateFormBySchema(schema, values);
    setErrors(newErrors);
    
    // Mark all fields as touched on full validation
    const allTouched: Record<string, boolean> = {};
    schema.forEach(field => {
      allTouched[field.name] = true;
    });
    setTouched(allTouched);
    
    return newErrors;
  }, [schema, values]);

  const getError = useCallback((fieldId: string) => {
    return getFieldError(errors, fieldId);
  }, [errors]);

  const getFieldProps = useCallback((fieldName: string) => {
    const fieldSchema = schema.find((s) => s.name === fieldName);
    if (!fieldSchema) {
      throw new Error(`Field ${fieldName} not found in schema`);
    }

    const validateFn = combineValidators(fieldSchema.validators);
    
    return {
      value: values[fieldName] ?? '',
      error: getError(fieldSchema.fieldId),
      validate: validateFn,
    };
  }, [schema, values, getError]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors([]);
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouched: setFieldTouched,
    validate,
    getFieldError: getError,
    getFieldProps,
    resetForm,
    firstInvalidFieldId,
  };
}
