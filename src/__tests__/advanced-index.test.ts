/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import nock from 'nock';
import { z } from 'zod';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Save environment variables
const originalEnv = process.env;

beforeAll(() => {
  nock.cleanAll();
  // Common mocks for all tests
  nock('http://localhost:9000')
    .persist()
    .get('/api/projects/search')
    .query(true)
    .reply(200, {
      components: [
        {
          key: 'test-project',
          name: 'Test Project',
          qualifier: 'TRK',
          visibility: 'public',
        },
      ],
      paging: {
        pageIndex: 1,
        pageSize: 10,
        total: 1,
      },
    });
});

afterAll(() => {
  nock.cleanAll();
});

let nullToUndefined: any;
let mapToSonarQubeParams: any;

// No need to mock axios anymore since we're using sonarqube-web-api-client

describe('Advanced MCP Server Tests', () => {
  beforeAll(async () => {
    // Import functions we need to test
    const module = await import('../index.js');
    nullToUndefined = module.nullToUndefined;
    mapToSonarQubeParams = module.mapToSonarQubeParams;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
    nock.cleanAll();
  });

  describe('Schema Transformation Tests', () => {
    it('should transform page parameters correctly', () => {
      // Create a schema that matches the one in the tool registration
      const pageSchema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      // Test valid inputs
      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('100')).toBe(100);

      // Test invalid or empty inputs
      expect(pageSchema.parse('')).toBe(null);
      expect(pageSchema.parse('abc')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
    });

    it('should transform boolean parameters correctly', () => {
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      // Test string values
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);

      // Test boolean values
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);

      // Test null/undefined values
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
  });

  describe('nullToUndefined Tests', () => {
    it('should convert null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('should pass through other values', () => {
      expect(nullToUndefined(123)).toBe(123);
      expect(nullToUndefined('string')).toBe('string');
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined({})).toEqual({});
      expect(nullToUndefined([])).toEqual([]);
      expect(nullToUndefined(undefined)).toBeUndefined();
    });
  });

  describe('mapToSonarQubeParams Tests', () => {
    it('should map MCP parameters to SonarQube parameters', () => {
      const mcpParams = {
        project_key: 'test-project',
        severity: 'MAJOR',
        page: 1,
        page_size: 10,
      };

      const sonarQubeParams = mapToSonarQubeParams(mcpParams);

      expect(sonarQubeParams.projectKey).toBe('test-project');
      expect(sonarQubeParams.severity).toBe('MAJOR');
      expect(sonarQubeParams.page).toBe(1);
      expect(sonarQubeParams.pageSize).toBe(10);
    });

    it('should handle empty optional parameters', () => {
      const mcpParams = {
        project_key: 'test-project',
      };

      const sonarQubeParams = mapToSonarQubeParams(mcpParams);

      expect(sonarQubeParams.projectKey).toBe('test-project');
      expect(sonarQubeParams.severity).toBeUndefined();
      expect(sonarQubeParams.page).toBeUndefined();
      expect(sonarQubeParams.pageSize).toBeUndefined();
    });

    it('should handle array parameters', () => {
      const mcpParams = {
        project_key: 'test-project',
        statuses: ['OPEN', 'CONFIRMED'],
        types: ['BUG', 'VULNERABILITY'],
      };

      const sonarQubeParams = mapToSonarQubeParams(mcpParams);

      expect(sonarQubeParams.projectKey).toBe('test-project');
      expect(sonarQubeParams.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(sonarQubeParams.types).toEqual(['BUG', 'VULNERABILITY']);
    });

    it('should handle boolean parameters', () => {
      const mcpParams = {
        project_key: 'test-project',
        resolved: true,
        on_component_only: false,
      };

      const sonarQubeParams = mapToSonarQubeParams(mcpParams);

      expect(sonarQubeParams.projectKey).toBe('test-project');
      expect(sonarQubeParams.resolved).toBe(true);
      expect(sonarQubeParams.onComponentOnly).toBe(false);
    });
  });

  describe('Environment Handling', () => {
    it('should correctly retrieve environment variables', () => {
      expect(process.env.SONARQUBE_TOKEN).toBe('test-token');
      expect(process.env.SONARQUBE_URL).toBe('http://localhost:9000');
      expect(process.env.SONARQUBE_ORGANIZATION).toBe('test-org');
    });
  });
});
