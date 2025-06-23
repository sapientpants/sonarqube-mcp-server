import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserContext } from '../types.js';
import { PermissionService } from '../permission-service.js';

// Mock dependencies
const mockGetUserContext = jest.fn();
const mockGetPermissionService = jest.fn();

jest.mock('../context-provider.js', () => ({
  contextProvider: {
    getUserContext: mockGetUserContext,
  },
}));

jest.mock('../permission-manager.js', () => ({
  permissionManager: {
    getPermissionService: mockGetPermissionService,
  },
}));

// Import after mocking
import {
  getContextAccess,
  isPermissionCheckingEnabled,
  getUserContextOrThrow,
  getPermissionServiceOrThrow,
} from '../context-utils.js';

describe('context-utils', () => {
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
  });

  describe('getContextAccess', () => {
    it('should return context with permissions when both are available', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result = getContextAccess();

      expect(result).toEqual({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
    });

    it('should return hasPermissions false when user context is missing', () => {
      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result = getContextAccess();

      expect(result).toEqual({
        userContext: null,
        permissionService: mockPermissionService,
        hasPermissions: false,
      });
    });

    it('should return hasPermissions false when permission service is missing', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(null);

      const result = getContextAccess();

      expect(result).toEqual({
        userContext: mockUserContext,
        permissionService: undefined,
        hasPermissions: false,
      });
    });

    it('should return hasPermissions false when both are missing', () => {
      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(null);

      const result = getContextAccess();

      expect(result).toEqual({
        userContext: null,
        permissionService: undefined,
        hasPermissions: false,
      });
    });

    it('should handle undefined user context', () => {
      mockGetUserContext.mockReturnValue(undefined);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result = getContextAccess();

      expect(result).toEqual({
        userContext: undefined,
        permissionService: mockPermissionService,
        hasPermissions: false,
      });
    });

    it('should convert null permission service to undefined', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(null);

      const result = getContextAccess();

      expect(result.permissionService).toBeUndefined();
      expect(result.hasPermissions).toBe(false);
    });
  });

  describe('isPermissionCheckingEnabled', () => {
    it('should return true when permissions are enabled', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result = isPermissionCheckingEnabled();

      expect(result).toBe(true);
    });

    it('should return false when user context is missing', () => {
      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result = isPermissionCheckingEnabled();

      expect(result).toBe(false);
    });

    it('should return false when permission service is missing', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(null);

      const result = isPermissionCheckingEnabled();

      expect(result).toBe(false);
    });

    it('should return false when both are missing', () => {
      mockGetUserContext.mockReturnValue(null);
      mockGetPermissionService.mockReturnValue(null);

      const result = isPermissionCheckingEnabled();

      expect(result).toBe(false);
    });
  });

  describe('getUserContextOrThrow', () => {
    it('should return user context when available', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);

      const result = getUserContextOrThrow();

      expect(result).toBe(mockUserContext);
    });

    it('should throw error when user context is null', () => {
      mockGetUserContext.mockReturnValue(null);

      expect(() => getUserContextOrThrow()).toThrow('User context not available');
    });

    it('should throw error when user context is undefined', () => {
      mockGetUserContext.mockReturnValue(undefined);

      expect(() => getUserContextOrThrow()).toThrow('User context not available');
    });

    it('should call contextProvider.getUserContext', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);

      getUserContextOrThrow();

      expect(mockGetUserContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPermissionServiceOrThrow', () => {
    it('should return permission service when available', () => {
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result = getPermissionServiceOrThrow();

      expect(result).toBe(mockPermissionService);
    });

    it('should throw error when permission service is null', () => {
      mockGetPermissionService.mockReturnValue(null);

      expect(() => getPermissionServiceOrThrow()).toThrow('Permission service not available');
    });

    it('should throw error when permission service is undefined', () => {
      mockGetPermissionService.mockReturnValue(undefined);

      expect(() => getPermissionServiceOrThrow()).toThrow('Permission service not available');
    });

    it('should call permissionManager.getPermissionService', () => {
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      getPermissionServiceOrThrow();

      expect(mockGetPermissionService).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle all combinations of null/undefined/truthy values', () => {
      const testCases = [
        { user: null, perm: null, hasPerms: false },
        { user: undefined, perm: null, hasPerms: false },
        { user: null, perm: undefined, hasPerms: false },
        { user: undefined, perm: undefined, hasPerms: false },
        { user: mockUserContext, perm: null, hasPerms: false },
        { user: mockUserContext, perm: undefined, hasPerms: false },
        { user: null, perm: mockPermissionService, hasPerms: false },
        { user: undefined, perm: mockPermissionService, hasPerms: false },
        { user: mockUserContext, perm: mockPermissionService, hasPerms: true },
      ];

      testCases.forEach(({ user, perm, hasPerms }) => {
        mockGetUserContext.mockReturnValue(user);
        mockGetPermissionService.mockReturnValue(perm);

        const result = getContextAccess();
        expect(result.hasPermissions).toBe(hasPerms);
      });
    });

    it('should handle multiple calls consistently', () => {
      mockGetUserContext.mockReturnValue(mockUserContext);
      mockGetPermissionService.mockReturnValue(mockPermissionService);

      const result1 = getContextAccess();
      const result2 = getContextAccess();
      const result3 = getContextAccess();

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(mockGetUserContext).toHaveBeenCalledTimes(3);
      expect(mockGetPermissionService).toHaveBeenCalledTimes(3);
    });
  });
});
