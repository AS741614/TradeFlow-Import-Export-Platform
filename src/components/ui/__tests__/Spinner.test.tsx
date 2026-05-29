import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';
import { describe, it, expect } from 'vitest';

describe('Spinner', () => {
  it('renders spinner with accessibility labels', () => {
    render(<Spinner id="spinner-test" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('id', 'spinner-test');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies sizing classes correctly', () => {
    const { rerender } = render(<Spinner id="spinner-test" size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('spinner-sm');

    rerender(<Spinner id="spinner-test" size="md" />);
    expect(screen.getByRole('status')).toHaveClass('spinner-md');

    rerender(<Spinner id="spinner-test" size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('spinner-lg');
  });

  it('supports ref forwarding', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Spinner id="spinner-test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
