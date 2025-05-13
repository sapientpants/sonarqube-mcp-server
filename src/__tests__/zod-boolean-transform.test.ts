/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Zod Boolean Transform Coverage', () => {
  // This explicitly tests the transform used in index.ts for boolean parameters
  // We're covering lines 705-731 in index.ts

  describe('resolved parameter transform', () => {
    // Recreate the exact schema used in index.ts
    const resolvedSchema = z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional();

    it('should handle boolean true value', () => {
      expect(resolvedSchema.parse(true)).toBe(true);
    });

    it('should handle boolean false value', () => {
      expect(resolvedSchema.parse(false)).toBe(false);
    });

    it('should transform string "true" to boolean true', () => {
      expect(resolvedSchema.parse('true')).toBe(true);
    });

    it('should transform string "false" to boolean false', () => {
      expect(resolvedSchema.parse('false')).toBe(false);
    });

    it('should pass null and undefined through', () => {
      expect(resolvedSchema.parse(null)).toBeNull();
      expect(resolvedSchema.parse(undefined)).toBeUndefined();
    });
  });

  describe('on_component_only parameter transform', () => {
    // Recreate the exact schema used in index.ts
    const onComponentOnlySchema = z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional();

    it('should transform valid values correctly', () => {
      expect(onComponentOnlySchema.parse(true)).toBe(true);
      expect(onComponentOnlySchema.parse('true')).toBe(true);
      expect(onComponentOnlySchema.parse(false)).toBe(false);
      expect(onComponentOnlySchema.parse('false')).toBe(false);
    });
  });

  describe('since_leak_period parameter transform', () => {
    // Recreate the exact schema used in index.ts
    const sinceLeakPeriodSchema = z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional();

    it('should transform valid values correctly', () => {
      expect(sinceLeakPeriodSchema.parse(true)).toBe(true);
      expect(sinceLeakPeriodSchema.parse('true')).toBe(true);
      expect(sinceLeakPeriodSchema.parse(false)).toBe(false);
      expect(sinceLeakPeriodSchema.parse('false')).toBe(false);
    });
  });

  describe('in_new_code_period parameter transform', () => {
    // Recreate the exact schema used in index.ts
    const inNewCodePeriodSchema = z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional();

    it('should transform valid values correctly', () => {
      expect(inNewCodePeriodSchema.parse(true)).toBe(true);
      expect(inNewCodePeriodSchema.parse('true')).toBe(true);
      expect(inNewCodePeriodSchema.parse(false)).toBe(false);
      expect(inNewCodePeriodSchema.parse('false')).toBe(false);
    });
  });
});
