import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';
import { describe, it, expect, vi } from 'vitest';

describe('Input', () => {
  it('renders input field with basic props', () => {
    render(<Input id="input-test" placeholder="Enter text..." />);
    const input = screen.getByPlaceholderText('Enter text...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'input-test');
    expect(input).toHaveClass('form-input');
  });

  it('renders label linked to input', () => {
    render(<Input id="input-test" label="Username" />);
    const label = screen.getByText('Username');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('id', 'input-test-label');
    expect(label).toHaveAttribute('for', 'input-test');
  });

  it('renders hint message and associates with input via aria-describedby', () => {
    render(<Input id="input-test" hint="Must be 8 characters long" />);
    const hint = screen.getByText('Must be 8 characters long');
    const input = screen.getByRole('textbox');
    
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveAttribute('id', 'input-test-hint');
    expect(input).toHaveAttribute('aria-describedby', 'input-test-hint');
  });

  it('renders error message, sets aria-invalid, and associates via aria-describedby', () => {
    render(<Input id="input-test" error="Required field" />);
    const error = screen.getByRole('alert');
    const input = screen.getByRole('textbox');

    expect(error).toBeInTheDocument();
    expect(error).toHaveAttribute('id', 'input-test-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'input-test-error');
  });

  it('associates both hint and error in aria-describedby when both are present', () => {
    render(<Input id="input-test" hint="Be careful" error="Required" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'input-test-error input-test-hint');
  });

  it('handles change events correctly', () => {
    const handleChange = vi.fn();
    render(<Input id="input-test" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'testing' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('supports ref forwarding', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input id="input-test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
