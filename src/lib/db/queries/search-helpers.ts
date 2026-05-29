import { SQL, and, or, ilike, eq, asc, desc, SQLWrapper, AnyColumn } from 'drizzle-orm';

export interface SearchFilterSortConfig {
  searchColumns: (SQLWrapper | AnyColumn)[]; // Drizzle table text columns to search with ILIKE
  statusColumn?: SQLWrapper | AnyColumn;   // Drizzle enum/text column to filter by status
  sortByWhitelist: string[]; // Whitelisted query param string values
  sortByColumnMap: Record<string, SQLWrapper | AnyColumn>; // Whitelisted string key mapping to Drizzle column
  defaultSortColumn: SQLWrapper | AnyColumn; // Default fallback Drizzle column
}

/**
 * Parses query parameters from URL searchParams and generates Drizzle conditions and order statements.
 * Safeguards against malicious or invalid sortBy options by falling back to the configured default column.
 */
export function applySearchFilterSort(
  urlSearchParams: URLSearchParams,
  config: SearchFilterSortConfig
): {
  whereClause: SQL | undefined;
  orderClause: SQL;
} {
  const search = urlSearchParams.get('search');
  const status = urlSearchParams.get('status');
  const sortBy = urlSearchParams.get('sortBy');
  const sortOrder = urlSearchParams.get('sortOrder') ?? 'desc';

  const conditions: SQL[] = [];

  // Search logic (case-insensitive Postgres ILIKE with special character escaping)
  if (search && config.searchColumns.length > 0) {
    // Escape Postgres LIKE wildcards (% and _) and backslashes
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    const searchPattern = `%${escapedSearch}%`;

    const searchConditions = config.searchColumns.map((col) =>
      ilike(col as AnyColumn, searchPattern)
    );
    const orCond = or(...searchConditions);
    if (orCond) {
      conditions.push(orCond);
    }
  }

  // Filter logic
  if (status && config.statusColumn) {
    conditions.push(eq(config.statusColumn, status));
  }

  // Sort logic (whitelisting sortBy)
  const isSortByValid = sortBy && config.sortByWhitelist.includes(sortBy);
  const targetSortColumn = (isSortByValid
    ? config.sortByColumnMap[sortBy]
    : undefined) ?? config.defaultSortColumn;

  const isAsc = sortOrder.toLowerCase() === 'asc';
  const orderClause = isAsc ? asc(targetSortColumn) : desc(targetSortColumn);

  return {
    whereClause: conditions.length > 0 ? and(...conditions) : undefined,
    orderClause,
  };
}
