import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column } from '../DataTable';
import { describe, it, expect, vi } from 'vitest';

interface TestItem {
  id: string;
  name: string;
  role: string;
}

const testData: TestItem[] = [
  { id: '1', name: 'Alice Smith', role: 'Developer' },
  { id: '2', name: 'Bob Jones', role: 'Designer' },
];

const columns: Column<TestItem>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'role', header: 'Role' },
];

describe('DataTable', () => {
  it('renders table columns and data rows', () => {
    render(
      <DataTable
        id="test-table"
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('displays loading state spinner', () => {
    render(
      <DataTable
        id="test-table"
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
        isLoading
      />
    );

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('renders custom empty state when data list is empty', () => {
    render(
      <DataTable
        id="test-table"
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyState={<div>Custom Empty</div>}
      />
    );

    expect(screen.getByText('Custom Empty')).toBeInTheDocument();
  });

  it('handles column sort trigger clicks correctly', () => {
    const handleSort = vi.fn();
    render(
      <DataTable
        id="test-table"
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
        sortBy="name"
        sortOrder="asc"
        onSort={handleSort}
      />
    );

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    expect(handleSort).toHaveBeenCalledWith('name');
  });

  it('renders checkboxes and coordinates row selection', () => {
    const handleSelectChange = vi.fn();
    const handleSelectAllChange = vi.fn();

    render(
      <DataTable
        id="test-table"
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
        selectedIds={['1']}
        onSelectChange={handleSelectChange}
        onSelectAllChange={handleSelectAllChange}
      />
    );

    const selectAllCheckbox = screen.getByLabelText('Select all rows');
    expect(selectAllCheckbox).toBeInTheDocument();

    const rowCheckbox = screen.getByLabelText('Select row 2');
    fireEvent.click(rowCheckbox);
    expect(handleSelectChange).toHaveBeenCalledWith('2', true);

    fireEvent.click(selectAllCheckbox);
    expect(handleSelectAllChange).toHaveBeenCalled();
  });

  it('renders pagination labels and handles click triggers', () => {
    const handlePageChange = vi.fn();
    render(
      <DataTable
        id="test-table"
        columns={columns}
        data={testData}
        keyExtractor={(item) => item.id}
        pagination={{
          total: 100,
          limit: 10,
          offset: 10,
          onPageChange: handlePageChange,
        }}
      />
    );

    expect(
      screen.getByText((_content, element) => {
        if (!element) return false;
        return (
          element.className.includes('pagination-info') &&
          element.textContent.includes('Showing 11 to 20 of 100 records')
        );
      })
    ).toBeInTheDocument();
    
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    const nextButton = screen.getByRole('button', { name: 'Next' });

    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(20);

    fireEvent.click(prevButton);
    expect(handlePageChange).toHaveBeenCalledWith(0);
  });
});
