import { z } from 'zod';
import { numberOrStringToString, parseJsonStringArray } from '../utils/transforms.js';

/**
 * Common schemas used across multiple domains
 */

// Severity schemas
export const severitySchema = z
  .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  .nullable()
  .optional();

export const severitiesSchema = z
  .union([z.array(z.enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])), z.string()])
  .nullable()
  .optional();

// Status schemas
export const statusSchema = z
  .union([z.array(z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'])), z.string()])
  .nullable()
  .optional();

// Resolution schemas
export const resolutionSchema = z
  .union([z.array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'])), z.string()])
  .nullable()
  .optional();

// Type schemas
export const typeSchema = z
  .union([z.array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT'])), z.string()])
  .nullable()
  .optional();

// Clean Code taxonomy schemas
export const cleanCodeAttributeCategoriesSchema = z
  .union([z.array(z.enum(['ADAPTABLE', 'CONSISTENT', 'INTENTIONAL', 'RESPONSIBLE'])), z.string()])
  .nullable()
  .optional();

export const impactSeveritiesSchema = z
  .union([z.array(z.enum(['HIGH', 'MEDIUM', 'LOW'])), z.string()])
  .nullable()
  .optional();

export const impactSoftwareQualitiesSchema = z
  .union([z.array(z.enum(['MAINTAINABILITY', 'RELIABILITY', 'SECURITY'])), z.string()])
  .nullable()
  .optional();

// Pull request schema - accepts either string or number and converts to string
export const pullRequestSchema = z
  .union([z.string(), z.number()])
  .optional()
  .transform(numberOrStringToString);

// Pull request schema with nullable - for schemas that allow null values
export const pullRequestNullableSchema = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform(numberOrStringToString);
