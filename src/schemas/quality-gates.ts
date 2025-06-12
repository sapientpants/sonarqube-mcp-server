import { z } from 'zod';

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
  pull_request: z.string().optional(),
};
