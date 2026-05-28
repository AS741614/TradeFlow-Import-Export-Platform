import { z } from 'zod';
import { currencyEnumSchema } from './_shared';

export const insertProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(255),
  hsCode: z.string().min(1, 'HS Code is required').max(255),
  category: z.string().min(1, 'Category is required').max(255),
  quantity: z.number().int().nonnegative('Quantity must be a non-negative integer'),
  reorderLevel: z.number().int().nonnegative('Reorder level must be a non-negative integer'),
  unitCost: z.number().int().nonnegative('Unit cost must be a non-negative integer (cents)'),
  currency: currencyEnumSchema,
  supplier: z.string().min(1, 'Supplier is required').max(255),
  origin: z.string().min(1, 'Origin is required').max(255),
  status: z.enum(['in-stock', 'low-stock', 'out-of-stock']),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateProductSchema = insertProductSchema.partial().omit({
  createdByUserId: true,
});
export type InsertProductInput = z.infer<typeof insertProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
