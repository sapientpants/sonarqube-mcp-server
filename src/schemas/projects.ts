import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';

/**
 * Schema for projects tool
 */
export const projectsToolSchema = {
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};
