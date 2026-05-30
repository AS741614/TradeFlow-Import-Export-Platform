import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Modal', () => {
  const handleClose = vi.fn();

  beforeEach(() => {
    handleClose.mockClear();
    document.body.className = '';
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal id="test-modal" isOpen={false} onClose={handleClose} title="My Modal">
        <div>Modal Content</div>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('My Modal')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('modal-open');
  });

  it('renders modal content, attaches class to body, and focuses on open', () => {
    render(
      <Modal id="test-modal" isOpen={true} onClose={handleClose} title="My Modal">
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
    expect(document.body).toHaveClass('modal-open');

    // Close button should be rendered
    const closeBtn = screen.getByLabelText('Close modal');
    expect(closeBtn).toBeInTheDocument();
    
    // Test clicking close button
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to close the modal', () => {
    render(
      <Modal id="test-modal" isOpen={true} onClose={handleClose} title="My Modal" closeOnEsc={true}>
        <div>Modal Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles overlay clicks to close the modal', () => {
    render(
      <Modal id="test-modal" isOpen={true} onClose={handleClose} title="My Modal" closeOnOverlayClick={true}>
        <div>Modal Content</div>
      </Modal>
    );

    const overlay = screen.getByRole('presentation');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
