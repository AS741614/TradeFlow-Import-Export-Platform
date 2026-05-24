// ============================================================
// TradeFlow — Utility Functions
// ============================================================

/**
 * Generate a unique ID using crypto.randomUUID with fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Format a number as currency.
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/**
 * Format a date string with time.
 */
export function formatDateTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/**
 * Get relative time string (e.g., "2 days ago").
 */
export function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateStr);
}

/**
 * Get current ISO date string.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Format a number with commas.
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Calculate percentage.
 */
export function calcPercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Capitalize first letter of each word.
 */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get status color class based on status value.
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    // Positive
    'in-stock': 'status-success',
    'delivered': 'status-success',
    'paid': 'status-success',
    'active': 'status-success',
    'approved': 'status-success',
    'done': 'status-success',
    'completed': 'status-success',
    'sent': 'status-success',
    'opened': 'status-success',
    // Warning
    'low-stock': 'status-warning',
    'in-transit': 'status-warning',
    'customs': 'status-warning',
    'review': 'status-warning',
    'scheduled': 'status-warning',
    'pending': 'status-warning',
    'prospect': 'status-warning',
    // Danger
    'out-of-stock': 'status-danger',
    'overdue': 'status-danger',
    'rejected': 'status-danger',
    'bounced': 'status-danger',
    'failed': 'status-danger',
    'urgent': 'status-danger',
    // Info / Neutral
    'draft': 'status-info',
    'ordered': 'status-info',
    'shipped': 'status-info',
    'todo': 'status-info',
    'in-progress': 'status-info',
    'sending': 'status-info',
    'paused': 'status-neutral',
    'inactive': 'status-neutral',
  };
  return colorMap[status] || 'status-neutral';
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
