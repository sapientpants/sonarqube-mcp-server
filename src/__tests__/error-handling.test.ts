/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import nock from 'nock';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';

// Save environment variables
const originalEnv = process.env;

beforeAll(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.cleanAll();
});

/* eslint-disable @typescript-eslint/no-explicit-any */
let nullToUndefined: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// No need to mock axios anymore since we're using sonarqube-web-api-client

describe('Error Handling', () => {
  beforeAll(async () => {
    const module = await import('../index.js');
    nullToUndefined = module.nullToUndefined;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    nock.cleanAll();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  describe('nullToUndefined function', () => {
    it('should handle various input types correctly', () => {
      // Test nulls
      expect(nullToUndefined(null)).toBeUndefined();

      // Test undefined
      expect(nullToUndefined(undefined)).toBeUndefined();

      // Test various other types
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
      expect(nullToUndefined('test')).toBe('test');
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined(true)).toBe(true);

      // Test objects and arrays
      const obj = { test: 1 };
      const arr = [1, 2, 3];
      expect(nullToUndefined(obj)).toBe(obj);
      expect(nullToUndefined(arr)).toBe(arr);
    });
  });

  describe('mapToSonarQubeParams', () => {
    it('should handle all parameters', async () => {
      const module = await import('../index.js');
      const mapToSonarQubeParams = module.mapToSonarQubeParams;

      const params = mapToSonarQubeParams({
        project_key: 'test-project',
        severity: 'MAJOR',
        page: 1,
        page_size: 10,
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE', 'FIXED'],
        resolved: true,
        types: ['BUG', 'VULNERABILITY'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2023-01-01',
        created_before: '2023-12-31',
        created_at: '2023-06-15',
        created_in_last: '7d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'typescript'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['sec1', 'sec2'],
        on_component_only: true,
        facets: ['facet1', 'facet2'],
        since_leak_period: true,
        in_new_code_period: true,
      });

      expect(params.projectKey).toBe('test-project');
      expect(params.severity).toBe('MAJOR');
      expect(params.page).toBe(1);
      expect(params.pageSize).toBe(10);
      expect(params.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(params.resolutions).toEqual(['FALSE-POSITIVE', 'FIXED']);
      expect(params.resolved).toBe(true);
      expect(params.types).toEqual(['BUG', 'VULNERABILITY']);
      expect(params.rules).toEqual(['rule1', 'rule2']);
      expect(params.tags).toEqual(['tag1', 'tag2']);
      expect(params.createdAfter).toBe('2023-01-01');
      expect(params.createdBefore).toBe('2023-12-31');
      expect(params.createdAt).toBe('2023-06-15');
      expect(params.createdInLast).toBe('7d');
      expect(params.assignees).toEqual(['user1', 'user2']);
      expect(params.authors).toEqual(['author1', 'author2']);
      expect(params.cwe).toEqual(['cwe1', 'cwe2']);
      expect(params.languages).toEqual(['java', 'typescript']);
      expect(params.owaspTop10).toEqual(['a1', 'a2']);
      expect(params.sansTop25).toEqual(['sans1', 'sans2']);
      expect(params.sonarsourceSecurity).toEqual(['sec1', 'sec2']);
      expect(params.onComponentOnly).toBe(true);
      expect(params.facets).toEqual(['facet1', 'facet2']);
      expect(params.sinceLeakPeriod).toBe(true);
      expect(params.inNewCodePeriod).toBe(true);
    });

    it('should handle empty parameters', async () => {
      const module = await import('../index.js');
      const mapToSonarQubeParams = module.mapToSonarQubeParams;

      const params = mapToSonarQubeParams({ project_key: 'test-project' });

      expect(params.projectKey).toBe('test-project');
      expect(params.severity).toBeUndefined();
      expect(params.statuses).toBeUndefined();
      expect(params.resolutions).toBeUndefined();
      expect(params.resolved).toBeUndefined();
      expect(params.types).toBeUndefined();
      expect(params.rules).toBeUndefined();
    });
  });

  describe('Error handling utility functions', () => {
    it('should properly handle null parameters', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('should pass through non-null values', () => {
      expect(nullToUndefined('value')).toBe('value');
      expect(nullToUndefined(123)).toBe(123);
      expect(nullToUndefined(true)).toBe(true);
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined([])).toEqual([]);
      expect(nullToUndefined({})).toEqual({});
    });

    it('should handle undefined parameters', () => {
      expect(nullToUndefined(undefined)).toBeUndefined();
    });
  });
});
