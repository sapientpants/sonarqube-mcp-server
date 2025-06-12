import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';

/**
 * Schema for metrics tool
 */
export const metricsToolSchema = {
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};
