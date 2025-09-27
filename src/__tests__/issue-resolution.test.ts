import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Mock the web API client
vi.mock('sonarqube-web-api-client', () => {
  const mockDoTransition = vi.fn() as MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  const mockAddComment = vi.fn() as MockedFunction<(...args: unknown[]) => Promise<unknown>>;

  return {
    SonarQubeClient: {
      withToken: vi.fn().mockReturnValue({
        issues: {
          doTransition: mockDoTransition,
          addComment: mockAddComment,
          search: vi.fn().mockReturnValue({
            execute: vi.fn<() => Promise<any>>().mockResolvedValue({
              issues: [],
              components: [],
              rules: [],
              paging: { pageIndex: 1, pageSize: 10, total: 0 },
            } as never),
          }),
        },
      }),
    },
  };
});
import { IssuesDomain } from '../domains/issues.js';
import {
  handleMarkIssueFalsePositive,
  handleMarkIssueWontFix,
  handleMarkIssuesFalsePositive,
  handleMarkIssuesWontFix,
  handleAddCommentToIssue,
} from '../handlers/issues.js';
describe('IssuesDomain - Issue Resolution', () => {
  let domain: IssuesDomain;
  let mockDoTransition: any;
  let mockAddComment: any;
  let mockWebApiClient: any;

  beforeEach(async () => {
    // Import the mocked client to get access to the mock functions
    const { SonarQubeClient } = await import('sonarqube-web-api-client');
    const clientInstance = SonarQubeClient.withToken('http://localhost:9000', 'test-token');
    mockDoTransition = clientInstance.issues.doTransition;
    mockAddComment = clientInstance.issues.addComment;

    mockWebApiClient = {
      issues: {
        doTransition: mockDoTransition,
        addComment: mockAddComment,
        search: vi.fn(),
      },
    };

    domain = new IssuesDomain(mockWebApiClient, 'test-org');
    vi.clearAllMocks();
  });
  describe('markIssueFalsePositive', () => {
    it('should mark issue as false positive without comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      const result = await domain.markIssueFalsePositive({ issueKey: 'ISSUE-123' });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'falsepositive',
      });
      expect(mockAddComment).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
    it('should mark issue as false positive with comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      (mockAddComment as MockedFunction<any>).mockResolvedValue({});
      const result = await domain.markIssueFalsePositive({
        issueKey: 'ISSUE-123',
        comment: 'This is a false positive because it is acceptable in this context.',
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        text: 'This is a false positive because it is acceptable in this context.',
      });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'falsepositive',
      });
      expect(result).toEqual(mockResponse);
    });
    it('should handle API errors', async () => {
      const error = new Error('API Error');
      (mockDoTransition as MockedFunction<any>).mockRejectedValue(error);
      await expect(domain.markIssueFalsePositive({ issueKey: 'ISSUE-123' })).rejects.toThrow(
        'API Error'
      );
    });
  });
  describe('markIssueWontFix', () => {
    it("should mark issue as won't fix without comment", async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-456', status: 'RESOLVED', resolution: 'WONTFIX' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      const result = await domain.markIssueWontFix({ issueKey: 'ISSUE-456' });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-456',
        transition: 'wontfix',
      });
      expect(mockAddComment).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
    it("should mark issue as won't fix with comment", async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-456', status: 'RESOLVED', resolution: 'WONTFIX' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      (mockAddComment as MockedFunction<any>).mockResolvedValue({});
      const result = await domain.markIssueWontFix({
        issueKey: 'ISSUE-456',
        comment: "Won't fix due to project constraints.",
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-456',
        text: "Won't fix due to project constraints.",
      });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-456',
        transition: 'wontfix',
      });
      expect(result).toEqual(mockResponse);
    });
  });
  describe('markIssuesFalsePositive (bulk)', () => {
    it('should mark multiple issues as false positive', async () => {
      const mockResponse1 = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      const mockResponse2 = {
        issue: { key: 'ISSUE-124', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      mockDoTransition.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);
      const result = await domain.markIssuesFalsePositive({
        issueKeys: ['ISSUE-123', 'ISSUE-124'],
        comment: 'Bulk false positive marking',
      });
      expect(mockAddComment).toHaveBeenCalledTimes(2);
      expect(mockDoTransition).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockResponse1, mockResponse2]);
    });
  });
  describe('markIssuesWontFix (bulk)', () => {
    it("should mark multiple issues as won't fix", async () => {
      const mockResponse1 = {
        issue: { key: 'ISSUE-456', status: 'RESOLVED', resolution: 'WONTFIX' },
        components: [],
        rules: [],
        users: [],
      };
      const mockResponse2 = {
        issue: { key: 'ISSUE-457', status: 'RESOLVED', resolution: 'WONTFIX' },
        components: [],
        rules: [],
        users: [],
      };
      mockDoTransition.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);
      const result = await domain.markIssuesWontFix({
        issueKeys: ['ISSUE-456', 'ISSUE-457'],
        comment: "Bulk won't fix marking",
      });
      expect(mockAddComment).toHaveBeenCalledTimes(2);
      expect(mockDoTransition).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockResponse1, mockResponse2]);
    });
  });
  describe('addCommentToIssue', () => {
    it('should add a comment to an issue', async () => {
      const mockIssueWithComment = {
        key: 'ISSUE-789',
        comments: [
          {
            key: 'comment-123',
            login: 'test-user',
            htmlText: '<p>Test comment with <strong>markdown</strong> support</p>',
            markdown: 'Test comment with **markdown** support',
            updatable: true,
            createdAt: '2024-01-01T10:00:00+0000',
          },
        ],
      };
      (mockAddComment as MockedFunction<any>).mockResolvedValue({ issue: mockIssueWithComment });
      const result = await domain.addCommentToIssue({
        issueKey: 'ISSUE-789',
        text: 'Test comment with **markdown** support',
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-789',
        text: 'Test comment with **markdown** support',
      });
      expect(result).toEqual({
        key: 'comment-123',
        login: 'test-user',
        htmlText: '<p>Test comment with <strong>markdown</strong> support</p>',
        markdown: 'Test comment with **markdown** support',
        updatable: true,
        createdAt: '2024-01-01T10:00:00+0000',
      });
    });
    it('should handle multiple existing comments and return the latest', async () => {
      const mockIssueWithComments = {
        key: 'ISSUE-789',
        comments: [
          {
            key: 'comment-old',
            login: 'old-user',
            htmlText: '<p>Old comment</p>',
            markdown: 'Old comment',
            updatable: false,
            createdAt: '2024-01-01T09:00:00+0000',
          },
          {
            key: 'comment-new',
            login: 'test-user',
            htmlText: '<p>New comment</p>',
            markdown: 'New comment',
            updatable: true,
            createdAt: '2024-01-01T10:00:00+0000',
          },
        ],
      };
      (mockAddComment as MockedFunction<any>).mockResolvedValue({ issue: mockIssueWithComments });
      const result = await domain.addCommentToIssue({
        issueKey: 'ISSUE-789',
        text: 'New comment',
      });
      expect(result.key).toBe('comment-new');
      expect(result.markdown).toBe('New comment');
    });
    it('should throw error when no comments are returned', async () => {
      const mockIssueWithoutComments = {
        key: 'ISSUE-789',
        comments: [],
      };
      (mockAddComment as MockedFunction<any>).mockResolvedValue({
        issue: mockIssueWithoutComments,
      });
      await expect(
        domain.addCommentToIssue({
          issueKey: 'ISSUE-789',
          text: 'Test comment',
        })
      ).rejects.toThrow('Failed to retrieve the newly added comment');
    });
    it('should throw error when comments is undefined', async () => {
      const mockIssueWithoutComments = {
        key: 'ISSUE-789',
        // comments field is missing
      };
      (mockAddComment as MockedFunction<any>).mockResolvedValue({
        issue: mockIssueWithoutComments,
      });
      await expect(
        domain.addCommentToIssue({
          issueKey: 'ISSUE-789',
          text: 'Test comment',
        })
      ).rejects.toThrow('Failed to retrieve the newly added comment');
    });
    it('should handle API errors', async () => {
      const error = new Error('API Error');
      (mockAddComment as MockedFunction<any>).mockRejectedValue(error);
      await expect(
        domain.addCommentToIssue({
          issueKey: 'ISSUE-789',
          text: 'Test comment',
        })
      ).rejects.toThrow('API Error');
    });
  });
});
describe('Issue Resolution Handlers', () => {
  const mockClient = {
    markIssueFalsePositive: vi.fn() as MockedFunction<any>,
    markIssueWontFix: vi.fn() as MockedFunction<any>,
    markIssuesFalsePositive: vi.fn() as MockedFunction<any>,
    markIssuesWontFix: vi.fn() as MockedFunction<any>,
    addCommentToIssue: vi.fn() as MockedFunction<any>,
  };
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('handleMarkIssueFalsePositive', () => {
    it('should handle marking issue as false positive', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      mockClient.markIssueFalsePositive.mockResolvedValue(mockResponse);
      const result = await handleMarkIssueFalsePositive(
        { issueKey: 'ISSUE-123', comment: 'Test comment' },
        mockClient as any
      );
      expect(mockClient.markIssueFalsePositive).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
        comment: 'Test comment',
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.message).toBe('Issue ISSUE-123 marked as false positive');
      expect(responseData.issue).toEqual(mockResponse.issue);
    });
    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssueFalsePositive.mockRejectedValue(error);
      await expect(
        handleMarkIssueFalsePositive({ issueKey: 'ISSUE-123' }, mockClient as any)
      ).rejects.toThrow('API Error');
    });
  });
  describe('handleMarkIssueWontFix', () => {
    it("should handle marking issue as won't fix", async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-456', status: 'RESOLVED', resolution: 'WONTFIX' },
        components: [],
        rules: [],
        users: [],
      };
      mockClient.markIssueWontFix.mockResolvedValue(mockResponse);
      const result = await handleMarkIssueWontFix(
        { issueKey: 'ISSUE-456', comment: 'Test comment' },
        mockClient as any
      );
      expect(mockClient.markIssueWontFix).toHaveBeenCalledWith({
        issueKey: 'ISSUE-456',
        comment: 'Test comment',
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.message).toBe("Issue ISSUE-456 marked as won't fix");
      expect(responseData.issue).toEqual(mockResponse.issue);
    });
    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssueWontFix.mockRejectedValue(error);
      await expect(
        handleMarkIssueWontFix({ issueKey: 'ISSUE-456' }, mockClient as any)
      ).rejects.toThrow('API Error');
    });
  });
  describe('handleMarkIssuesFalsePositive', () => {
    it('should handle bulk marking issues as false positive', async () => {
      const mockResponses = [
        { issue: { key: 'ISSUE-123' }, components: [], rules: [], users: [] },
        { issue: { key: 'ISSUE-124' }, components: [], rules: [], users: [] },
      ];
      mockClient.markIssuesFalsePositive.mockResolvedValue(mockResponses);
      const result = await handleMarkIssuesFalsePositive(
        { issueKeys: ['ISSUE-123', 'ISSUE-124'], comment: 'Bulk comment' },
        mockClient as any
      );
      expect(mockClient.markIssuesFalsePositive).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-123', 'ISSUE-124'],
        comment: 'Bulk comment',
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.message).toBe('2 issues marked as false positive');
      expect(responseData.results).toHaveLength(2);
    });
    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssuesFalsePositive.mockRejectedValue(error);
      await expect(
        handleMarkIssuesFalsePositive({ issueKeys: ['ISSUE-123'] }, mockClient as any)
      ).rejects.toThrow('API Error');
    });
  });
  describe('handleMarkIssuesWontFix', () => {
    it("should handle bulk marking issues as won't fix", async () => {
      const mockResponses = [
        { issue: { key: 'ISSUE-456' }, components: [], rules: [], users: [] },
        { issue: { key: 'ISSUE-457' }, components: [], rules: [], users: [] },
      ];
      mockClient.markIssuesWontFix.mockResolvedValue(mockResponses);
      const result = await handleMarkIssuesWontFix(
        { issueKeys: ['ISSUE-456', 'ISSUE-457'], comment: 'Bulk comment' },
        mockClient as any
      );
      expect(mockClient.markIssuesWontFix).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-456', 'ISSUE-457'],
        comment: 'Bulk comment',
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.message).toBe("2 issues marked as won't fix");
      expect(responseData.results).toHaveLength(2);
    });
    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssuesWontFix.mockRejectedValue(error);
      await expect(
        handleMarkIssuesWontFix({ issueKeys: ['ISSUE-456'] }, mockClient as any)
      ).rejects.toThrow('API Error');
    });
  });
  describe('handleAddCommentToIssue', () => {
    it('should handle adding a comment to an issue', async () => {
      const mockComment = {
        key: 'comment-123',
        login: 'test-user',
        htmlText: '<p>Test comment with <strong>markdown</strong> support</p>',
        markdown: 'Test comment with **markdown** support',
        updatable: true,
        createdAt: '2024-01-01T10:00:00+0000',
      };
      mockClient.addCommentToIssue.mockResolvedValue(mockComment);
      const result = await handleAddCommentToIssue(
        { issueKey: 'ISSUE-789', text: 'Test comment with **markdown** support' },
        mockClient as any
      );
      expect(mockClient.addCommentToIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-789',
        text: 'Test comment with **markdown** support',
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.message).toBe('Comment added to issue ISSUE-789');
      expect(responseData.comment).toEqual({
        key: 'comment-123',
        login: 'test-user',
        htmlText: '<p>Test comment with <strong>markdown</strong> support</p>',
        markdown: 'Test comment with **markdown** support',
        updatable: true,
        createdAt: '2024-01-01T10:00:00+0000',
      });
    });
    it('should handle plain text comments', async () => {
      const mockComment = {
        key: 'comment-456',
        login: 'test-user',
        htmlText: '<p>Plain text comment</p>',
        markdown: 'Plain text comment',
        updatable: true,
        createdAt: '2024-01-01T11:00:00+0000',
      };
      mockClient.addCommentToIssue.mockResolvedValue(mockComment);
      const result = await handleAddCommentToIssue(
        { issueKey: 'ISSUE-100', text: 'Plain text comment' },
        mockClient as any
      );
      expect(mockClient.addCommentToIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-100',
        text: 'Plain text comment',
      });
      const responseData = JSON.parse(result.content[0]?.text as string);
      expect(responseData.message).toBe('Comment added to issue ISSUE-100');
      expect(responseData.comment.markdown).toBe('Plain text comment');
    });
    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.addCommentToIssue.mockRejectedValue(error);
      await expect(
        handleAddCommentToIssue({ issueKey: 'ISSUE-789', text: 'Test comment' }, mockClient as any)
      ).rejects.toThrow('API Error');
    });
    it('should handle empty text rejection', async () => {
      const error = new Error('Comment text cannot be empty');
      mockClient.addCommentToIssue.mockRejectedValue(error);
      await expect(
        handleAddCommentToIssue({ issueKey: 'ISSUE-789', text: '' }, mockClient as any)
      ).rejects.toThrow('Comment text cannot be empty');
    });
  });
});
