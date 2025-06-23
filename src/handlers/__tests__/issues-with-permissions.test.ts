import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { IssuesParams, SonarQubeIssuesResult, SonarQubeIssue } from '../../types/index.js';

// Mock dependencies
const mockGetDefaultClient = jest.fn();
const mockWithErrorHandling = jest.fn();
const mockWithMCPErrorHandling = jest.fn();
const mockCreateStructuredResponse = jest.fn();
const mockGetContextAccess = jest.fn();
const mockValidateProjectAccessOrThrow = jest.fn();
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

jest.mock('../../utils/client-factory.js', () => ({
  getDefaultClient: mockGetDefaultClient,
}));

jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

jest.mock('../../errors.js', () => ({
  withErrorHandling: mockWithErrorHandling,
}));

jest.mock('../../utils/error-handler.js', () => ({
  withMCPErrorHandling: mockWithMCPErrorHandling,
}));

jest.mock('../../utils/structured-response.js', () => ({
  createStructuredResponse: mockCreateStructuredResponse,
}));

jest.mock('../../auth/context-utils.js', () => ({
  getContextAccess: mockGetContextAccess,
}));

jest.mock('../../auth/project-access-utils.js', () => ({
  validateProjectAccessOrThrow: mockValidateProjectAccessOrThrow,
}));

// Import after mocking
import { handleSonarQubeGetIssuesWithPermissions } from '../issues-with-permissions.js';

