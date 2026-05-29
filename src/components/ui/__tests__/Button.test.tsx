import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';
import { describe, it, expect, vi } from 'vitest';

describe('Button', () => {
  it('renders button with children', () => {
    render(<Button id="btn-test">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('id', 'btn-test');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button id="btn-test" variant="primary">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button id="btn-test" variant="secondary">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<Button id="btn-test" variant="ghost">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');

    rerender(<Button id="btn-test" variant="danger">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button id="btn-test" size="sm">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');

    rerender(<Button id="btn-test" size="md">Click</Button>);
    expect(screen.getByRole('button')).not.toHaveClass('btn-sm');
    expect(screen.getByRole('button')).not.toHaveClass('btn-lg');

    rerender(<Button id="btn-test" size="lg">Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('handles loading state correctly', () => {
    render(<Button id="btn-test" isLoading>Click</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button id="btn-test" onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports ref forwarding', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button id="btn-test" ref={ref}>Click</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
