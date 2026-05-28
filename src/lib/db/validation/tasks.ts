import { z } from 'zod';

export const insertTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).default(''),
  status: z.enum(['todo', 'in-progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').nullable().optional(),
  assignee: z.string().max(255).nullable().optional(),
  tags: z.array(z.string().max(255)).default([]),
  category: z.string().min(1, 'Category is required').max(255),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = insertTaskSchema.partial().omit({
  createdByUserId: true,
});

export type InsertTaskInput = z.infer<typeof insertTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
