import { z } from 'zod';
import { stringToNumberTransform } from '../utils/transforms.js';
import {
  severitySchema,
  severitiesSchema,
  statusSchema,
  resolutionSchema,
  typeSchema,
  cleanCodeAttributeCategoriesSchema,
  impactSeveritiesSchema,
  impactSoftwareQualitiesSchema,
} from './common.js';

/**
 * Schema for mark issue false positive tool
 */
export const markIssueFalsePositiveToolSchema = {
  issue_key: z.string().describe('The key of the issue to mark as false positive'),
  comment: z
    .string()
    .optional()
    .describe('Optional comment explaining why this is a false positive'),
};

/**
 * Schema for mark issue won\'t fix tool
 */
export const markIssueWontFixToolSchema = {
  issue_key: z.string().describe("The key of the issue to mark as won't fix"),
  comment: z.string().optional().describe("Optional comment explaining why this won't be fixed"),
};

/**
 * Schema for mark issues false positive (bulk) tool
 */
export const markIssuesFalsePositiveToolSchema = {
  issue_keys: z
    .array(z.string())
    .min(1, 'At least one issue key is required')
    .describe('Array of issue keys to mark as false positive'),
  comment: z
    .string()
    .optional()
    .describe('Optional comment explaining why these are false positives'),
};

/**
 * Schema for mark issues won\'t fix (bulk) tool
 */
export const markIssuesWontFixToolSchema = {
  issue_keys: z
    .array(z.string())
    .min(1, 'At least one issue key is required')
    .describe("Array of issue keys to mark as won't fix"),
  comment: z.string().optional().describe("Optional comment explaining why these won't be fixed"),
};

/**
 * Schema for issues tool
 */
export const issuesToolSchema = {
  // Component filters (backward compatible)
  project_key: z.string().optional(), // Made optional to support projects array
  projects: z.array(z.string()).nullable().optional(),
  component_keys: z.array(z.string()).nullable().optional(),
  components: z.array(z.string()).nullable().optional(),
  on_component_only: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),

  // Branch and PR support
  branch: z.string().nullable().optional(),
  pull_request: z.string().nullable().optional(),

  // Issue filters
  issues: z.array(z.string()).nullable().optional(),
  severity: severitySchema, // Deprecated single value
  severities: severitiesSchema, // New array support
  statuses: statusSchema,
  resolutions: resolutionSchema,
  resolved: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),
  types: typeSchema,

  // Clean Code taxonomy (SonarQube 10.x+)
  clean_code_attribute_categories: cleanCodeAttributeCategoriesSchema,
  impact_severities: impactSeveritiesSchema,
  impact_software_qualities: impactSoftwareQualitiesSchema,
  issue_statuses: statusSchema, // New issue status values

  // Rules and tags
  rules: z.array(z.string()).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),

  // Date filters
  created_after: z.string().nullable().optional(),
  created_before: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  created_in_last: z.string().nullable().optional(),

  // Assignment
  assigned: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),
  assignees: z.array(z.string()).nullable().optional(),
  author: z.string().nullable().optional(), // Single author
  authors: z.array(z.string()).nullable().optional(), // Multiple authors

  // Security standards
  cwe: z.array(z.string()).nullable().optional(),
  owasp_top10: z.array(z.string()).nullable().optional(),
  owasp_top10_v2021: z.array(z.string()).nullable().optional(), // New 2021 version
  sans_top25: z.array(z.string()).nullable().optional(),
  sonarsource_security: z.array(z.string()).nullable().optional(),
  sonarsource_security_category: z.array(z.string()).nullable().optional(),

  // Languages
  languages: z.array(z.string()).nullable().optional(),

  // Facets
  facets: z.array(z.string()).nullable().optional(),
  facet_mode: z.enum(['effort', 'count']).nullable().optional(),

  // New code
  since_leak_period: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),
  in_new_code_period: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(),

  // Sorting
  s: z.string().nullable().optional(), // Sort field
  asc: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .nullable()
    .optional(), // Sort direction

  // Response optimization
  additional_fields: z.array(z.string()).nullable().optional(),

  // Pagination
  page: z.string().optional().transform(stringToNumberTransform),
  page_size: z.string().optional().transform(stringToNumberTransform),
};
