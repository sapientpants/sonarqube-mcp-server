import nock from 'nock';
import { SonarQubeClient } from '../sonarqube';

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
      expect(result.projects[0].key).toBe('project1');
      expect(result.projects[1].key).toBe('project2');
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
        organization: 'my-org',
      });

      // Should return transformed data with 'projects' instead of 'components'
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].key).toBe('project3');
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

      const result = await client.getIssues({ projectKey: 'project1' });
      expect(result).toEqual(mockResponse);
      expect(result.issues[0].cleanCodeAttribute).toBe('CLEAR');
      expect(result.issues[0].impacts?.[0].softwareQuality).toBe('SECURITY');
      expect(result.components[0].qualifier).toBe('FIL');
      expect(result.rules[0].lang).toBe('java');
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
      expect(result.metrics[0].key).toBe('team_size');
      expect(result.metrics[1].key).toBe('uncovered_lines');
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
      expect(result.metrics[0].key).toBe('code_coverage');
      expect(result.paging).toEqual(mockResponse.paging);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('getHealth', () => {
    it('should fetch health status successfully', async () => {
      const mockResponse = {
        health: 'GREEN',
        causes: [],
      };

      nock(baseUrl)
        .get('/api/system/health')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getHealth();
      expect(result).toEqual(mockResponse);
      expect(result.health).toBe('GREEN');
      expect(result.causes).toEqual([]);
    });

    it('should handle warning health status', async () => {
      const mockResponse = {
        health: 'YELLOW',
        causes: ['Disk space low'],
      };

      nock(baseUrl)
        .get('/api/system/health')
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getHealth();
      expect(result).toEqual(mockResponse);
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
      expect(result.component.measures[0].metric).toBe('complexity');
      expect(result.component.measures[0].value).toBe('42');
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
        metricKeys: 'coverage',
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

      nock(baseUrl)
        .get('/api/measures/components')
        .query((queryObj) => {
          return (
            queryObj.componentKeys === 'project1,project2' &&
            queryObj.metricKeys === 'bugs,vulnerabilities'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getComponentsMeasures({
        componentKeys: ['project1', 'project2'],
        metricKeys: ['bugs', 'vulnerabilities'],
      });

      expect(result).toEqual(mockResponse);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].key).toBe('project1');
      expect(result.components[1].key).toBe('project2');
      expect(result.components[0].measures).toHaveLength(2);
      expect(result.components[1].measures).toHaveLength(2);
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

      const scope = nock(baseUrl)
        .get('/api/measures/components')
        .query((queryObj) => {
          return (
            queryObj.componentKeys === 'project1,project2,project3' &&
            queryObj.metricKeys === 'code_smells' &&
            queryObj.p === '2' &&
            queryObj.ps === '1' &&
            queryObj.additionalFields === 'periods' &&
            queryObj.branch === 'main'
          );
        })
        .matchHeader('authorization', 'Bearer test-token')
        .reply(200, mockResponse);

      const result = await client.getComponentsMeasures({
        componentKeys: 'project1,project2,project3',
        metricKeys: 'code_smells',
        page: 2,
        pageSize: 1,
        additionalFields: ['periods'],
        branch: 'main',
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
      expect(result.components).toHaveLength(1);
      expect(result.paging.pageIndex).toBe(2);
      expect(result.paging.pageSize).toBe(1);
      expect(result.period?.mode).toBe('previous_version');
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
      });

      expect(result).toEqual(mockResponse);
      expect(result.measures).toHaveLength(2);
      expect(result.measures[0].metric).toBe('coverage');
      expect(result.measures[1].metric).toBe('bugs');
      expect(result.measures[0].history).toHaveLength(2);
      expect(result.measures[1].history).toHaveLength(2);
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
        metrics: 'code_smells',
        from: '2023-01-15',
        to: '2023-01-31',
        branch: 'main',
      });

      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
      expect(result.measures).toHaveLength(1);
      expect(result.measures[0].metric).toBe('code_smells');
      expect(result.measures[0].history).toHaveLength(2);
      expect(result.measures[0].history[0].date).toBe('2023-01-15T00:00:00+0000');
      expect(result.measures[0].history[1].date).toBe('2023-01-20T00:00:00+0000');
    });
  });
});
