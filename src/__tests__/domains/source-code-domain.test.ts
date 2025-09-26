import nock from 'nock';
import { SourceCodeDomain } from '../../domains/source-code.js';
import { IssuesDomain } from '../../domains/issues.js';
import { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';

describe('SourceCodeDomain', () => {
  const baseUrl = 'https://sonarqube.example.com';
  const organization = 'test-org';
  let domain: SourceCodeDomain;
  let webApiClient: WebApiClient;
  let issuesDomain: IssuesDomain;

  beforeEach(() => {
    webApiClient = WebApiClient.withToken(baseUrl, 'test-token', { organization });
    issuesDomain = new IssuesDomain(webApiClient, organization);
    domain = new SourceCodeDomain(webApiClient, organization, issuesDomain);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getSourceCode', () => {
    const mockSourceResponse = [
      'public class Example {',
      '    public void method() {',
      '        // TODO: implement',
      '    }',
      '}',
    ].join('\n');

    const mockIssuesResponse = {
      paging: { pageIndex: 1, pageSize: 100, total: 2 },
      issues: [
        {
          key: 'issue1',
          rule: 'squid:S1234',
          component: 'com.example:Example.java',
          project: 'com.example',
          line: 2,
          message: 'Fix this issue',
          severity: 'MAJOR',
          status: 'OPEN',
          type: 'BUG',
          textRange: {
            startLine: 2,
            endLine: 2,
            startOffset: 10,
            endOffset: 20,
          },
          tags: [],
          creationDate: '2023-01-01T00:00:00Z',
          updateDate: '2023-01-01T00:00:00Z',
        },
        {
          key: 'issue2',
          rule: 'squid:S5678',
          component: 'com.example:Example.java',
          project: 'com.example',
          line: 3,
          message: 'Another issue',
          severity: 'MINOR',
          status: 'OPEN',
          type: 'CODE_SMELL',
          tags: [],
          creationDate: '2023-01-01T00:00:00Z',
          updateDate: '2023-01-01T00:00:00Z',
        },
      ],
      components: [],
      rules: [],
    };

    it('should get source code with issues for all lines', async () => {
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({
          key: 'com.example:Example.java',
          organization,
        })
        .reply(200, mockSourceResponse);

      nock(baseUrl)
        .get('/api/issues/search')
        .query({
          projects: 'com.example:Example.java',
          onComponentOnly: 'true',
          organization,
        })
        .reply(200, mockIssuesResponse);

      const result = await domain.getSourceCode({
        key: 'com.example:Example.java',
      });

      expect(result.component.key).toBe('com.example:Example.java');
      expect(result.component.name).toBe('com.example:Example.java'); // name is the full key since there's no '/' in the path
      expect(result.component.qualifier).toBe('FIL');
      expect(result.sources).toHaveLength(5);
      expect(result.sources[0]).toEqual({
        line: 1,
        code: 'public class Example {',
        issues: undefined,
      });
      expect(result.sources[1]!.issues).toHaveLength(1);
      expect(result.sources[1]!.issues?.[0]!.key).toBe('issue1');
      expect(result.sources[2]!.issues).toHaveLength(1);
      expect(result.sources[2]!.issues?.[0]!.key).toBe('issue2');
    });

    it('should get source code with line range and branch', async () => {
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({
          key: 'com.example:Example.java',
          branch: 'feature-branch',
          organization,
        })
        .reply(200, mockSourceResponse);

      nock(baseUrl)
        .get('/api/issues/search')
        .query({
          projects: 'com.example:Example.java',
          branch: 'feature-branch',
          onComponentOnly: 'true',
          organization,
        })
        .reply(200, { ...mockIssuesResponse, issues: [] });

      const result = await domain.getSourceCode({
        key: 'com.example:Example.java',
        from: 2,
        to: 4,
        branch: 'feature-branch',
      });

      expect(result.sources).toHaveLength(3);
      expect(result.sources[0]!.line).toBe(2);
      expect(result.sources[2]!.line).toBe(4);
    });

    it('should get source code for pull request', async () => {
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({
          key: 'com.example:Example.java',
          pullRequest: '123',
          organization,
        })
        .reply(200, mockSourceResponse);

      nock(baseUrl)
        .get('/api/issues/search')
        .query({
          projects: 'com.example:Example.java',
          pullRequest: '123',
          onComponentOnly: 'true',
          organization,
        })
        .reply(200, { ...mockIssuesResponse, issues: [] });

      const result = await domain.getSourceCode({
        key: 'com.example:Example.java',
        pullRequest: '123',
      });

      expect(result.sources).toHaveLength(5);
    });

    it('should handle source code without issues domain', async () => {
      const domainWithoutIssues = new SourceCodeDomain(webApiClient, organization);

      nock(baseUrl)
        .get('/api/sources/raw')
        .query({
          key: 'com.example:Example.java',
          organization,
        })
        .reply(200, mockSourceResponse);

      const result = await domainWithoutIssues.getSourceCode({
        key: 'com.example:Example.java',
      });

      expect(result.sources).toHaveLength(5);
      expect(result.sources[0]!.issues).toBeUndefined();
    });

    it('should handle error when fetching issues', async () => {
      nock(baseUrl)
        .get('/api/sources/raw')
        .query({
          key: 'com.example:Example.java',
          organization,
        })
        .reply(200, mockSourceResponse);

      nock(baseUrl)
        .get('/api/issues/search')
        .query({
          projects: 'com.example:Example.java',
          onComponentOnly: 'true',
          organization,
        })
        .reply(500, 'Internal Server Error');

      const result = await domain.getSourceCode({
        key: 'com.example:Example.java',
      });

      // Should still return source code without issues
      expect(result.sources).toHaveLength(5);
      expect(result.sources[0]!.issues).toBeUndefined();
    });
  });

  describe('getScmBlame', () => {
    const mockScmResponse = {
      scm: [
        ['abc123', 'john.doe@example.com', '2023-01-01T00:00:00Z'],
        ['def456', 'jane.doe@example.com', '2023-01-02T00:00:00Z'],
      ],
    };

    it('should get SCM blame information', async () => {
      nock(baseUrl)
        .get('/api/sources/scm')
        .query({
          key: 'com.example:Example.java',
          organization,
        })
        .reply(200, mockScmResponse);

      const result = await domain.getScmBlame({
        key: 'com.example:Example.java',
      });

      expect(result).toEqual(mockScmResponse);
    });

    it('should get SCM blame with line range', async () => {
      nock(baseUrl)
        .get('/api/sources/scm')
        .query({
          key: 'com.example:Example.java',
          from: 1,
          to: 3,
          organization,
        })
        .reply(200, mockScmResponse);

      const result = await domain.getScmBlame({
        key: 'com.example:Example.java',
        from: 1,
        to: 3,
      });

      expect(result).toEqual(mockScmResponse);
    });
  });
});
