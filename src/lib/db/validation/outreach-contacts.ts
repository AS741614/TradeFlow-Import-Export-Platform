import { z } from 'zod';

export const insertOutreachContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(1, 'Company is required'),
  phone: z.string().nullable().optional(),
  country: z.string().min(1, 'Country is required'),
  tags: z.array(z.string()).default([]),
  source: z.enum(['csv', 'excel', 'json', 'manual']),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateOutreachContactSchema = insertOutreachContactSchema.partial().omit({
  createdByUserId: true,
});

export type InsertOutreachContactInput = z.infer<typeof insertOutreachContactSchema>;
export type UpdateOutreachContactInput = z.infer<typeof updateOutreachContactSchema>;
