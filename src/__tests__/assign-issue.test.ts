import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IssuesDomain } from '../domains/issues.js';
import { handleAssignIssue } from '../handlers/issues.js';
import type { SonarQubeIssue } from '../types/issues.js';

// Extended issue type for testing with assignee fields
type SonarQubeIssueWithAssignee = SonarQubeIssue & {
  assignee?: string | null;
  assigneeName?: string | null;
  resolution?: string | null;
};

describe('Assign Issue Functionality', () => {
  const organization = 'test-org';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IssuesDomain.assignIssue', () => {
    it('should assign an issue and return updated details', async () => {
      const issueKey = 'ISSUE-123';
      const assignee = 'jane.doe';

      const mockSearchBuilder = {
        withIssues: vi.fn().mockReturnThis(),
        withAdditionalFields: vi.fn().mockReturnThis(),
        execute: vi.fn<() => Promise<any>>().mockResolvedValue({
          issues: [
            {
              key: issueKey,
              rule: 'test-rule',
              component: 'test-component',
              project: 'test-project',
              message: 'Test issue',
              assignee: assignee,
              assigneeName: 'Jane Doe',
              severity: 'CRITICAL',
              type: 'VULNERABILITY',
              status: 'OPEN',
              tags: [],
              creationDate: '2023-01-01T00:00:00.000Z',
              updateDate: '2023-01-01T00:00:00.000Z',
            } as unknown as SonarQubeIssueWithAssignee,
          ],
          total: 1,
        }),
      };

      const mockWebApiClient = {
        issues: {
          assign: vi.fn<(params: any) => Promise<any>>().mockResolvedValue({}),
          search: vi.fn().mockReturnValue(mockSearchBuilder),
        },
      };

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
      expect((result as SonarQubeIssueWithAssignee).assignee).toBe(assignee);
    });

    it('should handle unassignment', async () => {
      const issueKey = 'ISSUE-456';

      const mockSearchBuilder = {
        withIssues: vi.fn().mockReturnThis(),
        withAdditionalFields: vi.fn().mockReturnThis(),
        execute: vi.fn<() => Promise<any>>().mockResolvedValue({
          issues: [
            {
              key: issueKey,
              rule: 'test-rule',
              component: 'test-component',
              project: 'test-project',
              message: 'Test issue',
              assignee: undefined,
              assigneeName: null,
              severity: 'INFO',
              type: 'CODE_SMELL',
              status: 'OPEN',
              tags: [],
              creationDate: '2023-01-01T00:00:00.000Z',
              updateDate: '2023-01-01T00:00:00.000Z',
            } as unknown as SonarQubeIssueWithAssignee,
          ],
          total: 1,
        }),
      };

      const mockWebApiClient = {
        issues: {
          assign: vi.fn<(params: any) => Promise<any>>().mockResolvedValue({}),
          search: vi.fn().mockReturnValue(mockSearchBuilder),
        },
      };

      const issuesDomain = new IssuesDomain(mockWebApiClient as any, organization);
      const result = await issuesDomain.assignIssue({
        issueKey,
      });

      expect(mockWebApiClient.issues.assign).toHaveBeenCalledWith({
        issue: issueKey,
        assignee: undefined,
      });

      expect((result as SonarQubeIssueWithAssignee).assignee).toBeNull();
    });

    it('should throw error if issue not found after assignment', async () => {
      const issueKey = 'ISSUE-999';

      const mockSearchBuilder = {
        withIssues: vi.fn().mockReturnThis(),
        withAdditionalFields: vi.fn().mockReturnThis(),
        execute: vi.fn<() => Promise<any>>().mockResolvedValue({
          issues: [],
          total: 0,
        }),
      };

      const mockWebApiClient = {
        issues: {
          assign: vi.fn<(params: any) => Promise<any>>().mockResolvedValue({}),
          search: vi.fn().mockReturnValue(mockSearchBuilder),
        },
      };

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
        assignIssue: vi.fn<(params: any) => Promise<any>>().mockResolvedValue({
          key: 'ISSUE-123',
          rule: 'test-rule',
          component: 'src/main.js',
          project: 'test-project',
          message: 'Test issue message',
          assignee: 'john.doe',
          assigneeName: 'John Doe',
          severity: 'MAJOR',
          type: 'BUG',
          status: 'OPEN',
          resolution: null,
          tags: [],
          creationDate: '2023-01-01T00:00:00.000Z',
          updateDate: '2023-01-01T00:00:00.000Z',
        } as unknown as SonarQubeIssueWithAssignee),
      };

      const result = await handleAssignIssue(
        {
          issueKey: 'ISSUE-123',
          assignee: 'john.doe',
        },

        mockClient as any
      );

      expect(mockClient.assignIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
        assignee: 'john.doe',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const contentText = result.content[0]?.text;
      expect(contentText).toBeDefined();
      const parsedContent = JSON.parse(contentText as string) as {
        message: string;
        issue: {
          key: string;
          assignee: string | null;
          severity: string;
        };
      };
      expect(parsedContent.message).toContain('Assigned to: John Doe');
      expect(parsedContent.issue.key).toBe('ISSUE-123');
      expect(parsedContent.issue.assignee).toBe('john.doe');
      expect(parsedContent.issue.severity).toBe('MAJOR');
    });

    it('should handle issue unassignment', async () => {
      const mockClient = {
        assignIssue: vi.fn<(params: any) => Promise<any>>().mockResolvedValue({
          key: 'ISSUE-456',
          rule: 'test-rule',
          component: 'src/utils.js',
          project: 'test-project',
          message: 'Another test issue',
          assignee: undefined,
          assigneeName: null,
          severity: 'MINOR',
          type: 'CODE_SMELL',
          status: 'CONFIRMED',
          resolution: null,
          tags: [],
          creationDate: '2023-01-01T00:00:00.000Z',
          updateDate: '2023-01-01T00:00:00.000Z',
        } as unknown as SonarQubeIssueWithAssignee),
      };

      const result = await handleAssignIssue(
        {
          issueKey: 'ISSUE-456',
        },

        mockClient as any
      );

      expect(mockClient.assignIssue).toHaveBeenCalledWith({
        issueKey: 'ISSUE-456',
        assignee: undefined,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');

      const contentText = result.content[0]?.text;
      expect(contentText).toBeDefined();
      const parsedContent = JSON.parse(contentText as string) as {
        message: string;
        issue: {
          key: string;
          assignee: string | null;
          severity: string;
        };
      };
      expect(parsedContent.message).toContain('Issue unassigned');
      expect(parsedContent.issue.key).toBe('ISSUE-456');
      expect(parsedContent.issue.assignee).toBeNull();
      expect(parsedContent.issue.severity).toBe('MINOR');
    });

    it('should handle errors gracefully', async () => {
      const mockClient = {
        assignIssue: vi
          .fn<(params: any) => Promise<any>>()
          .mockRejectedValue(new Error('API Error')),
      };

      await expect(
        handleAssignIssue(
          {
            issueKey: 'ISSUE-789',
            assignee: 'invalid.user',
          },

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
