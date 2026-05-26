import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  formatCurrency,
  formatDate,
  formatDateTime,
  getRelativeTime,
  nowISO,
  truncate,
  isValidEmail,
  formatNumber,
  calcPercentage,
  debounce,
  titleCase,
  getStatusColor,
  clamp,
  toISODate,
} from '../utils';

describe('generateId', () => {
  it('should return a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should output a valid UUID format', () => {
    const id = generateId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });

  it('should generate unique values on consecutive calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    const id3 = generateId();
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });
});

describe('formatCurrency', () => {
  it('should format numeric inputs with standard decimal limits', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('should handle alternative currencies like EUR and GBP', () => {
    // Note: spaces or characters might vary based on node environment or locale settings.
    // For absolute resilience we check for numerical content matching.
    const eur = formatCurrency(50, 'EUR');
    expect(eur).toContain('50.00');
    expect(eur).toMatch(/€|EUR/);
    
    const gbp = formatCurrency(75.5, 'GBP');
    expect(gbp).toContain('75.50');
    expect(gbp).toMatch(/£|GBP/);
  });

  it('should handle negative and zero values', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    const negative = formatCurrency(-500.5);
    expect(negative).toContain('500.50');
    expect(negative).toContain('-');
  });
});

describe('formatDate', () => {
  it('should format ISO string to standard date representation', () => {
    expect(formatDate('2026-05-25T12:00:00Z')).toBe('May 25, 2026');
    expect(formatDate('2026-12-01')).toBe('Dec 1, 2026');
  });

  it('should return raw input string when input is invalid', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date');
    expect(formatDate('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('should format ISO string to date with time', () => {
    const formatted = formatDateTime('2026-05-25T14:30:00.000Z');
    // The formatted output timezone depends on test environment settings.
    // We verify standard elements of date-time conversion.
    expect(formatted).toContain('May 25, 2026');
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });

  it('should return raw input string when input is invalid', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});

describe('getRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return relative time strings for minutes, hours, days, and weeks', () => {
    // 30 seconds ago
    expect(getRelativeTime('2026-05-25T11:59:30Z')).toBe('Just now');
    // 5 minutes ago
    expect(getRelativeTime('2026-05-25T11:55:00Z')).toBe('5m ago');
    // 3 hours ago
    expect(getRelativeTime('2026-05-25T09:00:00Z')).toBe('3h ago');
    // 2 days ago
    expect(getRelativeTime('2026-05-23T12:00:00Z')).toBe('2d ago');
    // 3 weeks ago (21 days)
    expect(getRelativeTime('2026-05-04T12:00:00Z')).toBe('3w ago');
  });

  it('should format absolute dates for intervals older than 30 days', () => {
    // 40 days ago
    expect(getRelativeTime('2026-04-15T12:00:00Z')).toBe('Apr 15, 2026');
  });

  it('should return forward-looking relative strings for future dates', () => {
    // Future date tomorrow (relative to mock system time May 25, 2026)
    expect(getRelativeTime('2026-05-26T12:00:00Z')).toBe('in 1d');
    // Future date in 30 seconds
    expect(getRelativeTime('2026-05-25T12:00:30Z')).toBe('in 1m');
    // Future date in 10 minutes
    expect(getRelativeTime('2026-05-25T12:10:00Z')).toBe('in 10m');
    // Future date in 5 hours
    expect(getRelativeTime('2026-05-25T17:00:00Z')).toBe('in 5h');
    // Future date in 2 weeks
    expect(getRelativeTime('2026-06-08T12:00:00Z')).toBe('in 2w');
    // Future date > 30 days (40 days)
    expect(getRelativeTime('2026-07-04T12:00:00Z')).toBe('Jul 4, 2026');
  });
});

describe('nowISO', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should produce a string matching the ISO 8601 datetime format', () => {
    const val = nowISO();
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(val).toMatch(isoRegex);
  });

  it('should round-trip through new Date() without losing precision', () => {
    const val = nowISO();
    expect(new Date(val).toISOString()).toBe(val);
  });

  it('should reflect the mocked system time when timers are faked', () => {
    expect(nowISO()).toBe('2026-05-25T12:00:00.000Z');
  });
});

