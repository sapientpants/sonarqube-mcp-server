import { z } from 'zod';
import { pullRequestSchema } from './common.js';

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
  pull_request: pullRequestSchema,
};
