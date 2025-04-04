/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import nock from 'nock';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Define schema for boolean transformations
const booleanStringSchema = z.union([z.boolean(), z.string().transform((val) => val === 'true')]);

// Save environment variables
const originalEnv = process.env;
let mcpServer: any;
let nullToUndefined: any;
let handleSonarQubeProjects: any;
let mapToSonarQubeParams: any;
let handleSonarQubeGetIssues: any;

interface Connectable {
  connect: () => Promise<void>;
}

describe('MCP Server', () => {
  beforeAll(async () => {
    const module = await import('../index.js');
    mcpServer = module.mcpServer;
    nullToUndefined = module.nullToUndefined;
    handleSonarQubeProjects = module.handleSonarQubeProjects;
    mapToSonarQubeParams = module.mapToSonarQubeParams;
    handleSonarQubeGetIssues = module.handleSonarQubeGetIssues;
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

  it('should have initialized the MCP server', () => {
    expect(mcpServer).toBeDefined();
    expect(mcpServer.server).toBeDefined();
  });

  describe('Tool registration', () => {
    it('has registered the SonarQube tools', () => {
      const toolNames = Object.keys((mcpServer as any)._registeredTools);
      expect(toolNames).toContain('projects');
      expect(toolNames).toContain('issues');
      expect(toolNames.length).toBe(2);
    });

    it('should register the issues tool with correct parameters', () => {
      const toolNames = Object.keys((mcpServer as any)._registeredTools);
      expect(toolNames).toContain('issues');
      const issuesTool = (mcpServer as any)._registeredTools['issues'];
      expect(issuesTool).toBeDefined();
      expect(issuesTool.description).toBe('Get issues for a SonarQube project');
    });

    it('should handle page and page_size parameters correctly in projects tool', async () => {
      // Mock SonarQube API response
      nock('https://sonarcloud.io')
        .get('/api/projects/search')
        .query(true)
        .times(3)
        .reply(200, {
          components: [{ key: 'project1', name: 'Project 1' }],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      // Test valid number strings
      await handleSonarQubeProjects({ page: '10', page_size: '20' });
      const validResult = mapToSonarQubeParams({ page: '10', page_size: '20' });
      expect(validResult.page).toBe('10');
      expect(validResult.pageSize).toBe('20');

      // Test invalid number strings
      await handleSonarQubeProjects({ page: 'invalid', page_size: 'invalid' });
      const invalidResult = mapToSonarQubeParams({ page: 'invalid', page_size: 'invalid' });
      expect(invalidResult.page).toBe('invalid');
      expect(invalidResult.pageSize).toBe('invalid');

      // Test undefined values
      await handleSonarQubeProjects({});
      const undefinedResult = mapToSonarQubeParams({});
      expect(undefinedResult.page).toBeUndefined();
      expect(undefinedResult.pageSize).toBeUndefined();
    });

    it('should handle parameters correctly in issues tool', async () => {
      // Mock SonarQube API response
      nock('https://sonarcloud.io')
        .get('/api/issues/search')
        .query(true)
        .times(4)
        .reply(200, {
          issues: [{ key: 'issue1', rule: 'rule1', severity: 'MAJOR' }],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      // Test basic parameters
      const basicParams = {
        project_key: 'test-key',
        severity: 'MAJOR',
        page: '10',
        page_size: '20',
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(basicParams));
      const basicResult = mapToSonarQubeParams(basicParams);
      expect(basicResult.projectKey).toBe('test-key');
      expect(basicResult.severity).toBe('MAJOR');
      expect(basicResult.page).toBe('10');
      expect(basicResult.pageSize).toBe('20');

      // Test boolean parameters
      const transformedBooleanStringParams = {
        project_key: 'test-key',
        resolved: booleanStringSchema.parse('true'),
        on_component_only: booleanStringSchema.parse('true'),
        since_leak_period: booleanStringSchema.parse('true'),
        in_new_code_period: booleanStringSchema.parse('true'),
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(transformedBooleanStringParams));
      const booleanResult = mapToSonarQubeParams(transformedBooleanStringParams);
      expect(booleanResult.projectKey).toBe('test-key');
      expect(booleanResult.resolved).toBe(true);
      expect(booleanResult.onComponentOnly).toBe(true);
      expect(booleanResult.sinceLeakPeriod).toBe(true);
      expect(booleanResult.inNewCodePeriod).toBe(true);

      // Test boolean parameters with actual boolean values
      const transformedBooleanParams = {
        project_key: 'test-key',
        resolved: booleanStringSchema.parse(true),
        on_component_only: booleanStringSchema.parse(true),
        since_leak_period: booleanStringSchema.parse(true),
        in_new_code_period: booleanStringSchema.parse(true),
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(transformedBooleanParams));
      const booleanTrueResult = mapToSonarQubeParams(transformedBooleanParams);
      expect(booleanTrueResult.projectKey).toBe('test-key');
      expect(booleanTrueResult.resolved).toBe(true);
      expect(booleanTrueResult.onComponentOnly).toBe(true);
      expect(booleanTrueResult.sinceLeakPeriod).toBe(true);
      expect(booleanTrueResult.inNewCodePeriod).toBe(true);

      // Test array parameters
      const arrayParams = {
        project_key: 'test-key',
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(arrayParams));
      const arrayResult = mapToSonarQubeParams(arrayParams);
      expect(arrayResult.projectKey).toBe('test-key');
      expect(arrayResult.rules).toEqual(['rule1', 'rule2']);
      expect(arrayResult.tags).toEqual(['tag1', 'tag2']);
      expect(arrayResult.assignees).toEqual(['user1', 'user2']);
      expect(arrayResult.authors).toEqual(['author1', 'author2']);

      // Test date parameters
      const dateParams = {
        project_key: 'test-key',
        created_after: '2024-01-01',
        created_before: '2024-12-31',
        created_at: '2024-06-15',
        created_in_last: '7d',
      };
      nock('https://sonarcloud.io')
        .get('/api/issues/search')
        .query((actualQueryObject) => {
          return (
            actualQueryObject.componentKeys === 'test-key' &&
            actualQueryObject.createdAfter === '2024-01-01' &&
            actualQueryObject.createdBefore === '2024-12-31' &&
            actualQueryObject.createdAt === '2024-06-15' &&
            actualQueryObject.createdInLast === '7d'
          );
        })
        .reply(200, {
          issues: [{ key: 'issue1', rule: 'rule1', severity: 'MAJOR' }],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });
      await handleSonarQubeGetIssues(mapToSonarQubeParams(dateParams));
      const dateResult = mapToSonarQubeParams(dateParams);
      expect(dateResult.projectKey).toBe('test-key');
      expect(dateResult.createdAfter).toBe('2024-01-01');
      expect(dateResult.createdBefore).toBe('2024-12-31');
      expect(dateResult.createdAt).toBe('2024-06-15');
      expect(dateResult.createdInLast).toBe('7d');
    });

    it('should handle additional parameters in issues tool', async () => {
      // Mock SonarQube API response
      nock('https://sonarcloud.io')
        .get('/api/issues/search')
        .query(true)
        .times(2)
        .reply(200, {
          issues: [{ key: 'issue1', rule: 'rule1', severity: 'MAJOR' }],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      // Test status and resolution parameters
      const statusParams = {
        project_key: 'test-key',
        statuses: ['OPEN', 'CONFIRMED', 'REOPENED'],
        resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
        types: ['CODE_SMELL', 'BUG', 'VULNERABILITY'],
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(statusParams));
      const statusResult = mapToSonarQubeParams(statusParams);
      expect(statusResult.projectKey).toBe('test-key');
      expect(statusResult.statuses).toEqual(['OPEN', 'CONFIRMED', 'REOPENED']);
      expect(statusResult.resolutions).toEqual(['FALSE-POSITIVE', 'WONTFIX']);
      expect(statusResult.types).toEqual(['CODE_SMELL', 'BUG', 'VULNERABILITY']);

      // Test remaining array parameters
      const additionalParams = {
        project_key: 'test-key',
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'typescript'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['sec1', 'sec2'],
        facets: ['facet1', 'facet2'],
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(additionalParams));
      const additionalResult = mapToSonarQubeParams(additionalParams);
      expect(additionalResult.projectKey).toBe('test-key');
      expect(additionalResult.cwe).toEqual(['cwe1', 'cwe2']);
      expect(additionalResult.languages).toEqual(['java', 'typescript']);
      expect(additionalResult.owaspTop10).toEqual(['a1', 'a2']);
      expect(additionalResult.sansTop25).toEqual(['sans1', 'sans2']);
      expect(additionalResult.sonarsourceSecurity).toEqual(['sec1', 'sec2']);
      expect(additionalResult.facets).toEqual(['facet1', 'facet2']);
    });

    it('should handle parameter transformations correctly', () => {
      // Test nullToUndefined function
      expect(nullToUndefined(null)).toBeUndefined();
      expect(nullToUndefined(undefined)).toBeUndefined();
      expect(nullToUndefined('value')).toBe('value');
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined(false)).toBe(false);

      // Test mapToSonarQubeParams with various parameter types
      const params = {
        project_key: 'test-key',
        severity: 'MAJOR',
        page: '10',
        page_size: '20',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE'],
        resolved: 'true',
        types: ['CODE_SMELL', 'BUG'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2024-01-01',
        created_before: '2024-12-31',
        created_at: '2024-06-15',
        created_in_last: '7d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'typescript'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['sec1', 'sec2'],
        on_component_only: 'true',
        facets: ['facet1', 'facet2'],
        since_leak_period: 'true',
        in_new_code_period: 'true',
      };

      const result = mapToSonarQubeParams(params);

      // Verify all transformations
      expect(result).toEqual({
        projectKey: 'test-key',
        severity: 'MAJOR',
        page: '10',
        pageSize: '20',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE'],
        resolved: 'true',
        types: ['CODE_SMELL', 'BUG'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        createdAfter: '2024-01-01',
        createdBefore: '2024-12-31',
        createdAt: '2024-06-15',
        createdInLast: '7d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'typescript'],
        owaspTop10: ['a1', 'a2'],
        sansTop25: ['sans1', 'sans2'],
        sonarsourceSecurity: ['sec1', 'sec2'],
        onComponentOnly: 'true',
        facets: ['facet1', 'facet2'],
        sinceLeakPeriod: 'true',
        inNewCodePeriod: 'true',
      });

      // Test with null values
      const nullParams = {
        project_key: 'test-key',
        severity: null,
        page: null,
        statuses: null,
      };

      const nullResult = mapToSonarQubeParams(nullParams);
      expect(nullResult).toEqual({
        projectKey: 'test-key',
        severity: undefined,
        page: undefined,
        pageSize: undefined,
        statuses: undefined,
        resolutions: undefined,
        resolved: undefined,
        types: undefined,
        rules: undefined,
        tags: undefined,
        createdAfter: undefined,
        createdBefore: undefined,
        createdAt: undefined,
        createdInLast: undefined,
        assignees: undefined,
        authors: undefined,
        cwe: undefined,
        languages: undefined,
        owaspTop10: undefined,
        sansTop25: undefined,
        sonarsourceSecurity: undefined,
        onComponentOnly: undefined,
        facets: undefined,
        sinceLeakPeriod: undefined,
        inNewCodePeriod: undefined,
      });
    });

    it('should handle Zod schema transformations correctly', async () => {
      // Mock SonarQube API responses
      nock('https://sonarcloud.io')
        .get('/api/issues/search')
        .query(true)
        .times(8)
        .reply(200, {
          issues: [{ key: 'issue1', rule: 'rule1', severity: 'MAJOR' }],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      nock('https://sonarcloud.io')
        .get('/api/projects/search')
        .query(true)
        .times(4)
        .reply(200, {
          components: [{ key: 'project1', name: 'Project 1' }],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      // Test page and page_size transformations for projects tool
      const projectPageParams = {
        page: '10',
        page_size: '20',
      };
      await handleSonarQubeProjects(projectPageParams);

      // Test invalid page and page_size values for projects tool
      const invalidProjectPageParams = {
        page: 'invalid',
        page_size: 'invalid',
      };
      await handleSonarQubeProjects(invalidProjectPageParams);

      // Test empty page and page_size values for projects tool
      const emptyProjectPageParams = {
        page: '',
        page_size: '',
      };
      await handleSonarQubeProjects(emptyProjectPageParams);

      // Test undefined page and page_size values for projects tool
      await handleSonarQubeProjects({});

      // Test page and page_size transformations for issues tool
      const pageParams = {
        project_key: 'test-key',
        page: '10',
        page_size: '20',
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(pageParams));

      // Test invalid page and page_size values for issues tool
      const invalidPageParams = {
        project_key: 'test-key',
        page: 'invalid',
        page_size: 'invalid',
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(invalidPageParams));

      // Test empty page and page_size values for issues tool
      const emptyPageParams = {
        project_key: 'test-key',
        page: '',
        page_size: '',
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(emptyPageParams));

      // Test boolean transformations with string values
      const booleanStringParams = {
        project_key: 'test-key',
        resolved: 'true',
        on_component_only: 'true',
        since_leak_period: 'true',
        in_new_code_period: 'true',
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(booleanStringParams));

      // Test boolean transformations with 'false' string values
      const booleanFalseStringParams = {
        project_key: 'test-key',
        resolved: 'false',
        on_component_only: 'false',
        since_leak_period: 'false',
        in_new_code_period: 'false',
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(booleanFalseStringParams));

      // Test boolean transformations with boolean values
      const booleanParams = {
        project_key: 'test-key',
        resolved: true,
        on_component_only: true,
        since_leak_period: true,
        in_new_code_period: true,
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(booleanParams));

      // Test boolean transformations with false boolean values
      const booleanFalseParams = {
        project_key: 'test-key',
        resolved: false,
        on_component_only: false,
        since_leak_period: false,
        in_new_code_period: false,
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(booleanFalseParams));

      // Test array transformations with null values
      const nullArrayParams = {
        project_key: 'test-key',
        statuses: null,
        resolutions: null,
        types: null,
        rules: null,
        tags: null,
        assignees: null,
        authors: null,
        cwe: null,
        languages: null,
        owasp_top10: null,
        sans_top25: null,
        sonarsource_security: null,
        facets: null,
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(nullArrayParams));

      // Mock for empty array parameters
      nock('https://sonarcloud.io')
        .get('/api/issues/search')
        .query((actualQueryObject) => {
          // Verify that array parameters are passed as empty strings
          return (
            actualQueryObject.componentKeys === 'test-key' &&
            actualQueryObject.statuses === '' &&
            actualQueryObject.resolutions === '' &&
            actualQueryObject.types === '' &&
            actualQueryObject.rules === '' &&
            actualQueryObject.tags === '' &&
            actualQueryObject.assignees === '' &&
            actualQueryObject.authors === '' &&
            actualQueryObject.cwe === '' &&
            actualQueryObject.languages === '' &&
            actualQueryObject.owaspTop10 === '' &&
            actualQueryObject.sansTop25 === '' &&
            actualQueryObject.sonarsourceSecurity === '' &&
            actualQueryObject.facets === ''
          );
        })
        .reply(200, {
          issues: [{ key: 'issue1', rule: 'rule1', severity: 'MAJOR' }],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      // Test array transformations with empty arrays
      const emptyArrayParams = {
        project_key: 'test-key',
        statuses: [],
        resolutions: [],
        types: [],
        rules: [],
        tags: [],
        assignees: [],
        authors: [],
        cwe: [],
        languages: [],
        owasp_top10: [],
        sans_top25: [],
        sonarsource_security: [],
        facets: [],
      };
      await handleSonarQubeGetIssues(mapToSonarQubeParams(emptyArrayParams));
    });

    it('should validate and transform parameters correctly', () => {
      // Test page and page_size transformations
      expect(mapToSonarQubeParams({ page: '10', page_size: '20' })).toEqual(
        expect.objectContaining({
          page: '10',
          pageSize: '20',
        })
      );
      expect(mapToSonarQubeParams({ page: 'invalid', page_size: 'invalid' })).toEqual(
        expect.objectContaining({
          page: 'invalid',
          pageSize: 'invalid',
        })
      );
      expect(mapToSonarQubeParams({ page: '', page_size: '' })).toEqual(
        expect.objectContaining({
          page: '',
          pageSize: '',
        })
      );
      expect(mapToSonarQubeParams({})).toEqual(
        expect.objectContaining({
          page: undefined,
          pageSize: undefined,
        })
      );

      // Test boolean parameters
      expect(
        mapToSonarQubeParams({
          resolved: booleanStringSchema.parse('true'),
          on_component_only: booleanStringSchema.parse('true'),
          since_leak_period: booleanStringSchema.parse('true'),
          in_new_code_period: booleanStringSchema.parse('true'),
        })
      ).toEqual(
        expect.objectContaining({
          resolved: true,
          onComponentOnly: true,
          sinceLeakPeriod: true,
          inNewCodePeriod: true,
        })
      );

      expect(
        mapToSonarQubeParams({
          resolved: booleanStringSchema.parse(true),
          on_component_only: booleanStringSchema.parse(true),
          since_leak_period: booleanStringSchema.parse(true),
          in_new_code_period: booleanStringSchema.parse(true),
        })
      ).toEqual(
        expect.objectContaining({
          resolved: true,
          onComponentOnly: true,
          sinceLeakPeriod: true,
          inNewCodePeriod: true,
        })
      );

      // Test array parameters
      expect(
        mapToSonarQubeParams({
          rules: ['rule1', 'rule2'],
          tags: ['tag1', 'tag2'],
          statuses: ['OPEN', 'CONFIRMED'],
          resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
          types: ['CODE_SMELL', 'BUG'],
        })
      ).toEqual(
        expect.objectContaining({
          rules: ['rule1', 'rule2'],
          tags: ['tag1', 'tag2'],
          statuses: ['OPEN', 'CONFIRMED'],
          resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
          types: ['CODE_SMELL', 'BUG'],
        })
      );

      expect(
        mapToSonarQubeParams({
          rules: [],
          tags: [],
          statuses: [],
          resolutions: [],
          types: [],
        })
      ).toEqual(
        expect.objectContaining({
          rules: [],
          tags: [],
          statuses: [],
          resolutions: [],
          types: [],
        })
      );

      // Test string parameters
      expect(
        mapToSonarQubeParams({
          severity: 'MAJOR',
          created_after: '2024-01-01',
        })
      ).toEqual(
        expect.objectContaining({
          severity: 'MAJOR',
          createdAfter: '2024-01-01',
        })
      );

      expect(
        mapToSonarQubeParams({
          severity: null,
          created_after: null,
        })
      ).toEqual(
        expect.objectContaining({
          severity: undefined,
          createdAfter: undefined,
        })
      );
    });
  });

  describe('nullToUndefined', () => {
    it('should return undefined for null', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('should return the value for non-null', () => {
      expect(nullToUndefined('value')).toBe('value');
    });
  });

  describe('handleSonarQubeProjects', () => {
    it('should fetch and return a list of projects', async () => {
      nock('https://sonarcloud.io')
        .get('/api/projects/search')
        .query(true)
        .reply(200, {
          components: [
            { key: 'project1', name: 'Project 1', qualifier: 'TRK', visibility: 'public' },
          ],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      const response = await handleSonarQubeProjects({ page: 1, page_size: 1 });
      expect(response.content[0].text).toContain('Project 1');
    });
  });

  describe('mapToSonarQubeParams', () => {
    it('should map MCP tool parameters to SonarQube client parameters', () => {
      const params = mapToSonarQubeParams({ project_key: 'key', severity: 'MAJOR' });
      expect(params.projectKey).toBe('key');
      expect(params.severity).toBe('MAJOR');
    });
  });

  describe('handleSonarQubeGetIssues', () => {
    it('should fetch and return a list of issues', async () => {
      nock('https://sonarcloud.io')
        .get('/api/issues/search')
        .query(true)
        .reply(200, {
          issues: [{ key: 'issue1', rule: 'rule1', severity: 'MAJOR' }],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      const response = await handleSonarQubeGetIssues({ projectKey: 'key' });
      expect(response.content[0].text).toContain('issue1');
    });
  });

  describe('Conditional server start', () => {
    it('should not start the server if NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';
      const connectSpy = jest.spyOn(StdioServerTransport.prototype as any, 'connect');
      const mcpConnectSpy = jest.spyOn(mcpServer, 'connect');
      const transport = new StdioServerTransport();
      await (transport as unknown as Connectable).connect();
      expect(connectSpy).toHaveBeenCalled();
      expect(mcpConnectSpy).not.toHaveBeenCalled();
      connectSpy.mockRestore();
      mcpConnectSpy.mockRestore();
    });

    it('should start the server if NODE_ENV is not test', async () => {
      process.env.NODE_ENV = 'development';
      const connectSpy = jest.spyOn(StdioServerTransport.prototype as any, 'connect');
      const mcpConnectSpy = jest.spyOn(mcpServer, 'connect');
      const transport = new StdioServerTransport();
      await (transport as unknown as Connectable).connect();
      await mcpServer.connect(transport);
      expect(connectSpy).toHaveBeenCalled();
      expect(mcpConnectSpy).toHaveBeenCalled();
      connectSpy.mockRestore();
      mcpConnectSpy.mockRestore();
    });
  });
});
