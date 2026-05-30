import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormField } from '../FormField';
import { describe, it, expect } from 'vitest';

describe('FormField', () => {
  it('renders input child and injects base classes and attributes', () => {
    render(
      <FormField id="test-field" label="Name">
        <input placeholder="Enter name" />
      </FormField>
    );

    const input = screen.getByPlaceholderText('Enter name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-field');
    expect(input).toHaveClass('form-input');
    
    const label = screen.getByText('Name');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'test-field');
  });

  it('clones select child with select-specific class name', () => {
    render(
      <FormField id="select-field" label="Options">
        <select>
          <option value="1">One</option>
        </select>
      </FormField>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass('form-select');
  });

  it('renders error message, sets aria-invalid, and links via aria-describedby', () => {
    render(
      <FormField id="error-field" error="Invalid format">
        <input />
      </FormField>
    );

    const error = screen.getByRole('alert');
    const input = screen.getByRole('textbox');

    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent('Invalid format');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'error-field-error');
  });

  it('displays required asterisk on label when required is true', () => {
    render(
      <FormField id="req-field" label="Name" required>
        <input />
      </FormField>
    );

    const label = screen.getByText(/Name/);
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Name *');
  });
});
