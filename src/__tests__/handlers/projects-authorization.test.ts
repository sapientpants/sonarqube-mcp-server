import { describe, it, expect, jest } from '@jest/globals';
import { handleSonarQubeProjects } from '../../handlers/projects';
import type { ISonarQubeClient } from '../../types/index.js';

describe('Projects Handler Authorization Error', () => {
  // Mock client
  const mockClient: ISonarQubeClient = {
    listProjects: jest.fn(),
    getIssues: jest.fn(),
    getMetrics: jest.fn(),
    getHealth: jest.fn(),
    getStatus: jest.fn(),
    ping: jest.fn(),
    getComponentMeasures: jest.fn(),
    getComponentsMeasures: jest.fn(),
    getMeasuresHistory: jest.fn(),
    listQualityGates: jest.fn(),
    getQualityGate: jest.fn(),
    getQualityGateStatus: jest.fn(),
    getSourceCode: jest.fn(),
    getScmBlame: jest.fn(),
    searchHotspots: jest.fn(),
    getHotspot: jest.fn(),
    updateHotspotStatus: jest.fn(),
    markIssueAsFalsePositive: jest.fn(),
    markIssueAsWontFix: jest.fn(),
    bulkMarkIssuesAsFalsePositive: jest.fn(),
    bulkMarkIssuesAsWontFix: jest.fn(),
    addCommentToIssue: jest.fn(),
    assignIssue: jest.fn(),
    confirmIssue: jest.fn(),
    unconfirmIssue: jest.fn(),
    resolveIssue: jest.fn(),
    reopenIssue: jest.fn(),
    searchComponents: jest.fn(),
  } as ISonarQubeClient;

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
    const data = JSON.parse(result.content[0].text);

    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].key).toBe('test-project');
  });
});
