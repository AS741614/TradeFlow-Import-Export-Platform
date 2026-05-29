import { getDb } from './db/client';
import { activityLogs } from './db/schema';
import type { ActivityLogChangeSummary } from './db/schema/core';

export interface LogActivityOptions {
  orgId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  changeSummary: ActivityLogChangeSummary;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Recursively sanitizes data to drop sensitive fields (e.g. password, secret, token)
 * and truncates individual string fields > 1KB (1024 characters).
 */
export function sanitizeForAudit(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForAudit(item));
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      // Drop password, token, secret fields
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret')
      ) {
        continue;
      }

      if (typeof value === 'string') {
        if (value.length > 1024) {
          sanitized[key] = value.substring(0, 1024) + '...(truncated)';
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = sanitizeForAudit(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Caps the change summary size to 5KB (5120 characters after JSON serialization).
 * If exceeded, drops the snapshot/records and replaces them with a size exceeded message.
 */
export function capChangeSummary(summary: ActivityLogChangeSummary): ActivityLogChangeSummary {
  const serialized = JSON.stringify(summary);
  if (serialized.length <= 5120) {
    return summary;
  }

  if ('snapshot' in summary) {
    return { snapshot: { message: 'Snapshot size exceeded 5KB limit and was dropped.' } };
  }
  if ('before' in summary) {
    return {
      before: { message: 'Before size exceeded 5KB limit and was dropped.' },
      after: { message: 'After size exceeded 5KB limit and was dropped.' },
      changedFields: summary.changedFields
    };
  }
  if ('created' in summary) {
    return { created: { message: 'Created record size exceeded 5KB limit and was dropped.' } };
  }
  return summary;
}

/**
 * Compares two top-level records and returns a flat difference of modified fields.
 * Comparison for nested objects uses JSON.stringify equality.
 * Meta fields like createdAt and updatedAt are excluded from comparison.
 */
export function getDiff(
  before: unknown,
  after: unknown
): { before: Record<string, unknown>; after: Record<string, unknown>; changedFields: string[] } {
  const sanitizedBefore = (sanitizeForAudit(before) ?? {}) as Record<string, unknown>;
  const sanitizedAfter = (sanitizeForAudit(after) ?? {}) as Record<string, unknown>;

  const changedFields: string[] = [];
  const beforeDiff: Record<string, unknown> = {};
  const afterDiff: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(sanitizedBefore), ...Object.keys(sanitizedAfter)]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'createdAt') continue;

    const valBefore = sanitizedBefore[key];
    const valAfter = sanitizedAfter[key];

    if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
      changedFields.push(key);
      if (valBefore !== undefined) beforeDiff[key] = valBefore;
      if (valAfter !== undefined) afterDiff[key] = valAfter;
    }
  }

  return {
    before: beforeDiff,
    after: afterDiff,
    changedFields,
  };
}

/**
 * Logs an activity to the database in a fire-and-forget manner.
 * Ensures that database insertion errors are caught and logged, never throwing.
 */
export async function logActivity(options: LogActivityOptions): Promise<void> {
  try {
    const db = getDb();
    const sanitizedSummary = capChangeSummary(sanitizeForAudit(options.changeSummary) as ActivityLogChangeSummary);

    await db.insert(activityLogs).values({
      orgId: options.orgId,
      userId: options.userId,
      entityType: options.entityType,
      entityId: options.entityId,
      action: options.action,
      changeSummary: sanitizedSummary,
      reason: options.reason ?? null,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });
  } catch (error) {
    console.error('[Audit Log Failure]:', error);
  }
}
