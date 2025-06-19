/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  handleMarkIssueFalsePositive,
  handleMarkIssueWontFix,
  handleMarkIssuesFalsePositive,
  handleMarkIssuesWontFix,
  setElicitationManager,
} from '../handlers/issues.js';
import { ElicitationManager } from '../utils/elicitation.js';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

describe('Issue Resolution with Elicitation', () => {
  let mockElicitationManager: jest.Mocked<ElicitationManager>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock elicitation manager
    mockElicitationManager = {
      isEnabled: jest.fn(),
      collectResolutionComment: jest.fn(),
      confirmBulkOperation: jest.fn(),
      setServer: jest.fn(),
      getOptions: jest.fn(),
      updateOptions: jest.fn(),
      collectAuthentication: jest.fn(),
      disambiguateSelection: jest.fn(),
    } as unknown as jest.Mocked<ElicitationManager>;

    // Set the mock manager
    setElicitationManager(mockElicitationManager);

    // Create mock client
    mockClient = {
      markIssueFalsePositive: jest.fn(),
      markIssueWontFix: jest.fn(),
      markIssuesFalsePositive: jest.fn(),
      markIssuesWontFix: jest.fn(),
    };
  });

  describe('handleMarkIssueFalsePositive with elicitation', () => {
    it('should collect comment via elicitation when enabled and no comment provided', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectResolutionComment.mockResolvedValue({
        action: 'accept',
        content: { comment: 'Elicited comment for false positive' },
      });

      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      mockClient.markIssueFalsePositive.mockResolvedValue(mockResponse);

      const result = await handleMarkIssueFalsePositive({ issueKey: 'ISSUE-123' }, mockClient);

      expect(mockElicitationManager.isEnabled).toHaveBeenCalled();
      expect(mockElicitationManager.collectResolutionComment).toHaveBeenCalledWith(
        'ISSUE-123',
        'false positive'
      );
      expect(mockClient.markIssueFalsePositive).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
        comment: 'Elicited comment for false positive',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Issue ISSUE-123 marked as false positive');
    });

    it('should not collect comment when elicitation is disabled', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(false);

      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      mockClient.markIssueFalsePositive.mockResolvedValue(mockResponse);

      await handleMarkIssueFalsePositive({ issueKey: 'ISSUE-123' }, mockClient);

      expect(mockElicitationManager.collectResolutionComment).not.toHaveBeenCalled();
      expect(mockClient.markIssueFalsePositive).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
      });
    });

    it('should not collect comment when comment already provided', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);

      const mockResponse = {
        issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FALSE-POSITIVE' },
        components: [],
        rules: [],
        users: [],
      };
      mockClient.markIssueFalsePositive.mockResolvedValue(mockResponse);

      await handleMarkIssueFalsePositive(
        { issueKey: 'ISSUE-123', comment: 'Existing comment' },
        mockClient
      );

      expect(mockElicitationManager.collectResolutionComment).not.toHaveBeenCalled();
      expect(mockClient.markIssueFalsePositive).toHaveBeenCalledWith({
        issueKey: 'ISSUE-123',
        comment: 'Existing comment',
      });
    });

    it('should handle elicitation cancellation', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectResolutionComment.mockResolvedValue({
        action: 'cancel',
      });

      const result = await handleMarkIssueFalsePositive({ issueKey: 'ISSUE-123' }, mockClient);

      expect(mockElicitationManager.collectResolutionComment).toHaveBeenCalled();
      expect(mockClient.markIssueFalsePositive).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Operation cancelled by user');
      expect(responseData.issueKey).toBe('ISSUE-123');
    });

    it('should handle elicitation rejection', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectResolutionComment.mockResolvedValue({
        action: 'reject',
      });

      const result = await handleMarkIssueFalsePositive({ issueKey: 'ISSUE-123' }, mockClient);

      expect(mockElicitationManager.collectResolutionComment).toHaveBeenCalled();
      expect(mockClient.markIssueFalsePositive).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Operation cancelled by user');
    });
  });

  describe('handleMarkIssueWontFix with elicitation', () => {
    it('should collect comment via elicitation when enabled and no comment provided', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectResolutionComment.mockResolvedValue({
        action: 'accept',
        content: { comment: "Elicited comment for won't fix" },
      });

      const mockResponse = {
        issue: { key: 'ISSUE-456', status: 'RESOLVED', resolution: 'WONTFIX' },
        components: [],
        rules: [],
        users: [],
      };
      mockClient.markIssueWontFix.mockResolvedValue(mockResponse);

      const result = await handleMarkIssueWontFix({ issueKey: 'ISSUE-456' }, mockClient);

      expect(mockElicitationManager.isEnabled).toHaveBeenCalled();
      expect(mockElicitationManager.collectResolutionComment).toHaveBeenCalledWith(
        'ISSUE-456',
        "won't fix"
      );
      expect(mockClient.markIssueWontFix).toHaveBeenCalledWith({
        issueKey: 'ISSUE-456',
        comment: "Elicited comment for won't fix",
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe("Issue ISSUE-456 marked as won't fix");
    });

    it('should handle elicitation cancellation', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectResolutionComment.mockResolvedValue({
        action: 'cancel',
      });

      const result = await handleMarkIssueWontFix({ issueKey: 'ISSUE-456' }, mockClient);

      expect(mockElicitationManager.collectResolutionComment).toHaveBeenCalled();
      expect(mockClient.markIssueWontFix).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Operation cancelled by user');
      expect(responseData.issueKey).toBe('ISSUE-456');
    });
  });

  describe('handleMarkIssuesFalsePositive with elicitation', () => {
    it('should request confirmation for bulk operations when enabled', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'accept',
        content: { confirm: true, comment: 'Bulk operation comment' },
      });

      const mockResponses = [
        { issue: { key: 'ISSUE-123' }, components: [], rules: [], users: [] },
        { issue: { key: 'ISSUE-124' }, components: [], rules: [], users: [] },
      ];
      mockClient.markIssuesFalsePositive.mockResolvedValue(mockResponses);

      const result = await handleMarkIssuesFalsePositive(
        { issueKeys: ['ISSUE-123', 'ISSUE-124'] },
        mockClient
      );

      expect(mockElicitationManager.isEnabled).toHaveBeenCalled();
      expect(mockElicitationManager.confirmBulkOperation).toHaveBeenCalledWith(
        'mark as false positive',
        2,
        ['ISSUE-123', 'ISSUE-124']
      );
      expect(mockClient.markIssuesFalsePositive).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-123', 'ISSUE-124'],
        comment: 'Bulk operation comment',
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('2 issues marked as false positive');
    });

    it('should not request confirmation when elicitation is disabled', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(false);

      const mockResponses = [
        { issue: { key: 'ISSUE-123' }, components: [], rules: [], users: [] },
        { issue: { key: 'ISSUE-124' }, components: [], rules: [], users: [] },
      ];
      mockClient.markIssuesFalsePositive.mockResolvedValue(mockResponses);

      await handleMarkIssuesFalsePositive({ issueKeys: ['ISSUE-123', 'ISSUE-124'] }, mockClient);

      expect(mockElicitationManager.confirmBulkOperation).not.toHaveBeenCalled();
      expect(mockClient.markIssuesFalsePositive).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-123', 'ISSUE-124'],
      });
    });

    it('should handle bulk operation rejection', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'reject',
      });

      const result = await handleMarkIssuesFalsePositive(
        { issueKeys: ['ISSUE-123', 'ISSUE-124'] },
        mockClient
      );

      expect(mockElicitationManager.confirmBulkOperation).toHaveBeenCalled();
      expect(mockClient.markIssuesFalsePositive).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Bulk operation cancelled by user');
      expect(responseData.issueCount).toBe(2);
    });

    it('should handle bulk operation cancellation', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'cancel',
      });

      const result = await handleMarkIssuesFalsePositive(
        { issueKeys: ['ISSUE-123', 'ISSUE-124'] },
        mockClient
      );

      expect(mockElicitationManager.confirmBulkOperation).toHaveBeenCalled();
      expect(mockClient.markIssuesFalsePositive).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Bulk operation cancelled by user');
      expect(responseData.issueCount).toBe(2);
    });

    it('should not override existing comment with elicited comment', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'accept',
        content: { confirm: true, comment: 'Elicited comment' },
      });

      const mockResponses = [{ issue: { key: 'ISSUE-123' }, components: [], rules: [], users: [] }];
      mockClient.markIssuesFalsePositive.mockResolvedValue(mockResponses);

      await handleMarkIssuesFalsePositive(
        { issueKeys: ['ISSUE-123'], comment: 'Existing comment' },
        mockClient
      );

      expect(mockClient.markIssuesFalsePositive).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-123'],
        comment: 'Existing comment', // Should keep existing comment
      });
    });
  });

  describe('handleMarkIssuesWontFix with elicitation', () => {
    it('should request confirmation for bulk operations when enabled', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'accept',
        content: { confirm: true, comment: "Bulk won't fix comment" },
      });

      const mockResponses = [
        { issue: { key: 'ISSUE-456' }, components: [], rules: [], users: [] },
        { issue: { key: 'ISSUE-457' }, components: [], rules: [], users: [] },
      ];
      mockClient.markIssuesWontFix.mockResolvedValue(mockResponses);

      const result = await handleMarkIssuesWontFix(
        { issueKeys: ['ISSUE-456', 'ISSUE-457'] },
        mockClient
      );

      expect(mockElicitationManager.isEnabled).toHaveBeenCalled();
      expect(mockElicitationManager.confirmBulkOperation).toHaveBeenCalledWith(
        "mark as won't fix",
        2,
        ['ISSUE-456', 'ISSUE-457']
      );
      expect(mockClient.markIssuesWontFix).toHaveBeenCalledWith({
        issueKeys: ['ISSUE-456', 'ISSUE-457'],
        comment: "Bulk won't fix comment",
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe("2 issues marked as won't fix");
    });

    it('should handle bulk operation rejection', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'reject',
      });

      const result = await handleMarkIssuesWontFix(
        { issueKeys: ['ISSUE-456', 'ISSUE-457'] },
        mockClient
      );

      expect(mockElicitationManager.confirmBulkOperation).toHaveBeenCalled();
      expect(mockClient.markIssuesWontFix).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Bulk operation cancelled by user');
      expect(responseData.issueCount).toBe(2);
    });

    it('should handle bulk operation cancellation', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.confirmBulkOperation.mockResolvedValue({
        action: 'cancel',
      });

      const result = await handleMarkIssuesWontFix(
        { issueKeys: ['ISSUE-456', 'ISSUE-457'] },
        mockClient
      );

      expect(mockElicitationManager.confirmBulkOperation).toHaveBeenCalled();
      expect(mockClient.markIssuesWontFix).not.toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.message).toBe('Bulk operation cancelled by user');
      expect(responseData.issueCount).toBe(2);
    });
  });
});
