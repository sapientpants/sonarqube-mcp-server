/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Schema Validators and Transformers', () => {
  it('should transform page string to number or null', () => {
    const pageSchema = z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null));

    expect(pageSchema.parse('10')).toBe(10);
    expect(pageSchema.parse('invalid')).toBe(null);
    expect(pageSchema.parse('')).toBe(null);
    expect(pageSchema.parse(undefined)).toBe(null);
  });

  it('should transform string to boolean', () => {
    const booleanSchema = z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional();

    expect(booleanSchema.parse('true')).toBe(true);
    expect(booleanSchema.parse('false')).toBe(false);
    expect(booleanSchema.parse(true)).toBe(true);
    expect(booleanSchema.parse(false)).toBe(false);
    expect(booleanSchema.parse(null)).toBe(null);
    expect(booleanSchema.parse(undefined)).toBe(undefined);
  });

  it('should validate severity enum', () => {
    const severitySchema = z
      .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
      .nullable()
      .optional();

    expect(severitySchema.parse('INFO')).toBe('INFO');
    expect(severitySchema.parse('MINOR')).toBe('MINOR');
    expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
    expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
    expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');
    expect(severitySchema.parse(null)).toBe(null);
    expect(severitySchema.parse(undefined)).toBe(undefined);
    expect(() => severitySchema.parse('INVALID')).toThrow();
  });

  it('should validate status array enum', () => {
    const statusSchema = z
      .array(
        z.enum([
          'OPEN',
          'CONFIRMED',
          'REOPENED',
          'RESOLVED',
          'CLOSED',
          'TO_REVIEW',
          'IN_REVIEW',
          'REVIEWED',
        ])
      )
      .nullable()
      .optional();

    expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
    expect(statusSchema.parse(null)).toBe(null);
    expect(statusSchema.parse(undefined)).toBe(undefined);
    expect(() => statusSchema.parse(['INVALID'])).toThrow();
  });

  it('should validate resolution array enum', () => {
    const resolutionSchema = z
      .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
      .nullable()
      .optional();

    expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
      'FALSE-POSITIVE',
      'WONTFIX',
    ]);
    expect(resolutionSchema.parse(null)).toBe(null);
    expect(resolutionSchema.parse(undefined)).toBe(undefined);
    expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
  });

  it('should validate type array enum', () => {
    const typeSchema = z
      .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
      .nullable()
      .optional();

    expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
    expect(typeSchema.parse(null)).toBe(null);
    expect(typeSchema.parse(undefined)).toBe(undefined);
    expect(() => typeSchema.parse(['INVALID'])).toThrow();
  });
});
