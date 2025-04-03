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
        .basicAuth({ user: token, pass: '' })
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
        .basicAuth({ user: token, pass: '' })
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
        .basicAuth({ user: token, pass: '' })
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
          componentKeys: 'project1',
          severities: 'CRITICAL',
          p: 1,
          ps: 5,
        })
        .basicAuth({ user: token, pass: '' })
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
            queryObj.componentKeys === 'project1' &&
            queryObj.statuses === 'RESOLVED,CLOSED' &&
            queryObj.types === 'CODE_SMELL' &&
            queryObj.tags === 'code-smell,performance' &&
            queryObj.createdAfter === '2023-01-01' &&
            queryObj.languages === 'java,typescript'
          );
        })
        .basicAuth({ user: token, pass: '' })
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
            queryObj.componentKeys === 'project1' &&
            queryObj.resolved === 'false' &&
            queryObj.sinceLeakPeriod === 'true' &&
            queryObj.inNewCodePeriod === 'true'
          );
        })
        .basicAuth({ user: token, pass: '' })
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
});
