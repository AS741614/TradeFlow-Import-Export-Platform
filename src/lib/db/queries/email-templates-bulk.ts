import { getDb } from '../client';
import { emailTemplates } from '../schema';
import { insertEmailTemplateSchema } from '../validation/email-templates';

export interface BulkImportRowError {
  row: number;
  errors: string[];
}

export interface BulkImportResult {
  imported: number;
  failed: BulkImportRowError[];
}

export async function bulkImportEmailTemplates(
  orgId: string,
  rows: unknown[],
  continueOnError = true
): Promise<BulkImportResult> {
  const db = getDb();
  let imported = 0;
  const failed: BulkImportRowError[] = [];

  if (!continueOnError) {
    // Transactional (all-or-nothing)
    return db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const rawRow = rows[i];
        const parsed = insertEmailTemplateSchema.safeParse(rawRow);
        if (!parsed.success) {
          const errors = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
          throw new Error(`Row ${String(i + 1)} validation failed: ${errors.join(', ')}`);
        }

        try {
          await tx.insert(emailTemplates).values({
            ...parsed.data,
            orgId,
          });
          imported++;
        } catch (err: unknown) {
          throw new Error(`Row ${String(i + 1)} insertion failed: ${err instanceof Error ? err.message : 'Unknown database error'}`);
        }
      }
      return { imported, failed: [] };
    });
  } else {
    // Row-by-row (continue on error)
    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const parsed = insertEmailTemplateSchema.safeParse(rawRow);
      if (!parsed.success) {
        failed.push({
          row: i + 1,
          errors: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        });
        continue;
      }

      try {
        await db.insert(emailTemplates).values({
          ...parsed.data,
          orgId,
        });
        imported++;
      } catch (err: unknown) {
        failed.push({
          row: i + 1,
          errors: [err instanceof Error ? err.message : 'Unknown database error'],
        });
      }
    }
    return { imported, failed };
  }
}
