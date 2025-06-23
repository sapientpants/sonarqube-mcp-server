import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UserContext } from '../../auth/types.js';
import { PermissionService } from '../../auth/permission-service.js';

// Mock the permission manager first
const mockGetPermissionService = jest.fn();
jest.mock('../../auth/permission-manager.js', () => ({
  permissionManager: {
    getPermissionService: mockGetPermissionService,
  },
}));

// Import after mocking
import { createPermissionAwareHandler, HandlerContext } from '../permission-wrapper.js';

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
      mockGetPermissionService.mockReturnValue(null);
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
      mockGetPermissionService.mockReturnValue(mockPermissionService);
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

    it('should handle results without projects or issues', async () => {
      mockGetPermissionService.mockReturnValue(mockPermissionService);
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
      mockGetPermissionService.mockReturnValue(mockPermissionService);
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

    it('should handle non-Error exceptions', async () => {
      mockGetPermissionService.mockReturnValue(mockPermissionService);
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

  // Note: More complex permission filtering integration tests are skipped
  // due to ES module mocking complexities. The core permission functionality
  // is thoroughly tested in permission-service.test.ts and context-provider.test.ts
});
