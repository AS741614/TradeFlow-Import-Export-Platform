import { describe, it, expect } from 'vitest';
import { applySearchFilterSort, SearchFilterSortConfig } from '../db/queries/search-helpers';
import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { getDb } from '../db/client';

// Define a mock table for testing Drizzle schema behavior
const mockTable = pgTable('mock_table', {
  id: varchar('id').primaryKey(),
  name: varchar('name'),
  status: varchar('status'),
  createdAt: timestamp('created_at'),
});

const config: SearchFilterSortConfig = {
  searchColumns: [mockTable.name],
  statusColumn: mockTable.status,
  sortByWhitelist: ['name', 'createdAt'],
  sortByColumnMap: {
    name: mockTable.name,
    createdAt: mockTable.createdAt,
  },
  defaultSortColumn: mockTable.createdAt,
};

describe('Search Helpers Unit Tests', () => {
  it('should parse simple search and status constraints', () => {
    const params = new URLSearchParams('search=test&status=active');
    const { whereClause } = applySearchFilterSort(params, config);

    expect(whereClause).toBeDefined();
    if (!whereClause) return;

    const db = getDb();
    const query = db.select().from(mockTable).where(whereClause);
    const sql = query.toSQL();

    expect(sql.sql).toContain('ilike');
    expect(sql.sql).toContain('status');
    expect(sql.params).toEqual(['%test%', 'active']);
  });

  it('should escape wildcards in search queries', () => {
    const params = new URLSearchParams('search=100%_discount');
    const { whereClause } = applySearchFilterSort(params, config);

    expect(whereClause).toBeDefined();
    if (!whereClause) return;

    const db = getDb();
    const query = db.select().from(mockTable).where(whereClause);
    const sql = query.toSQL();

    expect(sql.params[0]).toBe('%100\\%\\_discount%');
  });

  it('should apply whitelisted sortBy parameter and default to DESC order', () => {
    const params = new URLSearchParams('sortBy=name');
    const { orderClause } = applySearchFilterSort(params, config);

    const db = getDb();
    const query = db.select().from(mockTable).orderBy(orderClause);
    const sql = query.toSQL();

    expect(sql.sql).toContain('desc');
    expect(sql.sql).toContain('name');
  });

  it('should apply sortOrder=asc parameter correctly', () => {
    const params = new URLSearchParams('sortBy=name&sortOrder=asc');
    const { orderClause } = applySearchFilterSort(params, config);

    const db = getDb();
    const query = db.select().from(mockTable).orderBy(orderClause);
    const sql = query.toSQL();

    expect(sql.sql).toContain('name');
    expect(sql.sql).not.toContain('desc');
  });

  it('should fallback to defaultSortColumn when invalid or malicious sortBy parameter is supplied', () => {
    const params = new URLSearchParams('sortBy=SELECT * FROM users&sortOrder=desc');
    const { orderClause } = applySearchFilterSort(params, config);

    const db = getDb();
    const query = db.select().from(mockTable).orderBy(orderClause);
    const sql = query.toSQL();

    expect(sql.sql).toContain('created_at');
    expect(sql.sql).toContain('desc');
  });

  it('should return undefined whereClause if no search or status parameters are provided', () => {
    const params = new URLSearchParams('');
    const { whereClause } = applySearchFilterSort(params, config);

    expect(whereClause).toBeUndefined();
  });
});

