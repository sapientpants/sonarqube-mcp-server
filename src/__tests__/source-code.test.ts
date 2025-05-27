import nock from 'nock';
import {
  createSonarQubeClient,
  SonarQubeClient,
  SourceCodeParams,
  ScmBlameParams,
} from '../sonarqube.js';
import { handleSonarQubeGetSourceCode, handleSonarQubeGetScmBlame } from '../index.js';

describe('SonarQube Source Code API', () => {
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

  describe('getSourceCode', () => {
    it('should return source code for a component', async () => {
      const params: SourceCodeParams = {
        key: 'my-project:src/main.js',
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          longName: 'my-project:src/main.js',
        },
        sources: [
          {
            line: 1,
            code: 'function main() {',
            issues: undefined,
          },
          {
            line: 2,
            code: '  console.log("Hello, world!");',
            issues: [
              {
                key: 'issue1',
                rule: 'javascript:S2228',
                severity: 'MINOR',
                component: 'my-project:src/main.js',
                project: 'my-project',
                line: 2,
                status: 'OPEN',
                message: 'Use a logger instead of console.log',
                effort: '5min',
                type: 'CODE_SMELL',
              },
            ],
          },
          {
            line: 3,
            code: '}',
            issues: undefined,
          },
        ],
      };

      // Mock the source code API call - raw endpoint returns plain text
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({ key: params.key })
        .reply(200, 'function main() {\n  console.log("Hello, world!");\n}');

      // Mock the issues API call
      nock(baseUrl)
        .get('/api/issues/search')
        .query(
          (queryObj) => queryObj.projects === params.key && queryObj.onComponentOnly === 'true'
        )
        .reply(200, {
          issues: [
            {
              key: 'issue1',
              rule: 'javascript:S1848',
              severity: 'MAJOR',
              component: 'my-project:src/main.js',
              project: 'my-project',
              line: 2,
              message: 'Use a logger instead of console.log',
              tags: ['bad-practice'],
              creationDate: '2021-01-01T00:00:00Z',
              updateDate: '2021-01-01T00:00:00Z',
              status: 'OPEN',
              effort: '5min',
              type: 'CODE_SMELL',
            },
          ],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
        });

      const result = await client.getSourceCode(params);

      // The result should include the source code with issue annotations
      expect(result.component).toEqual(mockResponse.component);
      expect(result.sources.length).toBe(3);

      // Line 2 should have an issue associated with it
      expect(result.sources[1].line).toBe(2);
      expect(result.sources[1].code).toBe('  console.log("Hello, world!");');
      expect(result.sources[1].issues).toBeDefined();
      expect(result.sources[1].issues?.[0].message).toBe('Use a logger instead of console.log');
    });

    it('should handle errors in issues retrieval', async () => {
      const params: SourceCodeParams = {
        key: 'my-project:src/main.js',
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          longName: 'my-project:src/main.js',
        },
        sources: [
          {
            line: 1,
            code: 'function main() {',
          },
        ],
      };

      // Mock the source code API call - raw endpoint returns plain text
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({ key: params.key })
        .reply(200, 'function main() {');

      // Mock a failed issues API call
      nock(baseUrl)
        .get('/api/issues/search')
        .query(
          (queryObj) => queryObj.projects === params.key && queryObj.onComponentOnly === 'true'
        )
        .replyWithError('Issues API error');

      const result = await client.getSourceCode(params);

      // Should return the source without annotations
      expect(result).toEqual(mockResponse);
    });

    it('should return source code without annotations when key is not provided', async () => {
      const params: SourceCodeParams = {
        key: '',
      };

      // Mock the source code API call - raw endpoint returns plain text
      nock(baseUrl).get('/api/sources/raw').query(true).reply(200, 'function main() {');

      const result = await client.getSourceCode(params);

      // Should return the source without annotations
      // When key is empty, component fields will be empty
      expect(result).toEqual({
        component: {
          key: '',
          qualifier: 'FIL',
          name: '',
          longName: '',
        },
        sources: [
          {
            line: 1,
            code: 'function main() {',
          },
        ],
      });
    });

    it('should return source code with line range', async () => {
      const params: SourceCodeParams = {
        key: 'my-project:src/main.js',
        from: 2,
        to: 2,
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          longName: 'my-project:src/main.js',
        },
        sources: [
          {
            line: 1,
            code: 'function main() {',
          },
          {
            line: 2,
            code: '  console.log("Hello, world!");',
          },
          {
            line: 3,
            code: '}',
          },
        ],
      };

      // Mock the raw source code API call - returns plain text with multiple lines
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({ key: params.key })
        .reply(200, 'function main() {\n  console.log("Hello, world!");\n}');

      // Mock the issues API call (no issues this time)
      nock(baseUrl)
        .get('/api/issues/search')
        .query(
          (queryObj) => queryObj.projects === params.key && queryObj.onComponentOnly === 'true'
        )
        .reply(200, {
          issues: [],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      const result = await client.getSourceCode(params);

      expect(result.component).toEqual(mockResponse.component);
      expect(result.sources.length).toBe(1);
      expect(result.sources[0].line).toBe(2);
      expect(result.sources[0].issues).toBeUndefined();
    });

    it('handler should return source code in the expected format', async () => {
      const params: SourceCodeParams = {
        key: 'my-project:src/main.js',
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          longName: 'my-project:src/main.js',
        },
        sources: [
          {
            line: 1,
            code: 'function main() {',
          },
        ],
      };

      // Mock the raw source code API call - returns plain text
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({ key: params.key })
        .reply(200, 'function main() {');

      // Mock the issues API call
      nock(baseUrl)
        .get('/api/issues/search')
        .query(
          (queryObj) => queryObj.projects === params.key && queryObj.onComponentOnly === 'true'
        )
        .reply(200, {
          issues: [],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      const response = await handleSonarQubeGetSourceCode(params, client);
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsedContent = JSON.parse(response.content[0].text);
      expect(parsedContent.component).toEqual(mockResponse.component);
    });
  });

  describe('getScmBlame', () => {
    it('should return SCM blame information', async () => {
      const params: ScmBlameParams = {
        key: 'my-project:src/main.js',
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          path: 'src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          language: 'js',
        },
        sources: {
          '1': {
            revision: 'abc123',
            date: '2021-01-01T00:00:00Z',
            author: 'developer',
          },
          '2': {
            revision: 'def456',
            date: '2021-01-02T00:00:00Z',
            author: 'another-dev',
          },
          '3': {
            revision: 'abc123',
            date: '2021-01-01T00:00:00Z',
            author: 'developer',
          },
        },
      };

      nock(baseUrl).get('/api/sources/scm').query({ key: params.key }).reply(200, mockResponse);

      const result = await client.getScmBlame(params);

      expect(result.component).toEqual(mockResponse.component);
      expect(Object.keys(result.sources).length).toBe(3);
      expect(result.sources['1'].author).toBe('developer');
      expect(result.sources['2'].author).toBe('another-dev');
      expect(result.sources['1'].revision).toBe('abc123');
    });

    it('should return SCM blame for specific line range', async () => {
      const params: ScmBlameParams = {
        key: 'my-project:src/main.js',
        from: 2,
        to: 2,
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          path: 'src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          language: 'js',
        },
        sources: {
          '2': {
            revision: 'def456',
            date: '2021-01-02T00:00:00Z',
            author: 'another-dev',
          },
        },
      };

      nock(baseUrl)
        .get('/api/sources/scm')
        .query({ key: params.key, from: params.from, to: params.to })
        .reply(200, mockResponse);

      const result = await client.getScmBlame(params);

      expect(result.component).toEqual(mockResponse.component);
      expect(Object.keys(result.sources).length).toBe(1);
      expect(Object.keys(result.sources)[0]).toBe('2');
      expect(result.sources['2'].author).toBe('another-dev');
    });

    it('handler should return SCM blame in the expected format', async () => {
      const params: ScmBlameParams = {
        key: 'my-project:src/main.js',
      };

      const mockResponse = {
        component: {
          key: 'my-project:src/main.js',
          path: 'src/main.js',
          qualifier: 'FIL',
          name: 'main.js',
          language: 'js',
        },
        sources: {
          '1': {
            revision: 'abc123',
            date: '2021-01-01T00:00:00Z',
            author: 'developer',
          },
        },
      };

      nock(baseUrl).get('/api/sources/scm').query({ key: params.key }).reply(200, mockResponse);

      const response = await handleSonarQubeGetScmBlame(params, client);
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');

      const parsedContent = JSON.parse(response.content[0].text);
      expect(parsedContent.component).toEqual(mockResponse.component);
      expect(parsedContent.sources['1'].author).toBe('developer');
    });
  });
});
