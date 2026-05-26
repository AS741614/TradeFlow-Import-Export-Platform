import { z } from 'zod';

export const insertContactSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  address: z.string().nullable().optional(),
  type: z.enum(['buyer', 'supplier', 'both']),
  status: z.enum(['active', 'prospect', 'inactive']),
  tradeTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateContactSchema = insertContactSchema.partial().omit({
  createdByUserId: true, // do not allow editing creator ID after creation
});
export type InsertContactInput = z.infer<typeof insertContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
