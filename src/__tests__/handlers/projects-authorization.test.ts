import { describe, it, expect, vi, type MockedFunction } from 'vitest';
import { handleSonarQubeProjects } from '../../handlers/projects.js';
import type { ISonarQubeClient } from '../../types/index.js';

describe('Projects Handler Authorization Error', () => {
  // Mock client
  const mockClient: ISonarQubeClient = {
    webApiClient: {} as any,
    listProjects: vi.fn() as any,
    getIssues: vi.fn() as any,
    getMetrics: vi.fn() as any,
    getHealth: vi.fn() as any,
    getStatus: vi.fn() as any,
    ping: vi.fn() as any,
    getComponentMeasures: vi.fn() as any,
    getComponentsMeasures: vi.fn() as any,
    getMeasuresHistory: vi.fn() as any,
    listQualityGates: vi.fn() as any,
    getQualityGate: vi.fn() as any,
    getProjectQualityGateStatus: vi.fn() as any,
    getSourceCode: vi.fn() as any,
    getScmBlame: vi.fn() as any,
    hotspots: vi.fn() as any,
    hotspot: vi.fn() as any,
    updateHotspotStatus: vi.fn() as any,
    markIssueFalsePositive: vi.fn() as any,
    markIssueWontFix: vi.fn() as any,
    markIssuesFalsePositive: vi.fn() as any,
    markIssuesWontFix: vi.fn() as any,
    addCommentToIssue: vi.fn() as any,
    assignIssue: vi.fn() as any,
    confirmIssue: vi.fn() as any,
    unconfirmIssue: vi.fn() as any,
    resolveIssue: vi.fn() as any,
    reopenIssue: vi.fn() as any,
  };

  it('should provide helpful error message when authorization fails', async () => {
    // Mock the listProjects method to throw an authorization error
    const authError = new Error('Insufficient privileges');
    (mockClient.listProjects as MockedFunction<typeof mockClient.listProjects>).mockRejectedValue(
      authError
    );

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should provide helpful error message for error containing "403"', async () => {
    vi.clearAllMocks();
    const authError = new Error('Error 403 Forbidden');
    (mockClient.listProjects as MockedFunction<typeof mockClient.listProjects>).mockRejectedValue(
      authError
    );

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should provide helpful error message for "Insufficient privileges" error', async () => {
    vi.clearAllMocks();
    const authError = new Error('Insufficient privileges');
    (mockClient.listProjects as MockedFunction<typeof mockClient.listProjects>).mockRejectedValue(
      authError
    );

    await expect(handleSonarQubeProjects({}, mockClient)).rejects.toThrow(
      /Note: The 'projects' tool requires admin permissions/
    );
  });

  it('should not modify error message for non-authorization errors', async () => {
    // Mock a different type of error
    const serverError = new Error('Internal server error');
    (mockClient.listProjects as MockedFunction<typeof mockClient.listProjects>).mockRejectedValue(
      serverError
    );

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

    (mockClient.listProjects as MockedFunction<typeof mockClient.listProjects>).mockResolvedValue(
      mockResponse
    );

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
