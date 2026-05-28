import { z } from 'zod';
import { currencyEnumSchema } from './_shared';

export const insertFinancialProjectionSchema = z.object({
  month: z.string().min(1, 'Month is required').max(255),
  revenue: z.number().int().nonnegative('Revenue must be non-negative'),
  expenses: z.number().int().nonnegative('Expenses must be non-negative'),
  profit: z.number().int(), // profit can be negative (loss)
  currency: currencyEnumSchema,
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateFinancialProjectionSchema = insertFinancialProjectionSchema.partial().omit({
  createdByUserId: true,
});

export type InsertFinancialProjectionInput = z.infer<typeof insertFinancialProjectionSchema>;
export type UpdateFinancialProjectionInput = z.infer<typeof updateFinancialProjectionSchema>;
