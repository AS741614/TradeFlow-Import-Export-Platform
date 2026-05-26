import { z } from 'zod';

export const insertBusinessPlanSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().default(''),
  sortOrder: z.number().int('Sort order must be an integer'),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateBusinessPlanSchema = insertBusinessPlanSchema.partial().omit({
  createdByUserId: true,
});

export type InsertBusinessPlanInput = z.infer<typeof insertBusinessPlanSchema>;
export type UpdateBusinessPlanInput = z.infer<typeof updateBusinessPlanSchema>;
