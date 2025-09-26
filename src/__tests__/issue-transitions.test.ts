import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';
// Mock the web API client
const mockDoTransition = vi.fn() as MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const mockAddComment = vi.fn() as MockedFunction<(...args: unknown[]) => Promise<unknown>>;
vi.mock('sonarqube-web-api-client', () => ({
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
}));
import { IssuesDomain } from '../domains/issues.js';
import {
  handleConfirmIssue,
  handleUnconfirmIssue,
  handleResolveIssue,
  handleReopenIssue,
} from '../handlers/issues.js';
describe('IssuesDomain - Issue Transitions', () => {
  let domain: IssuesDomain;
  const mockWebApiClient = {
    issues: {
      doTransition: mockDoTransition,
      addComment: mockAddComment,
      search: vi.fn(),
    },
  };
  beforeEach(() => {
    domain = new IssuesDomain(mockWebApiClient as any, 'test-org');
    vi.clearAllMocks();
  });
  describe('confirmIssue', () => {
    it('should confirm issue without comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'CONFIRMED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      const result = await domain.confirmIssue({ issueKey: 'ISSUE-123' });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'confirm',
      });
      expect(mockAddComment).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
    it('should confirm issue with comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'CONFIRMED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      (mockAddComment as MockedFunction<any>).mockResolvedValue({});
      const result = await domain.confirmIssue({
        issueKey: 'ISSUE-123',
        comment: 'Confirmed after code review',
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        text: 'Confirmed after code review',
      });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'confirm',
      });
      expect(result).toEqual(mockResponse);
    });
  });
  describe('unconfirmIssue', () => {
    it('should unconfirm issue without comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'REOPENED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      const result = await domain.unconfirmIssue({ issueKey: 'ISSUE-123' });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'unconfirm',
      });
      expect(mockAddComment).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
    it('should unconfirm issue with comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'REOPENED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      (mockAddComment as MockedFunction<any>).mockResolvedValue({});
      const result = await domain.unconfirmIssue({
        issueKey: 'ISSUE-123',
        comment: 'Needs further investigation',
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        text: 'Needs further investigation',
      });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'unconfirm',
      });
      expect(result).toEqual(mockResponse);
    });
  });
  describe('resolveIssue', () => {
    it('should resolve issue without comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FIXED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      const result = await domain.resolveIssue({ issueKey: 'ISSUE-123' });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'resolve',
      });
      expect(mockAddComment).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
    it('should resolve issue with comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FIXED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      (mockAddComment as MockedFunction<any>).mockResolvedValue({});
      const result = await domain.resolveIssue({
        issueKey: 'ISSUE-123',
        comment: 'Fixed in commit abc123',
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        text: 'Fixed in commit abc123',
      });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'resolve',
      });
      expect(result).toEqual(mockResponse);
    });
  });
  describe('reopenIssue', () => {
    it('should reopen issue without comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'REOPENED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      const result = await domain.reopenIssue({ issueKey: 'ISSUE-123' });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'reopen',
      });
      expect(mockAddComment).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
    it('should reopen issue with comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'REOPENED' },
        components: [],
        rules: [],
        users: [],
      };
      (mockDoTransition as MockedFunction<any>).mockResolvedValue(mockResponse);
      (mockAddComment as MockedFunction<any>).mockResolvedValue({});
      const result = await domain.reopenIssue({
        issueKey: 'ISSUE-123',
        comment: 'Issue still occurs in production',
      });
      expect(mockAddComment).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        text: 'Issue still occurs in production',
      });
      expect(mockDoTransition).toHaveBeenCalledWith({
        issue: 'ISSUE-123',
        transition: 'reopen',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
describe('Issue Transition Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('handleConfirmIssue', () => {
    it('should handle confirm issue request successfully', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'CONFIRMED' },
        components: [],
        rules: [],
        users: [],
      };
      const mockClient = {
        confirmIssue: vi.fn<() => Promise<any>>().mockResolvedValue(mockResponse as never),
      };
      const result = await handleConfirmIssue(
        {
          issueKey: 'ISSUE-123',
          comment: 'Confirmed',
        },
        mockClient as any
      );
      expect(mockClient.confirmIssue).toHaveBeenCalled();
      expect(result.content[0]?.type).toBe('text');
      const content = JSON.parse(result.content[0]?.text as string);
      expect(content.message).toBe('Issue ISSUE-123 confirmed');
      expect(content.issue).toEqual(mockResponse.issue);
    });
    it('should handle confirm issue errors', async () => {
      const mockClient = {
        confirmIssue: vi
          .fn<() => Promise<any>>()
          .mockRejectedValue(new Error('Transition not allowed') as never),
      };
      await expect(
        handleConfirmIssue({ issueKey: 'ISSUE-123' }, mockClient as any)
      ).rejects.toThrow('Transition not allowed');
    });
  });
  describe('handleUnconfirmIssue', () => {
    it('should handle unconfirm issue request successfully', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'REOPENED' },
        components: [],
        rules: [],
        users: [],
      };
      const mockClient = {
        unconfirmIssue: vi.fn<() => Promise<any>>().mockResolvedValue(mockResponse as never),
      };
      const result = await handleUnconfirmIssue(
        {
          issueKey: 'ISSUE-123',
        },
        mockClient as any
      );
      expect(mockClient.unconfirmIssue).toHaveBeenCalled();
      expect(result.content[0]?.type).toBe('text');
      const content = JSON.parse(result.content[0]?.text as string);
      expect(content.message).toBe('Issue ISSUE-123 unconfirmed');
      expect(content.issue).toEqual(mockResponse.issue);
    });
    it('should handle unconfirm issue errors', async () => {
      const mockClient = {
        unconfirmIssue: vi
          .fn<() => Promise<any>>()
          .mockRejectedValue(new Error('Transition not allowed') as never),
      };
      await expect(
        handleUnconfirmIssue({ issueKey: 'ISSUE-123' }, mockClient as any)
      ).rejects.toThrow('Transition not allowed');
    });
  });
  describe('handleResolveIssue', () => {
    it('should handle resolve issue request successfully', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FIXED' },
        components: [],
        rules: [],
        users: [],
      };
      const mockClient = {
        resolveIssue: vi.fn<() => Promise<any>>().mockResolvedValue(mockResponse as never),
      };
      const result = await handleResolveIssue(
        {
          issueKey: 'ISSUE-123',
          comment: 'Fixed',
        },
        mockClient as any
      );
      expect(mockClient.resolveIssue).toHaveBeenCalled();
      expect(result.content[0]?.type).toBe('text');
      const content = JSON.parse(result.content[0]?.text as string);
      expect(content.message).toBe('Issue ISSUE-123 resolved');
      expect(content.issue).toEqual(mockResponse.issue);
    });
    it('should handle resolve issue errors', async () => {
      const mockClient = {
        resolveIssue: vi
          .fn<() => Promise<any>>()
          .mockRejectedValue(new Error('Transition not allowed') as never),
      };
      await expect(
        handleResolveIssue({ issueKey: 'ISSUE-123' }, mockClient as any)
      ).rejects.toThrow('Transition not allowed');
    });
  });
  describe('handleReopenIssue', () => {
    it('should handle reopen issue request successfully', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'REOPENED' },
        components: [],
        rules: [],
        users: [],
      };
      const mockClient = {
        reopenIssue: vi.fn<() => Promise<any>>().mockResolvedValue(mockResponse as never),
      };
      const result = await handleReopenIssue(
        {
          issueKey: 'ISSUE-123',
        },
        mockClient as any
      );
      expect(mockClient.reopenIssue).toHaveBeenCalled();
      expect(result.content[0]?.type).toBe('text');
      const content = JSON.parse(result.content[0]?.text as string);
      expect(content.message).toBe('Issue ISSUE-123 reopened');
      expect(content.issue).toEqual(mockResponse.issue);
    });
    it('should handle reopen issue errors', async () => {
      const mockClient = {
        reopenIssue: vi
          .fn<() => Promise<any>>()
          .mockRejectedValue(new Error('Transition not allowed') as never),
      };
      await expect(handleReopenIssue({ issueKey: 'ISSUE-123' }, mockClient as any)).rejects.toThrow(
        'Transition not allowed'
      );
    });
  });
});
