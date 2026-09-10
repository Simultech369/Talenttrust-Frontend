import React, { useState, useCallback, FormEvent, useRef, useEffect } from 'react';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { MilestoneFormLiveRegion } from '@/components/milestones/MilestoneFormLiveRegion';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { sanitizeUserText } from '@/lib/sanitizeUserText';
import {
  MAX_MILESTONE_TITLE_LENGTH,
  ALLOWED_CURRENCIES,
  ALLOWED_STATUSES,
} from '@/lib/validateMilestone';
import type { Milestone } from '@/types/domain';
import { useSchemaForm } from '@/hooks/useSchemaForm';
import { MILESTONE_FORM_SCHEMA } from '@/lib/milestoneFormSchema';

// Re-export so existing imports of MAX_MILESTONE_TITLE_LENGTH from this module
// continue to work without breaking changes.
export { MAX_MILESTONE_TITLE_LENGTH };

/** Status options available when creating a milestone. */
const STATUS_OPTIONS = ALLOWED_STATUSES as unknown as Milestone['status'][];

/** Currency options available when creating a milestone. */
const CURRENCY_OPTIONS = ALLOWED_CURRENCIES;

export interface MilestoneCreationFormProps {
  onSubmit: (milestone: Milestone) => void;
  onCancel: () => void;
  contractId?: string;
}

export const MilestoneCreationForm: React.FC<MilestoneCreationFormProps> = ({
  onSubmit,
  onCancel,
  contractId,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  const {
    values,
    errors,
    setValue,
    validate,
    getFieldProps,
    firstInvalidFieldId,
  } = useSchemaForm({
    schema: MILESTONE_FORM_SCHEMA,
    initialValues: {
      title: '',
      payout: '',
      currency: 'USD',
      status: 'Pending',
      dueDate: '',
    },
  });

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitAttempts((prev) => prev + 1);
      
      const validationErrors = validate();

      if (validationErrors.length > 0) return;

      const sanitizedTitle = sanitizeUserText(values.title, MAX_MILESTONE_TITLE_LENGTH);
      const slug = sanitizedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const id = `${slug}-${Date.now()}`;

      const milestone: Milestone = {
        id,
        title: sanitizedTitle,
        status: values.status as Milestone['status'],
        payout: parseFloat(values.payout),
        currency: values.currency.trim(),
        dueDate: values.dueDate.trim() || undefined,
        contractId,
      };

      onSubmit(milestone);
    },
    [values, contractId, validate, onSubmit],
  );

  useEffect(() => {
    if (submitAttempts > 0 && errors.length > 0 && firstInvalidFieldId) {
      const firstInvalidEl = document.getElementById(firstInvalidFieldId);
      if (firstInvalidEl) {
        firstInvalidEl.focus();
      }
    }
  }, [submitAttempts, errors, firstInvalidFieldId]);

  useDialogFocusTrap({
    isOpen: true,
    dialogRef,
    initialFocusRef: titleInputRef,
    onEscape: onCancel,
    restoreFocus: true,
  });

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
      role="dialog"
      aria-labelledby="create-milestone-title"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="create-milestone-title"
          className="text-2xl font-bold text-slate-900 mb-6"
        >
          Add Milestone
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <MilestoneFormLiveRegion errors={errors} assertive={submitAttempts > 0} />
          <ErrorSummary errors={errors} />

          <FormField
            label="Title"
            id="milestone-title"
            {...getFieldProps('title')}
            required
          >
            <input
              ref={titleInputRef}
              type="text"
              value={values.title}
              onChange={(e) => setValue('title', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Frontend Development – Sprint 1"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Payout Amount"
              id="milestone-payout"
              {...getFieldProps('payout')}
              required
            >
              <input
                type="text"
                inputMode="decimal"
                value={values.payout}
                onChange={(e) => setValue('payout', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2500"
              />
            </FormField>

            <FormField
              label="Currency"
              id="milestone-currency"
              {...getFieldProps('currency')}
              required
            >
              <select
                value={values.currency}
                onChange={(e) => setValue('currency', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField 
            label="Status" 
            id="milestone-status" 
            {...getFieldProps('status')}
          >
            <select
              value={values.status}
              onChange={(e) => setValue('status', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Due Date"
            id="milestone-dueDate"
            helperText="Optional — e.g., Jun 1, 2025"
            {...getFieldProps('dueDate')}
          >
            <input
              type="text"
              value={values.dueDate}
              onChange={(e) => setValue('dueDate', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jun 1, 2025"
            />
          </FormField>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Add Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
