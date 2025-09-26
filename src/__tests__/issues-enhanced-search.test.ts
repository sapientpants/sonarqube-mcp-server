import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
// Note: SearchIssuesRequestBuilderInterface is used as type from sonarqube-web-api-client
type SearchIssuesRequestBuilderInterface = any;
// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';
// Mock search builder
const mockSearchBuilder = {
  withProjects: vi.fn().mockReturnThis(),
  withComponents: vi.fn().mockReturnThis(),
  onComponentOnly: vi.fn().mockReturnThis(),
  withSeverities: vi.fn().mockReturnThis(),
  withStatuses: vi.fn().mockReturnThis(),
  withTags: vi.fn().mockReturnThis(),
  assignedToAny: vi.fn().mockReturnThis(),
  onlyAssigned: vi.fn().mockReturnThis(),
  onlyUnassigned: vi.fn().mockReturnThis(),
  byAuthor: vi.fn().mockReturnThis(),
  byAuthors: vi.fn().mockReturnThis(),
  withFacets: vi.fn().mockReturnThis(),
  withFacetMode: vi.fn().mockReturnThis(),
  page: vi.fn().mockReturnThis(),
  pageSize: vi.fn().mockReturnThis(),
  execute: vi.fn(),
} as unknown as SearchIssuesRequestBuilderInterface;
// Mock the web API client
vi.mock('sonarqube-web-api-client', () => ({
  SonarQubeClient: {
    withToken: vi.fn().mockReturnValue({
      issues: {
        search: vi.fn().mockReturnValue(mockSearchBuilder),
      },
    }),
  },
}));
import { IssuesDomain } from '../domains/issues.js';
import { handleSonarQubeGetIssues } from '../handlers/issues.js';
import type { IssuesParams, ISonarQubeClient } from '../types/index.js';
// Note: IWebApiClient is mapped to ISonarQubeClient
// type IWebApiClient = ISonarQubeClient;
describe('Enhanced Issues Search', () => {
  let domain: IssuesDomain;
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation for execute
    (mockSearchBuilder.execute as Mock<() => Promise<any>>).mockResolvedValue({
      issues: [
        {
          key: 'issue-1',
          rule: 'java:S1234',
          severity: 'CRITICAL',
          component: 'src/main/java/com/example/Service.java',
          message: 'Security vulnerability',
          status: 'OPEN',
          tags: ['security', 'vulnerability'],
          author: 'developer@example.com',
          assignee: 'john.doe@example.com',
        },
      ],
      components: [],
      rules: [],
      users: [],
      facets: [
        {
          property: 'severities',
          values: [
            { val: 'CRITICAL', count: 5 },
            { val: 'MAJOR', count: 10 },
          ],
        },
        {
          property: 'tags',
          values: [
            { val: 'security', count: 8 },
            { val: 'performance', count: 3 },
          ],
        },
      ],
      paging: { pageIndex: 1, pageSize: 10, total: 1 },
    } as never);
    // Create domain instance
    const mockWebApiClient = {
      issues: {
        search: vi.fn().mockReturnValue(mockSearchBuilder),
      },
    };
    domain = new IssuesDomain(mockWebApiClient as any, null);
  });
  describe('File Path Filtering', () => {
    it('should filter issues by component keys (file paths)', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        componentKeys: [
          'src/main/java/com/example/Service.java',
          'src/main/java/com/example/Controller.java',
        ],
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith([
        'src/main/java/com/example/Service.java',
        'src/main/java/com/example/Controller.java',
      ]);
    });
    it('should support filtering by directories', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        componentKeys: ['src/main/java/com/example/'],
        onComponentOnly: false,
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith(['src/main/java/com/example/']);
      expect(mockSearchBuilder.onComponentOnly).not.toHaveBeenCalled();
    });
    it('should filter on component level only when specified', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        componentKeys: ['src/main/java/com/example/'],
        onComponentOnly: true,
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith(['src/main/java/com/example/']);
      expect(mockSearchBuilder.onComponentOnly).toHaveBeenCalled();
    });
  });
  describe('Assignee Filtering', () => {
    it('should filter issues by single assignee', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        assignees: ['john.doe@example.com'],
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.assignedToAny).toHaveBeenCalledWith(['john.doe@example.com']);
    });
    it('should filter issues by multiple assignees', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        assignees: ['john.doe@example.com', 'jane.smith@example.com'],
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.assignedToAny).toHaveBeenCalledWith([
        'john.doe@example.com',
        'jane.smith@example.com',
      ]);
    });
    it('should filter unassigned issues', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        assigned: false,
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.onlyUnassigned).toHaveBeenCalled();
    });
  });
  describe('Tag Filtering', () => {
    it('should filter issues by tags', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        tags: ['security', 'performance'],
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withTags).toHaveBeenCalledWith(['security', 'performance']);
    });
  });
  describe('Dashboard Use Cases', () => {
    it('should support faceted search for dashboard aggregations', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        facets: ['severities', 'types', 'tags', 'assignees'],
        facetMode: 'count',
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withFacets).toHaveBeenCalledWith([
        'severities',
        'types',
        'tags',
        'assignees',
      ]);
      expect(mockSearchBuilder.withFacetMode).toHaveBeenCalledWith('count');
    });
    it('should support effort-based facets for workload analysis', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        facets: ['assignees', 'tags'],
        facetMode: 'effort',
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withFacets).toHaveBeenCalledWith(['assignees', 'tags']);
      expect(mockSearchBuilder.withFacetMode).toHaveBeenCalledWith('effort');
    });
  });
  describe('Security Audit Use Cases', () => {
    it('should filter for security audits', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        tags: ['security', 'vulnerability'],
        severities: ['CRITICAL', 'BLOCKER'],
        statuses: ['OPEN', 'REOPENED'],
        componentKeys: ['src/main/java/com/example/auth/', 'src/main/java/com/example/security/'],
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withTags).toHaveBeenCalledWith(['security', 'vulnerability']);
      expect(mockSearchBuilder.withSeverities).toHaveBeenCalledWith(['CRITICAL', 'BLOCKER']);
      expect(mockSearchBuilder.withStatuses).toHaveBeenCalledWith(['OPEN', 'REOPENED']);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith([
        'src/main/java/com/example/auth/',
        'src/main/java/com/example/security/',
      ]);
    });
  });
  describe('Targeted Clean-up Sprint Use Cases', () => {
    it('should filter for assignee-based sprint planning', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        assignees: ['john.doe@example.com', 'jane.smith@example.com'],
        statuses: ['OPEN', 'CONFIRMED'],
        facets: ['severities', 'types'],
        page: undefined,
        pageSize: undefined,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.assignedToAny).toHaveBeenCalledWith([
        'john.doe@example.com',
        'jane.smith@example.com',
      ]);
      expect(mockSearchBuilder.withStatuses).toHaveBeenCalledWith(['OPEN', 'CONFIRMED']);
      expect(mockSearchBuilder.withFacets).toHaveBeenCalledWith(['severities', 'types']);
    });
  });
  describe('Complex Filtering Combinations', () => {
    it('should handle all filter types together', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        componentKeys: ['src/main/java/'],
        assignees: ['developer@example.com'],
        tags: ['security', 'code-smell'],
        severities: ['MAJOR', 'CRITICAL'],
        statuses: ['OPEN'],
        authors: ['author1@example.com', 'author2@example.com'],
        facets: ['severities', 'tags', 'assignees', 'authors'],
        facetMode: 'count',
        page: 1,
        pageSize: 50,
      };
      await domain.getIssues(params);
      expect(mockSearchBuilder.withProjects).toHaveBeenCalledWith(['my-project']);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith(['src/main/java/']);
      expect(mockSearchBuilder.assignedToAny).toHaveBeenCalledWith(['developer@example.com']);
      expect(mockSearchBuilder.withTags).toHaveBeenCalledWith(['security', 'code-smell']);
      expect(mockSearchBuilder.withSeverities).toHaveBeenCalledWith(['MAJOR', 'CRITICAL']);
      expect(mockSearchBuilder.withStatuses).toHaveBeenCalledWith(['OPEN']);
      expect(mockSearchBuilder.byAuthors).toHaveBeenCalledWith([
        'author1@example.com',
        'author2@example.com',
      ]);
      expect(mockSearchBuilder.withFacets).toHaveBeenCalledWith([
        'severities',
        'tags',
        'assignees',
        'authors',
      ]);
      expect(mockSearchBuilder.withFacetMode).toHaveBeenCalledWith('count');
      expect(mockSearchBuilder.page).toHaveBeenCalledWith(1);
      expect(mockSearchBuilder.pageSize).toHaveBeenCalledWith(50);
    });
  });
  describe('Handler Integration', () => {
    it('should return properly formatted response with facets', async () => {
      const params: IssuesParams = {
        projectKey: 'my-project',
        facets: ['severities', 'tags'],
        page: undefined,
        pageSize: undefined,
      };
      // Create a mock client that returns the domain
      const mockClient: ISonarQubeClient = {
        getIssues: vi.fn<() => Promise<any>>().mockResolvedValue({
          issues: [
            {
              key: 'issue-1',
              rule: 'java:S1234',
              severity: 'CRITICAL',
              component: 'src/main/java/com/example/Service.java',
              message: 'Security vulnerability',
              status: 'OPEN',
              tags: ['security', 'vulnerability'],
              author: 'developer@example.com',
              assignee: 'john.doe@example.com',
            },
          ],
          components: [],
          rules: [],
          users: [],
          facets: [
            {
              property: 'severities',
              values: [
                { val: 'CRITICAL', count: 5 },
                { val: 'MAJOR', count: 10 },
              ],
            },
            {
              property: 'tags',
              values: [
                { val: 'security', count: 8 },
                { val: 'performance', count: 3 },
              ],
            },
          ],
          paging: { pageIndex: 1, pageSize: 10, total: 1 },
        } as any),
      } as unknown as ISonarQubeClient;
      const result = await handleSonarQubeGetIssues(params, mockClient);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      const parsedContent = JSON.parse((result.content[0]?.text as string) ?? '{}');
      expect(parsedContent.issues).toHaveLength(1);
      expect(parsedContent.facets).toHaveLength(2);
      expect(parsedContent.facets[0]?.property).toBe('severities');
      expect(parsedContent.facets[1]?.property).toBe('tags');
    });
  });
});
