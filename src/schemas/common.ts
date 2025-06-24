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
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid severities
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) => ['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'].includes(v));
    }
    return parsed;
  })
  .nullable()
  .optional();

// Status schemas
export const statusSchema = z
  .union([z.array(z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'])), z.string()])
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid statuses
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) =>
        ['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'].includes(v)
      );
    }
    return parsed;
  })
  .nullable()
  .optional();

// Resolution schemas
export const resolutionSchema = z
  .union([z.array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'])), z.string()])
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid resolutions
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) => ['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'].includes(v));
    }
    return parsed;
  })
  .nullable()
  .optional();

// Type schemas
export const typeSchema = z
  .union([z.array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT'])), z.string()])
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid types
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) =>
        ['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT'].includes(v)
      );
    }
    return parsed;
  })
  .nullable()
  .optional();

// Clean Code taxonomy schemas
export const cleanCodeAttributeCategoriesSchema = z
  .union([z.array(z.enum(['ADAPTABLE', 'CONSISTENT', 'INTENTIONAL', 'RESPONSIBLE'])), z.string()])
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid categories
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) =>
        ['ADAPTABLE', 'CONSISTENT', 'INTENTIONAL', 'RESPONSIBLE'].includes(v)
      );
    }
    return parsed;
  })
  .nullable()
  .optional();

export const impactSeveritiesSchema = z
  .union([z.array(z.enum(['HIGH', 'MEDIUM', 'LOW'])), z.string()])
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid impact severities
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) => ['HIGH', 'MEDIUM', 'LOW'].includes(v));
    }
    return parsed;
  })
  .nullable()
  .optional();

export const impactSoftwareQualitiesSchema = z
  .union([z.array(z.enum(['MAINTAINABILITY', 'RELIABILITY', 'SECURITY'])), z.string()])
  .transform((val) => {
    const parsed = parseJsonStringArray(val);
    // Validate that all values are valid software qualities
    if (parsed && Array.isArray(parsed)) {
      return parsed.filter((v) => ['MAINTAINABILITY', 'RELIABILITY', 'SECURITY'].includes(v));
    }
    return parsed;
  })
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
