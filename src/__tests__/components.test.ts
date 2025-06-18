/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { ComponentsParams, ComponentQualifier } from '../types/components.js';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Save environment variables
const originalEnv = process.env;

// Mock the ComponentsDomain
const mockSearchComponents = jest.fn();
const mockGetComponentTree = jest.fn();
const mockShowComponent = jest.fn();

jest.mock('../domains/components.js', () => ({
  ComponentsDomain: jest.fn().mockImplementation(() => ({
    searchComponents: mockSearchComponents,
    getComponentTree: mockGetComponentTree,
    showComponent: mockShowComponent,
  })),
}));

// Mock the client factory
jest.mock('../utils/client-factory.js', () => ({
  getDefaultClient: jest.fn().mockReturnValue({
    webApiClient: {},
    organization: 'test-org',
  }),
  validateEnvironmentVariables: jest.fn(),
  resetDefaultClient: jest.fn(),
}));

describe('Components Handler', () => {
  let handleSonarQubeComponents: typeof import('../handlers/components.js').handleSonarQubeComponents;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Dynamically import to ensure mocks are applied
    const module = await import('../handlers/components.js');
    handleSonarQubeComponents = module.handleSonarQubeComponents;

    // Set up mock implementations
    mockSearchComponents.mockResolvedValue({
      components: [{ key: 'test-project', name: 'Test Project', qualifier: 'TRK' }],
      paging: { pageIndex: 1, pageSize: 100, total: 1 },
    });

    mockGetComponentTree.mockResolvedValue({
      baseComponent: { key: 'test-project', name: 'Test Project', qualifier: 'TRK' },
      components: [{ key: 'test-project:src', name: 'src', qualifier: 'DIR' }],
      paging: { pageIndex: 1, pageSize: 100, total: 1 },
    });

    mockShowComponent.mockResolvedValue({
      component: {
        key: 'test-project:src/Main.java',
        name: 'Main.java',
        qualifier: 'FIL',
        language: 'java',
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Search Operation', () => {
    it('should perform component search when query is provided', async () => {
      const params: ComponentsParams = {
        query: 'test',
        qualifiers: ['TRK', 'FIL'] as ComponentQualifier[],
        language: 'java',
        ps: 50,
        p: 1,
      };

      const result = await handleSonarQubeComponents(params);

      expect(mockSearchComponents).toHaveBeenCalledWith({
        query: 'test',
        qualifiers: ['TRK', 'FIL'],
        language: 'java',
        pageSize: 50,
        page: 1,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.components).toBeDefined();
      expect(data.components).toHaveLength(1);
      expect(data.components[0].key).toBe('test-project');
    });

    it('should perform search with only qualifiers', async () => {
      const params: ComponentsParams = {
        qualifiers: ['DIR', 'FIL'] as ComponentQualifier[],
      };

      await handleSonarQubeComponents(params);

      expect(mockSearchComponents).toHaveBeenCalledWith({
        qualifiers: ['DIR', 'FIL'],
      });
      expect(mockGetComponentTree).not.toHaveBeenCalled();
    });

    it('should default to search all projects when no specific parameters', async () => {
      const params: ComponentsParams = {};

      await handleSonarQubeComponents(params);

      expect(mockSearchComponents).toHaveBeenCalledWith({
        qualifiers: ['TRK'],
        page: undefined,
        pageSize: undefined,
      });
      expect(mockGetComponentTree).not.toHaveBeenCalled();
    });
  });

  describe('Tree Navigation Operation', () => {
    it('should perform tree navigation when component is provided', async () => {
      const params: ComponentsParams = {
        component: 'com.example:project',
        strategy: 'children',
        qualifiers: ['DIR', 'FIL'] as ComponentQualifier[],
        asc: true,
        ps: 50,
        p: 1,
        branch: 'main',
        pullRequest: '123',
      };

      const result = await handleSonarQubeComponents(params);

      expect(mockGetComponentTree).toHaveBeenCalledWith({
        component: 'com.example:project',
        strategy: 'children',
        qualifiers: ['DIR', 'FIL'],
        asc: true,
        pageSize: 50,
        page: 1,
        branch: 'main',
        pullRequest: '123',
      });
      expect(mockSearchComponents).not.toHaveBeenCalled();

      const data = JSON.parse(result.content[0].text);
      expect(data.baseComponent).toBeDefined();
      expect(data.components).toBeDefined();
    });

    it('should handle tree navigation with minimal parameters', async () => {
      const params: ComponentsParams = {
        component: 'test-key',
      };

      await handleSonarQubeComponents(params);

      expect(mockGetComponentTree).toHaveBeenCalledWith({
        component: 'test-key',
        strategy: undefined,
        qualifiers: undefined,
        asc: undefined,
        page: undefined,
        pageSize: undefined,
        branch: undefined,
        pullRequest: undefined,
      });
    });
  });

  describe('Show Component Operation', () => {
    it('should show component when only key is provided', async () => {
      const params: ComponentsParams = {
        key: 'com.example:project:src/Main.java',
      };

      const result = await handleSonarQubeComponents(params);

      expect(mockShowComponent).toHaveBeenCalledWith(
        'com.example:project:src/Main.java',
        undefined,
        undefined
      );
      expect(mockSearchComponents).not.toHaveBeenCalled();
      expect(mockGetComponentTree).not.toHaveBeenCalled();

      const data = JSON.parse(result.content[0].text);
      expect(data.component).toBeDefined();
      expect(data.component.key).toBe('test-project:src/Main.java');
    });

    it('should show component with branch', async () => {
      const params: ComponentsParams = {
        key: 'test-key',
        branch: 'feature',
      };

      await handleSonarQubeComponents(params);

      expect(mockShowComponent).toHaveBeenCalledWith('test-key', 'feature', undefined);
    });

    it('should show component with pull request', async () => {
      const params: ComponentsParams = {
        key: 'test-key',
        pullRequest: '456',
      };

      await handleSonarQubeComponents(params);

      expect(mockShowComponent).toHaveBeenCalledWith('test-key', undefined, '456');
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      mockSearchComponents.mockRejectedValue(new Error('Search failed'));

      await expect(handleSonarQubeComponents({ query: 'test' })).rejects.toThrow('Search failed');
    });

    it('should handle tree navigation errors', async () => {
      mockGetComponentTree.mockRejectedValue(new Error('Component not found'));

      await expect(handleSonarQubeComponents({ component: 'invalid' })).rejects.toThrow(
        'Component not found'
      );
    });

    it('should handle show component errors', async () => {
      mockShowComponent.mockRejectedValue(new Error('Not found'));

      await expect(handleSonarQubeComponents({ key: 'invalid' })).rejects.toThrow('Not found');
    });
  });

  describe('Parameter Handling', () => {
    it('should handle null values gracefully', async () => {
      const params = {
        query: null,
        component: null,
        key: null,
        strategy: null,
        asc: null,
        ps: null,
        p: null,
        branch: null,
        pullRequest: null,
      };

      await handleSonarQubeComponents(params);

      expect(mockSearchComponents).toHaveBeenCalledWith({
        qualifiers: ['TRK'],
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should handle undefined values', async () => {
      const params = {
        query: undefined,
        component: undefined,
        key: undefined,
      };

      await handleSonarQubeComponents(params);

      expect(mockSearchComponents).toHaveBeenCalledWith({
        qualifiers: ['TRK'],
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should prioritize show operation over others', async () => {
      const params: ComponentsParams = {
        key: 'show-key',
        component: 'tree-component',
        query: 'search-query',
      };

      await handleSonarQubeComponents(params);

      expect(mockShowComponent).toHaveBeenCalled();
      expect(mockGetComponentTree).not.toHaveBeenCalled();
      expect(mockSearchComponents).not.toHaveBeenCalled();
    });

    it('should prioritize tree operation over search', async () => {
      const params: ComponentsParams = {
        component: 'tree-component',
        query: 'search-query',
      };

      await handleSonarQubeComponents(params);

      expect(mockGetComponentTree).toHaveBeenCalled();
      expect(mockSearchComponents).not.toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted MCP response', async () => {
      const result = await handleSonarQubeComponents({ query: 'test' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify JSON is valid
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should have components handler exported from index', async () => {
      const module = await import('../index.js');
      expect(module.componentsHandler).toBeDefined();
      expect(typeof module.componentsHandler).toBe('function');
    });
  });
});
