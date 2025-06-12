import type {
  IssuesParams,
  SonarQubeIssuesResult,
  SonarQubeIssue,
  SonarQubeRule,
  SonarQubeIssueComment,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  AssignIssueParams,
  DoTransitionResponse,
} from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for issues-related operations
 */
export class IssuesDomain extends BaseDomain {
  /**
   * Gets issues for a project in SonarQube
   * @param params Parameters including project key, severity, pagination and organization
   * @returns Promise with the list of issues
   */
  async getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult> {
    const { page, pageSize } = params;
    const builder = this.webApiClient.issues.search();

    // Apply all filters using helper methods
    this.applyComponentFilters(builder, params);
    this.applyIssueFilters(builder, params);
    this.applyDateAndAssignmentFilters(builder, params);
    this.applySecurityAndMetadataFilters(builder, params);

    // Add pagination
    if (page !== undefined) {
      builder.page(page);
    }
    if (pageSize !== undefined) {
      builder.pageSize(pageSize);
    }

    const response = await builder.execute();

    // Transform to our interface
    return {
      issues: response.issues as SonarQubeIssue[],
      components: response.components ?? [],
      rules: (response.rules ?? []) as SonarQubeRule[],
      users: response.users,
      facets: response.facets,
      paging: response.paging ?? { pageIndex: 1, pageSize: 100, total: 0 },
    };
  }

  /**
   * Apply component-related filters to the issues search builder
   * @param builder The search builder
   * @param params The issues parameters
   */
  private applyComponentFilters(
    builder: ReturnType<typeof this.webApiClient.issues.search>,
    params: IssuesParams
  ): void {
    // Component filters
    if (params.projectKey) {
      builder.withProjects([params.projectKey]);
    }
    if (params.projects) {
      builder.withProjects(params.projects);
    }
    if (params.componentKeys) {
      builder.withComponents(params.componentKeys);
    }
    if (params.components) {
      builder.withComponents(params.components);
    }
    if (params.onComponentOnly) {
      builder.onComponentOnly();
    }

    // Branch and PR
    if (params.branch) {
      builder.onBranch(params.branch);
    }
    if (params.pullRequest) {
      builder.onPullRequest(params.pullRequest);
    }
  }

  /**
   * Apply issue-related filters to the search builder
   * @param builder The search builder
   * @param params The issues parameters
   */
  private applyIssueFilters(
    builder: ReturnType<typeof this.webApiClient.issues.search>,
    params: IssuesParams
  ): void {
    // Issue filters
    if (params.issues) {
      builder.withIssues(params.issues);
    }
    if (params.severities) {
      builder.withSeverities(params.severities);
    }
    if (params.statuses) {
      builder.withStatuses(params.statuses);
    }
    if (params.resolutions) {
      builder.withResolutions(params.resolutions);
    }
    if (params.resolved !== undefined) {
      if (params.resolved) {
        builder.onlyResolved();
      } else {
        builder.onlyUnresolved();
      }
    }
    if (params.types) {
      builder.withTypes(params.types);
    }

    // Clean Code taxonomy
    if (params.cleanCodeAttributeCategories) {
      builder.withCleanCodeAttributeCategories(params.cleanCodeAttributeCategories);
    }
    if (params.impactSeverities) {
      builder.withImpactSeverities(params.impactSeverities);
    }
    if (params.impactSoftwareQualities) {
      builder.withImpactSoftwareQualities(params.impactSoftwareQualities);
    }
    if (params.issueStatuses) {
      builder.withIssueStatuses(params.issueStatuses);
    }

    // Rules and tags
    if (params.rules) {
      builder.withRules(params.rules);
    }
    if (params.tags) {
      builder.withTags(params.tags);
    }
  }

  /**
   * Apply date and assignment filters to the search builder
   * @param builder The search builder
   * @param params The issues parameters
   */
  private applyDateAndAssignmentFilters(
    builder: ReturnType<typeof this.webApiClient.issues.search>,
    params: IssuesParams
  ): void {
    // Date filters
    if (params.createdAfter) {
      builder.createdAfter(params.createdAfter);
    }
    if (params.createdBefore) {
      builder.createdBefore(params.createdBefore);
    }
    if (params.createdAt) {
      builder.createdAt(params.createdAt);
    }
    if (params.createdInLast) {
      builder.createdInLast(params.createdInLast);
    }

    // Assignment
    if (params.assigned !== undefined) {
      if (params.assigned) {
        builder.onlyAssigned();
      } else {
        builder.onlyUnassigned();
      }
    }
    if (params.assignees) {
      builder.assignedToAny(params.assignees);
    }
    if (params.author) {
      builder.byAuthor(params.author);
    }
    if (params.authors) {
      builder.byAuthors(params.authors);
    }
  }

