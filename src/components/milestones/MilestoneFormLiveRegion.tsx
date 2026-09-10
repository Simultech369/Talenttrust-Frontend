import React from 'react';

interface MilestoneFormLiveRegionProps {
  errors: { fieldId: string; message: string }[];
  /** When true, uses aria-live='assertive' (for submit attempts). Default: 'polite' */
  assertive?: boolean;
}

export function MilestoneFormLiveRegion({ errors, assertive = false }: MilestoneFormLiveRegionProps) {
  const hasErrors = errors.length > 0;
  
  let screenReaderText = 'Form is valid';
  if (hasErrors) {
    const errorMessages = errors.map(e => e.message).join(', ');
    screenReaderText = `${errors.length} error${errors.length === 1 ? '' : 's'}: ${errorMessages}`;
  }

  return (
    <div className="milestone-form-live-region">
      <div 
        aria-live={assertive ? 'assertive' : 'polite'}
        className="sr-only"
        role="status"
      >
        {screenReaderText}
      </div>
      
      {hasErrors && (
        <div className="error-count-badge" aria-hidden="true" data-testid="error-count-badge">
          {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
        </div>
      )}
    </div>
  );
}
