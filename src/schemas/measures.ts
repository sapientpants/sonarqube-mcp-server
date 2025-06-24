import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';
import { pullRequestSchema } from './common.js';

/**
 * Schemas for measures tools
 */

export const componentMeasuresToolSchema = {
  component: z.string(),
  metric_keys: z.array(z.string()),
  additional_fields: z.array(z.string()).optional(),
  branch: z.string().optional(),
  pull_request: pullRequestSchema,
  period: z.string().optional(),
};

export const componentsMeasuresToolSchema = {
  component_keys: z.array(z.string()),
  metric_keys: z.array(z.string()),
  additional_fields: z.array(z.string()).optional(),
  branch: z.string().optional(),
  pull_request: pullRequestSchema,
  period: z.string().optional(),
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};

export const measuresHistoryToolSchema = {
  component: z.string(),
  metrics: z.array(z.string()),
  from: z.string().optional(),
  to: z.string().optional(),
  branch: z.string().optional(),
  pull_request: pullRequestSchema,
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};
