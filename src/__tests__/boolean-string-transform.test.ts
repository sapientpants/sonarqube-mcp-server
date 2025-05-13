/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Boolean string transform', () => {
  // Test the boolean transform that's used in the tool registrations
  const booleanStringTransform = (val: string) => val === 'true';

  // Create a schema that matches the one in index.ts
  const booleanSchema = z
    .union([z.boolean(), z.string().transform(booleanStringTransform)])
    .nullable()
    .optional();

  describe('direct transform function', () => {
    it('should transform "true" to true', () => {
      expect(booleanStringTransform('true')).toBe(true);
    });

    it('should transform anything else to false', () => {
      expect(booleanStringTransform('false')).toBe(false);
      expect(booleanStringTransform('True')).toBe(false);
      expect(booleanStringTransform('1')).toBe(false);
      expect(booleanStringTransform('')).toBe(false);
    });
  });

  describe('zod schema with boolean transform', () => {
    it('should accept and pass through boolean values', () => {
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);
    });

    it('should transform string "true" to boolean true', () => {
      expect(booleanSchema.parse('true')).toBe(true);
    });

    it('should transform other string values to boolean false', () => {
      expect(booleanSchema.parse('false')).toBe(false);
      expect(booleanSchema.parse('1')).toBe(false);
      expect(booleanSchema.parse('')).toBe(false);
    });

    it('should pass through null and undefined', () => {
      expect(booleanSchema.parse(null)).toBeNull();
      expect(booleanSchema.parse(undefined)).toBeUndefined();
    });
  });

  // Test multiple boolean schema transformations in the same schema
  describe('multiple boolean transforms in schema', () => {
    // Create a schema with multiple boolean transforms
    const complexSchema = z.object({
      resolved: z
        .union([z.boolean(), z.string().transform(booleanStringTransform)])
        .nullable()
        .optional(),
      on_component_only: z
        .union([z.boolean(), z.string().transform(booleanStringTransform)])
        .nullable()
        .optional(),
      since_leak_period: z
        .union([z.boolean(), z.string().transform(booleanStringTransform)])
        .nullable()
        .optional(),
      in_new_code_period: z
        .union([z.boolean(), z.string().transform(booleanStringTransform)])
        .nullable()
        .optional(),
    });

    it('should transform multiple boolean string values', () => {
      const result = complexSchema.parse({
        resolved: 'true',
        on_component_only: 'false',
        since_leak_period: true,
        in_new_code_period: 'true',
      });

      expect(result).toEqual({
        resolved: true,
        on_component_only: false,
        since_leak_period: true,
        in_new_code_period: true,
      });
    });

    it('should handle mix of boolean, string, null and undefined values', () => {
      const result = complexSchema.parse({
        resolved: true,
        on_component_only: 'true',
        since_leak_period: null,
      });

      expect(result).toEqual({
        resolved: true,
        on_component_only: true,
        since_leak_period: null,
      });
    });
  });
});
