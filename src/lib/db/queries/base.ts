import { eq, and, SQL } from 'drizzle-orm';
import { PgColumn } from 'drizzle-orm/pg-core';
import { getDb } from '../client';
import { activityLogs, users } from '../schema';

interface HasOrgId {
  orgId: PgColumn;
}

export type TxClient = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Wraps a database condition to automatically enforce the orgId multi-tenancy constraint.
 */
export function withTenant(table: HasOrgId, orgId: string, condition?: SQL): SQL {
  const tenantFilter = eq(table.orgId, orgId);
  return and(tenantFilter, condition) ?? tenantFilter;
}

/**
 * Helper to perform a hard delete inside a transaction, writing a snapshot to activity_log first.
 */
export async function deleteWithLog<T>(
  tableName: string,
  recordId: string,
  userId: string,
  selectQuery: (tx: TxClient) => Promise<T | null | undefined>,
  deleteQuery: (tx: TxClient) => Promise<unknown>,
  reason?: string
): Promise<T | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const data = await selectQuery(tx);
    if (data === null || data === undefined) return null;

    // Fetch user's orgId inside transaction
    const [user] = await tx.select({ orgId: users.orgId }).from(users).where(eq(users.id, userId));
    if (!user?.orgId) {
      throw new Error(`User ${userId} has no associated organization`);
    }

    const TABLE_TO_ENTITY_TYPE: Record<string, string> = {
      contacts: 'contact',
      products: 'product',
      shipments: 'shipment',
      invoices: 'invoice',
      compliance_items: 'compliance',
      cost_items: 'cost-item',
      financial_projections: 'financial-projection',
      outreach_contacts: 'outreach-contact',
      email_templates: 'email-template',
      campaigns: 'campaign',
      business_plan_sections: 'business-plan',
      swot_items: 'swot',
      tasks: 'task',
    };

    await tx.insert(activityLogs).values({
      orgId: user.orgId,
      userId,
      entityType: TABLE_TO_ENTITY_TYPE[tableName] ?? tableName,
      entityId: recordId,
      action: 'deleted',
      changeSummary: { snapshot: data as Record<string, unknown> },
      reason: reason ?? null,
    });

    await deleteQuery(tx);
    return data;
  });
}

