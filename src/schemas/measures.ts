import { z } from 'zod';
import { stringToNumberTransform, numberOrStringToString } from '../utils/transforms.js';

/**
 * Schemas for measures tools
 */

export const componentMeasuresToolSchema = {
  component: z.string(),
  metric_keys: z.array(z.string()),
  additional_fields: z.array(z.string()).optional(),
  branch: z.string().optional(),
  pull_request: z.union([z.string(), z.number()]).optional().transform(numberOrStringToString),
  period: z.string().optional(),
};

export const componentsMeasuresToolSchema = {
  component_keys: z.array(z.string()),
  metric_keys: z.array(z.string()),
  additional_fields: z.array(z.string()).optional(),
  branch: z.string().optional(),
  pull_request: z.union([z.string(), z.number()]).optional().transform(numberOrStringToString),
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
  pull_request: z.union([z.string(), z.number()]).optional().transform(numberOrStringToString),
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};
