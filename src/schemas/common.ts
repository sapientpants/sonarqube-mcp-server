import { z } from 'zod';

/**
 * Common schemas used across multiple domains
 */

// Severity schemas
export const severitySchema = z
  .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  .nullable()
  .optional();

export const severitiesSchema = z
  .array(z.enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER']))
  .nullable()
  .optional();

// Status schemas
export const statusSchema = z
  .array(z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED']))
  .nullable()
  .optional();

// Resolution schemas
export const resolutionSchema = z
  .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
  .nullable()
  .optional();

// Type schemas
export const typeSchema = z
  .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
  .nullable()
  .optional();

// Clean Code taxonomy schemas
export const cleanCodeAttributeCategoriesSchema = z
  .array(z.enum(['ADAPTABLE', 'CONSISTENT', 'INTENTIONAL', 'RESPONSIBLE']))
  .nullable()
  .optional();

export const impactSeveritiesSchema = z
  .array(z.enum(['HIGH', 'MEDIUM', 'LOW']))
  .nullable()
  .optional();

export const impactSoftwareQualitiesSchema = z
  .array(z.enum(['MAINTAINABILITY', 'RELIABILITY', 'SECURITY']))
  .nullable()
  .optional();
