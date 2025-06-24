import { z } from 'zod';
import { stringToNumberTransform, numberOrStringToString } from '../utils/transforms.js';

/**
 * Schemas for source code tools
 */

export const sourceCodeToolSchema = {
  key: z.string(),
  from: z.string().optional().transform(stringToNumberTransform),
  to: z.string().optional().transform(stringToNumberTransform),
  branch: z.string().optional(),
  pull_request: z.union([z.string(), z.number()]).optional().transform(numberOrStringToString),
};

export const scmBlameToolSchema = {
  key: z.string(),
  from: z.string().optional().transform(stringToNumberTransform),
  to: z.string().optional().transform(stringToNumberTransform),
  branch: z.string().optional(),
  pull_request: z.union([z.string(), z.number()]).optional().transform(numberOrStringToString),
};
