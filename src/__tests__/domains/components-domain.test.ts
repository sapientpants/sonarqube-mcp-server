/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { ComponentsDomain } from '../../domains/components.js';
import { createSonarQubeClient } from '../../sonarqube.js';
import type {
  ComponentsSearchParams,
  ComponentsTreeParams,
  ComponentQualifier,
} from '../../types/components.js';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

describe('ComponentsDomain', () => {
  let domain: ComponentsDomain;
  const baseUrl = 'http://localhost:9000';
  const token = 'test-token';
  const organization = 'test-org';

  beforeEach(() => {
    nock.cleanAll();
    const client = createSonarQubeClient(token, baseUrl, organization);
    domain = new ComponentsDomain(client['webApiClient'], organization);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('searchComponents', () => {
    const mockSearchResponse = {
      paging: { pageIndex: 1, pageSize: 100, total: 2 },
      components: [
        {
          key: 'com.example:project1',
          name: 'Project 1',
          qualifier: 'TRK',
          project: 'com.example:project1',
        },
        {
          key: 'com.example:project2',
          name: 'Project 2',
          qualifier: 'TRK',
          project: 'com.example:project2',
        },
      ],
    };

    it('should search components with all parameters', async () => {
      nock(baseUrl)
        .get('/api/components/search')
        .query((actualQuery) => {
          // Check the essential parameters, allow additional ones
          return (
            actualQuery.q === 'test' &&
            actualQuery.qualifiers === 'TRK,FIL' &&
            actualQuery.languages === 'java' && // API uses 'languages' not 'language'
            actualQuery.ps === '50' &&
            actualQuery.p === '1' &&
            actualQuery.organization === organization
          );
        })
        .reply(200, mockSearchResponse);

      const params: ComponentsSearchParams = {
        query: 'test',
        qualifiers: ['TRK', 'FIL'] as ComponentQualifier[],
        language: 'java',
        page: 1,
        pageSize: 50,
      };

      const result = await domain.searchComponents(params);

      expect(result.components).toHaveLength(2);
      expect(result.components[0].key).toBe('com.example:project1');
      expect(result.components[0].name).toBe('Project 1');
      expect(result.components[0].qualifier).toBe('TRK');
      expect(result.paging).toEqual(mockSearchResponse.paging);
    });

    it('should handle search with minimal parameters', async () => {
      nock(baseUrl)
        .get('/api/components/search')
        .query({
          q: 'test',
          organization,
        })
        .reply(200, mockSearchResponse);

      const result = await domain.searchComponents({ query: 'test' });

      expect(result.components).toHaveLength(2);
      expect(result.paging).toBeDefined();
    });

    it('should handle search without parameters', async () => {
      nock(baseUrl)
        .get('/api/components/search')
        .query({ organization })
        .reply(200, mockSearchResponse);

      const result = await domain.searchComponents();

      expect(result.components).toHaveLength(2);
    });

    it('should handle empty search results', async () => {
      nock(baseUrl)
        .get('/api/components/search')
        .query({ q: 'nonexistent', organization })
        .reply(200, {
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
          components: [],
        });

      const result = await domain.searchComponents({ query: 'nonexistent' });

      expect(result.components).toHaveLength(0);
      expect(result.paging.total).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      nock(baseUrl)
        .get('/api/components/search')
        .query({ q: 'test', organization })
        .reply(500, { errors: [{ msg: 'Internal server error' }] });

      await expect(domain.searchComponents({ query: 'test' })).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      nock(baseUrl)
        .get('/api/components/search')
        .query({ q: 'test', organization })
        .replyWithError('Network error');

      await expect(domain.searchComponents({ query: 'test' })).rejects.toThrow();
    });
  });

  describe('getComponentTree', () => {
    const mockTreeResponse = {
      paging: { pageIndex: 1, pageSize: 100, total: 3 },
      baseComponent: {
        key: 'com.example:project',
        name: 'Example Project',
        qualifier: 'TRK',
      },
      components: [
        {
          key: 'com.example:project:src',
          name: 'src',
          qualifier: 'DIR',
          path: 'src',
        },
        {
          key: 'com.example:project:src/Main.java',
          name: 'Main.java',
          qualifier: 'FIL',
          path: 'src/Main.java',
        },
      ],
    };

    it('should get component tree with all parameters', async () => {
      nock(baseUrl)
        .get('/api/components/tree')
        .query((actualQuery) => {
          // Check the essential parameters
          return (
            actualQuery.component === 'com.example:project' &&
            actualQuery.qualifiers === 'DIR,FIL' &&
            actualQuery.strategy === 'children' &&
            actualQuery.asc === 'true' &&
            actualQuery.ps === '50' &&
            actualQuery.p === '1' &&
            actualQuery.branch === 'main' &&
            actualQuery.pullRequest === '123' &&
            actualQuery.organization === organization
          );
        })
        .reply(200, mockTreeResponse);

      const params: ComponentsTreeParams = {
        component: 'com.example:project',
        qualifiers: ['DIR', 'FIL'] as ComponentQualifier[],
        strategy: 'children',
        asc: true,
        page: 1,
        pageSize: 50,
        branch: 'main',
        pullRequest: '123',
      };

      const result = await domain.getComponentTree(params);

      expect(result.baseComponent).toBeDefined();
      expect(result.baseComponent.key).toBe('com.example:project');
      expect(result.components).toHaveLength(2);
      expect(result.components[0].qualifier).toBe('DIR');
      expect(result.components[1].qualifier).toBe('FIL');
      expect(result.paging).toEqual(mockTreeResponse.paging);
    });

    it('should get component tree with minimal parameters', async () => {
      nock(baseUrl)
        .get('/api/components/tree')
        .query({
          component: 'com.example:project',
          organization,
        })
        .reply(200, mockTreeResponse);

      const result = await domain.getComponentTree({ component: 'com.example:project' });

      expect(result.components).toHaveLength(2);
      expect(result.baseComponent).toBeDefined();
    });

    it('should handle different strategies', async () => {
      const strategies: Array<'all' | 'children' | 'leaves'> = ['all', 'children', 'leaves'];

      for (const strategy of strategies) {
        nock(baseUrl)
          .get('/api/components/tree')
          .query({
            component: 'test',
            strategy,
            organization,
          })
          .reply(200, mockTreeResponse);

        const result = await domain.getComponentTree({
          component: 'test',
          strategy,
        });

        expect(result).toBeDefined();
      }
    });

    it('should handle tree API errors', async () => {
      nock(baseUrl)
        .get('/api/components/tree')
        .query({
          component: 'invalid',
          organization,
        })
        .reply(404, { errors: [{ msg: 'Component not found' }] });

      await expect(domain.getComponentTree({ component: 'invalid' })).rejects.toThrow();
    });
  });

  describe('showComponent', () => {
    const mockShowResponse = {
      component: {
        key: 'com.example:project:src/Main.java',
        name: 'Main.java',
        qualifier: 'FIL',
        path: 'src/Main.java',
        language: 'java',
        measures: [
          { metric: 'lines', value: '100' },
          { metric: 'coverage', value: '85.5' },
        ],
      },
    };

    it('should show component details', async () => {
      nock(baseUrl)
        .get('/api/components/show')
        .query((actualQuery) => {
          // The API client might be sending the key as a query param
          return actualQuery.organization === organization;
        })
        .reply(200, mockShowResponse);

      const result = await domain.showComponent('com.example:project:src/Main.java');

      expect(result.component).toBeDefined();
      expect(result.component.key).toBe('com.example:project:src/Main.java');
      expect(result.component.name).toBe('Main.java');
      expect(result.component.language).toBe('java');
    });

    it('should show component with branch', async () => {
      nock(baseUrl)
        .get('/api/components/show')
        .query({
          component: 'test-key',
          branch: 'feature',
          organization,
        })
        .reply(200, mockShowResponse);

      const result = await domain.showComponent('test-key', 'feature');

      expect(result.component).toBeDefined();
    });

    it('should show component with pull request', async () => {
      nock(baseUrl)
        .get('/api/components/show')
        .query({
          component: 'test-key',
          pullRequest: '456',
          organization,
        })
        .reply(200, mockShowResponse);

      const result = await domain.showComponent('test-key', undefined, '456');

      expect(result.component).toBeDefined();
    });

    it('should handle show API errors', async () => {
      nock(baseUrl)
        .get('/api/components/show')
        .query({
          component: 'nonexistent',
          organization,
        })
        .reply(404, { errors: [{ msg: 'Component not found' }] });

      await expect(domain.showComponent('nonexistent')).rejects.toThrow();
    });
  });

  describe('parameter transformation', () => {
    it('should correctly transform qualifiers array to comma-separated string', async () => {
      let capturedQuery: Record<string, string>;

      nock(baseUrl)
        .get('/api/components/search')
        .query((actualQuery) => {
          capturedQuery = actualQuery;
          return true;
        })
        .reply(200, { components: [], paging: { pageIndex: 1, pageSize: 100, total: 0 } });

      await domain.searchComponents({
        qualifiers: ['TRK', 'DIR', 'FIL'] as ComponentQualifier[],
      });

      expect(capturedQuery.qualifiers).toBe('TRK,DIR,FIL');
    });

    it('should handle boolean transformation for asc parameter', async () => {
      let capturedQuery: Record<string, string>;

      nock(baseUrl)
        .get('/api/components/tree')
        .query((actualQuery) => {
          capturedQuery = actualQuery;
          return true;
        })
        .reply(200, {
          components: [],
          baseComponent: { key: 'test', name: 'Test', qualifier: 'TRK' },
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      await domain.getComponentTree({
        component: 'test',
        asc: true,
      });

      expect(capturedQuery.asc).toBe('true');
    });

    it('should handle page size limits', async () => {
      let capturedQuery: Record<string, string>;

      nock(baseUrl)
        .get('/api/components/search')
        .query((actualQuery) => {
          capturedQuery = actualQuery;
          return true;
        })
        .reply(200, { components: [], paging: { pageIndex: 1, pageSize: 500, total: 0 } });

      await domain.searchComponents({
        pageSize: 1000, // Should be capped at 500
      });

      expect(capturedQuery.ps).toBe('500');
    });
  });
});
