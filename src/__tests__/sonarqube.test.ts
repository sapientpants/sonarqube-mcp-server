import nock from 'nock';
import { SonarQubeClient } from '../sonarqube.js';

describe('SonarQubeClient', () => {
  const baseUrl = 'https://sonarqube.example.com';
  const token = 'test-token';
  let client: SonarQubeClient;

  beforeEach(() => {
    client = new SonarQubeClient(token, baseUrl);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockResponse = {
        components: [
          {
            key: 'project1',
            name: 'Project 1',
            qualifier: 'TRK',
            visibility: 'public',
            lastAnalysisDate: '2023-01-01',
            revision: 'cfb82f55c6ef32e61828c4cb3db2da12795fd767',
            managed: false,
          },
          {
            key: 'project2',
            name: 'Project 2',
            qualifier: 'TRK',
            visibility: 'private',
            revision: '7be96a94ac0c95a61ee6ee0ef9c6f808d386a355',
            managed: false,
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 2,
        },
      };

      nock(baseUrl)
        .get('/api/projects/search')
        .query(true)
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.listProjects();

      // Should return transformed data with 'projects' instead of 'components'
      expect(result.projects).toHaveLength(2);
      expect(result.projects?.[0]?.key).toBe('project1');
      expect(result.projects?.[1]?.key).toBe('project2');
      expect(result.paging).toEqual(mockResponse.paging);
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        components: [
          {
            key: 'project3',
            name: 'Project 3',
            qualifier: 'TRK',
            visibility: 'public',
            revision: 'abc12345def67890abc12345def67890abc12345',
            managed: false,
          },
        ],
        paging: {
          pageIndex: 2,
          pageSize: 1,
          total: 3,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/projects/search')
        .query(true)
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.listProjects({
        page: 2,
        pageSize: 1,
      });

      // Should return transformed data with 'projects' instead of 'components'
      expect(result.projects).toHaveLength(1);
      expect(result.projects?.[0]?.key).toBe('project3');
      expect(result.paging).toEqual(mockResponse.paging);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getIssues', () => {
    it('should fetch issues successfully', async () => {
      const mockResponse = {
        issues: [
          {
            key: 'issue1',
            rule: 'rule1',
            severity: 'MAJOR',
            component: 'component1',
            project: 'project1',
            line: 42,
            status: 'OPEN',
            issueStatus: 'ACCEPTED',
            message: 'Fix this issue',
            messageFormattings: [
              {
                start: 0,
                end: 4,
                type: 'CODE',
              },
            ],
            tags: ['bug', 'security'],
            creationDate: '2023-01-01',
            updateDate: '2023-01-02',
            type: 'BUG',
            cleanCodeAttribute: 'CLEAR',
            cleanCodeAttributeCategory: 'INTENTIONAL',
            prioritizedRule: false,
            impacts: [
              {
                softwareQuality: 'SECURITY',
                severity: 'HIGH',
              },
            ],
            textRange: {
              startLine: 42,
              endLine: 42,
              startOffset: 0,
              endOffset: 100,
            },
          },
        ],
        components: [
          {
            key: 'component1',
            enabled: true,
            qualifier: 'FIL',
            name: 'Component 1',
            longName: 'src/main/component1.java',
            path: 'src/main/component1.java',
          },
        ],
        rules: [
          {
            key: 'rule1',
            name: 'Rule 1',
            status: 'READY',
            lang: 'java',
            langName: 'Java',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      };

      nock(baseUrl)
        .get('/api/issues/search')
        .query(true)
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getIssues({
        projectKey: 'project1',
        page: undefined,
        pageSize: undefined,
      });
      expect(result).toEqual(mockResponse);
      expect(result.issues?.[0]?.cleanCodeAttribute).toBe('CLEAR');
      expect(result.issues?.[0]?.impacts?.[0]?.softwareQuality).toBe('SECURITY');
      expect(result.components?.[0]?.qualifier).toBe('FIL');
      expect(result.rules?.[0]?.lang).toBe('java');
    });

    it('should handle filtering by severity', async () => {
      const mockResponse = {
        issues: [
          {
            key: 'issue2',
            rule: 'rule2',
            severity: 'CRITICAL',
            component: 'component2',
            project: 'project1',
            line: 100,
            status: 'OPEN',
            issueStatus: 'CONFIRMED',
            message: 'Critical issue',
            tags: ['security'],
            creationDate: '2023-01-03',
            updateDate: '2023-01-03',
            type: 'VULNERABILITY',
            cleanCodeAttribute: 'CLEAR',
            cleanCodeAttributeCategory: 'RESPONSIBLE',
            prioritizedRule: true,
            impacts: [
              {
                softwareQuality: 'SECURITY',
                severity: 'HIGH',
              },
            ],
          },
        ],
        components: [
          {
            key: 'component2',
            qualifier: 'FIL',
            name: 'Component 2',
          },
        ],
        rules: [
          {
            key: 'rule2',
            name: 'Rule 2',
            status: 'READY',
            lang: 'java',
            langName: 'Java',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 5,
          total: 1,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query({
          projects: 'project1',
          severities: 'CRITICAL',
          p: 1,
          ps: 5,
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getIssues({
        projectKey: 'project1',
        severity: 'CRITICAL',
        page: 1,
        pageSize: 5,
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle multiple filter parameters', async () => {
      const mockResponse = {
        issues: [
          {
            key: 'issue3',
            rule: 'rule3',
            severity: 'MAJOR',
            component: 'component3',
            project: 'project1',
            line: 200,
            status: 'RESOLVED',
            message: 'Fixed issue',
            tags: ['code-smell'],
            creationDate: '2023-01-04',
            updateDate: '2023-01-05',
            type: 'CODE_SMELL',
          },
        ],
        components: [],
        rules: [],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((queryObj) => {
          return (
            queryObj.projects === 'project1' &&
            queryObj.statuses === 'RESOLVED,CLOSED' &&
            queryObj.types === 'CODE_SMELL' &&
            queryObj.tags === 'code-smell,performance' &&
            queryObj.createdAfter === '2023-01-01' &&
            queryObj.languages === 'java,typescript'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getIssues({
        projectKey: 'project1',
        statuses: ['RESOLVED', 'CLOSED'],
        types: ['CODE_SMELL'],
        tags: ['code-smell', 'performance'],
        createdAfter: '2023-01-01',
        languages: ['java', 'typescript'],
        page: undefined,
        pageSize: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle boolean filter parameters', async () => {
      const mockResponse = {
        issues: [
          {
            key: 'issue4',
            rule: 'rule4',
            severity: 'BLOCKER',
            component: 'component4',
            project: 'project1',
            status: 'OPEN',
            message: 'New issue',
            tags: ['security'],
            creationDate: '2023-01-06',
            updateDate: '2023-01-06',
            type: 'VULNERABILITY',
          },
        ],
        components: [],
        rules: [],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((queryObj) => {
          return (
            queryObj.projects === 'project1' &&
            queryObj.resolved === 'false' &&
            queryObj.sinceLeakPeriod === 'true' &&
            queryObj.inNewCodePeriod === 'true'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getIssues({
        projectKey: 'project1',
        resolved: false,
        sinceLeakPeriod: true,
        inNewCodePeriod: true,
        page: undefined,
        pageSize: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should fetch metrics successfully', async () => {
      const mockResponse = {
        metrics: [
          {
            id: 'metric1',
            key: 'team_size',
            name: 'Team size',
            description: 'Number of people in the team',
            domain: 'Management',
            type: 'INT',
            direction: 0,
            qualitative: false,
            hidden: false,
            custom: true,
          },
          {
            id: 'metric2',
            key: 'uncovered_lines',
            name: 'Uncovered lines',
            description: 'Uncovered lines',
            domain: 'Tests',
            type: 'INT',
            direction: 1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 2,
        },
      };

      nock(baseUrl)
        .get('/api/metrics/search')
        .query(true)
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getMetrics();
      expect(result).toEqual(mockResponse);
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics?.[0]?.key).toBe('team_size');
      expect(result.metrics?.[1]?.key).toBe('uncovered_lines');
      expect(result.paging).toEqual(mockResponse.paging);
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        metrics: [
          {
            id: 'metric3',
            key: 'code_coverage',
            name: 'Code Coverage',
            description: 'Code coverage percentage',
            domain: 'Tests',
            type: 'PERCENT',
            direction: 1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
        ],
        paging: {
          pageIndex: 2,
          pageSize: 1,
          total: 3,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/metrics/search')
        .query((actualQuery) => {
          return actualQuery.p === '2' && actualQuery.ps === '1';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getMetrics({
        page: 2,
        pageSize: 1,
      });

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics?.[0]?.key).toBe('code_coverage');
      expect(result.paging).toEqual(mockResponse.paging);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getHealth', () => {
    it('should fetch health status successfully', async () => {
      const mockV2Response = {
        status: 'GREEN',
        checkedAt: '2023-12-01T10:00:00Z',
      };

      const expectedResponse = {
        health: 'GREEN',
        causes: [],
      };

      nock(baseUrl)
        .get('/api/v2/system/health')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockV2Response);

      const result = await client.getHealth();
      expect(result).toEqual(expectedResponse);
      expect(result.health).toBe('GREEN');
      expect(result.causes).toEqual([]);
    });

    it('should handle warning health status', async () => {
      const mockV2Response = {
        status: 'YELLOW',
        checkedAt: '2023-12-01T10:00:00Z',
        nodes: [
          {
            name: 'node1',
            status: 'YELLOW',
            causes: ['Disk space low'],
          },
        ],
      };

      const expectedResponse = {
        health: 'YELLOW',
        causes: ['Disk space low'],
      };

      nock(baseUrl)
        .get('/api/v2/system/health')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockV2Response);

      const result = await client.getHealth();
      expect(result).toEqual(expectedResponse);
      expect(result.health).toBe('YELLOW');
      expect(result.causes).toContain('Disk space low');
    });
  });

  describe('getStatus', () => {
    it('should fetch system status successfully', async () => {
      const mockResponse = {
        id: '20230101-1234',
        version: '10.3.0.82913',
        status: 'UP',
      };

      nock(baseUrl)
        .get('/api/system/status')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getStatus();
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('20230101-1234');
      expect(result.version).toBe('10.3.0.82913');
      expect(result.status).toBe('UP');
    });
  });

  describe('ping', () => {
    it('should ping SonarQube successfully', async () => {
      nock(baseUrl)
        .get('/api/system/ping')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, 'pong');

      const result = await client.ping();
      expect(result).toBe('pong');
    });

    it('should handle projects filter parameter', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return actualQuery.projects === 'proj1,proj2';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        projects: ['proj1', 'proj2'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle component filter parameters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      // When both componentKeys and components are provided, only the last one (components) is used
      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.projects === 'project1' &&
            actualQuery.components === 'comp2' && // components overrides componentKeys
            actualQuery.onComponentOnly === 'true'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        projectKey: 'project1',
        componentKeys: ['comp1'],
        components: ['comp2'],
        onComponentOnly: true,
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle branch and pull request parameters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return actualQuery.branch === 'feature/test' && actualQuery.pullRequest === '123';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        branch: 'feature/test',
        pullRequest: '123',
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle issue and type filters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.issues === 'ISSUE-1,ISSUE-2' &&
            actualQuery.severities === 'BLOCKER,CRITICAL' &&
            actualQuery.statuses === 'OPEN,CONFIRMED' &&
            actualQuery.resolutions === 'FALSE-POSITIVE,WONTFIX' &&
            actualQuery.resolved === 'true' &&
            actualQuery.types === 'BUG,VULNERABILITY'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        issues: ['ISSUE-1', 'ISSUE-2'],
        severities: ['BLOCKER', 'CRITICAL'],
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
        resolved: true,
        types: ['BUG', 'VULNERABILITY'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle rules and tags filters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.rules === 'java:S1234,java:S5678' &&
            actualQuery.tags === 'security,performance' &&
            actualQuery.languages === 'java,javascript'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        rules: ['java:S1234', 'java:S5678'],
        tags: ['security', 'performance'],
        languages: ['java', 'javascript'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle date and assignment filter parameters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.createdAfter === '2023-01-01' &&
            actualQuery.createdBefore === '2023-12-31' &&
            actualQuery.createdAt === '2023-06-15' &&
            actualQuery.createdInLast === '7d' &&
            actualQuery.assigned === 'true' &&
            actualQuery.assignees === 'user1,user2' &&
            // API now uses repeated 'author' parameter instead of 'authors'
            Array.isArray(actualQuery.author) &&
            actualQuery.author[0] === 'author1' &&
            actualQuery.author[1] === 'author2'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        createdAfter: '2023-01-01',
        createdBefore: '2023-12-31',
        createdAt: '2023-06-15',
        createdInLast: '7d',
        assigned: true,
        assignees: ['user1', 'user2'],
        author: 'author1',
        authors: ['author1', 'author2'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle security standards filter parameters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.cwe === '79,89' &&
            actualQuery.owaspTop10 === 'a1,a3' &&
            actualQuery['owaspTop10-2021'] === 'a01,a03' &&
            actualQuery.sansTop25 === 'insecure-interaction,risky-resource' &&
            actualQuery.sonarsourceSecurityCategory === 'sql-injection,xss' &&
            actualQuery.sonarsourceSecurity === 'injection'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        cwe: ['79', '89'],
        owaspTop10: ['a1', 'a3'],
        owaspTop10v2021: ['a01', 'a03'],
        sansTop25: ['insecure-interaction', 'risky-resource'],
        sonarsourceSecurity: ['sql-injection', 'xss'],
        sonarsourceSecurityCategory: ['injection'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle Clean Code and impact parameters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.cleanCodeAttributeCategories === 'INTENTIONAL,RESPONSIBLE' &&
            actualQuery.impactSeverities === 'HIGH,MEDIUM' &&
            actualQuery.impactSoftwareQualities === 'SECURITY,RELIABILITY' &&
            actualQuery.issueStatuses === 'OPEN,CONFIRMED'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        cleanCodeAttributeCategories: ['INTENTIONAL', 'RESPONSIBLE'],
        impactSeverities: ['HIGH', 'MEDIUM'],
        impactSoftwareQualities: ['SECURITY', 'RELIABILITY'],
        issueStatuses: ['OPEN', 'CONFIRMED'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle facets and additional fields', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        facets: [
          {
            property: 'severities',
            values: [{ val: 'BLOCKER', count: 10 }],
          },
        ],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return (
            actualQuery.facets === 'severities,types' &&
            actualQuery.facetMode === 'effort' &&
            actualQuery.additionalFields === '_all'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        facets: ['severities', 'types'],
        facetMode: 'effort',
        additionalFields: ['_all'],
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle period and sorting parameters', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return actualQuery.inNewCodePeriod === 'true' && actualQuery.sinceLeakPeriod === 'true';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({
        inNewCodePeriod: true,
        sinceLeakPeriod: true,
        s: 'FILE_LINE',
        asc: false,
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should handle deprecated severity parameter', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return actualQuery.severities === 'MAJOR';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({ severity: 'MAJOR', page: undefined, pageSize: undefined });
      expect(scope.isDone()).toBe(true);
    });

    it('should handle resolved parameter with false value', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return actualQuery.resolved === 'false';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({ resolved: false, page: undefined, pageSize: undefined });
      expect(scope.isDone()).toBe(true);
    });

    it('should handle assigned parameter with false value', async () => {
      const mockResponse = {
        issues: [],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/issues/search')
        .query((actualQuery) => {
          return actualQuery.assigned === 'false';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.getIssues({ assigned: false, page: undefined, pageSize: undefined });
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getComponentMeasures', () => {
    it('should fetch component measures successfully', async () => {
      const mockResponse = {
        component: {
          key: 'my-project',
          name: 'My Project',
          qualifier: 'TRK',
          measures: [
            {
              metric: 'complexity',
              value: '42',
              bestValue: false,
            },
            {
              metric: 'bugs',
              value: '5',
              bestValue: false,
            },
          ],
        },
        metrics: [
          {
            id: 'metric1',
            key: 'complexity',
            name: 'Complexity',
            description: 'Cyclomatic complexity',
            domain: 'Complexity',
            type: 'INT',
            direction: -1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
          {
            id: 'metric2',
            key: 'bugs',
            name: 'Bugs',
            description: 'Number of bugs',
            domain: 'Reliability',
            type: 'INT',
            direction: -1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
        ],
      };

      nock(baseUrl)
        .get('/api/measures/component')
        .query((queryObj) => {
          return queryObj.component === 'my-project' && queryObj.metricKeys === 'complexity,bugs';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getComponentMeasures({
        component: 'my-project',
        metricKeys: ['complexity', 'bugs'],
      });

      expect(result).toEqual(mockResponse);
      expect(result.component.key).toBe('my-project');
      expect(result.component.measures).toHaveLength(2);
      expect(result.metrics).toHaveLength(2);
      expect(result.component.measures?.[0]?.metric).toBe('complexity');
      expect(result.component.measures?.[0]?.value).toBe('42');
    });

    it('should handle additional parameters', async () => {
      const mockResponse = {
        component: {
          key: 'my-project',
          name: 'My Project',
          qualifier: 'TRK',
          measures: [
            {
              metric: 'coverage',
              value: '87.5',
              bestValue: false,
            },
          ],
        },
        metrics: [
          {
            id: 'metric3',
            key: 'coverage',
            name: 'Coverage',
            description: 'Test coverage',
            domain: 'Coverage',
            type: 'PERCENT',
            direction: 1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
        ],
        period: {
          index: 1,
          mode: 'previous_version',
          date: '2023-01-01T00:00:00+0000',
        },
      };

      const scope = nock(baseUrl)
        .get('/api/measures/component')
        .query((queryObj) => {
          return (
            queryObj.component === 'my-project' &&
            queryObj.metricKeys === 'coverage' &&
            queryObj.additionalFields === 'periods' &&
            queryObj.branch === 'main'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getComponentMeasures({
        component: 'my-project',
        metricKeys: ['coverage'],
        additionalFields: ['periods'],
        branch: 'main',
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
      expect(result.period?.mode).toBe('previous_version');
    });
  });

  describe('getComponentsMeasures', () => {
    it('should fetch multiple components measures successfully', async () => {
      const mockResponse = {
        components: [
          {
            key: 'project1',
            name: 'Project 1',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'bugs',
                value: '12',
              },
              {
                metric: 'vulnerabilities',
                value: '5',
              },
            ],
          },
          {
            key: 'project2',
            name: 'Project 2',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'bugs',
                value: '7',
              },
              {
                metric: 'vulnerabilities',
                value: '0',
                bestValue: true,
              },
            ],
          },
        ],
        metrics: [
          {
            id: 'metric2',
            key: 'bugs',
            name: 'Bugs',
            description: 'Number of bugs',
            domain: 'Reliability',
            type: 'INT',
            direction: -1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
          {
            id: 'metric3',
            key: 'vulnerabilities',
            name: 'Vulnerabilities',
            description: 'Number of vulnerabilities',
            domain: 'Security',
            type: 'INT',
            direction: -1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 2,
        },
      };

      // Mock individual component calls
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project1',
          metricKeys: 'bugs,vulnerabilities',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
        });

      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project2',
          metricKeys: 'bugs,vulnerabilities',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[1],
          metrics: mockResponse.metrics,
        });

      // Mock the additional call for metrics from first component
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project1',
          metricKeys: 'bugs,vulnerabilities',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
        });

      const result = await client.getComponentsMeasures({
        componentKeys: ['project1', 'project2'],
        metricKeys: ['bugs', 'vulnerabilities'],
        page: undefined,
        pageSize: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(result.components).toHaveLength(2);
      expect(result.components?.[0]?.key).toBe('project1');
      expect(result.components?.[1]?.key).toBe('project2');
      expect(result.components?.[0]?.measures).toHaveLength(2);
      expect(result.components?.[1]?.measures).toHaveLength(2);
      expect(result.metrics).toHaveLength(2);
      expect(result.paging.total).toBe(2);
    });

    it('should handle pagination and additional parameters', async () => {
      const mockResponse = {
        components: [
          {
            key: 'project3',
            name: 'Project 3',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'code_smells',
                value: '45',
              },
            ],
          },
        ],
        metrics: [
          {
            id: 'metric4',
            key: 'code_smells',
            name: 'Code Smells',
            description: 'Number of code smells',
            domain: 'Maintainability',
            type: 'INT',
            direction: -1,
            qualitative: true,
            hidden: false,
            custom: false,
          },
        ],
        paging: {
          pageIndex: 2,
          pageSize: 1,
          total: 3,
        },
        period: {
          index: 1,
          mode: 'previous_version',
          date: '2023-01-01T00:00:00+0000',
        },
      };

      // Mock individual component calls - all three components
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project1',
          metricKeys: 'code_smells',
          additionalFields: 'periods',
          branch: 'main',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: {
            key: 'project1',
            name: 'Project 1',
            qualifier: 'TRK',
            measures: [{ metric: 'code_smells', value: '10' }],
          },
          metrics: mockResponse.metrics,
          period: mockResponse.period,
        });

      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project2',
          metricKeys: 'code_smells',
          additionalFields: 'periods',
          branch: 'main',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: {
            key: 'project2',
            name: 'Project 2',
            qualifier: 'TRK',
            measures: [{ metric: 'code_smells', value: '20' }],
          },
          metrics: mockResponse.metrics,
          period: mockResponse.period,
        });

      const scope = nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project3',
          metricKeys: 'code_smells',
          additionalFields: 'periods',
          branch: 'main',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
          period: mockResponse.period,
        });

      // Mock the additional call for metrics from first component
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project1',
          metricKeys: 'code_smells',
          additionalFields: 'periods',
          branch: 'main',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: {
            key: 'project1',
            name: 'Project 1',
            qualifier: 'TRK',
            measures: [{ metric: 'code_smells', value: '10' }],
          },
          metrics: mockResponse.metrics,
          period: mockResponse.period,
        });

      const result = await client.getComponentsMeasures({
        componentKeys: 'project1,project2,project3',
        metricKeys: 'code_smells',
        page: 2,
        pageSize: 1,
        additionalFields: ['periods'],
        branch: 'main',
      });

      // Since we paginate after fetching all components, we should have only 1 result
      expect(result.components).toHaveLength(1);
      expect(result.components?.[0]?.key).toBe('project2'); // Page 2, size 1 would show the 2nd component
      expect(result.paging.pageIndex).toBe(2);
      expect(result.paging.pageSize).toBe(1);
      expect(result.paging.total).toBe(3); // Total of 3 components
      expect(result.period?.mode).toBe('previous_version');
      expect(scope.isDone()).toBe(true);
    });

    it('should handle comma-separated componentKeys string', async () => {
      const mockResponse = {
        components: [
          {
            key: 'comp1',
            name: 'Component 1',
            qualifier: 'FIL',
            measures: [{ metric: 'coverage', value: '80' }],
          },
          {
            key: 'comp2',
            name: 'Component 2',
            qualifier: 'FIL',
            measures: [{ metric: 'coverage', value: '90' }],
          },
        ],
        metrics: [
          {
            key: 'coverage',
            name: 'Coverage',
            type: 'PERCENT',
          },
        ],
      };

      // Mock individual component calls
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'comp1',
          metricKeys: 'coverage',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
        });

      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'comp2',
          metricKeys: 'coverage',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[1],
          metrics: mockResponse.metrics,
        });

      // Mock for extracting metrics
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'comp1',
          metricKeys: 'coverage',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
        });

      const result = await client.getComponentsMeasures({
        componentKeys: 'comp1,comp2',
        metricKeys: ['coverage'],
        page: undefined,
        pageSize: undefined,
      });

      expect(result.components).toHaveLength(2);
      expect(result.components?.[0]?.key).toBe('comp1');
      expect(result.components?.[1]?.key).toBe('comp2');
    });

    it('should handle comma-separated metricKeys string', async () => {
      const mockResponse = {
        components: [
          {
            key: 'project1',
            name: 'Project 1',
            qualifier: 'TRK',
            measures: [
              { metric: 'coverage', value: '75' },
              { metric: 'duplicated_lines_density', value: '5' },
            ],
          },
        ],
        metrics: [
          {
            key: 'coverage',
            name: 'Coverage',
            type: 'PERCENT',
          },
          {
            key: 'duplicated_lines_density',
            name: 'Duplicated Lines',
            type: 'PERCENT',
          },
        ],
      };

      // Mock individual component call
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project1',
          metricKeys: 'coverage,duplicated_lines_density',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
        });

      // Mock for extracting metrics
      nock(baseUrl)
        .get('/api/measures/component')
        .query({
          component: 'project1',
          metricKeys: 'coverage,duplicated_lines_density',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, {
          component: mockResponse.components[0],
          metrics: mockResponse.metrics,
        });

      const result = await client.getComponentsMeasures({
        componentKeys: ['project1'],
        metricKeys: 'coverage,duplicated_lines_density',
        page: undefined,
        pageSize: undefined,
      });

      expect(result.components).toHaveLength(1);
      expect(result.components?.[0]?.measures).toHaveLength(2);
      expect(result.metrics).toHaveLength(2);
    });
  });

  describe('getMeasuresHistory', () => {
    it('should fetch measures history successfully', async () => {
      const mockResponse = {
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 2,
        },
        measures: [
          {
            metric: 'coverage',
            history: [
              {
                date: '2023-01-01T00:00:00+0000',
                value: '85.5',
              },
              {
                date: '2023-01-02T00:00:00+0000',
                value: '87.2',
              },
            ],
          },
          {
            metric: 'bugs',
            history: [
              {
                date: '2023-01-01T00:00:00+0000',
                value: '12',
              },
              {
                date: '2023-01-02T00:00:00+0000',
                value: '5',
              },
            ],
          },
        ],
      };

      nock(baseUrl)
        .get('/api/measures/search_history')
        .query((queryObj) => {
          return queryObj.component === 'my-project' && queryObj.metrics === 'coverage,bugs';
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getMeasuresHistory({
        component: 'my-project',
        metrics: ['coverage', 'bugs'],
        page: undefined,
        pageSize: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(result.measures).toHaveLength(2);
      expect(result.measures?.[0]?.metric).toBe('coverage');
      expect(result.measures?.[1]?.metric).toBe('bugs');
      expect(result.measures?.[0]?.history).toHaveLength(2);
      expect(result.measures?.[1]?.history).toHaveLength(2);
      expect(result.paging.total).toBe(2);
    });

    it('should handle date range and pagination parameters', async () => {
      const mockResponse = {
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 1,
        },
        measures: [
          {
            metric: 'code_smells',
            history: [
              {
                date: '2023-01-15T00:00:00+0000',
                value: '45',
              },
              {
                date: '2023-01-20T00:00:00+0000',
                value: '32',
              },
            ],
          },
        ],
      };

      const scope = nock(baseUrl)
        .get('/api/measures/search_history')
        .query((queryObj) => {
          return (
            queryObj.component === 'my-project' &&
            queryObj.metrics === 'code_smells' &&
            queryObj.from === '2023-01-15' &&
            queryObj.to === '2023-01-31' &&
            queryObj.branch === 'main'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getMeasuresHistory({
        component: 'my-project',
        metrics: ['code_smells'],
        from: '2023-01-15',
        to: '2023-01-31',
        branch: 'main',
        page: undefined,
        pageSize: undefined,
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
      expect(result.measures).toHaveLength(1);
      expect(result.measures?.[0]?.metric).toBe('code_smells');
      expect(result.measures?.[0]?.history).toHaveLength(2);
      expect(result.measures?.[0]?.history?.[0]?.date).toBe('2023-01-15T00:00:00+0000');
      expect(result.measures?.[0]?.history?.[1]?.date).toBe('2023-01-20T00:00:00+0000');
    });
  });

  describe('Hotspots', () => {
    it('should search hotspots', async () => {
      const mockResponse = {
        hotspots: [
          {
            key: 'AYg1234567890',
            component: 'com.example:my-project:src/main/java/Example.java',
            project: 'com.example:my-project',
            securityCategory: 'sql-injection',
            vulnerabilityProbability: 'HIGH',
            status: 'TO_REVIEW',
            line: 42,
            message: 'Make sure using this database query is safe.',
            author: 'developer@example.com',
            creationDate: '2023-01-15T10:30:00+0000',
          },
        ],
        components: [
          {
            key: 'com.example:my-project:src/main/java/Example.java',
            name: 'Example.java',
            path: 'src/main/java/Example.java',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 1,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/hotspots/search')
        .query((actualQuery) => {
          return (
            actualQuery.projectKey === 'my-project' &&
            actualQuery.status === 'TO_REVIEW' &&
            actualQuery.p === '1' &&
            actualQuery.ps === '50'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.hotspots({
        projectKey: 'my-project',
        status: 'TO_REVIEW',
        page: 1,
        pageSize: 50,
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
      expect(result.hotspots).toHaveLength(1);
      expect(result.hotspots?.[0]?.key).toBe('AYg1234567890');
    });

    it('should search hotspots with all filters', async () => {
      const mockResponse = {
        hotspots: [],
        components: [],
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
      };

      const scope = nock(baseUrl)
        .get('/api/hotspots/search')
        .query((actualQuery) => {
          // Note: The API's support for branch, pullRequest, and inNewCodePeriod has not been confirmed. Ensure these filters are supported before relying on them.
          return (
            actualQuery.projectKey === 'my-project' &&
            actualQuery.status === 'REVIEWED' &&
            actualQuery.resolution === 'FIXED' &&
            actualQuery.files === 'file1.java,file2.java' &&
            actualQuery.onlyMine === 'true' &&
            actualQuery.sinceLeakPeriod === 'true'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      await client.hotspots({
        projectKey: 'my-project',
        branch: 'feature-branch',
        pullRequest: 'PR-123',
        status: 'REVIEWED',
        resolution: 'FIXED',
        files: ['file1.java', 'file2.java'],
        assignedToMe: true,
        sinceLeakPeriod: true,
        inNewCodePeriod: true,
        page: undefined,
        pageSize: undefined,
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should get hotspot details', async () => {
      const mockResponse = {
        key: 'AYg1234567890',
        component: {
          key: 'com.example:my-project:src/main/java/Example.java',
          name: 'Example.java',
          path: 'src/main/java/Example.java',
          qualifier: 'FIL',
        },
        project: {
          key: 'com.example:my-project',
          name: 'My Project',
          qualifier: 'TRK',
        },
        rule: {
          key: 'java:S2077',
          name: 'SQL injection',
          securityCategory: 'sql-injection',
          vulnerabilityProbability: 'HIGH',
        },
        status: 'TO_REVIEW',
        line: 42,
        message: 'Make sure using this database query is safe.',
        author: 'developer@example.com',
        creationDate: '2023-01-15T10:30:00+0000',
        updateDate: '2023-01-15T10:30:00+0000',
        textRange: {
          startLine: 42,
          endLine: 42,
          startOffset: 10,
          endOffset: 50,
        },
        flows: [],
        canChangeStatus: true,
      };

      const scope = nock(baseUrl)
        .get('/api/hotspots/show')
        .query({ hotspot: 'AYg1234567890' })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.hotspot('AYg1234567890');

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
      expect(result.key).toBe('AYg1234567890');
      expect(result.rule.securityCategory).toBe('sql-injection');
    });

    it('should update hotspot status', async () => {
      const scope = nock(baseUrl)
        .post('/api/hotspots/change_status', {
          hotspot: 'AYg1234567890',
          status: 'REVIEWED',
          resolution: 'FIXED',
          comment: 'Fixed by using prepared statements',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(204);

      await client.updateHotspotStatus({
        hotspot: 'AYg1234567890',
        status: 'REVIEWED',
        resolution: 'FIXED',
        comment: 'Fixed by using prepared statements',
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should update hotspot status without optional fields', async () => {
      const scope = nock(baseUrl)
        .post('/api/hotspots/change_status', {
          hotspot: 'AYg1234567890',
          status: 'TO_REVIEW',
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(204);

      await client.updateHotspotStatus({
        hotspot: 'AYg1234567890',
        status: 'TO_REVIEW',
      });

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('Issue Resolution Methods', () => {
    describe('markIssueFalsePositive', () => {
      it('should mark issue as false positive successfully', async () => {
        const mockResponse = {
          issue: {
            key: 'ISSUE-123',
            status: 'RESOLVED',
            resolution: 'FALSE-POSITIVE',
          },
          components: [],
          rules: [],
          users: [],
        };

        const scope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'falsepositive',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.markIssueFalsePositive({
          issueKey: 'ISSUE-123',
        });

        expect(result).toEqual(mockResponse);
        expect(scope.isDone()).toBe(true);
      });

      it('should mark issue as false positive with comment', async () => {
        const mockResponse = {
          issue: {
            key: 'ISSUE-123',
            status: 'RESOLVED',
            resolution: 'FALSE-POSITIVE',
          },
          components: [],
          rules: [],
          users: [],
        };

        const commentScope = nock(baseUrl)
          .post('/api/issues/add_comment', {
            issue: 'ISSUE-123',
            text: 'This is a false positive',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {});

        const transitionScope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'falsepositive',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.markIssueFalsePositive({
          issueKey: 'ISSUE-123',
          comment: 'This is a false positive',
        });

        expect(result).toEqual(mockResponse);
        expect(commentScope.isDone()).toBe(true);
        expect(transitionScope.isDone()).toBe(true);
      });
    });

    describe('markIssueWontFix', () => {
      it("should mark issue as won't fix successfully", async () => {
        const mockResponse = {
          issue: {
            key: 'ISSUE-456',
            status: 'RESOLVED',
            resolution: 'WONTFIX',
          },
          components: [],
          rules: [],
          users: [],
        };

        const scope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-456',
            transition: 'wontfix',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.markIssueWontFix({
          issueKey: 'ISSUE-456',
        });

        expect(result).toEqual(mockResponse);
        expect(scope.isDone()).toBe(true);
      });

      it("should mark issue as won't fix with comment", async () => {
        const mockResponse = {
          issue: {
            key: 'ISSUE-456',
            status: 'RESOLVED',
            resolution: 'WONTFIX',
          },
          components: [],
          rules: [],
          users: [],
        };

        const commentScope = nock(baseUrl)
          .post('/api/issues/add_comment', {
            issue: 'ISSUE-456',
            text: "Won't fix due to constraints",
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {});

        const transitionScope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-456',
            transition: 'wontfix',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.markIssueWontFix({
          issueKey: 'ISSUE-456',
          comment: "Won't fix due to constraints",
        });

        expect(result).toEqual(mockResponse);
        expect(commentScope.isDone()).toBe(true);
        expect(transitionScope.isDone()).toBe(true);
      });
    });

    describe('markIssuesFalsePositive', () => {
      it('should mark multiple issues as false positive successfully', async () => {
        const mockResponse1 = {
          issue: {
            key: 'ISSUE-123',
            status: 'RESOLVED',
            resolution: 'FALSE-POSITIVE',
          },
          components: [],
          rules: [],
          users: [],
        };

        const mockResponse2 = {
          issue: {
            key: 'ISSUE-124',
            status: 'RESOLVED',
            resolution: 'FALSE-POSITIVE',
          },
          components: [],
          rules: [],
          users: [],
        };

        const scope1 = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'falsepositive',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse1);

        const scope2 = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-124',
            transition: 'falsepositive',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse2);

        const result = await client.markIssuesFalsePositive({
          issueKeys: ['ISSUE-123', 'ISSUE-124'],
        });

        expect(result).toEqual([mockResponse1, mockResponse2]);
        expect(scope1.isDone()).toBe(true);
        expect(scope2.isDone()).toBe(true);
      });
    });

    describe('markIssuesWontFix', () => {
      it("should mark multiple issues as won't fix successfully", async () => {
        const mockResponse1 = {
          issue: {
            key: 'ISSUE-456',
            status: 'RESOLVED',
            resolution: 'WONTFIX',
          },
          components: [],
          rules: [],
          users: [],
        };

        const mockResponse2 = {
          issue: {
            key: 'ISSUE-457',
            status: 'RESOLVED',
            resolution: 'WONTFIX',
          },
          components: [],
          rules: [],
          users: [],
        };

        const scope1 = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-456',
            transition: 'wontfix',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse1);

        const scope2 = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-457',
            transition: 'wontfix',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse2);

        const result = await client.markIssuesWontFix({
          issueKeys: ['ISSUE-456', 'ISSUE-457'],
        });

        expect(result).toEqual([mockResponse1, mockResponse2]);
        expect(scope1.isDone()).toBe(true);
        expect(scope2.isDone()).toBe(true);
      });
    });

    describe('addCommentToIssue', () => {
      it('should add a comment to an issue', async () => {
        const mockResponse = {
          issue: {
            key: 'ISSUE-789',
            comments: [
              {
                key: 'comment-123',
                login: 'test-user',
                htmlText: '<p>Test comment</p>',
                markdown: 'Test comment',
                updatable: true,
                createdAt: '2024-01-01T10:00:00+0000',
              },
            ],
          },
        };

        const scope = nock(baseUrl)
          .post('/api/issues/add_comment', {
            issue: 'ISSUE-789',
            text: 'Test comment',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.addCommentToIssue({
          issueKey: 'ISSUE-789',
          text: 'Test comment',
        });

        expect(scope.isDone()).toBe(true);
        expect(result.key).toBe('comment-123');
        expect(result.markdown).toBe('Test comment');
      });

      it('should add a comment with markdown formatting', async () => {
        const mockResponse = {
          issue: {
            key: 'ISSUE-789',
            comments: [
              {
                key: 'comment-456',
                login: 'test-user',
                htmlText: '<p>Test with <strong>markdown</strong></p>',
                markdown: 'Test with **markdown**',
                updatable: true,
                createdAt: '2024-01-01T11:00:00+0000',
              },
            ],
          },
        };

        const scope = nock(baseUrl)
          .post('/api/issues/add_comment', {
            issue: 'ISSUE-789',
            text: 'Test with **markdown**',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.addCommentToIssue({
          issueKey: 'ISSUE-789',
          text: 'Test with **markdown**',
        });

        expect(scope.isDone()).toBe(true);
        expect(result.markdown).toBe('Test with **markdown**');
        expect(result.htmlText).toBe('<p>Test with <strong>markdown</strong></p>');
      });
    });

    describe('assignIssue', () => {
      it('should assign an issue to a user', async () => {
        const issueKey = 'ISSUE-999';
        const assignee = 'john.doe';

        // Mock the assign API call
        const assignScope = nock(baseUrl)
          .post('/api/issues/assign', {
            issue: issueKey,
            assignee: assignee,
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200);

        // Mock the search API call
        const searchScope = nock(baseUrl)
          .get('/api/issues/search')
          .query({
            issues: issueKey,
            additionalFields: '_all',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            issues: [
              {
                key: issueKey,
                message: 'Test issue',
                component: 'src/test.js',
                assignee: assignee,
                assigneeName: 'John Doe',
                severity: 'MAJOR',
                type: 'BUG',
                status: 'OPEN',
              },
            ],
            total: 1,
          });

        const result = await client.assignIssue({
          issueKey,
          assignee,
        });

        expect(assignScope.isDone()).toBe(true);
        expect(searchScope.isDone()).toBe(true);
        expect(result.key).toBe(issueKey);
        expect((result as any).assignee).toBe(assignee);
      });

      it('should unassign an issue when assignee is not provided', async () => {
        const issueKey = 'ISSUE-888';

        // Mock the assign API call
        const assignScope = nock(baseUrl)
          .post('/api/issues/assign', {
            issue: issueKey,
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200);

        // Mock the search API call
        const searchScope = nock(baseUrl)
          .get('/api/issues/search')
          .query({
            issues: issueKey,
            additionalFields: '_all',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            issues: [
              {
                key: issueKey,
                message: 'Test issue',
                component: 'src/test.js',
                assignee: null,
                assigneeName: null,
                severity: 'MINOR',
                type: 'CODE_SMELL',
                status: 'OPEN',
              },
            ],
            total: 1,
          });

        const result = await client.assignIssue({
          issueKey,
        });

        expect(assignScope.isDone()).toBe(true);
        expect(searchScope.isDone()).toBe(true);
        expect(result.key).toBe(issueKey);
        expect((result as any).assignee).toBeNull();
      });
    });

    describe('confirmIssue', () => {
      it('should confirm an issue', async () => {
        const mockResponse = {
          issue: { key: 'ISSUE-123', status: 'CONFIRMED' },
          components: [],
          rules: [],
          users: [],
        };

        const scope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'confirm',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.confirmIssue({
          issueKey: 'ISSUE-123',
        });

        expect(scope.isDone()).toBe(true);
        expect(result.issue.status).toBe('CONFIRMED');
      });

      it('should confirm an issue with comment', async () => {
        const mockResponse = {
          issue: { key: 'ISSUE-123', status: 'CONFIRMED' },
          components: [],
          rules: [],
          users: [],
        };

        const commentScope = nock(baseUrl)
          .post('/api/issues/add_comment', {
            issue: 'ISSUE-123',
            text: 'Confirmed after review',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200);

        const transitionScope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'confirm',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.confirmIssue({
          issueKey: 'ISSUE-123',
          comment: 'Confirmed after review',
        });

        expect(commentScope.isDone()).toBe(true);
        expect(transitionScope.isDone()).toBe(true);
        expect(result.issue.status).toBe('CONFIRMED');
      });
    });

    describe('unconfirmIssue', () => {
      it('should unconfirm an issue', async () => {
        const mockResponse = {
          issue: { key: 'ISSUE-123', status: 'REOPENED' },
          components: [],
          rules: [],
          users: [],
        };

        const scope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'unconfirm',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.unconfirmIssue({
          issueKey: 'ISSUE-123',
        });

        expect(scope.isDone()).toBe(true);
        expect(result.issue.status).toBe('REOPENED');
      });
    });

    describe('resolveIssue', () => {
      it('should resolve an issue', async () => {
        const mockResponse = {
          issue: { key: 'ISSUE-123', status: 'RESOLVED', resolution: 'FIXED' },
          components: [],
          rules: [],
          users: [],
        };

        const scope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'resolve',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.resolveIssue({
          issueKey: 'ISSUE-123',
        });

        expect(scope.isDone()).toBe(true);
        expect(result.issue.status).toBe('RESOLVED');
        expect(result.issue.resolution).toBe('FIXED');
      });
    });

    describe('reopenIssue', () => {
      it('should reopen an issue', async () => {
        const mockResponse = {
          issue: { key: 'ISSUE-123', status: 'REOPENED' },
          components: [],
          rules: [],
          users: [],
        };

        const scope = nock(baseUrl)
          .post('/api/issues/do_transition', {
            issue: 'ISSUE-123',
            transition: 'reopen',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, mockResponse);

        const result = await client.reopenIssue({
          issueKey: 'ISSUE-123',
        });

        expect(scope.isDone()).toBe(true);
        expect(result.issue.status).toBe('REOPENED');
      });
    });
  });
});
