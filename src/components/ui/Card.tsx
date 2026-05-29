import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
  isInteractive?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  isInteractive = false,
  header,
  footer,
  className = '',
  ...props
}) => {
  const variantClass = variant === 'glass' ? 'card-glass' : '';
  const interactiveClass = isInteractive ? 'card-interactive' : '';
  const combinedClassName = `card ${variantClass} ${interactiveClass} ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {header && <div className="card-header">{header}</div>}
      {children && <div className="card-body">{children}</div>}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};
