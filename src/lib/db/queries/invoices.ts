import { getDb } from '../client';
import { invoices, invoiceLineItems, contacts } from '../schema';
import { eq } from 'drizzle-orm';
import { withTenant, deleteWithLog } from './base';
import type { TxClient } from './base';
import type { InsertInvoiceInput, UpdateInvoiceInput } from '../validation/invoices';

export async function getInvoices(orgId: string) {
  const db = getDb();

  // 1. Fetch invoices joined with contacts to resolve contactName
  const invoiceRows = await db
    .select({
      invoice: invoices,
      contactCompany: contacts.company,
    })
    .from(invoices)
    .leftJoin(contacts, eq(invoices.contactId, contacts.id))
    .where(withTenant(invoices, orgId));

  // 2. Fetch line items for each invoice
  const result = [];
  for (const row of invoiceRows) {
    const lineItemsList = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, row.invoice.id));

    result.push({
      ...row.invoice,
      contactName: row.contactCompany ?? 'Unknown Contact',
      lineItems: lineItemsList,
    });
  }

  return result;
}

export async function getInvoiceById(orgId: string, id: string, tx?: TxClient) {
  const client = tx ?? getDb();

  const rows = await client
    .select({
      invoice: invoices,
      contactCompany: contacts.company,
    })
    .from(invoices)
    .leftJoin(contacts, eq(invoices.contactId, contacts.id))
    .where(withTenant(invoices, orgId, eq(invoices.id, id)));

  const row = rows[0];
  if (!row) return null;

  const lineItemsList = await client
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, row.invoice.id));

  return {
    ...row.invoice,
    contactName: row.contactCompany ?? 'Unknown Contact',
    lineItems: lineItemsList,
  };
}

export async function createInvoice(orgId: string, data: InsertInvoiceInput) {
  const db = getDb();
  const { lineItems: lineItemsData, ...invoiceFields } = data;

  return db.transaction(async (tx: TxClient) => {
    // 1. Insert invoice
    const invoiceResult = await tx.insert(invoices).values({
      ...invoiceFields,
      orgId,
    }).returning();
    const invoice = invoiceResult[0];
    if (!invoice) {
      throw new Error('Failed to create invoice');
    }

    // 2. Insert line items (pre-calculating line item total as quantity * unitPrice)
    const insertedLineItems = [];
    if (lineItemsData.length > 0) {
      const lRows = await tx.insert(invoiceLineItems).values(
        lineItemsData.map(item => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        }))
      ).returning();
      insertedLineItems.push(...lRows);
    }

    // 3. Resolve contact name
    const [contact] = await tx.select().from(contacts).where(eq(contacts.id, invoice.contactId));

    return {
      ...invoice,
      contactName: contact?.company ?? 'Unknown Contact',
      lineItems: insertedLineItems,
    };
  });
}

export async function updateInvoice(orgId: string, id: string, data: UpdateInvoiceInput) {
  const db = getDb();
  const { lineItems: lineItemsData, ...invoiceFields } = data;

  return db.transaction(async (tx: TxClient) => {
    // 1. Update invoice fields
    const invoiceResult = await tx.update(invoices)
      .set(invoiceFields)
      .where(withTenant(invoices, orgId, eq(invoices.id, id)))
      .returning();
    const invoice = invoiceResult[0];

    if (!invoice) return null;

    // 2. Replace line items if provided
    if (lineItemsData !== undefined) {
      await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
      if (lineItemsData.length > 0) {
        await tx.insert(invoiceLineItems).values(
          lineItemsData.map(item => ({
            invoiceId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          }))
        );
      }
    }

    // Fetch updated invoice using tx
    const updated = await getInvoiceById(orgId, id, tx);
    return updated;
  });
}

export async function deleteInvoice(orgId: string, id: string, userId: string, reason?: string) {
  return deleteWithLog(
    'invoices',
    id,
    userId,
    async (tx: TxClient) => {
      const invoice = await getInvoiceById(orgId, id, tx);
      return invoice;
    },
    async (tx: TxClient) => {
      // Cascade delete handles invoice_line_items automatically
      await tx.delete(invoices).where(
        withTenant(invoices, orgId, eq(invoices.id, id))
      );
    },
    reason
  );
}
