import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserContext } from '../types.js';
import { PermissionService } from '../permission-service.js';

// Mock dependencies
const mockGetContextAccess = jest.fn();

jest.mock('../context-utils.js', () => ({
  getContextAccess: mockGetContextAccess,
}));

// Import after mocking
import {
  extractProjectKey,
  checkSingleProjectAccess,
  checkMultipleProjectAccess,
  checkProjectAccessForParams,
  validateProjectAccessOrThrow,
} from '../project-access-utils.js';

describe('project-access-utils comprehensive tests', () => {
  const mockUserContext: UserContext = {
    userId: 'test-user',
    username: 'testuser',
    roles: ['user'],
    permissions: ['issues:read'],
    sessionId: 'session-123',
  };

  const mockPermissionService = {
    checkProjectAccess: jest.fn(),
  } as unknown as PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractProjectKey', () => {
    it('should extract project key from component key with colon', () => {
      expect(extractProjectKey('my-project:src/main/java/File.java')).toBe('my-project');
      expect(extractProjectKey('project:file.ts')).toBe('project');
      expect(extractProjectKey('complex-project-name:deeply/nested/path/file.js')).toBe(
        'complex-project-name'
      );
    });

    it('should return the whole string if no colon', () => {
      expect(extractProjectKey('simple-project')).toBe('simple-project');
      expect(extractProjectKey('no-colon-here')).toBe('no-colon-here');
    });

    it('should handle empty string', () => {
      expect(extractProjectKey('')).toBe('');
    });

    it('should handle colon at the beginning', () => {
      expect(extractProjectKey(':file.ts')).toBe(':file.ts');
    });

    it('should handle multiple colons', () => {
      expect(extractProjectKey('project:src:file:name.ts')).toBe('project');
    });

    it('should handle special characters', () => {
      expect(extractProjectKey('my-project_v2.0:src/file.ts')).toBe('my-project_v2.0');
      expect(extractProjectKey('@org/package:src/index.js')).toBe('@org/package');
    });
  });

  describe('checkSingleProjectAccess', () => {
    it('should return allowed true when permissions are disabled', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });

      const result = await checkSingleProjectAccess('project1');

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
    });

    it('should check project access when permissions are enabled', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkSingleProjectAccess('project1');

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project1'
      );
    });

    it('should return denied with reason when access is denied', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'No access to project',
      });

      const result = await checkSingleProjectAccess('restricted-project');

      expect(result).toEqual({
        allowed: false,
        reason: 'No access to project',
      });
    });
  });

  describe('checkMultipleProjectAccess', () => {
    it('should return allowed when all projects are accessible', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkMultipleProjectAccess(['project1', 'project2', 'project3']);

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(3);
    });

    it('should return first denial when a project is not accessible', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock)
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, reason: 'Access denied to project2' })
        .mockResolvedValueOnce({ allowed: true });

      const result = await checkMultipleProjectAccess(['project1', 'project2', 'project3']);

      expect(result).toEqual({
        allowed: false,
        reason: 'Access denied to project2',
      });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(2); // Stops at first denial
    });

    it('should handle empty array', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });

      const result = await checkMultipleProjectAccess([]);

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
    });

    it('should handle single project in array', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkMultipleProjectAccess(['single-project']);

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkProjectAccessForParams', () => {
    it('should return allowed when permissions are disabled', async () => {
      mockGetContextAccess.mockReturnValue({
        hasPermissions: false,
      });

      const result = await checkProjectAccessForParams({
        project_key: 'project1',
        component: 'project1:src/file.ts',
      });

      expect(result).toEqual({ allowed: true });
    });

    it('should check project_key parameter', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        project_key: 'my-project',
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'my-project'
      );
    });

    it('should check projectKey parameter', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        projectKey: 'another-project',
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'another-project'
      );
    });

    it('should extract project key from component parameter', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        component: 'project:src/main/java/File.java',
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project'
      );
    });

    it('should check array of components', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        components: ['proj1:file1.ts', 'proj2:file2.ts'],
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'proj1'
      );
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'proj2'
      );
    });

    it('should check component_keys array', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        component_keys: ['key1:file.ts', 'key2:file.js', 'key3:file.py'],
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(3);
    });

    it('should stop at first denial in array', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock)
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, reason: 'Access denied' });

      const result = await checkProjectAccessForParams({
        components: ['allowed:file1.ts', 'denied:file2.ts', 'other:file3.ts'],
      });

      expect(result).toEqual({
        allowed: false,
        reason: 'Access denied',
      });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(2);
    });

    it('should handle non-string values in arrays', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        components: ['valid:file.ts', 123, null, undefined, { key: 'invalid' }] as unknown[],
      });

      expect(result).toEqual({ allowed: true });
      // Should only check the valid string
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(1);
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'valid'
      );
    });

    it('should handle missing parameters', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });

      const result = await checkProjectAccessForParams({
        unrelated: 'value',
        other: 123,
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
    });

    it('should handle null/undefined parameter values', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });

      const result = await checkProjectAccessForParams({
        project_key: null,
        component: undefined,
        components: null,
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
    });

    it('should check multiple parameters if present', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      const result = await checkProjectAccessForParams({
        project_key: 'project1',
        component: 'project2:file.ts',
        components: ['project3:file.js'],
      });

      expect(result).toEqual({ allowed: true });
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project1'
      );
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project2'
      );
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project3'
      );
    });
  });

  describe('validateProjectAccessOrThrow', () => {
    it('should not throw when single project is accessible', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await expect(validateProjectAccessOrThrow('allowed-project')).resolves.toBeUndefined();
    });

    it('should throw when single project is not accessible', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Insufficient permissions',
      });

      await expect(validateProjectAccessOrThrow('denied-project')).rejects.toThrow(
        "Access denied to project 'denied-project': Insufficient permissions"
      );
    });

    it('should not throw when all projects in array are accessible', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({
        allowed: true,
      });

      await expect(
        validateProjectAccessOrThrow(['project1', 'project2', 'project3'])
      ).resolves.toBeUndefined();
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(3);
    });

    it('should throw for first inaccessible project in array', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkProjectAccess as jest.Mock)
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, reason: 'No access' });

      await expect(
        validateProjectAccessOrThrow(['allowed-project', 'denied-project', 'another-project'])
      ).rejects.toThrow("Access denied to project 'denied-project': No access");

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });

      await expect(validateProjectAccessOrThrow([])).resolves.toBeUndefined();
      expect(mockPermissionService.checkProjectAccess).not.toHaveBeenCalled();
    });

    it('should not throw when permissions are disabled', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });

      await expect(validateProjectAccessOrThrow('any-project')).resolves.toBeUndefined();
    });
  });
});
