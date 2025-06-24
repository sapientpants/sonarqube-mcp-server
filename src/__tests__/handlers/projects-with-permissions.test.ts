import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { handleSonarQubeProjectsWithPermissions } from '../../handlers/projects-with-permissions.js';
import type { ISonarQubeClient } from '../../types/index.js';
import { SonarQubeAPIError, SonarQubeErrorType } from '../../errors.js';

describe('handleSonarQubeProjectsWithPermissions', () => {
  let mockClient: ISonarQubeClient;

  const mockProjects = [
    {
      key: 'dev-project-1',
      name: 'Development Project 1',
      qualifier: 'TRK',
      visibility: 'private',
      lastAnalysisDate: '2023-01-01T00:00:00Z',
      revision: 'abc123',
      managed: false,
    },
    {
      key: 'prod-project-1',
      name: 'Production Project 1',
      qualifier: 'TRK',
      visibility: 'private',
      lastAnalysisDate: '2023-01-02T00:00:00Z',
      revision: 'def456',
      managed: true,
    },
    {
      key: 'feature-test-app',
      name: 'Feature Test Application',
      qualifier: 'TRK',
      visibility: 'public',
      lastAnalysisDate: '2023-01-03T00:00:00Z',
      revision: 'ghi789',
      managed: false,
    },
    {
      key: 'public-demo',
      name: 'Public Demo Project',
      qualifier: 'TRK',
      visibility: 'public',
      lastAnalysisDate: '2023-01-04T00:00:00Z',
      revision: 'jkl012',
      managed: false,
    },
  ];

  const mockResponse = {
    projects: mockProjects,
    paging: {
      pageIndex: 1,
      pageSize: 100,
      total: 4,
    },
  };

  beforeEach(() => {
    // Create mock client
    mockClient = {
      listProjects: jest.fn(),
      getIssues: jest.fn(),
      getMetrics: jest.fn(),
      getHealth: jest.fn(),
      getStatus: jest.fn(),
      ping: jest.fn(),
      getComponentMeasures: jest.fn(),
      getComponentsMeasures: jest.fn(),
      getMeasuresHistory: jest.fn(),
      listQualityGates: jest.fn(),
      getQualityGate: jest.fn(),
      getQualityGateStatus: jest.fn(),
      getSourceCode: jest.fn(),
      getScmBlame: jest.fn(),
      searchHotspots: jest.fn(),
      getHotspot: jest.fn(),
      updateHotspotStatus: jest.fn(),
      markIssueAsFalsePositive: jest.fn(),
      markIssueAsWontFix: jest.fn(),
      bulkMarkIssuesAsFalsePositive: jest.fn(),
      bulkMarkIssuesAsWontFix: jest.fn(),
      addCommentToIssue: jest.fn(),
      assignIssue: jest.fn(),
      confirmIssue: jest.fn(),
      unconfirmIssue: jest.fn(),
      resolveIssue: jest.fn(),
      reopenIssue: jest.fn(),
      searchComponents: jest.fn(),
    } as ISonarQubeClient;

    // Setup default mock responses
    (
      mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
    ).mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should handle pagination parameters correctly', async () => {
      await handleSonarQubeProjectsWithPermissions({ page: 2, page_size: 50 }, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: 2,
        pageSize: 50,
      });
    });

    it('should handle null pagination parameters', async () => {
      await handleSonarQubeProjectsWithPermissions({ page: null, page_size: null }, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should handle undefined pagination parameters', async () => {
      await handleSonarQubeProjectsWithPermissions({}, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
      });
    });

    it('should preserve project structure in response when no permissions are configured', async () => {
      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      expect(data.projects[0]).toEqual({
        key: 'dev-project-1',
        name: 'Development Project 1',
        qualifier: 'TRK',
        visibility: 'private',
        lastAnalysisDate: '2023-01-01T00:00:00Z',
        revision: 'abc123',
        managed: false,
      });
    });

    it('should handle empty projects list correctly', async () => {
      const emptyResponse = {
        projects: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockResolvedValue(emptyResponse);

      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toHaveLength(0);
      expect(data.paging.total).toBe(0);
    });

    it('should handle projects with missing optional fields', async () => {
      const projectsWithMissingFields = [
        {
          key: 'minimal-project',
          name: 'Minimal Project',
          qualifier: 'TRK',
          visibility: 'public',
          // Missing optional fields
        },
      ];
      const responseWithMissingFields = {
        projects: projectsWithMissingFields,
        paging: { pageIndex: 1, pageSize: 100, total: 1 },
      };
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockResolvedValue(responseWithMissingFields);

      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      expect(data.projects[0]).toEqual({
        key: 'minimal-project',
        name: 'Minimal Project',
        qualifier: 'TRK',
        visibility: 'public',
        lastAnalysisDate: undefined,
        revision: undefined,
        managed: undefined,
      });
    });

    it('should handle large project lists efficiently', async () => {
      // Create a large list of projects
      const largeProjectList = Array.from({ length: 1000 }, (_, i) => ({
        key: `project-${i}`,
        name: `Project ${i}`,
        qualifier: 'TRK',
        visibility: 'private',
        lastAnalysisDate: '2023-01-01T00:00:00Z',
        revision: `rev-${i}`,
        managed: false,
      }));

      const largeResponse = {
        projects: largeProjectList,
        paging: { pageIndex: 1, pageSize: 1000, total: 1000 },
      };
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockResolvedValue(largeResponse);

      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toHaveLength(1000);
      expect(data.paging.total).toBe(1000);
      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
      });
    });
  });

  describe('authorization error handling and messaging', () => {
    it.skip('should provide helpful error message for "Insufficient privileges" error', async () => {
      const authError = new SonarQubeAPIError(
        'Insufficient privileges',
        SonarQubeErrorType.AUTHORIZATION_FAILED
      );
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockRejectedValue(authError);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow(
        /Note: The 'projects' tool requires admin permissions/
      );
    });

    it.skip('should provide helpful error message for "requires authentication" error', async () => {
      const authError = new SonarQubeAPIError(
        'This action requires authentication',
        SonarQubeErrorType.AUTHORIZATION_FAILED
      );
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockRejectedValue(authError);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow(
        /Note: The 'projects' tool requires admin permissions/
      );
    });

    it.skip('should provide helpful error message for 403 error', async () => {
      const authError = new SonarQubeAPIError(
        'HTTP 403 Forbidden',
        SonarQubeErrorType.AUTHORIZATION_FAILED,
        {
          statusCode: 403,
        }
      );
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockRejectedValue(authError);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow(
        /Note: The 'projects' tool requires admin permissions/
      );
    });

    it.skip('should provide helpful error message for "Administer System" error', async () => {
      const authError = new SonarQubeAPIError(
        'Permission denied: Administer System required',
        SonarQubeErrorType.AUTHORIZATION_FAILED
      );
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockRejectedValue(authError);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow(
        /Note: The 'projects' tool requires admin permissions/
      );
    });

    it('should not modify error message for non-authorization errors', async () => {
      const serverError = new Error('Internal server error');
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockRejectedValue(serverError);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow(
        'Internal server error'
      );
      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.not.toThrow(
        /Note: The 'projects' tool requires admin permissions/
      );
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockRejectedValue(networkError);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow(
        'Network timeout'
      );
    });

    it('should handle malformed client responses gracefully', async () => {
      const malformedResponse = {
        projects: null as unknown as typeof mockProjects,
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockResolvedValue(malformedResponse);

      await expect(handleSonarQubeProjectsWithPermissions({}, mockClient)).rejects.toThrow();
    });
  });

  describe('parameter validation', () => {
    it('should handle mixed null and numeric pagination parameters', async () => {
      await handleSonarQubeProjectsWithPermissions({ page: 1, page_size: null }, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: 1,
        pageSize: undefined,
      });
    });

    it('should handle zero pagination parameters', async () => {
      await handleSonarQubeProjectsWithPermissions({ page: 0, page_size: 0 }, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: 0,
        pageSize: 0,
      });
    });

    it('should handle negative pagination parameters', async () => {
      await handleSonarQubeProjectsWithPermissions({ page: -1, page_size: -5 }, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledWith({
        page: -1,
        pageSize: -5,
      });
    });
  });

  describe('response structure validation', () => {
    it('should return structured response with correct format', async () => {
      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('projects');
      expect(data).toHaveProperty('paging');
      expect(Array.isArray(data.projects)).toBe(true);
      expect(data.paging).toHaveProperty('pageIndex');
      expect(data.paging).toHaveProperty('pageSize');
      expect(data.paging).toHaveProperty('total');
    });

    it('should maintain consistent project field mapping', async () => {
      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      const project = data.projects[0];

      // Verify all expected fields are present
      expect(project).toHaveProperty('key');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('qualifier');
      expect(project).toHaveProperty('visibility');
      expect(project).toHaveProperty('lastAnalysisDate');
      expect(project).toHaveProperty('revision');
      expect(project).toHaveProperty('managed');

      // Verify field types
      expect(typeof project.key).toBe('string');
      expect(typeof project.name).toBe('string');
      expect(typeof project.qualifier).toBe('string');
      expect(typeof project.visibility).toBe('string');
      expect(typeof project.managed).toBe('boolean');
    });

    it('should handle response with varying project data completeness', async () => {
      const mixedResponse = {
        projects: [
          {
            key: 'complete-project',
            name: 'Complete Project',
            qualifier: 'TRK',
            visibility: 'private',
            lastAnalysisDate: '2023-01-01T00:00:00Z',
            revision: 'abc123',
            managed: true,
          },
          {
            key: 'minimal-project',
            name: 'Minimal Project',
            qualifier: 'TRK',
            visibility: 'public',
            // Missing optional fields
          },
        ],
        paging: { pageIndex: 1, pageSize: 100, total: 2 },
      };
      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockResolvedValue(mixedResponse);

      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toHaveLength(2);

      // Complete project should have all fields
      expect(data.projects[0].lastAnalysisDate).toBe('2023-01-01T00:00:00Z');
      expect(data.projects[0].revision).toBe('abc123');
      expect(data.projects[0].managed).toBe(true);

      // Minimal project should have undefined for missing fields
      expect(data.projects[1].lastAnalysisDate).toBeUndefined();
      expect(data.projects[1].revision).toBeUndefined();
      expect(data.projects[1].managed).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple consecutive calls correctly', async () => {
      // First call
      await handleSonarQubeProjectsWithPermissions({ page: 1, page_size: 10 }, mockClient);

      // Second call with different parameters
      await handleSonarQubeProjectsWithPermissions({ page: 2, page_size: 20 }, mockClient);

      expect(mockClient.listProjects).toHaveBeenCalledTimes(2);
      expect(mockClient.listProjects).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 10 });
      expect(mockClient.listProjects).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 20 });
    });

    it('should work with different client implementations', async () => {
      // Test with a different mock client response format
      const alternativeResponse = {
        projects: [
          {
            key: 'alt-project',
            name: 'Alternative Project',
            qualifier: 'APP',
            visibility: 'private',
            lastAnalysisDate: null,
            revision: null,
            managed: false,
          },
        ],
        paging: { pageIndex: 1, pageSize: 50, total: 1 },
      };

      (
        mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
      ).mockResolvedValue(alternativeResponse);

      const result = await handleSonarQubeProjectsWithPermissions({}, mockClient);
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].qualifier).toBe('APP');
      expect(data.projects[0].lastAnalysisDate).toBeNull();
      expect(data.projects[0].revision).toBeNull();
    });
  });
});
