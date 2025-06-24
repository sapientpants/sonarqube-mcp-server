import { z } from 'zod';
import { numberOrStringToString } from '../utils/transforms.js';

/**
 * Schemas for quality gates tools
 */

export const qualityGatesToolSchema = {};

export const qualityGateToolSchema = {
  id: z.string(),
};

export const qualityGateStatusToolSchema = {
  project_key: z.string(),
  branch: z.string().optional(),
  pull_request: z.union([z.string(), z.number()]).optional().transform(numberOrStringToString),
};
