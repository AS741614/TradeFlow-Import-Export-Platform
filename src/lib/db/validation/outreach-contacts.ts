import { z } from 'zod';

export const insertOutreachContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.string().email('Invalid email address').max(254),
  company: z.string().min(1, 'Company is required').max(255),
  phone: z.string().max(255).nullable().optional(),
  country: z.string().min(1, 'Country is required').max(255),
  tags: z.array(z.string()).default([]),
  source: z.enum(['csv', 'excel', 'json', 'manual']),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateOutreachContactSchema = insertOutreachContactSchema.partial().omit({
  createdByUserId: true,
});

export type InsertOutreachContactInput = z.infer<typeof insertOutreachContactSchema>;
export type UpdateOutreachContactInput = z.infer<typeof updateOutreachContactSchema>;
