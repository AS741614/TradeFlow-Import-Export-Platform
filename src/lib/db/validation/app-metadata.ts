import { z } from 'zod';

export const saveAppMetadataSchema = z.object({
  value: z.string().max(10000),
});

export type SaveAppMetadataInput = z.infer<typeof saveAppMetadataSchema>;
