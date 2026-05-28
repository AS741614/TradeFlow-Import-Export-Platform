import { z } from 'zod';

export const campaignStatsSchema = z.object({
  total: z.number().int().default(0),
  sent: z.number().int().default(0),
  delivered: z.number().int().default(0),
  opened: z.number().int().default(0),
  clicked: z.number().int().default(0),
  replied: z.number().int().default(0),
  bounced: z.number().int().default(0),
  failed: z.number().int().default(0),
});

export const insertCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  templateId: z.string().uuid('Template ID must be a valid UUID'),
  status: z.enum(['draft', 'scheduled', 'sending', 'paused', 'completed']),
  scheduleType: z.enum(['immediate', 'scheduled', 'drip']),
  scheduledAt: z.string().nullable().optional(),
  sendsPerHour: z.number().int().nullable().optional(),
  subjectLineA: z.string().min(1, 'Subject line A is required').max(255),
  subjectLineB: z.string().max(255).nullable().optional(),
  stats: campaignStatsSchema.default({}),
  contactIds: z.array(z.string().uuid()).default([]),
  createdByUserId: z.string().uuid().nullable().optional(),
});

export const updateCampaignSchema = insertCampaignSchema.partial().omit({
  createdByUserId: true,
});

export type InsertCampaignInput = z.infer<typeof insertCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
