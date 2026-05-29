import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';
import { describe, it, expect } from 'vitest';

describe('Card', () => {
  it('renders children within card body', () => {
    render(<Card>Hello Content</Card>);
    expect(screen.getByText('Hello Content')).toBeInTheDocument();
    expect(screen.getByText('Hello Content')).toHaveClass('card-body');
  });

  it('applies default layout class', () => {
    const { container } = render(<Card>Content</Card>);
    const cardDiv = container.firstChild;
    expect(cardDiv).toHaveClass('card');
    expect(cardDiv).not.toHaveClass('card-glass');
    expect(cardDiv).not.toHaveClass('card-interactive');
  });

  it('applies glass class when glass variant is specified', () => {
    const { container } = render(<Card variant="glass">Content</Card>);
    const cardDiv = container.firstChild;
    expect(cardDiv).toHaveClass('card-glass');
  });

  it('applies interactive hover class when specified', () => {
    const { container } = render(<Card isInteractive>Content</Card>);
    const cardDiv = container.firstChild;
    expect(cardDiv).toHaveClass('card-interactive');
  });

  it('renders header and footer slots correctly', () => {
    render(
      <Card header={<div>My Header</div>} footer={<div>My Footer</div>}>
        Main Content
      </Card>
    );

    const header = screen.getByText('My Header');
    const body = screen.getByText('Main Content');
    const footer = screen.getByText('My Footer');

    expect(header).toBeInTheDocument();
    expect(header.parentElement).toHaveClass('card-header');

    expect(body).toBeInTheDocument();
    expect(body).toHaveClass('card-body');

    expect(footer).toBeInTheDocument();
    expect(footer.parentElement).toHaveClass('card-footer');
  });
});
