/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { SearchIssuesRequestBuilderInterface } from 'sonarqube-web-api-client';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Mock search builder
const mockSearchBuilder = {
  withProjects: jest.fn().mockReturnThis(),
  withComponents: jest.fn().mockReturnThis(),
  withDirectories: jest.fn().mockReturnThis(),
  withFiles: jest.fn().mockReturnThis(),
  withScopes: jest.fn().mockReturnThis(),
  onComponentOnly: jest.fn().mockReturnThis(),
  onBranch: jest.fn().mockReturnThis(),
  onPullRequest: jest.fn().mockReturnThis(),
  withIssues: jest.fn().mockReturnThis(),
  withSeverities: jest.fn().mockReturnThis(),
  withStatuses: jest.fn().mockReturnThis(),
  withResolutions: jest.fn().mockReturnThis(),
  onlyResolved: jest.fn().mockReturnThis(),
  onlyUnresolved: jest.fn().mockReturnThis(),
  withTypes: jest.fn().mockReturnThis(),
  withCleanCodeAttributeCategories: jest.fn().mockReturnThis(),
  withImpactSeverities: jest.fn().mockReturnThis(),
  withImpactSoftwareQualities: jest.fn().mockReturnThis(),
  withIssueStatuses: jest.fn().mockReturnThis(),
  withRules: jest.fn().mockReturnThis(),
  withTags: jest.fn().mockReturnThis(),
  createdAfter: jest.fn().mockReturnThis(),
  createdBefore: jest.fn().mockReturnThis(),
  createdAt: jest.fn().mockReturnThis(),
  createdInLast: jest.fn().mockReturnThis(),
  onlyAssigned: jest.fn().mockReturnThis(),
  onlyUnassigned: jest.fn().mockReturnThis(),
  assignedToAny: jest.fn().mockReturnThis(),
  byAuthor: jest.fn().mockReturnThis(),
  byAuthors: jest.fn().mockReturnThis(),
  withCwe: jest.fn().mockReturnThis(),
  withOwaspTop10: jest.fn().mockReturnThis(),
  withOwaspTop10v2021: jest.fn().mockReturnThis(),
  withSansTop25: jest.fn().mockReturnThis(),
  withSonarSourceSecurity: jest.fn().mockReturnThis(),
  withSonarSourceSecurityNew: jest.fn().mockReturnThis(),
  withLanguages: jest.fn().mockReturnThis(),
  withFacets: jest.fn().mockReturnThis(),
  withFacetMode: jest.fn().mockReturnThis(),
  sinceLeakPeriod: jest.fn().mockReturnThis(),
  inNewCodePeriod: jest.fn().mockReturnThis(),
  sortBy: jest.fn().mockReturnThis(),
  withAdditionalFields: jest.fn().mockReturnThis(),
  page: jest.fn().mockReturnThis(),
  pageSize: jest.fn().mockReturnThis(),
  execute: jest.fn(),
} as unknown as SearchIssuesRequestBuilderInterface;

// Mock the web API client
jest.mock('sonarqube-web-api-client', () => ({
  SonarQubeClient: {
    withToken: jest.fn().mockReturnValue({
      issues: {
        search: jest.fn().mockReturnValue(mockSearchBuilder),
      },
    }),
  },
}));

import { IssuesDomain } from '../domains/issues.js';
import type { IssuesParams, IWebApiClient } from '../types/index.js';

describe('IssuesDomain new parameters', () => {
  let issuesDomain: IssuesDomain;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

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
        search: jest.fn().mockReturnValue(mockSearchBuilder),
      },
    } as unknown as IWebApiClient;

    // Create issues domain instance
    issuesDomain = new IssuesDomain(mockWebApiClient);
  });

  describe('directories parameter', () => {
    it('should call withDirectories when directories parameter is provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        directories: ['src/main/', 'src/test/'],
      };

      await issuesDomain.getIssues(params);

      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledWith(['src/main/', 'src/test/']);
      expect(mockSearchBuilder.withDirectories).toHaveBeenCalledTimes(1);
    });

    it('should not call withDirectories when directories parameter is not provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
      };

      await issuesDomain.getIssues(params);

      expect(mockSearchBuilder.withDirectories).not.toHaveBeenCalled();
    });

    it('should handle empty directories array', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        directories: [],
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
      };

      await issuesDomain.getIssues(params);

      expect(mockSearchBuilder.withFiles).not.toHaveBeenCalled();
    });

    it('should handle single file', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        files: ['App.java'],
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
      };

      await issuesDomain.getIssues(params);

      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN', 'TEST']);
      expect(mockSearchBuilder.withScopes).toHaveBeenCalledTimes(1);
    });

    it('should handle single scope value', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        scopes: ['MAIN'],
      };

      await issuesDomain.getIssues(params);

      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN']);
    });

    it('should handle all scope values', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
        scopes: ['MAIN', 'TEST', 'OVERALL'],
      };

      await issuesDomain.getIssues(params);

      expect(mockSearchBuilder.withScopes).toHaveBeenCalledWith(['MAIN', 'TEST', 'OVERALL']);
    });

    it('should not call withScopes when scopes parameter is not provided', async () => {
      const params: IssuesParams = {
        projectKey: 'test-project',
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
