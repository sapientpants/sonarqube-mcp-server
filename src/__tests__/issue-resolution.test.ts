/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Mock the web API client
const mockDoTransition = jest.fn();
const mockAddComment = jest.fn();

jest.mock('sonarqube-web-api-client', () => ({
  SonarQubeClient: {
    withToken: jest.fn().mockReturnValue({
      issues: {
        doTransition: mockDoTransition,
        addComment: mockAddComment,
        search: jest.fn().mockReturnValue({
          execute: jest.fn().mockResolvedValue({
            issues: [],
            components: [],
            rules: [],
            paging: { pageIndex: 1, pageSize: 10, total: 0 },
          }),
        }),
      },
    }),
  },
}));

import { IssuesDomain } from '../domains/issues.js';
import {
  handleMarkIssueFalsePositive,
  handleMarkIssueWontFix,
  handleMarkIssuesFalsePositive,
  handleMarkIssuesWontFix,
} from '../handlers/issues.js';

describe('IssuesDomain - Issue Resolution', () => {
  let domain: IssuesDomain;
  const mockWebApiClient = {
    issues: {
      doTransition: mockDoTransition,
      addComment: mockAddComment,
      search: jest.fn(),
    },
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    domain = new IssuesDomain(mockWebApiClient as any, 'test-org');
    jest.clearAllMocks();
  });

  describe('markIssueFalsePositive', () => {
    it('should mark issue as false positive without comment', async () => {
      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      mockDoTransition.mockResolvedValue(mockResponse);

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
      mockDoTransition.mockResolvedValue(mockResponse);
      mockAddComment.mockResolvedValue({});

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
      mockDoTransition.mockRejectedValue(error);

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
      mockDoTransition.mockResolvedValue(mockResponse);

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
      mockDoTransition.mockResolvedValue(mockResponse);
      mockAddComment.mockResolvedValue({});

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
});

describe('Issue Resolution Handlers', () => {
  const mockClient = {
    markIssueFalsePositive: jest.fn(),
    markIssueWontFix: jest.fn(),
    markIssuesFalsePositive: jest.fn(),
    markIssuesWontFix: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any
      );

      expect(mockClient.markIssueFalsePositive).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
        comment: 'Test comment',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Issue ISSUE-123 marked as false positive');
      expect(responseData.issue).toEqual(mockResponse.issue);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssueFalsePositive.mockRejectedValue(error);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any
      );

      expect(mockClient.markIssueWontFix).toHaveBeenCalledWith({
        issueKey: 'ISSUE-456',
        comment: 'Test comment',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe("Issue ISSUE-456 marked as won't fix");
      expect(responseData.issue).toEqual(mockResponse.issue);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssueWontFix.mockRejectedValue(error);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any
      );

      expect(mockClient.markIssuesFalsePositive).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-123', 'ISSUE-124'],
        comment: 'Bulk comment',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('2 issues marked as false positive');
      expect(responseData.results).toHaveLength(2);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssuesFalsePositive.mockRejectedValue(error);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any
      );

      expect(mockClient.markIssuesWontFix).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-456', 'ISSUE-457'],
        comment: 'Bulk comment',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe("2 issues marked as won't fix");
      expect(responseData.results).toHaveLength(2);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockClient.markIssuesWontFix.mockRejectedValue(error);

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleMarkIssuesWontFix({ issueKeys: ['ISSUE-456'] }, mockClient as any)
      ).rejects.toThrow('API Error');
    });
  });
});
