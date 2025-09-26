import type { IssuesParams } from '../types/index.js';
import { nullToUndefined } from './transforms.js';

/**
 * Maps MCP tool parameters to SonarQube client parameters
 * @param params Parameters from the MCP tool
 * @returns Parameters for the SonarQube client
 */
export function mapToSonarQubeParams(params: Record<string, unknown>): IssuesParams {
  const result: IssuesParams = {
    page: undefined,
    pageSize: undefined,
  };

  // Helper function to add property only if not undefined
  const addIfDefined = <K extends keyof IssuesParams>(
    key: K,
    value: IssuesParams[K] | undefined
  ): void => {
    if (value !== undefined) {
      result[key] = value;
    }
  };

  // Component filters (support both single project_key and multiple projects)
  addIfDefined('projectKey', nullToUndefined(params.project_key) as string | undefined);
  addIfDefined('projects', nullToUndefined(params.projects) as string[] | undefined);
  addIfDefined('componentKeys', nullToUndefined(params.component_keys) as string[] | undefined);
  addIfDefined('components', nullToUndefined(params.components) as string[] | undefined);
  addIfDefined('onComponentOnly', nullToUndefined(params.on_component_only) as boolean | undefined);
  addIfDefined('directories', nullToUndefined(params.directories) as string[] | undefined);
  addIfDefined('files', nullToUndefined(params.files) as string[] | undefined);
  addIfDefined('scopes', nullToUndefined(params.scopes) as IssuesParams['scopes']);

  // Branch and PR support
  addIfDefined('branch', nullToUndefined(params.branch) as string | undefined);
  addIfDefined('pullRequest', nullToUndefined(params.pull_request) as string | undefined);

  // Issue filters
  addIfDefined('issues', nullToUndefined(params.issues) as string[] | undefined);
  addIfDefined('severity', nullToUndefined(params.severity) as IssuesParams['severity']); // Deprecated
  addIfDefined('severities', nullToUndefined(params.severities) as IssuesParams['severities']);
  addIfDefined('statuses', nullToUndefined(params.statuses) as IssuesParams['statuses']);
  addIfDefined('resolutions', nullToUndefined(params.resolutions) as IssuesParams['resolutions']);
  addIfDefined('resolved', nullToUndefined(params.resolved) as boolean | undefined);
  addIfDefined('types', nullToUndefined(params.types) as IssuesParams['types']);

  // Clean Code taxonomy
  addIfDefined(
    'cleanCodeAttributeCategories',
    nullToUndefined(
      params.clean_code_attribute_categories
    ) as IssuesParams['cleanCodeAttributeCategories']
  );
  addIfDefined(
    'impactSeverities',
    nullToUndefined(params.impact_severities) as IssuesParams['impactSeverities']
  );
  addIfDefined(
    'impactSoftwareQualities',
    nullToUndefined(params.impact_software_qualities) as IssuesParams['impactSoftwareQualities']
  );
  addIfDefined(
    'issueStatuses',
    nullToUndefined(params.issue_statuses) as IssuesParams['issueStatuses']
  );

  // Rules and tags
  addIfDefined('rules', nullToUndefined(params.rules) as string[] | undefined);
  addIfDefined('tags', nullToUndefined(params.tags) as string[] | undefined);

  // Date filters
  addIfDefined('createdAfter', nullToUndefined(params.created_after) as string | undefined);
  addIfDefined('createdBefore', nullToUndefined(params.created_before) as string | undefined);
  addIfDefined('createdAt', nullToUndefined(params.created_at) as string | undefined);
  addIfDefined('createdInLast', nullToUndefined(params.created_in_last) as string | undefined);

  // Assignment
  addIfDefined('assigned', nullToUndefined(params.assigned) as boolean | undefined);
  addIfDefined('assignees', nullToUndefined(params.assignees) as string[] | undefined);
  addIfDefined('author', nullToUndefined(params.author) as string | undefined);
  addIfDefined('authors', nullToUndefined(params.authors) as string[] | undefined);

  // Security standards
  addIfDefined('cwe', nullToUndefined(params.cwe) as string[] | undefined);
  addIfDefined('owaspTop10', nullToUndefined(params.owasp_top10) as string[] | undefined);
  addIfDefined(
    'owaspTop10v2021',
    nullToUndefined(params.owasp_top10_v2021) as string[] | undefined
  );
  addIfDefined('sansTop25', nullToUndefined(params.sans_top25) as string[] | undefined);
  addIfDefined(
    'sonarsourceSecurity',
    nullToUndefined(params.sonarsource_security) as string[] | undefined
  );
  addIfDefined(
    'sonarsourceSecurityCategory',
    nullToUndefined(params.sonarsource_security_category) as string[] | undefined
  );

  // Languages
  addIfDefined('languages', nullToUndefined(params.languages) as string[] | undefined);

  // Facets
  addIfDefined('facets', nullToUndefined(params.facets) as string[] | undefined);
  addIfDefined('facetMode', nullToUndefined(params.facet_mode) as IssuesParams['facetMode']);

  // New code
  addIfDefined('sinceLeakPeriod', nullToUndefined(params.since_leak_period) as boolean | undefined);
  addIfDefined(
    'inNewCodePeriod',
    nullToUndefined(params.in_new_code_period) as boolean | undefined
  );

  // Sorting
  addIfDefined('s', nullToUndefined(params.s) as string | undefined);
  addIfDefined('asc', nullToUndefined(params.asc) as boolean | undefined);

  // Response optimization
  addIfDefined(
    'additionalFields',
    nullToUndefined(params.additional_fields) as string[] | undefined
  );

  // Pagination
  addIfDefined('page', nullToUndefined(params.page) as number | undefined);
  addIfDefined('pageSize', nullToUndefined(params.page_size) as number | undefined);

  return result;
}
