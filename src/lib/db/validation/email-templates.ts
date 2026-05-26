import { z } from 'zod';

export const insertEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['introduction', 'catalog', 'quotation', 'follow-up', 're-engagement', 'notification', 'custom']),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  variables: z.array(z.string()).default([]),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateEmailTemplateSchema = insertEmailTemplateSchema.partial().omit({
  createdByUserId: true,
});

export type InsertEmailTemplateInput = z.infer<typeof insertEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
