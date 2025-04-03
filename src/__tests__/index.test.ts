/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import nock from 'nock';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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
