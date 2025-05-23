/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn(() => ({
    name: 'sonarqube-mcp-server',
    version: '1.1.0',
    tool: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    server: { use: jest.fn() },
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Save original environment variables
const originalEnv = process.env;

// Set environment variables for testing
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-organization';

describe('Mocked Environment Tests', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.SONARQUBE_TOKEN = 'test-token';
    process.env.SONARQUBE_URL = 'http://localhost:9000';
    process.env.SONARQUBE_ORGANIZATION = 'test-organization';
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize the MCP server with correct configuration', async () => {
      const { mcpServer } = await import('../index.js');
      expect(mcpServer).toBeDefined();
      expect(mcpServer.name).toBe('sonarqube-mcp-server');
      expect(mcpServer.version).toBe('1.1.0');
    });

    it('should register tools on the server', async () => {
      const { mcpServer } = await import('../index.js');
      expect(mcpServer.tool).toBeDefined();
      expect(mcpServer.tool).toHaveBeenCalled();
      // Check number of tool registrations (9 tools total)
      expect(mcpServer.tool).toHaveBeenCalledTimes(9);
    });

    it('should not connect to transport in test mode', async () => {
      process.env.NODE_ENV = 'test';
      const { mcpServer } = await import('../index.js');
      expect(mcpServer.connect).not.toHaveBeenCalled();
    });

    it('should connect to transport in non-test mode', async () => {
      process.env.NODE_ENV = 'development';

      // Special mock for this specific test that simulates a clean import
      jest.resetModules();

      // Import the module with development environment
      await import('../index.js');

      // Since we're not directly importing mcpServer here, we check connection indirectly
      // We've mocked the StdioServerTransport so its connect method should have been called
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
      expect(StdioServerTransport).toHaveBeenCalled();

      // Reset to test mode
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Environment Variables', () => {
    it('should use environment variables to configure SonarQube client', async () => {
      // Set specific test environment variables
      process.env.SONARQUBE_TOKEN = 'specific-test-token';
      process.env.SONARQUBE_URL = 'https://specific-test-url.com';
      process.env.SONARQUBE_ORGANIZATION = 'specific-test-org';

      // Mock the SonarQubeClient constructor to verify params
      const mockClientConstructor = jest.fn();
      jest.mock('../sonarqube.js', () => ({
        SonarQubeClient: mockClientConstructor.mockImplementation(() => ({
          listProjects: jest.fn().mockResolvedValue({ projects: [], paging: {} }),
          getIssues: jest.fn().mockResolvedValue({ issues: [], paging: {} }),
          getMetrics: jest.fn().mockResolvedValue({ metrics: [], paging: {} }),
          getHealth: jest.fn().mockResolvedValue({}),
          getStatus: jest.fn().mockResolvedValue({}),
          ping: jest.fn().mockResolvedValue(''),
          getComponentMeasures: jest.fn().mockResolvedValue({}),
          getComponentsMeasures: jest.fn().mockResolvedValue({}),
          getMeasuresHistory: jest.fn().mockResolvedValue({}),
        })),
      }));

      // Import the module to create the client with our environment variables
      await import('../index.js');

      // Verify client was created with the correct parameters
      expect(mockClientConstructor).toHaveBeenCalledWith(
        'specific-test-token',
        'https://specific-test-url.com',
        'specific-test-org'
      );
    });
  });

  describe('Tool Registration Complete', () => {
    it('should register all expected tools', async () => {
      const { mcpServer } = await import('../index.js');

      // Verify all tools are registered
      const toolNames = mcpServer.tool.mock.calls.map((call) => call[0]);

      expect(toolNames).toContain('projects');
      expect(toolNames).toContain('metrics');
      expect(toolNames).toContain('issues');
      expect(toolNames).toContain('system_health');
      expect(toolNames).toContain('system_status');
      expect(toolNames).toContain('system_ping');
      expect(toolNames).toContain('measures_component');
      expect(toolNames).toContain('measures_components');
      expect(toolNames).toContain('measures_history');
    });

    it('should register tools with correct descriptions', async () => {
      const { mcpServer } = await import('../index.js');

      // Map of tool names to their descriptions from the mcpServer.tool mock calls
      const toolDescriptions = new Map(mcpServer.tool.mock.calls.map((call) => [call[0], call[1]]));

      expect(toolDescriptions.get('projects')).toBe('List all SonarQube projects');
      expect(toolDescriptions.get('metrics')).toBe('Get available metrics from SonarQube');
      expect(toolDescriptions.get('issues')).toBe('Get issues for a SonarQube project');
      expect(toolDescriptions.get('system_health')).toBe(
        'Get the health status of the SonarQube instance'
      );
      expect(toolDescriptions.get('system_status')).toBe(
        'Get the status of the SonarQube instance'
      );
      expect(toolDescriptions.get('system_ping')).toBe(
        'Ping the SonarQube instance to check if it is up'
      );
      expect(toolDescriptions.get('measures_component')).toBe(
        'Get measures for a specific component'
      );
      expect(toolDescriptions.get('measures_components')).toBe(
        'Get measures for multiple components'
      );
      expect(toolDescriptions.get('measures_history')).toBe('Get measures history for a component');
    });

    it('should register tools with valid schemas', async () => {
      const { mcpServer } = await import('../index.js');

      // Extract schemas from the mcpServer.tool mock calls
      const toolSchemas = new Map(mcpServer.tool.mock.calls.map((call) => [call[0], call[2]]));

      // Check if each tool has a schema defined
      for (const [, schema] of toolSchemas.entries()) {
        expect(schema).toBeDefined();
      }

      // Check specific schemas for required tools
      expect(toolSchemas.get('projects')).toHaveProperty('page');
      expect(toolSchemas.get('projects')).toHaveProperty('page_size');

      expect(toolSchemas.get('issues')).toHaveProperty('project_key');
      expect(toolSchemas.get('issues')).toHaveProperty('severity');

      expect(toolSchemas.get('measures_component')).toHaveProperty('component');
      expect(toolSchemas.get('measures_component')).toHaveProperty('metric_keys');

      expect(toolSchemas.get('measures_components')).toHaveProperty('component_keys');
      expect(toolSchemas.get('measures_components')).toHaveProperty('metric_keys');

      expect(toolSchemas.get('measures_history')).toHaveProperty('component');
      expect(toolSchemas.get('measures_history')).toHaveProperty('metrics');
    });

    it('should register tools with valid handlers', async () => {
      const { mcpServer } = await import('../index.js');

      // Extract handlers from the mcpServer.tool mock calls
      const toolHandlers = new Map(mcpServer.tool.mock.calls.map((call) => [call[0], call[3]]));

      // Check if each tool has a handler defined and it's a function
      for (const [, handler] of toolHandlers.entries()) {
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
      }
    });
  });
});
