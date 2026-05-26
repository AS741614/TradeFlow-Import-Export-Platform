import { z } from 'zod';

export const insertComplianceSchema = z.object({
  shipmentId: z.string().uuid().nullable().optional(),
  documentName: z.string().min(1, 'Document name is required'),
  documentType: z.string().min(1, 'Document type is required'),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected']),
  requiredBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required by must be a YYYY-MM-DD date string'),
  submittedAt: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateComplianceSchema = insertComplianceSchema.partial().omit({
  createdByUserId: true,
});
export type InsertComplianceInput = z.infer<typeof insertComplianceSchema>;
export type UpdateComplianceInput = z.infer<typeof updateComplianceSchema>;
