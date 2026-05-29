import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      id,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantClass = `btn-${variant}`;
    const sizeClass = size !== 'md' ? `btn-${size}` : '';
    const combinedClassName = `btn ${variantClass} ${sizeClass} ${className}`.trim();

    return (
      <button
        ref={ref}
        id={id}
        type={type}
        className={combinedClassName}
        disabled={disabled ? true : isLoading}
        aria-busy={isLoading ? true : undefined}
        {...props}
      >
        {isLoading && <Spinner size="sm" id={`${id}-spinner`} />}
        {!isLoading && leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
