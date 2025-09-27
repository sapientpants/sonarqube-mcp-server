import type {
  SourceCodeParams,
  ScmBlameParams,
  SonarQubeSourceResult,
  SonarQubeScmBlameResult,
  SonarQubeSourceLine,
  IssuesParams,
} from '../types/index.js';
import type { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';
import type { IssuesDomain } from './issues.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for source code operations
 */
export class SourceCodeDomain extends BaseDomain {
  constructor(
    webApiClient: WebApiClient,
    organization: string | null,
    private readonly issuesDomain?: IssuesDomain
  ) {
    super(webApiClient, organization);
  }

  /**
   * Gets source code for a file
   * @param params Parameters including file key and line range
   * @returns Promise with the source code
   */
  async getSourceCode(params: SourceCodeParams): Promise<SonarQubeSourceResult> {
    const { key, from, to, branch, pullRequest } = params;

    // Get raw source code
    const response = await this.webApiClient.sources.raw({
      key,
      ...(branch && { branch }),
      ...(pullRequest && { pullRequest }),
    });

    // Transform the response to match our interface
    // The raw method returns a string with lines separated by newlines
    const lines = response.split('\n');
    let sourcesArray = lines.map((line, index) => ({
      line: index + 1,
      code: line,
    }));

    // Apply line range filtering if specified
    if (from !== undefined || to !== undefined) {
      const startLine = from ?? 1;
      const endLine = to ?? sourcesArray.length;
      sourcesArray = sourcesArray.filter(
        (source) => source.line >= startLine && source.line <= endLine
      );
    }

    const sources = {
      sources: sourcesArray,
      component: {
        key,
        qualifier: 'FIL', // Default for files
        name: key.split('/').pop() ?? key,
        longName: key,
      },
    };

    // Get issues for this component to annotate the source
    if (key && this.issuesDomain) {
      try {
        const issuesParams: IssuesParams = {
          projects: [key],
          onComponentOnly: true,
          page: 1,
          pageSize: 100,
        };
        if (params.branch) {
          issuesParams.branch = params.branch;
        }
        if (params.pullRequest) {
          issuesParams.pullRequest = params.pullRequest;
        }

        const issues = await this.issuesDomain.getIssues(issuesParams);

        // Map issues to source lines
        const sourceLines: SonarQubeSourceLine[] = sources.sources.map((line) => {
          const lineIssues = issues.issues.filter((issue) => issue.line === line.line);
          return {
            ...line,
            issues: lineIssues.length > 0 ? lineIssues : undefined,
          };
        });

        return {
          component: {
            key: sources.component.key,
            path: undefined,
            qualifier: sources.component.qualifier,
            name: sources.component.name,
            longName: sources.component.longName,
            language: undefined,
          },
          sources: sourceLines,
        };
      } catch (error) {
        // Log the error for debugging but continue with source code without annotations
        this.logger.error('Failed to retrieve issues for source code annotation', error);
        // Return source code without issue annotations
        return this.mapSourceToResult(sources);
      }
    }

    return this.mapSourceToResult(sources);
  }

  private mapSourceToResult(sources: {
    sources: Array<{
      line: number;
      code: string;
      scmAuthor?: string;
      scmDate?: string;
      scmRevision?: string;
      duplicated?: boolean;
      isNew?: boolean;
      lineHits?: number;
      conditions?: number;
      coveredConditions?: number;
      highlightedText?: string;
    }>;
    component: {
      key: string;
      path?: string;
      qualifier: string;
      name: string;
      longName?: string;
      language?: string;
    };
  }): SonarQubeSourceResult {
    const mappedSources: SonarQubeSourceLine[] = sources.sources.map((line) => ({
      line: line.line,
      code: line.code,
      scmAuthor: line.scmAuthor,
      scmDate: line.scmDate,
      scmRevision: line.scmRevision,
      duplicated: line.duplicated,
      isNew: line.isNew,
      lineHits: line.lineHits,
      conditions: line.conditions,
      coveredConditions: line.coveredConditions,
      highlightedText: line.highlightedText,
      issues: undefined,
    }));

    return {
      component: {
        key: sources.component.key,
        path: sources.component.path,
        qualifier: sources.component.qualifier,
        name: sources.component.name,
        longName: sources.component.longName,
        language: sources.component.language,
      },
      sources: mappedSources,
    };
  }

  /**
   * Gets SCM blame information for a file
   * @param params Parameters including file key and line range
   * @returns Promise with the SCM blame information
   */
  async getScmBlame(params: ScmBlameParams): Promise<SonarQubeScmBlameResult> {
    const { key, from, to } = params;

    const response = await this.webApiClient.sources.scm({
      key,
      ...(from && { from }),
      ...(to && { to }),
    });

    return response as unknown as SonarQubeScmBlameResult;
  }
}
