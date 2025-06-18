import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';

/**
 * Valid component qualifiers based on SonarQube API
 */
const componentQualifierSchema = z.enum([
  'TRK', // Project
  'DIR', // Directory
  'FIL', // File
  'UTS', // Unit Test
  'BRC', // Branch
  'APP', // Application
  'VW', // View
  'SVW', // Sub-view
  'LIB', // Library
]);

/**
 * Schema for components tool
 */
export const componentsToolSchema = {
  // Search parameters
  query: z.string().optional().describe('Text search query'),
  qualifiers: z
    .array(componentQualifierSchema)
    .optional()
    .describe('Component types: TRK, DIR, FIL, UTS, BRC, APP, VW, SVW, LIB'),
  language: z.string().optional().describe('Programming language filter'),

  // Tree navigation parameters
  component: z.string().optional().describe('Component key for tree navigation'),
  strategy: z.enum(['all', 'children', 'leaves']).optional().describe('Tree traversal strategy'),

  // Show component parameter
  key: z.string().optional().describe('Component key to show details for'),

  // Common parameters
  asc: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional()
    .describe('Sort ascending/descending'),
  ps: z
    .string()
    .optional()
    .transform(stringToNumberTransform)
    .describe('Page size (default: 100, max: 500)'),
  p: z.string().optional().transform(stringToNumberTransform).describe('Page number'),

  // Additional filters
  branch: z.string().optional().describe('Branch name'),
  pullRequest: z.string().optional().describe('Pull request ID'),
};
