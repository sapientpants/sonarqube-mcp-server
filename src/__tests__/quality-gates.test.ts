import nock from 'nock';
import { createSonarQubeClient, SonarQubeClient, ProjectQualityGateParams } from '../sonarqube.js';
import {
  handleSonarQubeListQualityGates,
  handleSonarQubeGetQualityGate,
  handleSonarQubeQualityGateStatus,
} from '../index.js';

describe('SonarQube Quality Gates API', () => {
  const baseUrl = 'https://sonarcloud.io';
  const token = 'fake-token';
  let client: SonarQubeClient;

  beforeEach(() => {
    client = createSonarQubeClient(token, baseUrl) as SonarQubeClient;
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('listQualityGates', () => {
    it('should return a list of quality gates', async () => {
      const mockResponse = {
        qualitygates: [
          {
            id: '1',
            name: 'Sonar way',
            isDefault: true,
            isBuiltIn: true,
          },
          {
            id: '2',
            name: 'Custom Quality Gate',
            isDefault: false,
            isBuiltIn: false,
          },
        ],
        default: '1',
        actions: {
          create: true,
        },
      };

      nock(baseUrl)
        .get('/api/qualitygates/list')
        .query(() => true)
        .reply(200, mockResponse);

      const result = await client.listQualityGates();
      expect(result).toEqual(mockResponse);
    });

    it('handler should return quality gates in the expected format', async () => {
      const mockResponse = {
        qualitygates: [
          {
            id: '1',
            name: 'Sonar way',
            isDefault: true,
            isBuiltIn: true,
          },
        ],
        default: '1',
      };

      nock(baseUrl)
        .get('/api/qualitygates/list')
        .query(() => true)
        .reply(200, mockResponse);

      const response = await handleSonarQubeListQualityGates(client);
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsedContent = JSON.parse(response.content[0].text);
      expect(parsedContent).toEqual(mockResponse);
    });
  });

  describe('getQualityGate', () => {
    it('should return quality gate details including conditions', async () => {
      const gateId = '1';
      const mockResponse = {
        id: '1',
        name: 'Sonar way',
        isDefault: true,
        isBuiltIn: true,
        conditions: [
          {
            id: '3',
            metric: 'new_coverage',
            op: 'LT',
            error: '80',
          },
          {
            id: '4',
            metric: 'new_bugs',
            op: 'GT',
            error: '0',
          },
        ],
      };

      nock(baseUrl).get('/api/qualitygates/show').query({ id: gateId }).reply(200, mockResponse);

      const result = await client.getQualityGate(gateId);
      expect(result).toEqual(mockResponse);
    });

    it('handler should return quality gate details in the expected format', async () => {
      const gateId = '1';
      const mockResponse = {
        id: '1',
        name: 'Sonar way',
        conditions: [
          {
            id: '3',
            metric: 'new_coverage',
            op: 'LT',
            error: '80',
          },
        ],
      };

      nock(baseUrl).get('/api/qualitygates/show').query({ id: gateId }).reply(200, mockResponse);

      const response = await handleSonarQubeGetQualityGate({ id: gateId }, client);
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsedContent = JSON.parse(response.content[0].text);
      expect(parsedContent).toEqual(mockResponse);
    });
  });

  describe('getProjectQualityGateStatus', () => {
    it('should return the quality gate status for a project', async () => {
      const params: ProjectQualityGateParams = {
        projectKey: 'my-project',
      };

      const mockResponse = {
        projectStatus: {
          status: 'OK',
          conditions: [
            {
              status: 'OK',
              metricKey: 'new_reliability_rating',
              comparator: 'GT',
              errorThreshold: '1',
              actualValue: '1',
            },
            {
              status: 'ERROR',
              metricKey: 'new_security_rating',
              comparator: 'GT',
              errorThreshold: '1',
              actualValue: '2',
            },
          ],
          periods: [
            {
              index: 1,
              mode: 'previous_version',
              date: '2020-01-01T00:00:00+0000',
            },
          ],
          ignoredConditions: false,
        },
      };

      nock(baseUrl)
        .get('/api/qualitygates/project_status')
        .query({ projectKey: params.projectKey })
        .reply(200, mockResponse);

      const result = await client.getProjectQualityGateStatus(params);
      expect(result).toEqual(mockResponse);
    });

    it('should include branch parameter if provided', async () => {
      const params: ProjectQualityGateParams = {
        projectKey: 'my-project',
        branch: 'feature/branch',
      };

      const mockResponse = {
        projectStatus: {
          status: 'OK',
          conditions: [],
          ignoredConditions: false,
        },
      };

      const scope = nock(baseUrl)
        .get('/api/qualitygates/project_status')
        .query({ projectKey: params.projectKey, branch: params.branch })
        .reply(200, mockResponse);

      const result = await client.getProjectQualityGateStatus(params);
      expect(result).toEqual(mockResponse);
      expect(scope.isDone()).toBe(true);
    });

    it('handler should return project quality gate status in the expected format', async () => {
      const params: ProjectQualityGateParams = {
        projectKey: 'my-project',
      };

      const mockResponse = {
        projectStatus: {
          status: 'OK',
          conditions: [],
          ignoredConditions: false,
        },
      };

      nock(baseUrl)
        .get('/api/qualitygates/project_status')
        .query({ projectKey: params.projectKey })
        .reply(200, mockResponse);

      const response = await handleSonarQubeQualityGateStatus(params, client);
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsedContent = JSON.parse(response.content[0].text);
      expect(parsedContent).toEqual(mockResponse);
    });
  });
});
