import { z } from 'zod';

export const insertCostItemSchema = z.object({
  category: z.enum(['purchase', 'freight', 'insurance', 'customs', 'tax', 'logistics', 'warehousing', 'other']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().int().nonnegative('Amount must be non-negative'),
  currency: z.string().length(3, 'Currency must be a 3-character ISO code'),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateCostItemSchema = insertCostItemSchema.partial().omit({
  createdByUserId: true,
});

export type InsertCostItemInput = z.infer<typeof insertCostItemSchema>;
export type UpdateCostItemInput = z.infer<typeof updateCostItemSchema>;
