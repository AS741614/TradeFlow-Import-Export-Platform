import { z } from 'zod';

export const lineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().int().nonnegative('Unit price must be non-negative (cents)'),
});

export const insertInvoiceSchema = z.object({
  number: z.string().min(1, 'Invoice number is required'),
  contactId: z.string().uuid('Invalid contact ID'),
  shipmentId: z.string().uuid().nullable().optional(),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code'),
  subtotal: z.number().int().nonnegative('Subtotal must be non-negative'),
  taxRate: z.number().int().nonnegative('Tax rate must be non-negative'),
  tax: z.number().int().nonnegative('Tax must be non-negative'),
  total: z.number().int().nonnegative('Total must be non-negative'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issued date must be a YYYY-MM-DD date string'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be a YYYY-MM-DD date string'),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Paid date must be a YYYY-MM-DD date string').nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.string().uuid().nullable().optional(),
  lineItems: z.array(lineItemInputSchema).min(1, 'At least one line item is required'),
});

export const updateInvoiceSchema = insertInvoiceSchema.partial().omit({
  createdByUserId: true,
});

export type InsertInvoiceInput = z.infer<typeof insertInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
