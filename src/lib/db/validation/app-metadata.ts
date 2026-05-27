import { z } from 'zod';

export const saveAppMetadataSchema = z.object({
  value: z.string(),
});

export type SaveAppMetadataInput = z.infer<typeof saveAppMetadataSchema>;
