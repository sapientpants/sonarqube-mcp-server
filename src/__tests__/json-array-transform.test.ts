import { z } from 'zod';
import { parseJsonStringArray } from '../utils/transforms.js';
import { issuesToolSchema } from '../schemas/issues.js';
import {
  resolutionSchema,
  typeSchema,
  cleanCodeAttributeCategoriesSchema,
  impactSeveritiesSchema,
  impactSoftwareQualitiesSchema,
} from '../schemas/common.js';

describe('JSON Array Transform', () => {
  describe('parseJsonStringArray', () => {
    test('handles arrays correctly', () => {
      const result = parseJsonStringArray(['item1', 'item2']);
      expect(result).toEqual(['item1', 'item2']);
    });

    test('parses JSON string arrays', () => {
      const result = parseJsonStringArray('["item1", "item2"]');
      expect(result).toEqual(['item1', 'item2']);
    });

    test('handles single string as array', () => {
      const result = parseJsonStringArray('single-item');
      expect(result).toEqual(['single-item']);
    });

    test('handles null values', () => {
      const result = parseJsonStringArray(null);
      expect(result).toBeNull();
    });

    test('handles undefined values', () => {
      const result = parseJsonStringArray(undefined);
      expect(result).toBeUndefined();
    });

    test('handles invalid JSON as single item array', () => {
      const result = parseJsonStringArray('{invalid json');
      expect(result).toEqual(['{invalid json']);
    });
  });

  describe('issues schema with JSON arrays', () => {
    const schema = z.object(issuesToolSchema);

    test('accepts facets as array', () => {
      const result = schema.parse({
        facets: ['severities', 'statuses', 'types', 'rules', 'files'],
      });
      expect(result.facets).toEqual(['severities', 'statuses', 'types', 'rules', 'files']);
    });

    test('accepts facets as JSON string', () => {
      const result = schema.parse({
        facets: '["severities", "statuses", "types", "rules", "files"]',
      });
      expect(result.facets).toEqual(['severities', 'statuses', 'types', 'rules', 'files']);
    });

    test('accepts multiple array fields as JSON strings', () => {
      const result = schema.parse({
        projects: '["project1", "project2"]',
        facets: '["severities", "statuses"]',
        tags: '["security", "performance"]',
        assignees: '["user1", "user2"]',
        rules: '["rule1", "rule2"]',
        severities: '["CRITICAL", "MAJOR"]',
        statuses: '["OPEN", "CONFIRMED"]',
      });

      expect(result.projects).toEqual(['project1', 'project2']);
      expect(result.facets).toEqual(['severities', 'statuses']);
      expect(result.tags).toEqual(['security', 'performance']);
      expect(result.assignees).toEqual(['user1', 'user2']);
      expect(result.rules).toEqual(['rule1', 'rule2']);
      expect(result.severities).toEqual(['CRITICAL', 'MAJOR']);
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
    });

    test('filters invalid enum values', () => {
      const result = schema.parse({
        severities: '["CRITICAL", "INVALID", "MAJOR"]',
        statuses: '["OPEN", "INVALID_STATUS", "CONFIRMED"]',
        scopes: '["MAIN", "INVALID_SCOPE", "TEST"]',
      });

      expect(result.severities).toEqual(['CRITICAL', 'MAJOR']);
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result.scopes).toEqual(['MAIN', 'TEST']);
    });

    test('handles complex MCP client scenario', () => {
      // This simulates what an MCP client might send
      const input = {
        project_key: 'sonarqube-mcp-server',
        page_size: '50',
        facets: '["severities", "statuses", "types", "rules", "files"]',
      };

      const result = schema.parse(input);

      expect(result.project_key).toBe('sonarqube-mcp-server');
      expect(result.page_size).toBe(50); // Transformed by stringToNumberTransform
      expect(result.facets).toEqual(['severities', 'statuses', 'types', 'rules', 'files']);
    });

    test('handles resolutions with JSON strings and filters invalid values', () => {
      const result = schema.parse({
        resolutions: '["FALSE-POSITIVE", "INVALID", "WONTFIX"]',
      });

      expect(result.resolutions).toEqual(['FALSE-POSITIVE', 'WONTFIX']);
    });

    test('handles types with JSON strings and filters invalid values', () => {
      const result = schema.parse({
        types: '["BUG", "INVALID_TYPE", "VULNERABILITY"]',
      });

      expect(result.types).toEqual(['BUG', 'VULNERABILITY']);
    });

    test('handles clean code attributes with JSON strings', () => {
      const result = schema.parse({
        clean_code_attribute_categories: '["ADAPTABLE", "INVALID", "CONSISTENT"]',
      });

      expect(result.clean_code_attribute_categories).toEqual(['ADAPTABLE', 'CONSISTENT']);
    });

    test('handles impact severities with JSON strings', () => {
      const result = schema.parse({
        impact_severities: '["HIGH", "INVALID", "LOW"]',
      });

      expect(result.impact_severities).toEqual(['HIGH', 'LOW']);
    });

    test('handles impact software qualities with JSON strings', () => {
      const result = schema.parse({
        impact_software_qualities: '["MAINTAINABILITY", "INVALID", "SECURITY"]',
      });

      expect(result.impact_software_qualities).toEqual(['MAINTAINABILITY', 'SECURITY']);
    });
  });

  describe('common schemas with JSON arrays', () => {
    test('resolutionSchema accepts JSON strings and filters invalid values', () => {
      const schema = z.object({ resolution: resolutionSchema });

      const result = schema.parse({
        resolution: '["FALSE-POSITIVE", "INVALID_RESOLUTION", "FIXED"]',
      });

      expect(result.resolution).toEqual(['FALSE-POSITIVE', 'FIXED']);
    });

    test('resolutionSchema accepts arrays directly', () => {
      const schema = z.object({ resolution: resolutionSchema });

      const result = schema.parse({
        resolution: ['WONTFIX', 'REMOVED'],
      });

      expect(result.resolution).toEqual(['WONTFIX', 'REMOVED']);
    });

    test('typeSchema accepts JSON strings and filters invalid values', () => {
      const schema = z.object({ type: typeSchema });

      const result = schema.parse({
        type: '["CODE_SMELL", "INVALID_TYPE", "BUG"]',
      });

      expect(result.type).toEqual(['CODE_SMELL', 'BUG']);
    });

    test('cleanCodeAttributeCategoriesSchema accepts JSON strings', () => {
      const schema = z.object({ categories: cleanCodeAttributeCategoriesSchema });

      const result = schema.parse({
        categories: '["INTENTIONAL", "INVALID_CATEGORY", "RESPONSIBLE"]',
      });

      expect(result.categories).toEqual(['INTENTIONAL', 'RESPONSIBLE']);
    });

    test('impactSeveritiesSchema accepts JSON strings', () => {
      const schema = z.object({ severities: impactSeveritiesSchema });

      const result = schema.parse({
        severities: '["HIGH", "INVALID_SEVERITY", "MEDIUM"]',
      });

      expect(result.severities).toEqual(['HIGH', 'MEDIUM']);
    });

    test('impactSoftwareQualitiesSchema accepts JSON strings', () => {
      const schema = z.object({ qualities: impactSoftwareQualitiesSchema });

      const result = schema.parse({
        qualities: '["RELIABILITY", "INVALID_QUALITY", "SECURITY"]',
      });

      expect(result.qualities).toEqual(['RELIABILITY', 'SECURITY']);
    });
  });
});
