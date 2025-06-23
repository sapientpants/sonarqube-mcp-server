import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PermissionService } from '../../auth/permission-service.js';
import { UserContext, McpTool } from '../../auth/types.js';

// Mock dependencies first
const mockGetUserContext = jest.fn();
const mockGetPermissionService = jest.fn();

jest.mock('../../auth/permission-manager.js', () => ({
  permissionManager: {
    getPermissionService: mockGetPermissionService,
  },
}));

jest.mock('../../auth/context-provider.js', () => ({
  contextProvider: {
    getUserContext: mockGetUserContext,
  },
}));

jest.mock('../../utils/logger.js', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock handlers
const mockHandleSonarQubeProjects = jest.fn();
const mockHandleSonarQubeGetIssues = jest.fn();
const mockHandleSonarQubeProjectsWithPermissions = jest.fn();
const mockHandleSonarQubeGetIssuesWithPermissions = jest.fn();

jest.mock('../projects.js', () => ({
  handleSonarQubeProjects: mockHandleSonarQubeProjects,
}));
jest.mock('../issues.js', () => ({
  handleSonarQubeGetIssues: mockHandleSonarQubeGetIssues,
}));
jest.mock('../projects-with-permissions.js', () => ({
  handleSonarQubeProjectsWithPermissions: mockHandleSonarQubeProjectsWithPermissions,
}));
jest.mock('../issues-with-permissions.js', () => ({
  handleSonarQubeGetIssuesWithPermissions: mockHandleSonarQubeGetIssuesWithPermissions,
}));

// Import after mocking
import { HandlerFactory } from '../handler-factory.js';

describe('HandlerFactory', () => {
  const mockUserContext: UserContext = {
    userId: 'test-user',
    username: 'testuser',
    roles: ['user'],
    permissions: ['issues:read'],
    sessionId: 'session-123',
  };

  const mockPermissionService = {
    checkToolAccess: jest.fn(),
    checkProjectAccess: jest.fn(),
    checkIssueAccess: jest.fn(),
    checkWritePermission: jest.fn(),
    filterProjects: jest.fn(),
    filterIssues: jest.fn(),
    hasPermission: jest.fn(),
  } as unknown as PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock return values
    mockHandleSonarQubeProjects.mockResolvedValue({ projects: [] });
    mockHandleSonarQubeGetIssues.mockResolvedValue({ issues: [] });
    mockHandleSonarQubeProjectsWithPermissions.mockResolvedValue({ projects: ['filtered'] });
    mockHandleSonarQubeGetIssuesWithPermissions.mockResolvedValue({ issues: ['filtered'] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createHandler', () => {
    it('should use standard handler when permissions are not enabled', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(null);

      const handler = HandlerFactory.createHandler(
        'projects',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({});

      expect(result).toBe('standard-result');
      expect(standardHandler).toHaveBeenCalledWith({});
      expect(permissionAwareHandler).not.toHaveBeenCalled();
    });

    it('should use standard handler when no user context exists', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const handler = HandlerFactory.createHandler(
        'projects',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({});

      expect(result).toBe('standard-result');
      expect(standardHandler).toHaveBeenCalledWith({});
      expect(permissionAwareHandler).not.toHaveBeenCalled();
    });

    it('should check tool access when permissions are enabled', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'projects',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({});

      expect(mockPermissionService.checkToolAccess).toHaveBeenCalledWith(
        mockUserContext,
        'projects'
      );
      expect(result).toBe('permission-result');
      expect(permissionAwareHandler).toHaveBeenCalledWith({});
    });

    it('should throw error when tool access is denied', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Insufficient permissions',
      });

      const handler = HandlerFactory.createHandler(
        'projects',
        standardHandler,
        permissionAwareHandler
      );

      await expect(handler({})).rejects.toThrow('Access denied: Insufficient permissions');
      expect(standardHandler).not.toHaveBeenCalled();
      expect(permissionAwareHandler).not.toHaveBeenCalled();
    });

    it('should check project access for project-specific tools', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_component',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({ component: 'project1:src/file.ts' });

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project1'
      );
      expect(result).toBe('permission-result');
    });

    it('should throw error when project access is denied', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'No access to project',
      });

      const handler = HandlerFactory.createHandler(
        'source_code',
        standardHandler,
        permissionAwareHandler
      );

      await expect(handler({ component: 'project1:src/file.ts' })).rejects.toThrow(
        'Access denied: No access to project'
      );
    });

    it('should handle array of components for project access check', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_components',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({
        component_keys: ['project1:src/file1.ts', 'project2:src/file2.ts'],
      });

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project1'
      );
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project2'
      );
      expect(result).toBe('permission-result');
    });

    it('should use standard handler when no permission-aware handler is provided', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler('projects', standardHandler);
      const result = await handler({});

      expect(result).toBe('standard-result');
      expect(standardHandler).toHaveBeenCalledWith({});
    });

    it('should handle project_key parameter', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'quality_gate_status',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({ project_key: 'my-project' });

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'my-project'
      );
      expect(result).toBe('permission-result');
    });

    it('should handle projectKey parameter', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_history',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({ projectKey: 'another-project' });

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'another-project'
      );
      expect(result).toBe('permission-result');
    });

    it('should handle components without colon as project key', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_component',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({ component: 'simple-project-key' });

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'simple-project-key'
      );
      expect(result).toBe('permission-result');
    });

    it('should skip project access check for non-project tools', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'issues',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({ component: 'project1:src/file.ts' });

      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
      expect(result).toBe('permission-result');
    });

    it('should handle missing parameter values gracefully', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_component',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({}); // No component parameter

      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
      expect(result).toBe('permission-result');
    });

    it('should handle non-string array values', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_components',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({
        component_keys: [123, null, 'valid-project:file.ts', undefined] as unknown[],
      });

      // Should only check the valid string
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(1);
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'valid-project'
      );
      expect(result).toBe('permission-result');
    });

    it('should handle components parameter', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_components',
        standardHandler,
        permissionAwareHandler
      );
      const result = await handler({
        components: ['project1:src/file1.ts'],
      });

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project1'
      );
      expect(result).toBe('permission-result');
    });
  });

  describe('getProjectsHandler', () => {
    it('should return a handler for projects', async () => {
      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(null);

      const handler = HandlerFactory.getProjectsHandler();
      const result = await handler({});

      expect(result).toEqual({ projects: [] });
    });

    it('should use permission-aware handler when permissions are enabled', async () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.getProjectsHandler();
      const result = await handler({});

      expect(result).toEqual({ projects: ['filtered'] });
    });
  });

  describe('getIssuesHandler', () => {
    it('should return a handler for issues', async () => {
      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(null);

      const handler = HandlerFactory.getIssuesHandler();
      const result = await handler({ projects: ['test-project'] });

      expect(result).toEqual({ issues: [] });
    });

    it('should use permission-aware handler when permissions are enabled', async () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const handler = HandlerFactory.getIssuesHandler();
      const result = await handler({ projects: ['test-project'] });

      expect(result).toEqual({ issues: ['filtered'] });
    });
  });

  describe('edge cases', () => {
    it('should handle all project-specific tools', async () => {
      const projectTools: McpTool[] = [
        'measures_component',
        'measures_components',
        'measures_history',
        'quality_gate_status',
        'source_code',
        'scm_blame',
      ];

      for (const tool of projectTools) {
        jest.clearAllMocks();

        const standardHandler = jest.fn().mockResolvedValue('result');
        const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

        mockGetUserContext.mockReturnValue(mockUserContext);
        mockGetPermissionService.mockReturnValue(mockPermissionService);
        (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
        (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
          allowed: true,
        });

        const handler = HandlerFactory.createHandler(tool, standardHandler, permissionAwareHandler);
        await handler({ component: 'project:file' });

        expect(mockPermissionService.checkProjectAccess).toHaveBeenCalled();
      }
    });

    it('should handle first project access denial in array', async () => {
      const standardHandler = jest.fn().mockResolvedValue('standard-result');
      const permissionAwareHandler = jest.fn().mockResolvedValue('permission-result');

      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock)
        .mockResolvedValueOnce({ allowed: false, reason: 'No access to project1' })
        .mockResolvedValueOnce({ allowed: true });

      const handler = HandlerFactory.createHandler(
        'measures_components',
        standardHandler,
        permissionAwareHandler
      );

      await expect(
        handler({
          components: ['project1:file1.ts', 'project2:file2.ts'],
        })
      ).rejects.toThrow('Access denied: No access to project1');

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(1);
    });
  });
});
