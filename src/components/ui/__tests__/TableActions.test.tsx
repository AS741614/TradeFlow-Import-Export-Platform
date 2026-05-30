import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableActions } from '../TableActions';
import { describe, it, expect, vi } from 'vitest';

describe('TableActions', () => {
  it('does not render when selectedCount is 0', () => {
    const { container } = render(
      <TableActions id="actions-test" selectedCount={0} onClearSelection={vi.fn()}>
        <button>Delete</button>
      </TableActions>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders select actions panel when selectedCount is > 0', () => {
    const handleClear = vi.fn();
    render(
      <TableActions id="actions-test" selectedCount={5} onClearSelection={handleClear}>
        <button id="btn-delete">Delete</button>
      </TableActions>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
