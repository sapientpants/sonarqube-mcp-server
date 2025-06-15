import type { IssuesParams } from '../types/index.js';
import { nullToUndefined } from './transforms.js';

/**
 * Maps MCP tool parameters to SonarQube client parameters
 * @param params Parameters from the MCP tool
 * @returns Parameters for the SonarQube client
 */
export function mapToSonarQubeParams(params: Record<string, unknown>): IssuesParams {
  return {
    // Component filters (support both single project_key and multiple projects)
    projectKey: nullToUndefined(params.project_key) as string | undefined,
    projects: nullToUndefined(params.projects) as string[] | undefined,
    componentKeys: nullToUndefined(params.component_keys) as string[] | undefined,
    components: nullToUndefined(params.components) as string[] | undefined,
    onComponentOnly: nullToUndefined(params.on_component_only) as boolean | undefined,
    directories: nullToUndefined(params.directories) as string[] | undefined,
    files: nullToUndefined(params.files) as string[] | undefined,
    scopes: nullToUndefined(params.scopes) as IssuesParams['scopes'],

    // Branch and PR support
    branch: nullToUndefined(params.branch) as string | undefined,
    pullRequest: nullToUndefined(params.pull_request) as string | undefined,

    // Issue filters
    issues: nullToUndefined(params.issues) as string[] | undefined,
    severity: nullToUndefined(params.severity) as IssuesParams['severity'], // Deprecated
    severities: nullToUndefined(params.severities) as IssuesParams['severities'],
    statuses: nullToUndefined(params.statuses) as IssuesParams['statuses'],
    resolutions: nullToUndefined(params.resolutions) as IssuesParams['resolutions'],
    resolved: nullToUndefined(params.resolved) as boolean | undefined,
    types: nullToUndefined(params.types) as IssuesParams['types'],

    // Clean Code taxonomy
    cleanCodeAttributeCategories: nullToUndefined(
      params.clean_code_attribute_categories
    ) as IssuesParams['cleanCodeAttributeCategories'],
    impactSeverities: nullToUndefined(params.impact_severities) as IssuesParams['impactSeverities'],
    impactSoftwareQualities: nullToUndefined(
      params.impact_software_qualities
    ) as IssuesParams['impactSoftwareQualities'],
    issueStatuses: nullToUndefined(params.issue_statuses) as IssuesParams['issueStatuses'],

    // Rules and tags
    rules: nullToUndefined(params.rules) as string[] | undefined,
    tags: nullToUndefined(params.tags) as string[] | undefined,

    // Date filters
    createdAfter: nullToUndefined(params.created_after) as string | undefined,
    createdBefore: nullToUndefined(params.created_before) as string | undefined,
    createdAt: nullToUndefined(params.created_at) as string | undefined,
    createdInLast: nullToUndefined(params.created_in_last) as string | undefined,

    // Assignment
    assigned: nullToUndefined(params.assigned) as boolean | undefined,
    assignees: nullToUndefined(params.assignees) as string[] | undefined,
    author: nullToUndefined(params.author) as string | undefined,
    authors: nullToUndefined(params.authors) as string[] | undefined,

    // Security standards
    cwe: nullToUndefined(params.cwe) as string[] | undefined,
    owaspTop10: nullToUndefined(params.owasp_top10) as string[] | undefined,
    owaspTop10v2021: nullToUndefined(params.owasp_top10_v2021) as string[] | undefined,
    sansTop25: nullToUndefined(params.sans_top25) as string[] | undefined,
    sonarsourceSecurity: nullToUndefined(params.sonarsource_security) as string[] | undefined,
    sonarsourceSecurityCategory: nullToUndefined(params.sonarsource_security_category) as
      | string[]
      | undefined,

    // Languages
    languages: nullToUndefined(params.languages) as string[] | undefined,

    // Facets
    facets: nullToUndefined(params.facets) as string[] | undefined,
    facetMode: nullToUndefined(params.facet_mode) as IssuesParams['facetMode'],

    // New code
    sinceLeakPeriod: nullToUndefined(params.since_leak_period) as boolean | undefined,
    inNewCodePeriod: nullToUndefined(params.in_new_code_period) as boolean | undefined,

    // Sorting
    s: nullToUndefined(params.s) as string | undefined,
    asc: nullToUndefined(params.asc) as boolean | undefined,

    // Response optimization
    additionalFields: nullToUndefined(params.additional_fields) as string[] | undefined,

    // Pagination
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  };
}
