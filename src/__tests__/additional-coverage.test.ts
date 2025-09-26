import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';

describe('Lambda Handlers Coverage Tests', () => {
  beforeEach(() => {
    vi.resetModules();

    // Setup nock to mock SonarQube API responses
    nock('http://localhost:9000')
      .persist()
      .get('/api/metrics/search')
      .query(true)
      .reply(200, {
        metrics: [
          {
            key: 'test-metric',
            name: 'Test Metric',
            description: 'Test metric description',
            domain: 'test',
            type: 'INT',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      });

    nock('http://localhost:9000')
      .persist()
      .get('/api/measures/component')
      .query(true)
      .reply(200, {
        component: {
          key: 'test-component',
          name: 'Test Component',
          qualifier: 'TRK',
          measures: [
            {
              metric: 'coverage',
              value: '85.4',
            },
          ],
        },
        metrics: [
          {
            key: 'coverage',
            name: 'Coverage',
            description: 'Test coverage',
            domain: 'Coverage',
            type: 'PERCENT',
          },
        ],
      });

    nock('http://localhost:9000')
      .persist()
      .get('/api/measures/components')
      .query(true)
      .reply(200, {
        components: [
          {
            key: 'test-component-1',
            name: 'Test Component 1',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'coverage',
                value: '85.4',
              },
            ],
          },
        ],
        metrics: [
          {
            key: 'coverage',
            name: 'Coverage',
            description: 'Test coverage',
            domain: 'Coverage',
            type: 'PERCENT',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 1,
        },
      });

    nock('http://localhost:9000')
      .persist()
      .get('/api/measures/search_history')
      .query(true)
      .reply(200, {
        measures: [
          {
            metric: 'coverage',
            history: [
              {
                date: '2023-01-01T00:00:00+0000',
                value: '80.0',
              },
            ],
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 100,
          total: 1,
        },
      });

    // No need for this now since we're importing directly in each test
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // Import the module directly in each test to ensure it's available
  it('should call metricsHandler', async () => {
    const module = await import('../index.js');
    const result = await module.metricsHandler({ page: 1, page_size: 10 });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content?.[0]?.text).toBeDefined();
  });

  it('should call componentMeasuresHandler', async () => {
    const module = await import('../index.js');
    const result = await module.componentMeasuresHandler({
      component: 'test-component',
      metric_keys: ['coverage'],
      additional_fields: ['periods'],
      branch: 'main',
      pull_request: 'pr-123',
      period: '1',
    });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content?.[0]?.text).toBeDefined();
  });

  it('should call componentsMeasuresHandler', async () => {
    const module = await import('../index.js');
    const result = await module.componentsMeasuresHandler({
      component_keys: ['component1', 'component2'],
      metric_keys: ['coverage', 'bugs'],
      additional_fields: ['metrics'],
      branch: 'develop',
      pull_request: 'pr-456',
      period: '2',
      page: '1',
      page_size: '20',
    });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content?.[0]?.text).toBeDefined();
  });

  it('should call measuresHistoryHandler', async () => {
    const module = await import('../index.js');
    const result = await module.measuresHistoryHandler({
      component: 'test-component',
      metrics: ['coverage', 'bugs'],
      from: '2023-01-01',
      to: '2023-12-31',
      branch: 'feature',
      pull_request: 'pr-789',
      page: '1',
      page_size: '30',
    });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content?.[0]?.text).toBeDefined();
  });
});
