import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MilestoneFormLiveRegion } from '../MilestoneFormLiveRegion';

describe('MilestoneFormLiveRegion', () => {
  it('renders with no errors -> "Form is valid" text (sr-only)', () => {
    render(<MilestoneFormLiveRegion errors={[]} />);
    const srElement = screen.getByText('Form is valid');
    expect(srElement).toBeInTheDocument();
    expect(srElement).toHaveClass('sr-only');
    expect(srElement).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByTestId('error-count-badge')).not.toBeInTheDocument();
  });

  it('renders with errors -> error count and messages', () => {
    const errors = [
      { fieldId: 'title', message: 'Title is required' },
      { fieldId: 'date', message: 'Date is invalid' }
    ];
    render(<MilestoneFormLiveRegion errors={errors} />);
    const srElement = screen.getByText('2 errors: Title is required, Date is invalid');
    expect(srElement).toBeInTheDocument();
    
    const badge = screen.getByTestId('error-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2 Errors');
  });

  it('uses aria-live="assertive" when assertive prop is true', () => {
    render(<MilestoneFormLiveRegion errors={[]} assertive={true} />);
    const srElement = screen.getByText('Form is valid');
    expect(srElement).toHaveAttribute('aria-live', 'assertive');
  });
});
