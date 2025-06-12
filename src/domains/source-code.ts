import type {
  SourceCodeParams,
  ScmBlameParams,
  SonarQubeSourceResult,
  SonarQubeScmBlameResult,
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
        const issues = await this.issuesDomain.getIssues({
          projects: [key],
          branch,
          pullRequest,
          onComponentOnly: true,
        });

        // Map issues to source lines
        const sourceLines = sources.sources.map((line) => {
          const lineIssues = issues.issues.filter((issue) => issue.line === line.line);
          return {
            ...line,
            issues: lineIssues.length > 0 ? lineIssues : undefined,
          };
        });

        return {
          component: sources.component,
          sources: sourceLines,
        };
      } catch (error) {
        // Log the error for debugging but continue with source code without annotations
        this.logger.error('Failed to retrieve issues for source code annotation', error);
        // Return source code without issue annotations
        return sources;
      }
    }

    return sources;
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
