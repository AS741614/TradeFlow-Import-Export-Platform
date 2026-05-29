import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, containerClassName = '', className = '', ...props }, ref) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    let ariaDescribedBy = '';
    if (error) ariaDescribedBy += errorId;
    if (hint) ariaDescribedBy += (ariaDescribedBy ? ' ' : '') + hintId;

    return (
      <div className={`form-group ${containerClassName}`.trim()}>
        {label && (
          <label htmlFor={id} id={`${id}-label`} className="form-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`form-input ${className}`.trim()}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy || undefined}
          {...props}
        />
        {hint && (
          <span id={hintId} className="form-hint">
            {hint}
          </span>
        )}
        {error && (
          <span id={errorId} className="form-error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
