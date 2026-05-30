import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormSection } from '../FormSection';
import { describe, it, expect } from 'vitest';

describe('FormSection', () => {
  it('renders section title and description correctly', () => {
    render(
      <FormSection id="test-sec" title="Profile Details" description="Tell us about yourself">
        <input placeholder="Username" />
      </FormSection>
    );

    const heading = screen.getByRole('heading', { level: 3, name: 'Profile Details' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'test-sec-title');

    const desc = screen.getByText('Tell us about yourself');
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveAttribute('id', 'test-sec-description');

    const input = screen.getByPlaceholderText('Username');
    expect(input).toBeInTheDocument();
  });
});
