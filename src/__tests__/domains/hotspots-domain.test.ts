import nock from 'nock';
import { HotspotsDomain } from '../../domains/hotspots.js';
import { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';

describe('HotspotsDomain', () => {
  const baseUrl = 'https://sonarqube.example.com';
  const organization = 'test-org';
  let domain: HotspotsDomain;
  let webApiClient: WebApiClient;

  beforeEach(() => {
    webApiClient = WebApiClient.withToken(baseUrl, 'test-token', { organization });
    domain = new HotspotsDomain(webApiClient, organization);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('hotspots', () => {
    it('should search hotspots with all parameters', async () => {
      const mockResponse = {
        paging: { pageIndex: 1, pageSize: 100, total: 1 },
        hotspots: [
          {
            key: 'hotspot1',
            component: 'com.example:file.java',
            project: 'com.example',
            securityCategory: 'sql-injection',
            vulnerabilityProbability: 'HIGH',
            status: 'TO_REVIEW',
            line: 42,
            message: 'SQL injection vulnerability',
            author: 'user1',
            creationDate: '2023-01-01T00:00:00Z',
            updateDate: '2023-01-02T00:00:00Z',
          },
        ],
        components: [
          {
            key: 'com.example:file.java',
            qualifier: 'FIL',
            name: 'file.java',
            longName: 'src/main/java/com/example/file.java',
            path: 'src/main/java/com/example/file.java',
          },
        ],
      };

      nock(baseUrl)
        .get('/api/hotspots/search')
        .query({
          projectKey: 'test-project',
          status: 'TO_REVIEW',
          resolution: 'FIXED',
          files: 'file1.java,file2.java',
          onlyMine: 'true',
          sinceLeakPeriod: 'true',
          p: 2,
          ps: 50,
          organization,
        })
        .reply(200, mockResponse);

      const result = await domain.hotspots({
        projectKey: 'test-project',
        branch: 'main',
        pullRequest: '123',
        status: 'TO_REVIEW',
        resolution: 'FIXED',
        files: ['file1.java', 'file2.java'],
        assignedToMe: true,
        sinceLeakPeriod: true,
        inNewCodePeriod: true,
        page: 2,
        pageSize: 50,
      });

      expect(result).toEqual({
        hotspots: mockResponse.hotspots,
        components: mockResponse.components,
        paging: mockResponse.paging,
      });
    });

    it('should search hotspots with minimal parameters', async () => {
      const mockResponse = {
        paging: { pageIndex: 1, pageSize: 100, total: 0 },
        hotspots: [],
      };

      nock(baseUrl).get('/api/hotspots/search').query({ organization }).reply(200, mockResponse);

      const result = await domain.hotspots({ page: undefined, pageSize: undefined });

      expect(result).toEqual({
        hotspots: [],
        components: undefined,
        paging: mockResponse.paging,
      });
    });

    it('should handle hotspots without optional parameters', async () => {
      const mockResponse = {
        paging: { pageIndex: 1, pageSize: 100, total: 1 },
        hotspots: [
          {
            key: 'hotspot1',
            component: 'com.example:file.java',
            project: 'com.example',
            securityCategory: 'sql-injection',
            vulnerabilityProbability: 'HIGH',
            status: 'TO_REVIEW',
            line: 42,
            message: 'SQL injection vulnerability',
          },
        ],
      };

      nock(baseUrl)
        .get('/api/hotspots/search')
        .query({
          projectKey: 'test-project',
          organization,
        })
        .reply(200, mockResponse);

      const result = await domain.hotspots({
        projectKey: 'test-project',
        page: undefined,
        pageSize: undefined,
      });

      expect(result.hotspots).toHaveLength(1);
      expect(result.hotspots[0]!.key).toBe('hotspot1');
    });
  });

  describe('hotspot', () => {
    it('should get hotspot details', async () => {
      const mockApiResponse = {
        key: 'hotspot1',
        component: {
          key: 'com.example:file.java',
          qualifier: 'FIL',
          name: 'file.java',
        },
        project: {
          key: 'com.example',
          name: 'Example Project',
        },
        rule: {
          key: 'squid:S2077',
          name: 'SQL queries should not be vulnerable to injection attacks',
          securityCategory: 'sql-injection',
          vulnerabilityProbability: 'HIGH',
        },
        status: 'TO_REVIEW',
        line: 42,
        message: 'SQL injection vulnerability',
        author: {
          login: 'user1',
          name: 'User One',
        },
        creationDate: '2023-01-01T00:00:00Z',
        updateDate: '2023-01-02T00:00:00Z',
        changelog: [],
        comment: [],
      };

      nock(baseUrl)
        .get('/api/hotspots/show')
        .query({
          hotspot: 'hotspot1',
          organization,
        })
        .reply(200, mockApiResponse);

      const result = await domain.hotspot('hotspot1');

      expect(result.key).toBe('hotspot1');
      expect(result.component).toBe('com.example:file.java');
      expect(result.project).toBe('com.example');
      expect(result.securityCategory).toBe('sql-injection');
      expect(result.vulnerabilityProbability).toBe('HIGH');
      expect(result.status).toBe('TO_REVIEW');
      expect(result.author).toBe('user1');
      expect(result.rule).toEqual(mockApiResponse.rule);
    });
  });

  describe('updateHotspotStatus', () => {
    it('should update hotspot status with all parameters', async () => {
      const scope = nock(baseUrl)
        .post('/api/hotspots/change_status', {
          hotspot: 'hotspot1',
          status: 'REVIEWED',
          resolution: 'SAFE',
          comment: 'This is safe',
        })
        .query({ organization })
        .reply(204);

      await domain.updateHotspotStatus({
        hotspot: 'hotspot1',
        status: 'REVIEWED',
        resolution: 'SAFE',
        comment: 'This is safe',
      });

      expect(scope.isDone()).toBe(true);
    });

    it('should update hotspot status without optional parameters', async () => {
      const scope = nock(baseUrl)
        .post('/api/hotspots/change_status', {
          hotspot: 'hotspot1',
          status: 'TO_REVIEW',
        })
        .query({ organization })
        .reply(204);

      await domain.updateHotspotStatus({
        hotspot: 'hotspot1',
        status: 'TO_REVIEW',
      });

      expect(scope.isDone()).toBe(true);
    });
  });
});
