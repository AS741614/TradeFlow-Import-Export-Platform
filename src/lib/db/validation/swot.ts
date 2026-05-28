import { z } from 'zod';

export const insertSwotSchema = z.object({
  text: z.string().min(1, 'Text is required').max(255),
  category: z.enum(['strength', 'weakness', 'opportunity', 'threat']),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateSwotSchema = insertSwotSchema.partial().omit({
  createdByUserId: true,
});

export type InsertSwotInput = z.infer<typeof insertSwotSchema>;
export type UpdateSwotInput = z.infer<typeof updateSwotSchema>;
