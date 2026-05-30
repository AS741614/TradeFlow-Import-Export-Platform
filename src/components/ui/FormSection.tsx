import React from 'react';

export interface FormSectionProps {
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  id,
  title,
  description,
  className = '',
  children,
}) => {
  return (
    <section id={id} className={`form-section ${className}`.trim()} aria-labelledby={`${id}-title`}>
      <div className="form-section-header">
        <h3 id={`${id}-title`} className="form-section-title">
          {title}
        </h3>
        {description && (
          <p id={`${id}-description`} className="form-section-description">
            {description}
          </p>
        )}
      </div>
      <div className="form-section-content">
        {children}
      </div>
    </section>
  );
};
