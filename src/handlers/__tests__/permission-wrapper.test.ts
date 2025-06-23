import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserContext, McpTool } from '../../auth/types.js';
import { PermissionService } from '../../auth/permission-service.js';

// Mock dependencies
const mockGetContextAccess = jest.fn();
const mockExtractProjectKey = jest.fn();
const mockCreatePermissionDeniedError = jest.fn();
const mockCreateSuccessResponse = jest.fn();
const mockHandlePermissionError = jest.fn();

jest.mock('../../auth/context-utils.js', () => ({
  getContextAccess: mockGetContextAccess,
}));

jest.mock('../../auth/project-access-utils.js', () => ({
  extractProjectKey: mockExtractProjectKey,
  checkProjectAccessForParams: jest.fn(),
}));

jest.mock('../../auth/permission-error-handler.js', () => ({
  createPermissionDeniedError: mockCreatePermissionDeniedError,
  createSuccessResponse: mockCreateSuccessResponse,
  handlePermissionError: mockHandlePermissionError,
}));

// Import after mocking
import { createPermissionAwareHandler, HandlerContext } from '../permission-wrapper.js';

describe('permission-wrapper', () => {
  const mockUserContext: UserContext = {
    userId: 'test-user',
    username: 'testuser',
    roles: ['user'],
    permissions: ['issues:read'],
    sessionId: 'session-123',
  };

  const mockPermissionService: PermissionService = {
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

    // Default mock implementations
    mockCreateSuccessResponse.mockImplementation((data) => ({ success: true, data }));
    mockCreatePermissionDeniedError.mockImplementation(() => ({
      success: false,
      error: 'Access denied',
      errorCode: 'PERMISSION_DENIED',
    }));
    mockHandlePermissionError.mockImplementation((tool, userContext, error) => ({
      success: false,
      error: error.message,
      errorCode: 'PERMISSION_ERROR',
    }));
    mockExtractProjectKey.mockImplementation((key: string) => {
      const colonIndex = key.indexOf(':');
      return colonIndex > 0 ? key.substring(0, colonIndex) : key;
    });
  });

  describe('createPermissionAwareHandler', () => {
    it('should bypass permissions when hasPermissions is false', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'test' });
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({ param: 'value' });

      expect(mockHandler).toHaveBeenCalledWith({ param: 'value' }, undefined);
      expect(result).toEqual({ success: true, data: { data: 'test' } });
      expect(mockPermissionService.checkToolAccess).not.toHaveBeenCalled();
    });

    it('should use provided context over global context', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'test' });
      const providedContext: HandlerContext = {
        userContext: {
          userId: 'provided-user',
          username: 'provideduser',
          roles: ['admin'],
          permissions: ['*'],
          sessionId: 'provided-session',
        },
      };

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({ param: 'value' }, providedContext);

      expect(mockPermissionService.checkToolAccess).toHaveBeenCalledWith(
        providedContext.userContext,
        'projects'
      );
      expect(mockHandler).toHaveBeenCalledWith({ param: 'value' }, providedContext);
      expect(result).toEqual({ success: true, data: { data: 'test' } });
    });

    it('should deny access when tool access is not allowed', async () => {
      const mockHandler = jest.fn();
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Insufficient permissions',
      });

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({ param: 'value' });

      expect(mockPermissionService.checkToolAccess).toHaveBeenCalledWith(
        mockUserContext,
        'projects'
      );
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockCreatePermissionDeniedError).toHaveBeenCalledWith(
        'projects',
        'test-user',
        'Insufficient permissions'
      );
      expect(result).toEqual({
        success: false,
        error: 'Access denied',
        errorCode: 'PERMISSION_DENIED',
      });
    });

    it('should filter projects array when tool is projects', async () => {
      const mockProjects = [{ key: 'proj1' }, { key: 'proj2' }, { key: 'proj3' }];
      const mockFilteredProjects = [{ key: 'proj1' }, { key: 'proj3' }];
      const mockHandler = jest.fn().mockResolvedValue(mockProjects);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.filterProjects as jest.Mock).mockResolvedValue(mockFilteredProjects);

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({});

      expect(mockPermissionService.filterProjects).toHaveBeenCalledWith(
        mockUserContext,
        mockProjects
      );
      expect(result).toEqual({ success: true, data: mockFilteredProjects });
    });

    it('should filter issues when tool is issues', async () => {
      const mockIssues = [{ key: 'issue1' }, { key: 'issue2' }];
      const mockFilteredIssues = [{ key: 'issue1' }];
      const mockResult = { issues: mockIssues, total: 2, paging: {} };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.filterIssues as jest.Mock).mockResolvedValue(mockFilteredIssues);

      const wrappedHandler = createPermissionAwareHandler('issues', mockHandler);
      const result = await wrappedHandler({});

      expect(mockPermissionService.filterIssues).toHaveBeenCalledWith(mockUserContext, mockIssues);
      expect(result).toEqual({
        success: true,
        data: { issues: mockFilteredIssues, total: 1, paging: {} },
      });
    });

    it('should filter components based on project access', async () => {
      const mockComponents = [
        { key: 'proj1:src/file1.ts' },
        { key: 'proj2:src/file2.ts' },
        { key: 'proj3:src/file3.ts' },
      ];
      const mockResult = { components: mockComponents };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock)
        .mockResolvedValueOnce({ allowed: true }) // proj1
        .mockResolvedValueOnce({ allowed: false }) // proj2
        .mockResolvedValueOnce({ allowed: true }); // proj3

      const wrappedHandler = createPermissionAwareHandler('components', mockHandler);
      const result = await wrappedHandler({});

      expect(mockExtractProjectKey).toHaveBeenCalledWith('proj1:src/file1.ts');
      expect(mockExtractProjectKey).toHaveBeenCalledWith('proj2:src/file2.ts');
      expect(mockExtractProjectKey).toHaveBeenCalledWith('proj3:src/file3.ts');
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        data: {
          components: [{ key: 'proj1:src/file1.ts' }, { key: 'proj3:src/file3.ts' }],
        },
      });
    });

    it('should filter hotspots based on project access', async () => {
      const mockHotspots = [
        { key: 'h1', project: 'proj1' },
        { key: 'h2', project: { key: 'proj2' } },
        { key: 'h3', project: 'proj3' },
      ];
      const mockResult = { hotspots: mockHotspots };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock)
        .mockResolvedValueOnce({ allowed: true }) // proj1
        .mockResolvedValueOnce({ allowed: false }) // proj2
        .mockResolvedValueOnce({ allowed: true }); // proj3

      const wrappedHandler = createPermissionAwareHandler('hotspots', mockHandler);
      const result = await wrappedHandler({});

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'proj1'
      );
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'proj2'
      );
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'proj3'
      );
      expect(result).toEqual({
        success: true,
        data: {
          hotspots: [
            { key: 'h1', project: 'proj1' },
            { key: 'h3', project: 'proj3' },
          ],
        },
      });
    });

    it('should pass through results for project-specific tools', async () => {
      const projectTools: McpTool[] = [
        'measures_component',
        'measures_components',
        'measures_history',
        'quality_gate_status',
        'source_code',
        'scm_blame',
      ];

      for (const tool of projectTools) {
        const mockResult = { data: `${tool} result` };
        const mockHandler = jest.fn().mockResolvedValue(mockResult);

        mockGetContextAccess.mockReturnValue({
          userContext: mockUserContext,
          permissionService: mockPermissionService,
          hasPermissions: true,
        });
        (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

        const wrappedHandler = createPermissionAwareHandler(tool, mockHandler);
        const result = await wrappedHandler({});

        expect(result).toEqual({ success: true, data: mockResult });
      }
    });

    it('should handle handler errors gracefully', async () => {
      const mockError = new Error('Handler failed');
      const mockHandler = jest.fn().mockRejectedValue(mockError);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({});

      expect(mockHandlePermissionError).toHaveBeenCalledWith(
        'projects',
        mockUserContext,
        mockError
      );
      expect(result).toEqual({
        success: false,
        error: 'Handler failed',
        errorCode: 'PERMISSION_ERROR',
      });
    });

    it('should handle non-array projects result', async () => {
      const mockResult = { projects: 'not an array' };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({});

      expect(mockPermissionService.filterProjects).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should handle issues result without issues array', async () => {
      const mockResult = { total: 0 };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('issues', mockHandler);
      const result = await wrappedHandler({});

      expect(mockPermissionService.filterIssues).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should handle components without key property', async () => {
      const mockComponents = [
        { key: 'proj1:src/file1.ts' },
        { name: 'no-key' }, // No key property
        null, // Null component
        { key: 'proj2:src/file2.ts' },
      ];
      const mockResult = { components: mockComponents };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('components', mockHandler);
      const result = await wrappedHandler({});

      expect(mockExtractProjectKey).toHaveBeenCalledTimes(2); // Only for components with keys
      expect(result).toEqual({
        success: true,
        data: {
          components: [{ key: 'proj1:src/file1.ts' }, { key: 'proj2:src/file2.ts' }],
        },
      });
    });

    it('should handle hotspots without project property', async () => {
      const mockHotspots = [
        { key: 'h1', project: 'proj1' },
        { key: 'h2' }, // No project property
        null, // Null hotspot
        { key: 'h3', project: 'proj2' },
      ];
      const mockResult = { hotspots: mockHotspots };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });
      (mockPermissionService.checkProjectAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('hotspots', mockHandler);
      const result = await wrappedHandler({});

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(2); // Only for hotspots with projects
      expect(result).toEqual({
        success: true,
        data: {
          hotspots: [
            { key: 'h1', project: 'proj1' },
            { key: 'h3', project: 'proj2' },
          ],
        },
      });
    });

    it('should handle unknown tools by passing through results', async () => {
      const mockResult = { custom: 'data' };
      const mockHandler = jest.fn().mockResolvedValue(mockResult);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('unknown-tool' as McpTool, mockHandler);
      const result = await wrappedHandler({});

      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should handle error in permission check', async () => {
      const mockError = new Error('Permission check failed');
      const mockHandler = jest.fn();

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockRejectedValue(mockError);

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({});

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockHandlePermissionError).toHaveBeenCalledWith(
        'projects',
        mockUserContext,
        mockError
      );
      expect(result).toEqual({
        success: false,
        error: 'Permission check failed',
        errorCode: 'PERMISSION_ERROR',
      });
    });

    it('should handle null result from handler', async () => {
      const mockHandler = jest.fn().mockResolvedValue(null);

      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });
      (mockPermissionService.checkToolAccess as jest.Mock).mockResolvedValue({ allowed: true });

      const wrappedHandler = createPermissionAwareHandler('projects', mockHandler);
      const result = await wrappedHandler({});

      expect(result).toEqual({ success: true, data: null });
    });
  });
});
