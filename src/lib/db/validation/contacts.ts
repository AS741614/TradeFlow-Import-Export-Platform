import { z } from 'zod';

export const insertContactSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(255),
  contactPerson: z.string().min(1, 'Contact person is required').max(255),
  email: z.string().email('Invalid email address').max(254),
  phone: z.string().min(1, 'Phone number is required').max(255),
  country: z.string().min(1, 'Country is required').max(255),
  address: z.string().max(5000).nullable().optional(),
  type: z.enum(['buyer', 'supplier', 'both']),
  status: z.enum(['active', 'prospect', 'inactive']),
  tradeTerms: z.string().max(255).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateContactSchema = insertContactSchema.partial().omit({
  createdByUserId: true, // do not allow editing creator ID after creation
});
export type InsertContactInput = z.infer<typeof insertContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
