import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';

/**
 * Schemas for source code tools
 */

export const sourceCodeToolSchema = {
  key: z.string(),
  from: z.string().optional().transform(stringToNumberTransform),
  to: z.string().optional().transform(stringToNumberTransform),
  branch: z.string().optional(),
  pull_request: z.string().optional(),
};

export const scmBlameToolSchema = {
  key: z.string(),
  from: z.string().optional().transform(stringToNumberTransform),
  to: z.string().optional().transform(stringToNumberTransform),
  branch: z.string().optional(),
  pull_request: z.string().optional(),
};