describe('issues-with-permissions', () => {
  const mockClient = {
    getIssues: jest.fn(),
  };

  const mockUserContext = {
    userId: 'test-user',
    username: 'testuser',
    groups: ['developer'],
  };

  const mockPermissionService = {
    checkProjectAccess: jest.fn(),
    filterIssues: jest.fn(),
  };

  const mockIssue1: SonarQubeIssue = {
    key: 'issue-1',
    rule: 'javascript:S1234',
    severity: 'MAJOR',
    component: 'project1:src/file1.js',
    project: 'project1',
    line: 10,
    status: 'OPEN',
    message: 'Fix this issue',
    effort: '5min',
    debt: '5min',
    author: 'author1',
    tags: ['bug'],
    creationDate: '2024-01-01',
    updateDate: '2024-01-02',
    type: 'BUG',
  };

  const mockIssue2: SonarQubeIssue = {
    key: 'issue-2',
    rule: 'javascript:S5678',
    severity: 'CRITICAL',
    component: 'project2:src/file2.js',
    project: 'project2',
    line: 20,
    status: 'CONFIRMED',
    message: 'Critical security issue',
    effort: '30min',
    debt: '30min',
    author: 'author2',
    tags: ['security'],
    creationDate: '2024-01-03',
    updateDate: '2024-01-04',
    type: 'VULNERABILITY',
  };

  const mockIssue3: SonarQubeIssue = {
    key: 'issue-3',
    rule: 'javascript:S9999',
    severity: 'MINOR',
    component: 'project3:src/file3.js',
    project: 'project3',
    line: 30,
    status: 'OPEN',
    message: 'Code smell',
    effort: '2min',
    debt: '2min',
    author: 'author3',
    tags: ['code-smell'],
    creationDate: '2024-01-05',
    updateDate: '2024-01-06',
    type: 'CODE_SMELL',
  };

  const mockResult: SonarQubeIssuesResult = {
    issues: [mockIssue1, mockIssue2, mockIssue3],
    paging: {
      pageIndex: 1,
      pageSize: 100,
      total: 3,
    },
    components: [
      { key: 'project1:src/file1.js', name: 'file1.js' },
      { key: 'project2:src/file2.js', name: 'file2.js' },
      { key: 'project3:src/file3.js', name: 'file3.js' },
    ],
    facets: {
      severities: [
        { val: 'MAJOR', count: 1 },
        { val: 'CRITICAL', count: 1 },
        { val: 'MINOR', count: 1 },
      ],
    },
    rules: [
      { key: 'javascript:S1234', name: 'Rule 1234' },
      { key: 'javascript:S5678', name: 'Rule 5678' },
      { key: 'javascript:S9999', name: 'Rule 9999' },
    ],
    users: [
      { login: 'author1', name: 'Author 1' },
      { login: 'author2', name: 'Author 2' },
      { login: 'author3', name: 'Author 3' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDefaultClient.mockReturnValue(mockClient);
    mockClient.getIssues.mockResolvedValue(mockResult);
    mockCreateStructuredResponse.mockImplementation((data) => data);

    // Setup withMCPErrorHandling to call the wrapped function
    mockWithMCPErrorHandling.mockImplementation((fn) => fn);

    // Setup withErrorHandling to call the wrapped function
    mockWithErrorHandling.mockImplementation((message, fn) => fn());
  });

  describe('without permissions', () => {
    beforeEach(() => {
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });
    });

    it('should return all issues when permissions are disabled', async () => {
      const params: IssuesParams = {
        severities: ['MAJOR', 'CRITICAL'],
      };

      const result = await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockClient.getIssues).toHaveBeenCalledWith(params);
      expect(mockValidateProjectAccessOrThrow).not.toHaveBeenCalled();
      expect(result.issues).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should pass custom client to getIssues', async () => {
      const customClient = { getIssues: jest.fn().mockResolvedValue(mockResult) };
      const params: IssuesParams = {};

      await handleSonarQubeGetIssuesWithPermissions(params, customClient);

      expect(customClient.getIssues).toHaveBeenCalledWith(params);
      expect(mockGetDefaultClient).not.toHaveBeenCalled();
    });
  });

  describe('with permissions', () => {
    beforeEach(() => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });

      // Setup default permission responses
      mockPermissionService.checkProjectAccess.mockResolvedValue({ allowed: true });
      mockPermissionService.filterIssues.mockImplementation(async (context, issues) => issues);
    });

    it('should validate project access when specific projects are requested', async () => {
      const params: IssuesParams = {
        projects: ['project1', 'project2'],
      };

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockValidateProjectAccessOrThrow).toHaveBeenCalledWith(['project1', 'project2']);
    });

    it('should not validate project access when no projects specified', async () => {
      const params: IssuesParams = {
        severities: ['MAJOR'],
      };

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockValidateProjectAccessOrThrow).not.toHaveBeenCalled();
    });

    it('should filter issues by project access', async () => {
      mockPermissionService.checkProjectAccess
        .mockResolvedValueOnce({ allowed: true }) // project1
        .mockResolvedValueOnce({ allowed: false }) // project2
        .mockResolvedValueOnce({ allowed: true }); // project3

      const params: IssuesParams = {};

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(3);
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

      // Should only include issues from allowed projects
      expect(mockPermissionService.filterIssues).toHaveBeenCalledWith(
        mockUserContext,
        [mockIssue1, mockIssue3] // project2 excluded
      );
    });

    it('should apply additional issue filtering', async () => {
      mockPermissionService.filterIssues.mockResolvedValue([mockIssue1]); // Only return first issue

      const params: IssuesParams = {};

      const result = await handleSonarQubeGetIssuesWithPermissions(params);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].key).toBe('issue-1');
      expect(result.total).toBe(1);
      expect(result.paging.total).toBe(1);
    });

    it('should handle issues without project field', async () => {
      const issueWithoutProject = { ...mockIssue1, project: undefined };
      mockClient.getIssues.mockResolvedValue({
        ...mockResult,
        issues: [issueWithoutProject, mockIssue2],
      });

      const params: IssuesParams = {};

      await handleSonarQubeGetIssuesWithPermissions(params);

      // Should check access only for issues with project
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledTimes(1);
      expect(mockPermissionService.checkProjectAccess).toHaveBeenCalledWith(
        mockUserContext,
        'project2'
      );
    });

    it('should log filtering information', async () => {
      mockPermissionService.checkProjectAccess.mockResolvedValue({ allowed: true });
      mockPermissionService.filterIssues.mockResolvedValue([mockIssue1, mockIssue3]);

      const params: IssuesParams = {};

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockLogger.debug).toHaveBeenCalledWith('Applying permission filtering to issues', {
        userId: 'test-user',
        issueCount: 3,
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Issues filtered by permissions', {
        originalCount: 3,
        filteredCount: 2,
      });
    });
  });

  describe('response structure', () => {
    beforeEach(() => {
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });
    });

    it('should map all issue fields correctly', async () => {
      const params: IssuesParams = {};

      const result = await handleSonarQubeGetIssuesWithPermissions(params);

      const mappedIssue = result.issues[0];
      expect(mappedIssue).toEqual({
        key: mockIssue1.key,
        rule: mockIssue1.rule,
        severity: mockIssue1.severity,
        component: mockIssue1.component,
        project: mockIssue1.project,
        line: mockIssue1.line,
        status: mockIssue1.status,
        message: mockIssue1.message,
        effort: mockIssue1.effort,
        debt: mockIssue1.debt,
        author: mockIssue1.author,
        tags: mockIssue1.tags,
        creationDate: mockIssue1.creationDate,
        updateDate: mockIssue1.updateDate,
        type: mockIssue1.type,
        cleanCodeAttribute: mockIssue1.cleanCodeAttribute,
        cleanCodeAttributeCategory: mockIssue1.cleanCodeAttributeCategory,
        impacts: mockIssue1.impacts,
        issueStatus: mockIssue1.issueStatus,
        prioritizedRule: mockIssue1.prioritizedRule,
      });
    });

    it('should include additional result metadata', async () => {
      const params: IssuesParams = {};

      const result = await handleSonarQubeGetIssuesWithPermissions(params);

      expect(result.components).toEqual(mockResult.components);
      expect(result.facets).toEqual(mockResult.facets);
      expect(result.rules).toEqual(mockResult.rules);
      expect(result.users).toEqual(mockResult.users);
    });

    it('should handle missing optional fields', async () => {
      mockClient.getIssues.mockResolvedValue({
        issues: [mockIssue1],
        paging: mockResult.paging,
        // No components, facets, rules, or users
      });

      const params: IssuesParams = {};

      const result = await handleSonarQubeGetIssuesWithPermissions(params);

      expect(result.components).toBeUndefined();
      expect(result.facets).toBeUndefined();
      expect(result.rules).toBeUndefined();
      expect(result.users).toBeUndefined();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });
    });

    it('should handle client errors', async () => {
      const error = new Error('Client error');
      mockWithErrorHandling.mockImplementation(() => {
        throw error;
      });

      const params: IssuesParams = {};

      await expect(handleSonarQubeGetIssuesWithPermissions(params)).rejects.toThrow('Client error');
    });

    it('should handle permission validation errors', async () => {
      mockGetContextAccess.mockReturnValue({
        userContext: mockUserContext,
        permissionService: mockPermissionService,
        hasPermissions: true,
      });

      const error = new Error('Access denied');
      mockValidateProjectAccessOrThrow.mockRejectedValue(error);

      const params: IssuesParams = {
        projects: ['restricted-project'],
      };

      await expect(handleSonarQubeGetIssuesWithPermissions(params)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('logging', () => {
    beforeEach(() => {
      mockGetContextAccess.mockReturnValue({
        userContext: null,
        permissionService: null,
        hasPermissions: false,
      });
    });

    it('should log debug message when handling request', async () => {
      const params: IssuesParams = {
        severities: ['MAJOR'],
        page: '2',
      };

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Handling SonarQube issues request with permissions',
        params
      );
    });

    it('should log success message with counts', async () => {
      const params: IssuesParams = {};

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockLogger.info).toHaveBeenCalledWith('Successfully retrieved and filtered issues', {
        count: 3,
        facets: 1,
      });
    });

    it('should handle missing facets in logging', async () => {
      mockClient.getIssues.mockResolvedValue({
        ...mockResult,
        facets: undefined,
      });

      const params: IssuesParams = {};

      await handleSonarQubeGetIssuesWithPermissions(params);

      expect(mockLogger.info).toHaveBeenCalledWith('Successfully retrieved and filtered issues', {
        count: 3,
        facets: 0,
      });
    });
  });
});
