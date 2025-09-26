import { describe, it, expect, jest } from '@jest/globals';
import { handleSonarQubeProjects } from '../../handlers/projects.js';
import type { ISonarQubeClient } from '../../types/index.js';

describe('Projects Handler Authorization Error', () => {
  // Mock client
  const mockClient: ISonarQubeClient = {
    webApiClient: {} as any,
    listProjects: jest.fn() as any,
    getIssues: jest.fn() as any,
    getMetrics: jest.fn() as any,
    getHealth: jest.fn() as any,
    getStatus: jest.fn() as any,
    ping: jest.fn() as any,
    getComponentMeasures: jest.fn() as any,
    getComponentsMeasures: jest.fn() as any,
    getMeasuresHistory: jest.fn() as any,
    listQualityGates: jest.fn() as any,
    getQualityGate: jest.fn() as any,
    getProjectQualityGateStatus: jest.fn() as any,
    getSourceCode: jest.fn() as any,
    getScmBlame: jest.fn() as any,
    hotspots: jest.fn() as any,
    hotspot: jest.fn() as any,
    updateHotspotStatus: jest.fn() as any,
    markIssueFalsePositive: jest.fn() as any,
    markIssueWontFix: jest.fn() as any,
    markIssuesFalsePositive: jest.fn() as any,
    markIssuesWontFix: jest.fn() as any,
    addCommentToIssue: jest.fn() as any,
    assignIssue: jest.fn() as any,
    confirmIssue: jest.fn() as any,
    unconfirmIssue: jest.fn() as any,
    resolveIssue: jest.fn() as any,
    reopenIssue: jest.fn() as any,
  };

  it('should provide helpful error message when authorization fails', async () => {
    // Mock the listProjects method to throw an authorization error
    const authError = new Error('Insufficient privileges');
    (
      mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
    ).mockRejectedValue(authError);

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should provide helpful error message for error containing "403"', async () => {
    jest.clearAllMocks();
    const authError = new Error('Error 403 Forbidden');
    (
      mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
    ).mockRejectedValue(authError);

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should provide helpful error message for "Insufficient privileges" error', async () => {
    jest.clearAllMocks();
    const authError = new Error('Insufficient privileges');
    (
      mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
    ).mockRejectedValue(authError);

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should not modify error message for non-authorization errors', async () => {
    // Mock a different type of error
    const serverError = new Error('Internal server error');
    (
      mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
    ).mockRejectedValue(serverError);

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow('Internal server error');
    await expect(handleSonarQubeProjects({}, mockClient)).rejects.not.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should handle successful response without error', async () => {
    const mockResponse = {
      projects: [
        {
          key: 'test-project',
          name: 'Test Project',
          qualifier: 'TRK',
          visibility: 'public',
          lastAnalysisDate: '2023-01-01',
          revision: 'abc123',
          managed: false,
        },
      ],
      paging: {
        pageIndex: 1,
        pageSize: 10,
        total: 1,
      },
    };

    (
      mockClient.listProjects as jest.MockedFunction<typeof mockClient.listProjects>
    ).mockResolvedValue(mockResponse);

    const result = await handleSonarQubeProjects({}, mockClient);
    const firstContent = result.content[0]!;
    if ('text' in firstContent && typeof firstContent.text === 'string') {
      const data = JSON.parse(firstContent.text);
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].key).toBe('test-project');
    } else {
      throw new Error('Expected text content');
    }
  });
});
