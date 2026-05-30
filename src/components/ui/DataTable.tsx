import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  id: string;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  // Selection
  selectedIds?: string[];
  onSelectChange?: (id: string, checked: boolean) => void;
  onSelectAllChange?: (checked: boolean) => void;
  // States
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  // Pagination
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    onPageChange: (newOffset: number) => void;
  };
  className?: string;
}

export function DataTable<T>({
  id,
  columns,
  data,
  keyExtractor,
  sortBy,
  sortOrder,
  onSort,
  selectedIds,
  onSelectChange,
  onSelectAllChange,
  isLoading = false,
  emptyState,
  pagination,
  className = '',
}: DataTableProps<T>) {
  const hasSelection = !!selectedIds && !!onSelectChange && !!onSelectAllChange;
  const allSelected = data.length > 0 && selectedIds?.length === data.length;
  const isSelected = (item: T) => selectedIds?.includes(keyExtractor(item)) ?? false;

  return (
    <div className={`table-container ${className}`.trim()} id={id}>
      <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {hasSelection && (
                <th className="table-checkbox-cell">
                  <input
                    type="checkbox"
                    id={`${id}-select-all`}
                    checked={allSelected}
                    onChange={(e) => onSelectAllChange(e.target.checked)}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col, idx) => {
                const isSortable = col.sortable && !!onSort;
                const isSorted = sortBy === col.key;
                
                return (
                  <th
                    key={col.key ? col.key : String(idx)}
                    className={`${col.headerClassName ?? ''} ${isSortable ? 'sortable-header' : ''}`.trim()}
                    onClick={isSortable ? () => onSort(col.key) : undefined}
                    aria-sort={isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <div className="table-header-content">
                      {col.header}
                      {isSorted && (
                        <span className="sort-icon" aria-hidden="true">
                          {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="table-loading-cell">
                  <div className="table-loading-spinner-wrapper">
                    <Spinner size="md" id={`${id}-loading-spinner`} />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)} className="table-empty-cell">
                  {emptyState ?? (
                    <div className="table-empty-state">No records found.</div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const key = keyExtractor(item);
                const selected = isSelected(item);
                
                return (
                  <tr key={key} className={selected ? 'row-selected' : ''}>
                    {hasSelection && (
                      <td className="table-checkbox-cell">
                        <input
                          type="checkbox"
                          id={`${id}-select-${key}`}
                          checked={selected}
                          onChange={(e) => onSelectChange(key, e.target.checked)}
                          aria-label={`Select row ${String(rowIdx + 1)}`}
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={col.key ? col.key : String(colIdx)} className={col.cellClassName ?? ''}>
                        {col.render ? col.render(item, rowIdx) : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Showing <span className="font-semibold">{Math.min(pagination.offset + 1, pagination.total)}</span> to{' '}
            <span className="font-semibold">
              {Math.min(pagination.offset + pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold">{pagination.total}</span> records
          </div>
          <div className="pagination-buttons">
            <button
              id={`${id}-prev-page`}
              className="btn btn-secondary btn-sm"
              disabled={pagination.offset === 0}
              onClick={() => pagination.onPageChange(pagination.offset - pagination.limit)}
            >
              Previous
            </button>
            <button
              id={`${id}-next-page`}
              className="btn btn-secondary btn-sm"
              disabled={pagination.offset + pagination.limit >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.offset + pagination.limit)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
