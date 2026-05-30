import React from 'react';

export interface TableActionsProps {
  id: string;
  selectedCount: number;
  onClearSelection: () => void;
  children: React.ReactNode;
  className?: string;
}

export const TableActions: React.FC<TableActionsProps> = ({
  id,
  selectedCount,
  onClearSelection,
  children,
  className = '',
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={`table-actions-bar animate-fade-in ${className}`.trim()} id={id} role="toolbar">
      <div className="table-actions-info">
        <span className="selected-count-badge">{selectedCount}</span>
        <span className="selected-count-text">selected</span>
        <button
          id={`${id}-clear`}
          type="button"
          className="btn-clear-selection"
          onClick={onClearSelection}
        >
          Clear
        </button>
      </div>
      <div className="table-actions-buttons">
        {children}
      </div>
    </div>
  );
};
