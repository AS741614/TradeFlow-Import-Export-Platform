import { z } from 'zod';

export const insertTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  status: z.enum(['todo', 'in-progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').nullable().optional(),
  assignee: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().min(1, 'Category is required'),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = insertTaskSchema.partial().omit({
  createdByUserId: true,
});

export type InsertTaskInput = z.infer<typeof insertTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
