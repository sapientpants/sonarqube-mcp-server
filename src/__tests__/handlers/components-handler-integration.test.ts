/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { handleSonarQubeComponents } from '../../handlers/components.js';
import { ISonarQubeClient } from '../../types/index.js';
import { resetDefaultClient } from '../../utils/client-factory.js';

describe('Components Handler Integration', () => {
  let mockClient: ISonarQubeClient;
  let mockSearchBuilder: any;
  let mockTreeBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetDefaultClient();

    // Create mock builders
    mockSearchBuilder = {
      query: jest.fn().mockReturnThis(),
      qualifiers: jest.fn().mockReturnThis(),
      languages: jest.fn().mockReturnThis(),
      page: jest.fn().mockReturnThis(),
      pageSize: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    mockTreeBuilder = {
      component: jest.fn().mockReturnThis(),
      childrenOnly: jest.fn().mockReturnThis(),
      leavesOnly: jest.fn().mockReturnThis(),
      qualifiers: jest.fn().mockReturnThis(),
      sortByName: jest.fn().mockReturnThis(),
      sortByPath: jest.fn().mockReturnThis(),
      sortByQualifier: jest.fn().mockReturnThis(),
      page: jest.fn().mockReturnThis(),
      pageSize: jest.fn().mockReturnThis(),
      branch: jest.fn().mockReturnThis(),
      pullRequest: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    const mockWebApiClient = {
      components: {
        search: jest.fn().mockReturnValue(mockSearchBuilder),
        tree: jest.fn().mockReturnValue(mockTreeBuilder),
        show: jest.fn(),
      },
    };

    // Create mock client
    mockClient = {
      webApiClient: mockWebApiClient,
      organization: 'test-org',
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetDefaultClient();
  });

  describe('Search Operation', () => {
    it('should handle component search with query', async () => {
      const mockSearchResult = {
        components: [
          { key: 'comp1', name: 'Component 1', qualifier: 'TRK' },
          { key: 'comp2', name: 'Component 2', qualifier: 'FIL' },
        ],
        paging: { pageIndex: 1, pageSize: 100, total: 2 },
      };

      mockSearchBuilder.execute.mockResolvedValue(mockSearchResult);

      const result = await handleSonarQubeComponents(
        { query: 'test', qualifiers: ['TRK', 'FIL'] },
        mockClient
      );

      expect(mockSearchBuilder.query).toHaveBeenCalledWith('test');
      expect(mockSearchBuilder.qualifiers).toHaveBeenCalledWith(['TRK', 'FIL']);
      expect(mockSearchBuilder.execute).toHaveBeenCalled();

      const content = JSON.parse(result.content[0].text);
      expect(content.components).toHaveLength(2);
      expect(content.components[0].key).toBe('comp1');
    });

    it('should handle component search with language filter', async () => {
      const mockSearchResult = {
        components: [{ key: 'comp1', name: 'Component 1', qualifier: 'FIL' }],
        paging: { pageIndex: 1, pageSize: 100, total: 1 },
      };

      mockSearchBuilder.execute.mockResolvedValue(mockSearchResult);

      await handleSonarQubeComponents({ query: 'test', language: 'java' }, mockClient);

      expect(mockSearchBuilder.query).toHaveBeenCalledWith('test');
      expect(mockSearchBuilder.languages).toHaveBeenCalledWith(['java']);
    });

    it('should default to listing all projects when no specific operation', async () => {
      const mockSearchResult = {
        components: [{ key: 'proj1', name: 'Project 1', qualifier: 'TRK' }],
        paging: { pageIndex: 1, pageSize: 100, total: 1 },
      };

      mockSearchBuilder.execute.mockResolvedValue(mockSearchResult);

      await handleSonarQubeComponents({}, mockClient);

      expect(mockSearchBuilder.qualifiers).toHaveBeenCalledWith(['TRK']);
    });

    it('should handle pagination parameters', async () => {
      const mockSearchResult = {
        components: [],
        paging: { pageIndex: 2, pageSize: 50, total: 100 },
      };

      mockSearchBuilder.execute.mockResolvedValue(mockSearchResult);

      await handleSonarQubeComponents({ query: 'test', p: 2, ps: 50 }, mockClient);

      expect(mockSearchBuilder.page).toHaveBeenCalledWith(2);
      expect(mockSearchBuilder.pageSize).toHaveBeenCalledWith(50);
    });
  });

  describe('Tree Navigation Operation', () => {
    it('should handle component tree navigation', async () => {
      const mockTreeResult = {
        components: [
          { key: 'dir1', name: 'Directory 1', qualifier: 'DIR' },
          { key: 'file1', name: 'File 1', qualifier: 'FIL' },
        ],
        baseComponent: { key: 'project1', name: 'Project 1', qualifier: 'TRK' },
        paging: { pageIndex: 1, pageSize: 100, total: 2 },
      };

      mockTreeBuilder.execute.mockResolvedValue(mockTreeResult);

      const result = await handleSonarQubeComponents(
        {
          component: 'project1',
          strategy: 'children',
          qualifiers: ['DIR', 'FIL'],
        },
        mockClient
      );

      expect(mockTreeBuilder.component).toHaveBeenCalledWith('project1');
      expect(mockTreeBuilder.childrenOnly).toHaveBeenCalled();
      expect(mockTreeBuilder.qualifiers).toHaveBeenCalledWith(['DIR', 'FIL']);

      const content = JSON.parse(result.content[0].text);
      expect(content.components).toHaveLength(2);
      expect(content.baseComponent.key).toBe('project1');
    });

    it('should handle tree navigation with branch', async () => {
      const mockTreeResult = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };

      mockTreeBuilder.execute.mockResolvedValue(mockTreeResult);

      await handleSonarQubeComponents(
        {
          component: 'project1',
          branch: 'develop',
          ps: 50,
          p: 2,
        },
        mockClient
      );

      expect(mockTreeBuilder.branch).toHaveBeenCalledWith('develop');
      expect(mockTreeBuilder.page).toHaveBeenCalledWith(2);
      expect(mockTreeBuilder.pageSize).toHaveBeenCalledWith(50);
    });

    it('should handle leaves strategy', async () => {
      const mockTreeResult = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };

      mockTreeBuilder.execute.mockResolvedValue(mockTreeResult);

      await handleSonarQubeComponents(
        {
          component: 'project1',
          strategy: 'leaves',
        },
        mockClient
      );

      expect(mockTreeBuilder.leavesOnly).toHaveBeenCalled();
      expect(mockTreeBuilder.childrenOnly).not.toHaveBeenCalled();
    });
  });

  describe('Show Component Operation', () => {
    it('should handle show component details', async () => {
      const mockShowResult = {
        component: { key: 'comp1', name: 'Component 1', qualifier: 'FIL' },
        ancestors: [
          { key: 'proj1', name: 'Project 1', qualifier: 'TRK' },
          { key: 'dir1', name: 'Directory 1', qualifier: 'DIR' },
        ],
      };

      (mockClient.webApiClient as any).components.show.mockResolvedValue(mockShowResult);

      const result = await handleSonarQubeComponents({ key: 'comp1' }, mockClient);

      expect((mockClient.webApiClient as any).components.show).toHaveBeenCalledWith('comp1');

      const content = JSON.parse(result.content[0].text);
      expect(content.component.key).toBe('comp1');
      expect(content.ancestors).toHaveLength(2);
    });

    it('should handle show component with branch and PR', async () => {
      const mockShowResult = {
        component: { key: 'comp1', name: 'Component 1', qualifier: 'FIL' },
        ancestors: [],
      };

      (mockClient.webApiClient as any).components.show.mockResolvedValue(mockShowResult);

      await handleSonarQubeComponents(
        {
          key: 'comp1',
          branch: 'feature-branch',
          pullRequest: 'PR-123',
        },
        mockClient
      );

      // Note: branch and PR are passed to domain but not used by API
      expect((mockClient.webApiClient as any).components.show).toHaveBeenCalledWith('comp1');
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      mockSearchBuilder.execute.mockRejectedValue(new Error('Search API Error'));

      await expect(handleSonarQubeComponents({ query: 'test' }, mockClient)).rejects.toThrow(
        'Search API Error'
      );
    });

    it('should handle tree errors gracefully', async () => {
      mockTreeBuilder.execute.mockRejectedValue(new Error('Tree API Error'));

      await expect(
        handleSonarQubeComponents({ component: 'project1' }, mockClient)
      ).rejects.toThrow('Tree API Error');
    });

    it('should handle show errors gracefully', async () => {
      (mockClient.webApiClient as any).components.show.mockRejectedValue(
        new Error('Show API Error')
      );

      await expect(handleSonarQubeComponents({ key: 'comp1' }, mockClient)).rejects.toThrow(
        'Show API Error'
      );
    });
  });

  describe('Parameter Priority', () => {
    it('should prioritize show operation over tree operation', async () => {
      const mockShowResult = {
        component: { key: 'comp1', name: 'Component 1', qualifier: 'FIL' },
        ancestors: [],
      };

      (mockClient.webApiClient as any).components.show.mockResolvedValue(mockShowResult);

      await handleSonarQubeComponents(
        {
          key: 'comp1',
          component: 'project1', // This should be ignored
          query: 'test', // This should also be ignored
        },
        mockClient
      );

      expect((mockClient.webApiClient as any).components.show).toHaveBeenCalled();
      expect((mockClient.webApiClient as any).components.tree).not.toHaveBeenCalled();
      expect((mockClient.webApiClient as any).components.search).not.toHaveBeenCalled();
    });

    it('should prioritize tree operation over search operation', async () => {
      const mockTreeResult = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };

      mockTreeBuilder.execute.mockResolvedValue(mockTreeResult);

      await handleSonarQubeComponents(
        {
          component: 'project1',
          query: 'test', // This should be ignored when component is present
        },
        mockClient
      );

      expect((mockClient.webApiClient as any).components.tree).toHaveBeenCalled();
      expect((mockClient.webApiClient as any).components.search).not.toHaveBeenCalled();
    });
  });
});
