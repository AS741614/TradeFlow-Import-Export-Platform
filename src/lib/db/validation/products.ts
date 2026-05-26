import { z } from 'zod';

export const insertProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  hsCode: z.string().min(1, 'HS Code is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().int().nonnegative('Quantity must be a non-negative integer'),
  reorderLevel: z.number().int().nonnegative('Reorder level must be a non-negative integer'),
  unitCost: z.number().int().nonnegative('Unit cost must be a non-negative integer (cents)'),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code'),
  supplier: z.string().min(1, 'Supplier is required'),
  origin: z.string().min(1, 'Origin is required'),
  status: z.enum(['in-stock', 'low-stock', 'out-of-stock']),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateProductSchema = insertProductSchema.partial().omit({
  createdByUserId: true,
});
export type InsertProductInput = z.infer<typeof insertProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
