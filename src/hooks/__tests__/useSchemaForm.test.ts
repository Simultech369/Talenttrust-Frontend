import { renderHook, act } from '@testing-library/react';
import { useSchemaForm } from '../useSchemaForm';
import type { FieldSchema } from '../../lib/milestoneFormSchema';

describe('useSchemaForm', () => {
  const dummySchema: FieldSchema[] = [
    {
      name: 'title',
      fieldId: 'milestone-title',
      type: 'text',
      required: true,
      validators: [
        (value: string) => (!value ? 'Title is required' : null),
      ],
    },
    {
      name: 'payout',
      fieldId: 'milestone-payout',
      type: 'number',
      required: true,
      validators: [
        (value: string) => (!value ? 'Payout is required' : null),
      ],
    },
  ];

  const initialValues = {
    title: '',
    payout: '',
  };

  it('initializes with correct state', () => {
    const { result } = renderHook(() => useSchemaForm({ schema: dummySchema, initialValues }));
    
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual([]);
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(true);
    expect(result.current.firstInvalidFieldId).toBeNull();
  });

  it('setValue updates value and clears field error', () => {
    const { result } = renderHook(() => useSchemaForm({ schema: dummySchema, initialValues }));
    
    act(() => {
      result.current.validate();
    });
    
    expect(result.current.errors.length).toBe(2);
    
    act(() => {
      result.current.setValue('title', 'New Title');
    });
    
    expect(result.current.values.title).toBe('New Title');
    expect(result.current.errors).toEqual([
      { fieldId: 'milestone-payout', message: 'Payout is required' },
    ]);
  });

  it('validate() returns errors and updates state', () => {
    const { result } = renderHook(() => useSchemaForm({ schema: dummySchema, initialValues }));
    
    let errors: any;
    act(() => {
      errors = result.current.validate();
    });
    
    expect(errors.length).toBe(2);
    expect(result.current.errors).toEqual(errors);
    expect(result.current.isValid).toBe(false);
    expect(result.current.touched).toEqual({ title: true, payout: true });
  });

  it('firstInvalidFieldId returns the first field with an error', () => {
    const { result } = renderHook(() => useSchemaForm({ schema: dummySchema, initialValues }));
    
    act(() => {
      result.current.validate();
    });
    
    expect(result.current.firstInvalidFieldId).toBe('milestone-title');
  });

  it('resetForm resets state to initial', () => {
    const { result } = renderHook(() => useSchemaForm({ schema: dummySchema, initialValues }));
    
    act(() => {
      result.current.setValue('title', 'Test');
      result.current.setTouched('title');
      result.current.validate();
    });
    
    act(() => {
      result.current.resetForm();
    });
    
    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual([]);
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(true);
  });

  it('getFieldProps returns correct value, error, and validate function', () => {
    const { result } = renderHook(() => useSchemaForm({ schema: dummySchema, initialValues }));
    
    act(() => {
      result.current.validate();
    });
    
    const props = result.current.getFieldProps('title');
    expect(props.value).toBe('');
    expect(props.error).toBe('Title is required');
    expect(props.validate('')).toBe('Title is required');
    expect(props.validate('Test')).toBeNull();
  });
});
