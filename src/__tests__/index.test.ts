/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import nock from 'nock';
import { mcpServer } from '../index.js';

// Save environment variables
const originalEnv = process.env;

describe('MCP Server', () => {
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
  });

  // Add tests for sonarqube tools
  describe('sonarqube_projects tool', () => {
    // These would be your SonarQube tests
  });

  describe('sonarqube_issues tool', () => {
    // These would be your SonarQube issues tests
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
          components: [{ key: 'project1', name: 'Project 1', qualifier: 'TRK', visibility: 'public' }],
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
});
