import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  withDirectories: vi.fn().mockReturnThis(),
  withFiles: vi.fn().mockReturnThis(),
  withScopes: vi.fn().mockReturnThis(),
  onComponentOnly: vi.fn().mockReturnThis(),
  onBranch: vi.fn().mockReturnThis(),
  onPullRequest: vi.fn().mockReturnThis(),
  withIssues: vi.fn().mockReturnThis(),
  withSeverities: vi.fn().mockReturnThis(),
  withStatuses: vi.fn().mockReturnThis(),
  withResolutions: vi.fn().mockReturnThis(),
  onlyResolved: vi.fn().mockReturnThis(),
  onlyUnresolved: vi.fn().mockReturnThis(),
  withTypes: vi.fn().mockReturnThis(),
  withCleanCodeAttributeCategories: vi.fn().mockReturnThis(),
  withImpactSeverities: vi.fn().mockReturnThis(),
  withImpactSoftwareQualities: vi.fn().mockReturnThis(),
  withIssueStatuses: vi.fn().mockReturnThis(),
  withRules: vi.fn().mockReturnThis(),
  withTags: vi.fn().mockReturnThis(),
  createdAfter: vi.fn().mockReturnThis(),
  createdBefore: vi.fn().mockReturnThis(),
  createdAt: vi.fn().mockReturnThis(),
  createdInLast: vi.fn().mockReturnThis(),
  onlyAssigned: vi.fn().mockReturnThis(),
  onlyUnassigned: vi.fn().mockReturnThis(),
  assignedToAny: vi.fn().mockReturnThis(),
  byAuthor: vi.fn().mockReturnThis(),
  byAuthors: vi.fn().mockReturnThis(),
  withCwe: vi.fn().mockReturnThis(),
  withOwaspTop10: vi.fn().mockReturnThis(),
  withOwaspTop10v2021: vi.fn().mockReturnThis(),
  withSansTop25: vi.fn().mockReturnThis(),
  withSonarSourceSecurity: vi.fn().mockReturnThis(),
  withSonarSourceSecurityNew: vi.fn().mockReturnThis(),
  withLanguages: vi.fn().mockReturnThis(),
  withFacets: vi.fn().mockReturnThis(),
  withFacetMode: vi.fn().mockReturnThis(),
  sinceLeakPeriod: vi.fn().mockReturnThis(),
  inNewCodePeriod: vi.fn().mockReturnThis(),
  sortBy: vi.fn().mockReturnThis(),
  withAdditionalFields: vi.fn().mockReturnThis(),
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
import type { IssuesParams, ISonarQubeClient } from '../types/index.js';
// Note: IWebApiClient is mapped to ISonarQubeClient
type IWebApiClient = ISonarQubeClient;
describe('IssuesDomain new parameters', () => {
  let issuesDomain: IssuesDomain;
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    // Reset execute mock to return default response
    mockSearchBuilder.execute.mockResolvedValue({
      issues: [],
      components: [],
      rules: [],
      paging: { pageIndex: 1, pageSize: 100, total: 0 },
    });
    // Create mock web API client
    const mockWebApiClient = {
      issues: {
        search: vi.fn().mockReturnValue(mockSearchBuilder),
      },
    } as unknown as IWebApiClient;
    // Create issues domain instance
    issuesDomain = new IssuesDomain(mockWebApiClient as any, {} as any);
  });
  describe('directories parameter', () => {
    it('should call withDirectories when directories parameter is provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        directories: ['src/main/', 'src/test/'],
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledWith(['src/main/', 'src/test/']);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledTimes(1);
    });
    it('should not call withDirectories when directories parameter is not provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withDirectories).not.toHaveBeenCalled();
    });
    it('should handle empty directories array', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        directories: [],
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledWith([]);
    });
  });
  describe('files parameter', () => {
    it('should call withFiles when files parameter is provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        files: ['UserService.java', 'config.properties'],
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withFiles).toHaveBeenCalledWith([
        'UserService.java',
        'config.properties',
      ]);
      expect(mockSearchBuilder.withFiles).toHaveBeenCalledTimes(1);
    });
    it('should not call withFiles when files parameter is not provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withFiles).not.toHaveBeenCalled();
    });
    it('should handle single file', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        files: ['App.java'],
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withFiles).toHaveBeenCalledWith(['App.java']);
    });
  });
  describe('scopes parameter', () => {
    it('should call withScopes when scopes parameter is provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        scopes: ['MAIN', 'TEST'],
        page: undefined,
        pageSize: undefined,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN', 'TEST']);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledTimes(1);
    });
    it('should handle single scope value', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        scopes: ['MAIN'],
        page: undefined,
        pageSize: undefined,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN']);
    });
    it('should handle all scope values', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        scopes: ['MAIN', 'TEST', 'OVERALL'],
        page: undefined,
        pageSize: undefined,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN', 'TEST', 'OVERALL']);
    });
    it('should not call withScopes when scopes parameter is not provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        page: 1,
        pageSize: 10,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withScopes).not.toHaveBeenCalled();
    });
  });
  describe('combined parameters', () => {
    it('should handle all three new parameters together', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        directories: ['src/main/java/', 'src/test/java/'],
        files: ['Application.java', 'pom.xml'],
        scopes: ['MAIN', 'TEST', 'OVERALL'],
        page: undefined,
        pageSize: undefined,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledWith([
        'src/main/java/',
        'src/test/java/',
      ]);
      expect(mockSearchBuilder.withFiles).toHaveBeenCalledWith(['Application.java', 'pom.xml']);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN', 'TEST', 'OVERALL']);
    });
    it('should work with existing component filters', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        componentKeys: ['src/main/java/com/example/Service.java'],
        directories: ['src/main/java/com/example/'],
        files: ['Service.java'],
        scopes: ['MAIN'],
        page: undefined,
        pageSize: undefined,
      };
      await issuesDomain.getIssues(params);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith([
        'src/main/java/com/example/Service.java',
      ]);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledWith([
        'src/main/java/com/example/',
      ]);
      expect(mockSearchBuilder.withFiles).toHaveBeenCalledWith(['Service.java']);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN']);
    });
    it('should work with all filtering types together', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        componentKeys: ['src/Service.java'],
        directories: ['src/'],
        files: ['Service.java', 'Controller.java'],
        scopes: ['MAIN'],
        severities: ['CRITICAL', 'BLOCKER'],
        statuses: ['OPEN'],
        tags: ['security'],
        page: undefined,
        pageSize: undefined,
      };
      await issuesDomain.getIssues(params);
      // Component filters
      expect(mockSearchBuilder.withProjects).toHaveBeenCalledWith(['test-project']);
      expect(mockSearchBuilder.withComponents).toHaveBeenCalledWith(['src/Service.java']);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledWith(['src/']);
      expect(mockSearchBuilder.withFiles).toHaveBeenCalledWith(['Service.java', 'Controller.java']);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN']);
      // Issue filters
      expect(mockSearchBuilder.withSeverities).toHaveBeenCalledWith(['CRITICAL', 'BLOCKER']);
      expect(mockSearchBuilder.withStatuses).toHaveBeenCalledWith(['OPEN']);
      expect(mockSearchBuilder.withTags).toHaveBeenCalledWith(['security']);
    });
  });
});
