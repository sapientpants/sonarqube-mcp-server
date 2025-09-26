import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComponentsDomain } from '../../domains/components.js';
describe('ComponentsDomain Full Tests', () => {
  let domain: ComponentsDomain;
  let mockWebApiClient: any;
  const organization = 'test-org';
  beforeEach(() => {
    // Create mock builders
    const mockSearchBuilder = {
      query: vi.fn().mockReturnThis(),
      qualifiers: vi.fn().mockReturnThis(),
      languages: vi.fn().mockReturnThis(),
      page: vi.fn().mockReturnThis(),
      pageSize: vi.fn().mockReturnThis(),
      execute: vi.fn(),
    };
    const mockTreeBuilder = {
      component: vi.fn().mockReturnThis(),
      childrenOnly: vi.fn().mockReturnThis(),
      leavesOnly: vi.fn().mockReturnThis(),
      qualifiers: vi.fn().mockReturnThis(),
      sortByName: vi.fn().mockReturnThis(),
      sortByPath: vi.fn().mockReturnThis(),
      sortByQualifier: vi.fn().mockReturnThis(),
      page: vi.fn().mockReturnThis(),
      pageSize: vi.fn().mockReturnThis(),
      branch: vi.fn().mockReturnThis(),
      pullRequest: vi.fn().mockReturnThis(),
      execute: vi.fn(),
    };
    // Create mock web API client
    mockWebApiClient = {
      components: {
        search: vi.fn().mockReturnValue(mockSearchBuilder),
        tree: vi.fn().mockReturnValue(mockTreeBuilder),
        show: vi.fn(),
      },
    };
    domain = new ComponentsDomain(mockWebApiClient, organization);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  describe('searchComponents', () => {
    it('should search components with all parameters', async () => {
      const mockResponse = {
        components: [
          { key: 'comp1', name: 'Component 1', qualifier: 'TRK' },
          { key: 'comp2', name: 'Component 2', qualifier: 'FIL' },
        ],
        paging: { pageIndex: 1, pageSize: 100, total: 2 },
      };
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockResolvedValue(mockResponse);
      const result = await domain.searchComponents({
        query: 'test',
        qualifiers: ['TRK', 'FIL'],
        language: 'java',
        page: 2,
        pageSize: 50,
      });
      expect(mockWebApiClient.components.search).toHaveBeenCalled();
      expect(searchBuilder.query).toHaveBeenCalledWith('test');
      expect(searchBuilder.qualifiers).toHaveBeenCalledWith(['TRK', 'FIL']);
      expect(searchBuilder.languages).toHaveBeenCalledWith(['java']);
      expect(searchBuilder.page).toHaveBeenCalledWith(2);
      expect(searchBuilder.pageSize).toHaveBeenCalledWith(50);
      expect(searchBuilder.execute).toHaveBeenCalled();
      expect(result).toEqual({
        components: mockResponse.components,
        paging: mockResponse.paging,
      });
    });
    it('should search components with minimal parameters', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockResolvedValue(mockResponse);
      const result = await domain.searchComponents();
      expect(mockWebApiClient.components.search).toHaveBeenCalled();
      expect(searchBuilder.query).not.toHaveBeenCalled();
      expect(searchBuilder.qualifiers).not.toHaveBeenCalled();
      expect(searchBuilder.languages).not.toHaveBeenCalled();
      expect(searchBuilder.execute).toHaveBeenCalled();
      expect(result).toEqual({
        components: [],
        paging: mockResponse.paging,
      });
    });
    it('should limit page size to maximum of 500', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 500, total: 0 },
      };
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockResolvedValue(mockResponse);
      await domain.searchComponents({ pageSize: 1000 });
      expect(searchBuilder.pageSize).toHaveBeenCalledWith(500);
    });
    it('should handle search errors', async () => {
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockRejectedValue(new Error('Search failed'));
      await expect(domain.searchComponents({ query: 'test' })).rejects.toThrow('Search failed');
    });
    it('should handle missing paging in response', async () => {
      const mockResponse = {
        components: [{ key: 'comp1', name: 'Component 1', qualifier: 'TRK' }],
        // paging is missing
      };
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockResolvedValue(mockResponse);
      const result = await domain.searchComponents();
      expect(result.paging).toEqual({
        pageIndex: 1,
        pageSize: 100,
        total: 1,
      });
    });
  });
  describe('getComponentTree', () => {
    it('should get component tree with all parameters', async () => {
      const mockResponse = {
        components: [
          { key: 'dir1', name: 'Directory 1', qualifier: 'DIR' },
          { key: 'file1', name: 'File 1', qualifier: 'FIL' },
        ],
        baseComponent: { key: 'project1', name: 'Project 1', qualifier: 'TRK' },
        paging: { pageIndex: 1, pageSize: 100, total: 2 },
      };
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockResolvedValue(mockResponse);
      const result = await domain.getComponentTree({
        component: 'project1',
        strategy: 'children',
        qualifiers: ['DIR', 'FIL'],
        sort: 'name',
        asc: true,
        page: 1,
        pageSize: 50,
        branch: 'develop',
        pullRequest: 'PR-123',
      });
      expect(mockWebApiClient.components.tree).toHaveBeenCalled();
      expect(treeBuilder.component).toHaveBeenCalledWith('project1');
      expect(treeBuilder.childrenOnly).toHaveBeenCalled();
      expect(treeBuilder.qualifiers).toHaveBeenCalledWith(['DIR', 'FIL']);
      expect(treeBuilder.sortByName).toHaveBeenCalled();
      expect(treeBuilder.page).toHaveBeenCalledWith(1);
      expect(treeBuilder.pageSize).toHaveBeenCalledWith(50);
      expect(treeBuilder.branch).toHaveBeenCalledWith('develop');
      expect(treeBuilder.pullRequest).toHaveBeenCalledWith('PR-123');
      expect(result).toEqual({
        components: mockResponse.components,
        baseComponent: mockResponse.baseComponent,
        paging: mockResponse.paging,
      });
    });
    it('should handle leaves strategy', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockResolvedValue(mockResponse);
      await domain.getComponentTree({
        component: 'project1',
        strategy: 'leaves',
      });
      expect(treeBuilder.leavesOnly).toHaveBeenCalled();
      expect(treeBuilder.childrenOnly).not.toHaveBeenCalled();
    });
    it('should handle all strategy', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockResolvedValue(mockResponse);
      await domain.getComponentTree({
        component: 'project1',
        strategy: 'all',
      });
      expect(treeBuilder.childrenOnly).not.toHaveBeenCalled();
      expect(treeBuilder.leavesOnly).not.toHaveBeenCalled();
    });
    it('should sort by path', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockResolvedValue(mockResponse);
      await domain.getComponentTree({
        component: 'project1',
        sort: 'path',
      });
      expect(treeBuilder.sortByPath).toHaveBeenCalled();
    });
    it('should sort by qualifier', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockResolvedValue(mockResponse);
      await domain.getComponentTree({
        component: 'project1',
        sort: 'qualifier',
      });
      expect(treeBuilder.sortByQualifier).toHaveBeenCalled();
    });
    it('should limit page size to maximum of 500', async () => {
      const mockResponse = {
        components: [],
        paging: { pageIndex: 1, pageSize: 500, total: 0 },
      };
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockResolvedValue(mockResponse);
      await domain.getComponentTree({
        component: 'project1',
        pageSize: 1000,
      });
      expect(treeBuilder.pageSize).toHaveBeenCalledWith(500);
    });
    it('should handle tree errors', async () => {
      const treeBuilder = mockWebApiClient.components.tree();
      treeBuilder.execute.mockRejectedValue(new Error('Tree failed'));
      await expect(domain.getComponentTree({ component: 'project1' })).rejects.toThrow(
        'Tree failed'
      );
    });
  });
  describe('showComponent', () => {
    it('should show component details', async () => {
      const mockResponse = {
        component: { key: 'comp1', name: 'Component 1', qualifier: 'FIL' },
        ancestors: [
          { key: 'proj1', name: 'Project 1', qualifier: 'TRK' },
          { key: 'dir1', name: 'Directory 1', qualifier: 'DIR' },
        ],
      };
      mockWebApiClient.components.show.mockResolvedValue(mockResponse);
      const result = await domain.showComponent('comp1');
      expect(mockWebApiClient.components.show).toHaveBeenCalledWith('comp1');
      expect(result).toEqual({
        component: mockResponse.component,
        ancestors: mockResponse.ancestors,
      });
    });
    it('should show component with branch and PR (though not supported by API)', async () => {
      const mockResponse = {
        component: { key: 'comp1', name: 'Component 1', qualifier: 'FIL' },
        ancestors: [],
      };
      mockWebApiClient.components.show.mockResolvedValue(mockResponse);
      const result = await domain.showComponent('comp1', 'develop', 'PR-123');
      // Note: branch and pullRequest are not passed to API as it doesn't support them
      expect(mockWebApiClient.components.show).toHaveBeenCalledWith('comp1');
      expect(result).toEqual({
        component: mockResponse.component,
        ancestors: [],
      });
    });
    it('should handle missing ancestors', async () => {
      const mockResponse = {
        component: { key: 'comp1', name: 'Component 1', qualifier: 'FIL' },
        // ancestors is missing
      };
      mockWebApiClient.components.show.mockResolvedValue(mockResponse);
      const result = await domain.showComponent('comp1');
      expect(result.ancestors).toEqual([]);
    });
    it('should handle show errors', async () => {
      mockWebApiClient.components.show.mockRejectedValue(new Error('Show failed'));
      await expect(domain.showComponent('comp1')).rejects.toThrow('Show failed');
    });
  });
  describe('transformComponent', () => {
    it('should transform component with all fields', async () => {
      const mockResponse = {
        components: [
          {
            key: 'comp1',
            name: 'Component 1',
            qualifier: 'FIL',
            path: '/src/file.js',
            longName: 'Project :: src/file.js',
            enabled: true,
          },
        ],
      };
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockResolvedValue(mockResponse);
      const result = await domain.searchComponents();
      expect(result.components[0]).toEqual({
        key: 'comp1',
        name: 'Component 1',
        qualifier: 'FIL',
        path: '/src/file.js',
        longName: 'Project :: src/file.js',
        enabled: true,
      });
    });
    it('should transform component with minimal fields', async () => {
      const mockResponse = {
        components: [
          {
            key: 'comp1',
            name: 'Component 1',
            qualifier: 'TRK',
            // optional fields missing
          },
        ],
      };
      const searchBuilder = mockWebApiClient.components.search();
      searchBuilder.execute.mockResolvedValue(mockResponse);
      const result = await domain.searchComponents();
      expect(result.components[0]).toEqual({
        key: 'comp1',
        name: 'Component 1',
        qualifier: 'TRK',
        path: undefined,
        longName: undefined,
        enabled: undefined,
      });
    });
  });
});
