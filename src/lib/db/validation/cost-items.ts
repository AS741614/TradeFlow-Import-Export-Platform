import { z } from 'zod';
import { currencyEnumSchema } from './_shared';

export const insertCostItemSchema = z.object({
  category: z.enum(['purchase', 'freight', 'insurance', 'customs', 'tax', 'logistics', 'warehousing', 'other']),
  description: z.string().min(1, 'Description is required').max(255),
  amount: z.number().int().nonnegative('Amount must be non-negative'),
  currency: currencyEnumSchema,
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateCostItemSchema = insertCostItemSchema.partial().omit({
  createdByUserId: true,
});

export type InsertCostItemInput = z.infer<typeof insertCostItemSchema>;
export type UpdateCostItemInput = z.infer<typeof updateCostItemSchema>;
