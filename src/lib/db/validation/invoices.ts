import { z } from 'zod';
import { currencyEnumSchema } from './_shared';

export const lineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().int().nonnegative('Unit price must be non-negative (cents)'),
});

export const invoiceBaseObject = z.object({
  number: z.string().min(1, 'Invoice number is required').max(255),
  contactId: z.string().uuid('Invalid contact ID'),
  shipmentId: z.string().uuid().nullable().optional(),
  currency: currencyEnumSchema,
  subtotal: z.number().int().nonnegative('Subtotal must be non-negative'),
  taxRate: z.number().int().nonnegative('Tax rate must be non-negative'),
  tax: z.number().int().nonnegative('Tax must be non-negative'),
  total: z.number().int().nonnegative('Total must be non-negative'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Issued date must be a YYYY-MM-DD date string'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be a YYYY-MM-DD date string'),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Paid date must be a YYYY-MM-DD date string').nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  createdByUserId: z.string().uuid().nullable().optional(),
  lineItems: z.array(lineItemInputSchema).min(1, 'At least one line item is required'),
});

export const insertInvoiceSchema = invoiceBaseObject.refine(
  (data) => Math.abs((data.subtotal + data.tax) - data.total) < 0.01,
  {
    message: 'Invoice total must equal subtotal plus tax',
    path: ['total'],
  }
);

export const updateInvoiceSchema = invoiceBaseObject.partial().omit({
  createdByUserId: true,
}).refine(
  (data) => {
    if (data.subtotal === undefined && data.tax === undefined && data.total === undefined) {
      return true;
    }
    if (data.subtotal !== undefined && data.tax !== undefined && data.total !== undefined) {
      return Math.abs((data.subtotal + data.tax) - data.total) < 0.01;
    }
    return true;
  },
  {
    message: 'Invoice total must equal subtotal plus tax',
    path: ['total'],
  }
);

export type InsertInvoiceInput = z.infer<typeof invoiceBaseObject>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
