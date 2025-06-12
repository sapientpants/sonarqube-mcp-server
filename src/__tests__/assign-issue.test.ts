import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { IssuesDomain } from '../domains/issues.js';
import { handleAssignIssue } from '../handlers/issues.js';

describe('Assign Issue Functionality', () => {
  const organization = 'test-org';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('IssuesDomain.assignIssue', () => {
    it('should assign an issue and return updated details', async () => {
      const issueKey = 'ISSUE-123';
      const assignee = 'jane.doe';

      const mockSearchBuilder = {
        withIssues: jest.fn().mockReturnThis(),
        withAdditionalFields: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          issues: [
            {
              key: issueKey,
              message: 'Test issue',
              assignee: assignee,
              assigneeName: 'Jane Doe',
              severity: 'CRITICAL',
              type: 'VULNERABILITY',
              status: 'OPEN',
            },
          ],
          total: 1,
        }),
      };

      const mockWebApiClient = {
        issues: {
          assign: jest.fn().mockResolvedValue({}),
          search: jest.fn().mockReturnValue(mockSearchBuilder),
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issuesDomain = new IssuesDomain(mockWebApiClient as any, organization);
      const result = await issuesDomain.assignIssue({
        issueKey,
        assignee,
      });

      expect(mockWebApiClient.issues.assign).toHaveBeenCalledWith({
        issue: issueKey,
        assignee: assignee,
      });

      expect(mockWebApiClient.issues.search).toHaveBeenCalled();
      expect(mockSearchBuilder.withIssues).toHaveBeenCalledWith([issueKey]);
      expect(mockSearchBuilder.withAdditionalFields).toHaveBeenCalledWith(['_all']);
      expect(mockSearchBuilder.execute).toHaveBeenCalled();

      expect(result.key).toBe(issueKey);
      expect(result.assignee).toBe(assignee);
    });

    it('should handle unassignment', async () => {
      const issueKey = 'ISSUE-456';

      const mockSearchBuilder = {
        withIssues: jest.fn().mockReturnThis(),
        withAdditionalFields: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          issues: [
            {
              key: issueKey,
              message: 'Test issue',
              assignee: null,
              assigneeName: null,
              severity: 'INFO',
              type: 'CODE_SMELL',
              status: 'OPEN',
            },
          ],
          total: 1,
        }),
      };

      const mockWebApiClient = {
        issues: {
          assign: jest.fn().mockResolvedValue({}),
          search: jest.fn().mockReturnValue(mockSearchBuilder),
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issuesDomain = new IssuesDomain(mockWebApiClient as any, organization);
      const result = await issuesDomain.assignIssue({
        issueKey,
      });

      expect(mockWebApiClient.issues.assign).toHaveBeenCalledWith({
        issue: issueKey,
        assignee: undefined,
      });

      expect(result.assignee).toBeNull();
    });

    it('should throw error if issue not found after assignment', async () => {
      const issueKey = 'ISSUE-999';

      const mockSearchBuilder = {
        withIssues: jest.fn().mockReturnThis(),
        withAdditionalFields: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          issues: [],
          total: 0,
        }),
      };

      const mockWebApiClient = {
        issues: {
          assign: jest.fn().mockResolvedValue({}),
          search: jest.fn().mockReturnValue(mockSearchBuilder),
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issuesDomain = new IssuesDomain(mockWebApiClient as any, organization);

      await expect(
        issuesDomain.assignIssue({
          issueKey,
        })
      ).rejects.toThrow(`Issue ${issueKey} not found after assignment`);
    });
  });

  describe('handleAssignIssue', () => {
    it('should handle issue assignment and return formatted response', async () => {
      const mockClient = {
        assignIssue: jest.fn().mockResolvedValue({
          key: 'ISSUE-123',
          message: 'Test issue message',
          component: 'src/main.js',
          assignee: 'john.doe',
          assigneeName: 'John Doe',
          severity: 'MAJOR',
          type: 'BUG',
          status: 'OPEN',
          resolution: null,
        }),
      };

      const result = await handleAssignIssue(
        {
          issueKey: 'ISSUE-123',
          assignee: 'john.doe',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any
      );

      expect(mockClient.assignIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
        assignee: 'john.doe',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.message).toContain('Assigned to: John Doe');
      expect(parsedContent.issue.key).toBe('ISSUE-123');
      expect(parsedContent.issue.assignee).toBe('john.doe');
      expect(parsedContent.issue.severity).toBe('MAJOR');
    });

    it('should handle issue unassignment', async () => {
      const mockClient = {
        assignIssue: jest.fn().mockResolvedValue({
          key: 'ISSUE-456',
          message: 'Another test issue',
          component: 'src/utils.js',
          assignee: null,
          assigneeName: null,
          severity: 'MINOR',
          type: 'CODE_SMELL',
          status: 'CONFIRMED',
          resolution: null,
        }),
      };

      const result = await handleAssignIssue(
        {
          issueKey: 'ISSUE-456',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockClient as any
      );

      expect(mockClient.assignIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-456',
        assignee: undefined,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.message).toContain('Issue unassigned');
      expect(parsedContent.issue.key).toBe('ISSUE-456');
      expect(parsedContent.issue.assignee).toBeNull();
      expect(parsedContent.issue.severity).toBe('MINOR');
    });

    it('should handle errors gracefully', async () => {
      const mockClient = {
        assignIssue: jest.fn().mockRejectedValue(new Error('API Error')),
      };

      await expect(
        handleAssignIssue(
          {
            issueKey: 'ISSUE-789',
            assignee: 'invalid.user',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockClient as any
        )
      ).rejects.toThrow('API Error');

      expect(mockClient.assignIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-789',
        assignee: 'invalid.user',
      });
    });
  });
});
