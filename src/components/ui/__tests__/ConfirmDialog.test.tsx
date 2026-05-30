import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { describe, it, expect, vi } from 'vitest';

describe('ConfirmDialog', () => {
  it('renders confirmation text and triggers action buttons', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        id="confirm-test"
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Record"
        message="Are you absolutely sure you want to delete this?"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
      />
    );

    expect(screen.getByText('Delete Record')).toBeInTheDocument();
    expect(screen.getByText('Are you absolutely sure you want to delete this?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'No, Keep' });
    const confirmBtn = screen.getByRole('button', { name: 'Yes, Delete' });

    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
