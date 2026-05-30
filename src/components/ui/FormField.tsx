import React from 'react';

export interface FormFieldProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  required?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  hint,
  containerClassName = '',
  required = false,
  children,
}) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  let ariaDescribedBy = '';
  if (error) ariaDescribedBy += errorId;
  if (hint) ariaDescribedBy += (ariaDescribedBy ? ' ' : '') + hintId;

  const childProps = children.props;
  const originalClassName = typeof childProps.className === 'string' ? childProps.className : '';
  const childType = children.type;

  const className = `${originalClassName} ${
    childType === 'select' ? 'form-select' : 
    childType === 'textarea' ? 'form-textarea' : 'form-input'
  }`.trim();

  // Clone child element and inject relevant props
  const clonedChild = React.cloneElement(children, {
    id,
    className,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': ariaDescribedBy || undefined,
    required: required || Boolean(childProps.required),
  });

  return (
    <div className={`form-group ${containerClassName}`.trim()}>
      {label && (
        <label htmlFor={id} id={`${id}-label`} className="form-label">
          {label}
          {required && <span className="form-required" aria-hidden="true"> *</span>}
        </label>
      )}
      {clonedChild}
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
};