describe('truncate', () => {
  it('should return unchanged string if length within max bound', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should trim string and append ellipsis when exceeding bounds', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('TradeFlow Project', 12)).toBe('TradeFlow...');
  });

  it('should return empty string on empty input', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('should validate standard compliant email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@sub.domain.co')).toBe(true);
  });

  it('should reject email formats missing symbols or domains', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('spaces in@domain.com')).toBe(false);
  });
});

describe('formatNumber', () => {
  it('should format large numbers with standard thousands separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(12.34)).toBe('12.34');
  });
});

describe('calcPercentage', () => {
  it('should calculate integer percentages correctly', () => {
    expect(calcPercentage(50, 100)).toBe(50);
    expect(calcPercentage(1, 3)).toBe(33); // Rounds down
    expect(calcPercentage(2, 3)).toBe(67); // Rounds up
  });

  it('should return 0 when total denominator is 0', () => {
    expect(calcPercentage(10, 0)).toBe(0);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay target function execution and aggregate calls', () => {
    let count = 0;
    const mockFn = () => {
      count++;
    };

    const debounced = debounce(mockFn, 100);

    debounced();
    debounced();
    debounced();

    expect(count).toBe(0);

    vi.advanceTimersByTime(50);
    expect(count).toBe(0);

    vi.advanceTimersByTime(50);
    expect(count).toBe(1);

    // Call again and verify it executes after another delay
    debounced();
    vi.advanceTimersByTime(100);
    expect(count).toBe(2);
  });
});

describe('titleCase', () => {
  it('should capitalize first letters of words in a string', () => {
    expect(titleCase('hello world')).toBe('Hello World');
    expect(titleCase('TRADEFLOW IMPORT EXPORT')).toBe('TRADEFLOW IMPORT EXPORT'); // Matches non-word transitions
    expect(titleCase('a b c')).toBe('A B C');
  });
});

describe('getStatusColor', () => {
  it('should map domain status terms to correct styling classes', () => {
    expect(getStatusColor('in-stock')).toBe('status-success');
    expect(getStatusColor('delivered')).toBe('status-success');
    expect(getStatusColor('low-stock')).toBe('status-warning');
    expect(getStatusColor('customs')).toBe('status-warning');
    expect(getStatusColor('out-of-stock')).toBe('status-danger');
    expect(getStatusColor('urgent')).toBe('status-danger');
    expect(getStatusColor('draft')).toBe('status-info');
    expect(getStatusColor('todo')).toBe('status-info');
  });

  it('should default to status-neutral when status is unknown', () => {
    expect(getStatusColor('unknown')).toBe('status-neutral');
    expect(getStatusColor('')).toBe('status-neutral');
  });
});

describe('clamp', () => {
  it('should confine values inside defined boundaries', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(15, 1, 10)).toBe(10);
  });
});

describe('toISODate', () => {
  it('should format undefined input to today\'s date in YYYY-MM-DD format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T12:00:00Z'));
    expect(toISODate()).toBe('2026-05-25');
    vi.useRealTimers();
  });

  it('should format Date object input to YYYY-MM-DD format', () => {
    const date = new Date('2026-12-25T00:00:00Z');
    expect(toISODate(date)).toBe('2026-12-25');
  });

  it('should format ISO string input to YYYY-MM-DD format', () => {
    expect(toISODate('2026-07-04T15:30:00Z')).toBe('2026-07-04');
  });

  it('should format numeric timestamp input to YYYY-MM-DD format', () => {
    const timestamp = new Date('2026-08-15T00:00:00Z').getTime();
    expect(toISODate(timestamp)).toBe('2026-08-15');
  });

  it('should return empty string for invalid date input', () => {
    expect(toISODate('invalid-date-string')).toBe('');
  });

  it('should format future date correctly', () => {
    expect(toISODate('2027-01-01')).toBe('2027-01-01');
  });
});

