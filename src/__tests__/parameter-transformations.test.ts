/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { mapToSonarQubeParams, nullToUndefined } from '../index.js';
import { z } from 'zod';

describe('Parameter Transformation Functions', () => {
  describe('nullToUndefined', () => {
    it('should convert null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('should return the original value for non-null inputs', () => {
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
      expect(nullToUndefined('test')).toBe('test');
      expect(nullToUndefined(undefined)).toBeUndefined();
      expect(nullToUndefined(123)).toBe(123);
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined(true)).toBe(true);

      const obj = { test: 'value' };
      const arr = [1, 2, 3];
      expect(nullToUndefined(obj)).toBe(obj);
      expect(nullToUndefined(arr)).toBe(arr);
    });
  });

  describe('mapToSonarQubeParams', () => {
    it('should map MCP tool parameters to SonarQube client parameters', () => {
      const result = mapToSonarQubeParams({
        project_key: 'my-project',
        severity: 'MAJOR',
        page: '10',
        page_size: '25',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE'],
        resolved: 'true',
        types: ['BUG', 'VULNERABILITY'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2023-01-01',
        created_before: '2023-12-31',
        created_at: '2023-06-15',
        created_in_last: '30d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'js'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['ss1', 'ss2'],
        on_component_only: 'true',
        facets: ['facet1', 'facet2'],
        since_leak_period: 'true',
        in_new_code_period: 'true',
      });

      // Check key mappings
      expect(result.projectKey).toBe('my-project');
      expect(result.severity).toBe('MAJOR');
      expect(result.page).toBe('10');
      expect(result.pageSize).toBe('25');
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result.resolutions).toEqual(['FALSE-POSITIVE']);
      expect(result.resolved).toBe('true');
      expect(result.types).toEqual(['BUG', 'VULNERABILITY']);
      expect(result.rules).toEqual(['rule1', 'rule2']);
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.createdAfter).toBe('2023-01-01');
      expect(result.createdBefore).toBe('2023-12-31');
      expect(result.createdAt).toBe('2023-06-15');
      expect(result.createdInLast).toBe('30d');
      expect(result.assignees).toEqual(['user1', 'user2']);
      expect(result.authors).toEqual(['author1', 'author2']);
      expect(result.cwe).toEqual(['cwe1', 'cwe2']);
      expect(result.languages).toEqual(['java', 'js']);
      expect(result.owaspTop10).toEqual(['a1', 'a2']);
      expect(result.sansTop25).toEqual(['sans1', 'sans2']);
      expect(result.sonarsourceSecurity).toEqual(['ss1', 'ss2']);
      expect(result.onComponentOnly).toBe('true');
      expect(result.facets).toEqual(['facet1', 'facet2']);
      expect(result.sinceLeakPeriod).toBe('true');
      expect(result.inNewCodePeriod).toBe('true');
    });

    it('should handle null and undefined values correctly', () => {
      const result = mapToSonarQubeParams({
        project_key: 'my-project',
        severity: null,
        statuses: null,
        resolved: null,
      });

      expect(result.projectKey).toBe('my-project');
      expect(result.severity).toBeUndefined();
      expect(result.statuses).toBeUndefined();
      expect(result.resolved).toBeUndefined();
    });

    it('should handle minimal parameters', () => {
      const result = mapToSonarQubeParams({
        project_key: 'my-project',
      });

      expect(result.projectKey).toBe('my-project');
      expect(result.severity).toBeUndefined();
      expect(result.page).toBeUndefined();
      expect(result.pageSize).toBeUndefined();
    });

    it('should handle empty parameters', () => {
      const result = mapToSonarQubeParams({
        project_key: 'my-project',
        statuses: [],
        resolutions: [],
        types: [],
        rules: [],
      });

      expect(result.projectKey).toBe('my-project');
      expect(result.statuses).toEqual([]);
      expect(result.resolutions).toEqual([]);
      expect(result.types).toEqual([]);
      expect(result.rules).toEqual([]);
    });
  });

  describe('Array parameter handling', () => {
    it('should handle array handling for issues parameters', () => {
      // Test with arrays
      const result1 = mapToSonarQubeParams({
        project_key: 'project1',
        statuses: ['OPEN', 'CONFIRMED'],
        types: ['BUG', 'VULNERABILITY'],
      });

      expect(result1.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result1.types).toEqual(['BUG', 'VULNERABILITY']);

      // Test with null
      const result2 = mapToSonarQubeParams({
        project_key: 'project1',
        statuses: null,
        types: null,
      });

      expect(result2.statuses).toBeUndefined();
      expect(result2.types).toBeUndefined();
    });
  });

  describe('Schema Transformations', () => {
    describe('Page Parameter Transformation', () => {
      it('should transform string values to numbers or null', () => {
        const pageSchema = z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) || null : null));

        // Test valid numeric strings
        expect(pageSchema.parse('1')).toBe(1);
        expect(pageSchema.parse('100')).toBe(100);

        // Test invalid values
        expect(pageSchema.parse('invalid')).toBe(null);
        expect(pageSchema.parse('')).toBe(null);
        expect(pageSchema.parse(undefined)).toBe(null);
      });
    });

    describe('Boolean Parameter Transformation', () => {
      it('should transform string "true"/"false" to boolean values', () => {
        const booleanSchema = z
          .union([z.boolean(), z.string().transform((val) => val === 'true')])
          .nullable()
          .optional();

        // String values
        expect(booleanSchema.parse('true')).toBe(true);
        expect(booleanSchema.parse('false')).toBe(false);

        // Boolean values should pass through
        expect(booleanSchema.parse(true)).toBe(true);
        expect(booleanSchema.parse(false)).toBe(false);

        // Null/undefined values
        expect(booleanSchema.parse(null)).toBe(null);
        expect(booleanSchema.parse(undefined)).toBe(undefined);
      });
    });

    describe('Enum Arrays Parameter Transformation', () => {
      it('should validate enum arrays correctly', () => {
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

        // Valid values
        expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);

        // Null/undefined values
        expect(statusSchema.parse(null)).toBe(null);
        expect(statusSchema.parse(undefined)).toBe(undefined);

        // Invalid values should throw
        expect(() => statusSchema.parse(['INVALID'])).toThrow();
      });

      it('should validate resolution enums', () => {
        const resolutionSchema = z
          .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
          .nullable()
          .optional();

        // Valid values
        expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
          'FALSE-POSITIVE',
          'WONTFIX',
        ]);

        // Null/undefined values
        expect(resolutionSchema.parse(null)).toBe(null);
        expect(resolutionSchema.parse(undefined)).toBe(undefined);

        // Invalid values should throw
        expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
      });

      it('should validate issue type enums', () => {
        const typeSchema = z
          .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
          .nullable()
          .optional();

        // Valid values
        expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);

        // Null/undefined values
        expect(typeSchema.parse(null)).toBe(null);
        expect(typeSchema.parse(undefined)).toBe(undefined);

        // Invalid values should throw
        expect(() => typeSchema.parse(['INVALID'])).toThrow();
      });
    });
  });
});
