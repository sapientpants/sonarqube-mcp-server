import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';
import { pullRequestNullableSchema } from './common.js';
import { hotspotStatusSchema, hotspotResolutionSchema } from './hotspots.js';

/**
 * Schemas for hotspot tools
 */

export const hotspotsToolSchema = {
  project_key: z.string().optional(),
  branch: z.string().nullable().optional(),
  pull_request: pullRequestNullableSchema,
  status: hotspotStatusSchema,
  resolution: hotspotResolutionSchema,
  files: z.array(z.string()).nullable().optional(),
  assigned_to_me: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),
  since_leak_period: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),
  in_new_code_period: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};

export const hotspotToolSchema = {
  hotspot_key: z.string(),
};

export const updateHotspotStatusToolSchema = {
  hotspot_key: z.string(),
  status: z.enum(['TO_REVIEW', 'REVIEWED']),
  resolution: z.enum(['FIXED', 'SAFE']).nullable().optional(),
  comment: z.string().nullable().optional(),
};
