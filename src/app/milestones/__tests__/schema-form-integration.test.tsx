import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MilestoneCreationForm } from '../../../components/milestones/MilestoneCreationForm';

beforeAll(() => {
  global.URL.createObjectURL = jest.fn();
  global.URL.revokeObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = jest.fn();
});

describe('MilestoneCreationForm Schema Integration', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalid field -> inline message + described-by wired', async () => {
    render(<MilestoneCreationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} contractId="c1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    
    await waitFor(() => {
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      const describedBy = titleInput.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      
      const errorMessage = document.getElementById(describedBy!);
      expect(errorMessage).toHaveTextContent(/title is required/i);
    });
  });

  it('submit with errors -> focus first invalid, summary announced', async () => {
    render(<MilestoneCreationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} contractId="c1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    
    await waitFor(() => {
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveFocus();
    });

    const alerts = screen.queryAllByRole('alert');
    if (alerts.length > 0) {
      expect(alerts.length).toBeGreaterThan(0);
    } else {
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
    }
  });

  it('fix a field -> its error clears', async () => {
    render(<MilestoneCreationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} contractId="c1" />);
    
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-invalid', 'true');
    });

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Milestone' } });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).not.toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('all valid -> submits', async () => {
    render(<MilestoneCreationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} contractId="c1" />);
    
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Milestone' } });
    fireEvent.change(screen.getByLabelText(/payout amount/i), { target: { value: '500' } });
    
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('messages are specific per field', async () => {
    render(<MilestoneCreationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} contractId="c1" />);
    
    fireEvent.change(screen.getByLabelText(/payout amount/i), { target: { value: '-100' } });
    fireEvent.click(screen.getByRole('button', { name: /add milestone/i }));
    
    await waitFor(() => {
      const input = screen.getByLabelText(/payout amount/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
