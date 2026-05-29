import React from 'react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ id, size = 'md', className = '', ...props }, ref) => {
    const sizeClass = `spinner-${size}`;
    const combinedClassName = `spinner ${sizeClass} ${className}`.trim();

    return (
      <div
        ref={ref}
        id={id}
        className={combinedClassName}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