  /**
   * Apply security standards and metadata filters to the search builder
   * @param builder The search builder
   * @param params The issues parameters
   */
  private applySecurityAndMetadataFilters(
    builder: ReturnType<typeof this.webApiClient.issues.search>,
    params: IssuesParams
  ): void {
    // Security standards
    if (params.cwe) {
      builder.withCwe(params.cwe);
    }
    if (params.owaspTop10) {
      builder.withOwaspTop10(params.owaspTop10);
    }
    if (params.owaspTop10v2021) {
      builder.withOwaspTop10v2021(params.owaspTop10v2021);
    }
    if (params.sansTop25) {
      builder.withSansTop25(params.sansTop25);
    }
    if (params.sonarsourceSecurity) {
      builder.withSonarSourceSecurity(params.sonarsourceSecurity);
    }
    if (params.sonarsourceSecurityCategory) {
      builder.withSonarSourceSecurityNew(params.sonarsourceSecurityCategory);
    }

    // Languages
    if (params.languages) {
      builder.withLanguages(params.languages);
    }

    // Facets
    if (params.facets) {
      builder.withFacets(params.facets);
    }
    if (params.facetMode) {
      builder.withFacetMode(params.facetMode);
    }

    // New code
    if (params.sinceLeakPeriod) {
      builder.sinceLeakPeriod();
    }
    if (params.inNewCodePeriod) {
      builder.inNewCodePeriod();
    }

    // Sorting
    if (params.s) {
      builder.sortBy(params.s, params.asc);
    }

    // Additional fields
    if (params.additionalFields) {
      builder.withAdditionalFields(params.additionalFields);
    }

    // Deprecated parameters
    // Note: hotspots parameter is deprecated and not supported by the current API
    if (params.severity) {
      builder.withSeverities([params.severity]);
    }
  }

  /**
   * Mark an issue as false positive
   * @param params Parameters including issue key and optional comment
   * @returns Promise with the updated issue and related data
   */
  async markIssueFalsePositive(
    params: MarkIssueFalsePositiveParams
  ): Promise<DoTransitionResponse> {
    const request = {
      issue: params.issueKey,
      transition: 'falsepositive' as const,
    };

    // Add comment if provided (using separate API call if needed)
    if (params.comment) {
      // First add the comment, then perform the transition
      await this.webApiClient.issues.addComment({
        issue: params.issueKey,
        text: params.comment,
      });
    }

    return this.webApiClient.issues.doTransition(request);
  }

  /**
   * Mark an issue as won't fix
   * @param params Parameters including issue key and optional comment
   * @returns Promise with the updated issue and related data
   */
  async markIssueWontFix(params: MarkIssueWontFixParams): Promise<DoTransitionResponse> {
    const request = {
      issue: params.issueKey,
      transition: 'wontfix' as const,
    };

    // Add comment if provided (using separate API call if needed)
    if (params.comment) {
      // First add the comment, then perform the transition
      await this.webApiClient.issues.addComment({
        issue: params.issueKey,
        text: params.comment,
      });
    }

    return this.webApiClient.issues.doTransition(request);
  }

  /**
   * Mark multiple issues as false positive
   * @param params Parameters including issue keys and optional comment
   * @returns Promise with array of updated issues and related data
   */
  async markIssuesFalsePositive(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]> {
    return Promise.all(
      params.issueKeys.map((issueKey) =>
        this.markIssueFalsePositive({
          issueKey,
          comment: params.comment,
        })
      )
    );
  }

  /**
   * Mark multiple issues as won't fix
   * @param params Parameters including issue keys and optional comment
   * @returns Promise with array of updated issues and related data
   */
  async markIssuesWontFix(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]> {
    const results: DoTransitionResponse[] = [];

    for (const issueKey of params.issueKeys) {
      const result = await this.markIssueWontFix({
        issueKey,
        comment: params.comment,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Add a comment to an issue
   * @param params Parameters including issue key and comment text
   * @returns Promise with the created comment details
   */
  async addCommentToIssue(params: AddCommentToIssueParams): Promise<SonarQubeIssueComment> {
    const response = await this.webApiClient.issues.addComment({
      issue: params.issueKey,
      text: params.text,
    });

    // The API returns the full issue with comments, so we need to extract the latest comment
    const issue = response.issue as SonarQubeIssue;
    const comments = issue.comments || [];

    // Sort comments by timestamp to ensure chronological order
    comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // The newly added comment should now be the last one
    const newComment = comments[comments.length - 1];
    if (!newComment) {
      throw new Error('Failed to retrieve the newly added comment');
    }

    return newComment;
  }

  /**
   * Assign an issue to a user
   * @param params Assignment parameters
   * @returns The updated issue details
   */
  async assignIssue(params: AssignIssueParams): Promise<SonarQubeIssue> {
    // Call the assign API
    await this.webApiClient.issues.assign({
      issue: params.issueKey,
      assignee: params.assignee,
    });

    // Fetch and return the updated issue using the same search as getIssues
    const searchBuilder = this.webApiClient.issues.search();
    searchBuilder.withIssues([params.issueKey]);
    searchBuilder.withAdditionalFields(['_all']);

    const response = await searchBuilder.execute();

    if (!response.issues || response.issues.length === 0) {
      throw new Error(`Issue ${params.issueKey} not found after assignment`);
    }

    return response.issues[0] as SonarQubeIssue;
  }
}
