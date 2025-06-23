import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { createPermissionAwareHandler, HandlerContext } from '../permission-wrapper.js';
import { UserContext } from '../../auth/types.js';
import { permissionManager } from '../../auth/permission-manager.js';
import { PermissionService } from '../../auth/permission-service.js';

// Mock the permission manager
jest.mock('../../auth/permission-manager.js', () => ({
  permissionManager: {
    getPermissionService: jest.fn(),
  },
}));

const mockPermissionManager = permissionManager as jest.Mocked<typeof permissionManager>;

describe('Permission Wrapper', () => {
  let mockPermissionService: jest.Mocked<PermissionService>;
  let mockUserContext: UserContext;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserContext = {
      userId: 'test-user',
      groups: ['developer'],
      scopes: ['sonarqube:read'],
      issuer: 'https://auth.example.com',
      claims: {},
    };

    mockHandler = jest.fn();

    mockPermissionService = {
      checkToolAccess: jest.fn(),
      filterProjects: jest.fn(),
      filterIssues: jest.fn(),
      checkProjectAccess: jest.fn(),
      extractUserContext: jest.fn(),
      clearCache: jest.fn(),
      getAuditLog: jest.fn(),
    } as jest.Mocked<PermissionService>;
  });

  describe('createPermissionAwareHandler', () => {
    it('should call handler directly when permissions are disabled', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(null);
      mockHandler.mockResolvedValue({ data: 'test result' });

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const result = await wrappedHandler({ param: 'value' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test result' });
      expect(mockHandler).toHaveBeenCalledWith({ param: 'value' }, undefined);
    });

    it('should call handler directly when no user context is provided', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockHandler.mockResolvedValue({ data: 'test result' });

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'test result' });
      expect(mockHandler).toHaveBeenCalledWith({ param: 'value' }, context);
    });

    it('should deny access when tool access is not allowed', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: false,
        reason: 'Tool not in allowed list',
      });

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'markIssueFalsePositive',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
      expect(result.errorCode).toBe('PERMISSION_DENIED');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should allow access and apply filtering when permissions allow', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      const mockResult = {
        projects: [
          { key: 'project1', name: 'Project 1' },
          { key: 'project2', name: 'Project 2' },
        ],
      };

      const filteredProjects = [{ key: 'project1', name: 'Project 1' }];

      mockHandler.mockResolvedValue(mockResult);
      mockPermissionService.filterProjects.mockResolvedValue(filteredProjects);

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        projects: filteredProjects,
      });
      expect(mockHandler).toHaveBeenCalledWith({ param: 'value' }, context);
      expect(mockPermissionService.filterProjects).toHaveBeenCalledWith(
        mockUserContext,
        mockResult.projects
      );
    });

    it('should handle issues filtering', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      const mockResult = {
        issues: [
          { key: 'issue1', severity: 'MAJOR' },
          { key: 'issue2', severity: 'BLOCKER' },
        ],
      };

      const filteredIssues = [{ key: 'issue1', severity: 'MAJOR' }];

      mockHandler.mockResolvedValue(mockResult);
      mockPermissionService.filterIssues.mockResolvedValue(filteredIssues);

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { issues: unknown[] }>(
        'issues',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        issues: filteredIssues,
      });
      expect(mockPermissionService.filterIssues).toHaveBeenCalledWith(
        mockUserContext,
        mockResult.issues
      );
    });

    it('should handle results without projects or issues', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      const mockResult = {
        metrics: [
          { key: 'coverage', value: '85%' },
          { key: 'duplications', value: '2%' },
        ],
      };

      mockHandler.mockResolvedValue(mockResult);

      const wrappedHandler = createPermissionAwareHandler<
        { param: string },
        { metrics: unknown[] }
      >('metrics', mockHandler);

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(mockPermissionService.filterProjects).not.toHaveBeenCalled();
      expect(mockPermissionService.filterIssues).not.toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      const error = new Error('Handler failed');
      mockHandler.mockRejectedValue(error);

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler failed');
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle permission service errors gracefully', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockRejectedValue(new Error('Permission check failed'));

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission check failed');
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle non-Error exceptions', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      mockHandler.mockRejectedValue('String error');

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal error');
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('permission filtering integration', () => {
    it('should properly filter nested project data', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      const mockResult = {
        data: {
          projects: [
            { key: 'allowed-project', name: 'Allowed Project' },
            { key: 'denied-project', name: 'Denied Project' },
          ],
        },
        metadata: {
          total: 2,
        },
      };

      const filteredProjects = [{ key: 'allowed-project', name: 'Allowed Project' }];

      mockHandler.mockResolvedValue(mockResult);
      mockPermissionService.filterProjects.mockResolvedValue(filteredProjects);

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(true);
      expect(result.data.data.projects).toEqual(filteredProjects);
      expect(result.data.metadata).toEqual({ total: 2 }); // Metadata should be preserved
    });

    it('should handle array results directly', async () => {
      mockPermissionManager.getPermissionService.mockReturnValue(mockPermissionService);
      mockPermissionService.checkToolAccess.mockResolvedValue({
        allowed: true,
      });

      const mockResult = [
        { key: 'project1', name: 'Project 1' },
        { key: 'project2', name: 'Project 2' },
      ];

      const filteredProjects = [{ key: 'project1', name: 'Project 1' }];

      mockHandler.mockResolvedValue(mockResult);
      mockPermissionService.filterProjects.mockResolvedValue(filteredProjects);

      const wrappedHandler = createPermissionAwareHandler<{ param: string }, { data: string }>(
        'projects',
        mockHandler
      );

      const context: HandlerContext = {
        userContext: mockUserContext,
        sessionId: 'session123',
      };

      const result = await wrappedHandler({ param: 'value' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(filteredProjects);
    });
  });
});
