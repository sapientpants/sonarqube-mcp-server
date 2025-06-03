#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  PaginationParams,
  ISonarQubeClient,
  IssuesParams,
  SonarQubeProject,
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  ProjectQualityGateParams,
  SourceCodeParams,
  ScmBlameParams,
  HotspotSearchParams,
  HotspotStatusUpdateParams,
  createSonarQubeClient,
} from './sonarqube.js';
import { z } from 'zod';
import { createLogger } from './utils/logger.js';

const logger = createLogger('index');

interface Connectable {
  connect: () => Promise<void>;
}
if (!(StdioServerTransport.prototype as unknown as Connectable).connect) {
  (StdioServerTransport.prototype as unknown as Connectable).connect = async function () {
    // Dummy connect method for compatibility with MCP server
    return Promise.resolve();
  };
}

/**
 * Helper function to convert null to undefined
 * @param value Any value that might be null
 * @returns The original value or undefined if null
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Helper function to transform string to number or null
 * @param val String value to transform
 * @returns Number or null if conversion fails
 */
export function stringToNumberTransform(val: string | null | undefined): number | null | undefined {
  if (val === null || val === undefined) {
    return val;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

// Initialize MCP server
export const mcpServer = new McpServer({
  name: 'sonarqube-mcp-server',
  version: '1.1.0',
});

// Validate environment variables
const validateEnvironmentVariables = () => {
  logger.debug('Validating environment variables');

  if (!process.env.SONARQUBE_TOKEN) {
    const error = new Error(
      'SONARQUBE_TOKEN environment variable is required. ' +
        'Please set it to your SonarQube/SonarCloud authentication token.'
    );
    logger.error('Missing SONARQUBE_TOKEN environment variable', error);
    throw error;
  }

  if (process.env.SONARQUBE_URL) {
    try {
      new URL(process.env.SONARQUBE_URL);
      logger.debug('Valid SONARQUBE_URL provided', { url: process.env.SONARQUBE_URL });
    } catch {
      const error = new Error(
        `Invalid SONARQUBE_URL: "${process.env.SONARQUBE_URL}". ` +
          'Please provide a valid URL (e.g., https://sonarcloud.io or https://your-sonarqube-instance.com).'
      );
      logger.error('Invalid SONARQUBE_URL', error);
      throw error;
    }
  }

  if (
    process.env.SONARQUBE_ORGANIZATION &&
    typeof process.env.SONARQUBE_ORGANIZATION !== 'string'
  ) {
    const error = new Error(
      'Invalid SONARQUBE_ORGANIZATION. Please provide a valid organization key as a string.'
    );
    logger.error('Invalid SONARQUBE_ORGANIZATION', error);
    throw error;
  }

  logger.info('Environment variables validated successfully');
};

// Create the SonarQube client
export const createDefaultClient = (): ISonarQubeClient => {
  logger.debug('Creating default SonarQube client');
  validateEnvironmentVariables();

  const client = createSonarQubeClient(
    process.env.SONARQUBE_TOKEN!,
    process.env.SONARQUBE_URL,
    process.env.SONARQUBE_ORGANIZATION
  );

  logger.info('SonarQube client created successfully', {
    url: process.env.SONARQUBE_URL ?? 'https://sonarcloud.io',
    organization: process.env.SONARQUBE_ORGANIZATION ?? 'not specified',
  });

  return client;
};

// Default client instance for backward compatibility
// Created lazily to allow environment variable validation at runtime
let defaultClient: ISonarQubeClient | null = null;

const getDefaultClient = (): ISonarQubeClient => {
  defaultClient ??= createDefaultClient();
  return defaultClient;
};

// Export for testing purposes
export const resetDefaultClient = () => {
  defaultClient = null;
};

/**
 * Fetches and returns a list of all SonarQube projects
 * @param params Parameters for listing projects, including pagination and organization
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of projects with their details
 * @throws Error if the SONARQUBE_TOKEN environment variable is not set
 */
export async function handleSonarQubeProjects(
  params: {
    page?: number | null;
    page_size?: number | null;
  },
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling SonarQube projects request', params);

  const projectsParams: PaginationParams = {
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  };

  try {
    const result = await client.listProjects(projectsParams);
    logger.info('Successfully retrieved projects', { count: result.projects.length });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            projects: result.projects.map((project: SonarQubeProject) => ({
              key: project.key,
              name: project.name,
              qualifier: project.qualifier,
              visibility: project.visibility,
              lastAnalysisDate: project.lastAnalysisDate,
              revision: project.revision,
              managed: project.managed,
            })),
            paging: result.paging,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to retrieve SonarQube projects', error);
    throw error;
  }
}

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

/**
 * Fetches and returns issues from a specified SonarQube project
 * @param params Parameters for fetching issues, including project key, severity, and pagination
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of issues with their details
 * @throws Error if the SONARQUBE_TOKEN environment variable is not set
 */
export async function handleSonarQubeGetIssues(
  params: IssuesParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling SonarQube issues request', { projectKey: params.projectKey });

  try {
    const result = await client.getIssues(params);
    logger.info('Successfully retrieved issues', {
      projectKey: params.projectKey,
      count: result.issues.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            issues: result.issues.map((issue) => ({
              key: issue.key,
              rule: issue.rule,
              severity: issue.severity,
              component: issue.component,
              project: issue.project,
              line: issue.line,
              status: issue.status,
              issueStatus: issue.issueStatus,
              message: issue.message,
              messageFormattings: issue.messageFormattings,
              effort: issue.effort,
              debt: issue.debt,
              author: issue.author,
              tags: issue.tags,
              creationDate: issue.creationDate,
              updateDate: issue.updateDate,
              type: issue.type,
              cleanCodeAttribute: issue.cleanCodeAttribute,
              cleanCodeAttributeCategory: issue.cleanCodeAttributeCategory,
              prioritizedRule: issue.prioritizedRule,
              impacts: issue.impacts,
              textRange: issue.textRange,
              comments: issue.comments,
              transitions: issue.transitions,
              actions: issue.actions,
              flows: issue.flows,
              quickFixAvailable: issue.quickFixAvailable,
              ruleDescriptionContextKey: issue.ruleDescriptionContextKey,
              codeVariants: issue.codeVariants,
              hash: issue.hash,
            })),
            components: result.components,
            rules: result.rules,
            users: result.users,
            facets: result.facets,
            paging: result.paging,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to retrieve SonarQube issues', error);
    throw error;
  }
}

/**
 * Handler for getting SonarQube metrics
 * @param params Parameters for the metrics request
 * @param client Optional SonarQube client instance
 * @returns Promise with the metrics result
 */
export async function handleSonarQubeGetMetrics(
  params: PaginationParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getMetrics(params);

  // Create a properly structured response matching the expected format
  const response = {
    metrics: result.metrics ?? [],
    paging: result.paging ?? {
      pageIndex: params.page ?? 1,
      pageSize: params.pageSize ?? 100,
      total: (result.metrics ?? []).length,
    },
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response),
      },
    ],
  };
}

/**
 * Handler for getting SonarQube system health status
 * @param client Optional SonarQube client instance
 * @returns Promise with the health status result
 */
export async function handleSonarQubeGetHealth(client: ISonarQubeClient = getDefaultClient()) {
  const result = await client.getHealth();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting SonarQube system status
 * @param client Optional SonarQube client instance
 * @returns Promise with the system status result
 */
export async function handleSonarQubeGetStatus(client: ISonarQubeClient = getDefaultClient()) {
  const result = await client.getStatus();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for pinging SonarQube system
 * @param client Optional SonarQube client instance
 * @returns Promise with the ping result
 */
export async function handleSonarQubePing(client: ISonarQubeClient = getDefaultClient()) {
  const result = await client.ping();

  return {
    content: [
      {
        type: 'text' as const,
        text: result,
      },
    ],
  };
}

/**
 * Handler for getting measures for a specific component
 * @param params Parameters for the component measures request
 * @param client Optional SonarQube client instance
 * @returns Promise with the component measures result
 */
export async function handleSonarQubeComponentMeasures(
  params: ComponentMeasuresParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getComponentMeasures(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting measures for multiple components
 * @param params Parameters for the components measures request
 * @param client Optional SonarQube client instance
 * @returns Promise with the components measures result
 */
export async function handleSonarQubeComponentsMeasures(
  params: ComponentsMeasuresParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getComponentsMeasures(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting measures history for a component
 * @param params Parameters for the measures history request
 * @param client Optional SonarQube client instance
 * @returns Promise with the measures history result
 */
export async function handleSonarQubeMeasuresHistory(
  params: MeasuresHistoryParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getMeasuresHistory(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for listing quality gates
 * @param client Optional SonarQube client instance
 * @returns Promise with the list of quality gates
 */
export async function handleSonarQubeListQualityGates(
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.listQualityGates();

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting quality gate details
 * @param params Parameters for the quality gate request
 * @param client Optional SonarQube client instance
 * @returns Promise with the quality gate details
 */
export async function handleSonarQubeGetQualityGate(
  params: { id: string },
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getQualityGate(params.id);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting project quality gate status
 * @param params Parameters for the project quality gate status request
 * @param client Optional SonarQube client instance
 * @returns Promise with the project quality gate status
 */
export async function handleSonarQubeProjectQualityGateStatus(
  params: ProjectQualityGateParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getProjectQualityGateStatus(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting source code with issues
 * @param params Parameters for the source code request
 * @param client Optional SonarQube client instance
 * @returns Promise with the source code and annotations
 */
export async function handleSonarQubeGetSourceCode(
  params: SourceCodeParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getSourceCode(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting SCM blame information
 * @param params Parameters for the SCM blame request
 * @param client Optional SonarQube client instance
 * @returns Promise with the blame information
 */
export async function handleSonarQubeGetScmBlame(
  params: ScmBlameParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getScmBlame(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for searching security hotspots
 * @param params Parameters for the hotspot search
 * @param client Optional SonarQube client instance
 * @returns Promise with the hotspot search results
 */
export async function handleSonarQubeSearchHotspots(
  params: HotspotSearchParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.searchHotspots(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for getting hotspot details
 * @param hotspotKey The key of the hotspot
 * @param client Optional SonarQube client instance
 * @returns Promise with the hotspot details
 */
export async function handleSonarQubeGetHotspotDetails(
  hotspotKey: string,
  client: ISonarQubeClient = getDefaultClient()
) {
  const result = await client.getHotspotDetails(hotspotKey);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

/**
 * Handler for updating hotspot status
 * @param params Parameters for updating hotspot status
 * @param client Optional SonarQube client instance
 * @returns Promise that resolves when the update is complete
 */
export async function handleSonarQubeUpdateHotspotStatus(
  params: HotspotStatusUpdateParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  await client.updateHotspotStatus(params);

  return {
    content: [
      {
        type: 'text' as const,
        text: 'Hotspot status updated successfully',
      },
    ],
  };
}

// Define SonarQube severity schema for validation
const severitySchema = z
  .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  .nullable()
  .optional();
const severitiesSchema = z
  .array(z.enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER']))
  .nullable()
  .optional();
const statusSchema = z
  .array(z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED']))
  .nullable()
  .optional();
const resolutionSchema = z
  .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
  .nullable()
  .optional();
const typeSchema = z
  .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
  .nullable()
  .optional();

// Clean Code taxonomy schemas
const cleanCodeAttributeCategoriesSchema = z
  .array(z.enum(['ADAPTABLE', 'CONSISTENT', 'INTENTIONAL', 'RESPONSIBLE']))
  .nullable()
  .optional();
const impactSeveritiesSchema = z
  .array(z.enum(['HIGH', 'MEDIUM', 'LOW']))
  .nullable()
  .optional();
const impactSoftwareQualitiesSchema = z
  .array(z.enum(['MAINTAINABILITY', 'RELIABILITY', 'SECURITY']))
  .nullable()
  .optional();

// Hotspot schemas
const hotspotStatusSchema = z.enum(['TO_REVIEW', 'REVIEWED']).nullable().optional();
const hotspotResolutionSchema = z.enum(['FIXED', 'SAFE']).nullable().optional();

// Lambda functions for the MCP tools
/**
 * Lambda function for projects tool
 */
export const projectsHandler = handleSonarQubeProjects;

/**
 * Lambda function for metrics tool
 */
export const metricsHandler = async (params: { page: number | null; page_size: number | null }) => {
  const result = await handleSonarQubeGetMetrics({
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result),
      },
    ],
  };
};

/**
 * Lambda function for issues tool
 */
export const issuesHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeGetIssues(mapToSonarQubeParams(params));
};

/**
 * Lambda function for system_health tool
 */
export const healthHandler = handleSonarQubeGetHealth;

/**
 * Lambda function for system_status tool
 */
export const statusHandler = handleSonarQubeGetStatus;

/**
 * Lambda function for system_ping tool
 */
export const pingHandler = handleSonarQubePing;

/**
 * Lambda function for measures_component tool
 */
export const componentMeasuresHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeComponentMeasures({
    component: params.component as string,
    metricKeys: Array.isArray(params.metric_keys)
      ? (params.metric_keys as string[])
      : [params.metric_keys as string],
    additionalFields: params.additional_fields as string[] | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
    period: params.period as string | undefined,
  });
};

/**
 * Lambda function for measures_components tool
 */
export const componentsMeasuresHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeComponentsMeasures({
    componentKeys: Array.isArray(params.component_keys)
      ? (params.component_keys as string[])
      : [params.component_keys as string],
    metricKeys: Array.isArray(params.metric_keys)
      ? (params.metric_keys as string[])
      : [params.metric_keys as string],
    additionalFields: params.additional_fields as string[] | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
    period: params.period as string | undefined,
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  });
};

/**
 * Lambda function for measures_history tool
 */
export const measuresHistoryHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeMeasuresHistory({
    component: params.component as string,
    metrics: Array.isArray(params.metrics)
      ? (params.metrics as string[])
      : [params.metrics as string],
    from: params.from as string | undefined,
    to: params.to as string | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  });
};

/**
 * Lambda function for quality_gates tool
 */
export const qualityGatesHandler = handleSonarQubeListQualityGates;

/**
 * Lambda function for quality_gate tool
 */
export const qualityGateHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeGetQualityGate({
    id: params.id as string,
  });
};

/**
 * Lambda function for project_quality_gate_status tool
 */
export const projectQualityGateStatusHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeProjectQualityGateStatus({
    projectKey: params.project_key as string,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
  });
};

/**
 * Lambda function for source_code tool
 */
export const sourceCodeHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeGetSourceCode({
    key: params.key as string,
    from: nullToUndefined(params.from) as number | undefined,
    to: nullToUndefined(params.to) as number | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
  });
};

/**
 * Lambda function for scm_blame tool
 */
export const scmBlameHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeGetScmBlame({
    key: params.key as string,
    from: nullToUndefined(params.from) as number | undefined,
    to: nullToUndefined(params.to) as number | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
  });
};

/**
 * Lambda function for search_hotspots tool
 */
export const searchHotspotsHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeSearchHotspots({
    projectKey: params.project_key as string | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pull_request as string | undefined,
    status: params.status as HotspotSearchParams['status'],
    resolution: params.resolution as HotspotSearchParams['resolution'],
    files: nullToUndefined(params.files) as string[] | undefined,
    assignedToMe: nullToUndefined(params.assigned_to_me) as boolean | undefined,
    sinceLeakPeriod: nullToUndefined(params.since_leak_period) as boolean | undefined,
    inNewCodePeriod: nullToUndefined(params.in_new_code_period) as boolean | undefined,
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  });
};

/**
 * Lambda function for get_hotspot_details tool
 */
export const getHotspotDetailsHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeGetHotspotDetails(params.hotspot_key as string);
};

/**
 * Lambda function for update_hotspot_status tool
 */
export const updateHotspotStatusHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeUpdateHotspotStatus({
    hotspot: params.hotspot_key as string,
    status: params.status as HotspotStatusUpdateParams['status'],
    resolution: params.resolution as HotspotStatusUpdateParams['resolution'],
    comment: params.comment as string | undefined,
  });
};

// Wrapper functions for MCP registration that don't expose the client parameter
const projectsMcpHandler = (params: Record<string, unknown>) => projectsHandler(params);
const metricsMcpHandler = (params: Record<string, unknown>) =>
  metricsHandler(params as { page: number | null; page_size: number | null });
const issuesMcpHandler = (params: Record<string, unknown>) => issuesHandler(params);
const healthMcpHandler = () => healthHandler();
const statusMcpHandler = () => statusHandler();
const pingMcpHandler = () => pingHandler();
const componentMeasuresMcpHandler = (params: Record<string, unknown>) =>
  componentMeasuresHandler(params);
const componentsMeasuresMcpHandler = (params: Record<string, unknown>) =>
  componentsMeasuresHandler(params);
const measuresHistoryMcpHandler = (params: Record<string, unknown>) =>
  measuresHistoryHandler(params);
const qualityGatesMcpHandler = () => qualityGatesHandler();
const qualityGateMcpHandler = (params: Record<string, unknown>) => qualityGateHandler(params);
const projectQualityGateStatusMcpHandler = (params: Record<string, unknown>) =>
  projectQualityGateStatusHandler(params);
const sourceCodeMcpHandler = (params: Record<string, unknown>) => sourceCodeHandler(params);
const scmBlameMcpHandler = (params: Record<string, unknown>) => scmBlameHandler(params);
const searchHotspotsMcpHandler = (params: Record<string, unknown>) => searchHotspotsHandler(params);
const getHotspotDetailsMcpHandler = (params: Record<string, unknown>) =>
  getHotspotDetailsHandler(params);
const updateHotspotStatusMcpHandler = (params: Record<string, unknown>) =>
  updateHotspotStatusHandler(params);

// Register SonarQube tools
mcpServer.tool(
  'projects',
  'List all SonarQube projects',
  {
    page: z.string().optional().transform(stringToNumberTransform),
    page_size: z.string().optional().transform(stringToNumberTransform),
  },
  projectsMcpHandler
);

mcpServer.tool(
  'metrics',
  'Get available metrics from SonarQube',
  {
    page: z.string().optional().transform(stringToNumberTransform),
    page_size: z.string().optional().transform(stringToNumberTransform),
  },
  metricsMcpHandler
);

mcpServer.tool(
  'issues',
  'Get issues for a SonarQube project with advanced filtering, sorting, and branch/PR support',
  {
    // Component filters (backward compatible)
    project_key: z.string().optional(), // Made optional to support projects array
    projects: z.array(z.string()).nullable().optional(),
    component_keys: z.array(z.string()).nullable().optional(),
    components: z.array(z.string()).nullable().optional(),
    on_component_only: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),

    // Branch and PR support
    branch: z.string().nullable().optional(),
    pull_request: z.string().nullable().optional(),

    // Issue filters
    issues: z.array(z.string()).nullable().optional(),
    severity: severitySchema, // Deprecated single value
    severities: severitiesSchema, // New array support
    statuses: statusSchema,
    resolutions: resolutionSchema,
    resolved: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    types: typeSchema,

    // Clean Code taxonomy (SonarQube 10.x+)
    clean_code_attribute_categories: cleanCodeAttributeCategoriesSchema,
    impact_severities: impactSeveritiesSchema,
    impact_software_qualities: impactSoftwareQualitiesSchema,
    issue_statuses: statusSchema, // New issue status values

    // Rules and tags
    rules: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),

    // Date filters
    created_after: z.string().nullable().optional(),
    created_before: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    created_in_last: z.string().nullable().optional(),

    // Assignment
    assigned: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    assignees: z.array(z.string()).nullable().optional(),
    author: z.string().nullable().optional(), // Single author
    authors: z.array(z.string()).nullable().optional(), // Multiple authors

    // Security standards
    cwe: z.array(z.string()).nullable().optional(),
    owasp_top10: z.array(z.string()).nullable().optional(),
    owasp_top10_v2021: z.array(z.string()).nullable().optional(), // New 2021 version
    sans_top25: z.array(z.string()).nullable().optional(),
    sonarsource_security: z.array(z.string()).nullable().optional(),
    sonarsource_security_category: z.array(z.string()).nullable().optional(),

    // Languages
    languages: z.array(z.string()).nullable().optional(),

    // Facets
    facets: z.array(z.string()).nullable().optional(),
    facet_mode: z.enum(['effort', 'count']).nullable().optional(),

    // New code
    since_leak_period: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    in_new_code_period: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),

    // Sorting
    s: z.string().nullable().optional(), // Sort field
    asc: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(), // Sort direction

    // Response optimization
    additional_fields: z.array(z.string()).nullable().optional(),

    // Pagination
    page: z.string().optional().transform(stringToNumberTransform),
    page_size: z.string().optional().transform(stringToNumberTransform),
  },
  issuesMcpHandler
);

// Register system API tools
mcpServer.tool(
  'system_health',
  'Get the health status of the SonarQube instance',
  {},
  healthMcpHandler
);

mcpServer.tool('system_status', 'Get the status of the SonarQube instance', {}, statusMcpHandler);

mcpServer.tool(
  'system_ping',
  'Ping the SonarQube instance to check if it is up',
  {},
  pingMcpHandler
);

// Register measures API tools
mcpServer.tool(
  'measures_component',
  'Get measures for a specific component',
  {
    component: z.string(),
    metric_keys: z.array(z.string()),
    additional_fields: z.array(z.string()).optional(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
    period: z.string().optional(),
  },
  componentMeasuresMcpHandler
);

mcpServer.tool(
  'measures_components',
  'Get measures for multiple components',
  {
    component_keys: z.array(z.string()),
    metric_keys: z.array(z.string()),
    additional_fields: z.array(z.string()).optional(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
    period: z.string().optional(),
    page: z.string().optional().transform(stringToNumberTransform),
    page_size: z.string().optional().transform(stringToNumberTransform),
  },
  componentsMeasuresMcpHandler
);

mcpServer.tool(
  'measures_history',
  'Get measures history for a component',
  {
    component: z.string(),
    metrics: z.array(z.string()),
    from: z.string().optional(),
    to: z.string().optional(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
    page: z.string().optional().transform(stringToNumberTransform),
    page_size: z.string().optional().transform(stringToNumberTransform),
  },
  measuresHistoryMcpHandler
);

// Register Quality Gates API tools
mcpServer.tool('quality_gates', 'List available quality gates', {}, qualityGatesMcpHandler);

mcpServer.tool(
  'quality_gate',
  'Get quality gate conditions',
  {
    id: z.string(),
  },
  qualityGateMcpHandler
);

mcpServer.tool(
  'project_quality_gate_status',
  'Get project quality gate status',
  {
    project_key: z.string(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
  },
  projectQualityGateStatusMcpHandler
);

// Register Source Code API tools
mcpServer.tool(
  'source_code',
  'View source code with issues highlighted',
  {
    key: z.string(),
    from: z.string().optional().transform(stringToNumberTransform),
    to: z.string().optional().transform(stringToNumberTransform),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
  },
  sourceCodeMcpHandler
);

mcpServer.tool(
  'scm_blame',
  'Get SCM blame information for source code',
  {
    key: z.string(),
    from: z.string().optional().transform(stringToNumberTransform),
    to: z.string().optional().transform(stringToNumberTransform),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
  },
  scmBlameMcpHandler
);

// Register Security Hotspot tools
mcpServer.tool(
  'search_hotspots',
  'Search for security hotspots with filtering options',
  {
    project_key: z.string().optional(),
    branch: z.string().nullable().optional(),
    pull_request: z.string().nullable().optional(),
    status: hotspotStatusSchema,
    resolution: hotspotResolutionSchema,
    files: z.array(z.string()).nullable().optional(),
    assigned_to_me: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    since_leak_period: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    in_new_code_period: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    page: z.string().optional().transform(stringToNumberTransform),
    page_size: z.string().optional().transform(stringToNumberTransform),
  },
  searchHotspotsMcpHandler
);

mcpServer.tool(
  'get_hotspot_details',
  'Get detailed information about a specific security hotspot',
  {
    hotspot_key: z.string(),
  },
  getHotspotDetailsMcpHandler
);

mcpServer.tool(
  'update_hotspot_status',
  'Update the status of a security hotspot (requires appropriate permissions)',
  {
    hotspot_key: z.string(),
    status: z.enum(['TO_REVIEW', 'REVIEWED']),
    resolution: z.enum(['FIXED', 'SAFE']).nullable().optional(),
    comment: z.string().nullable().optional(),
  },
  updateHotspotStatusMcpHandler
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  logger.info('Starting SonarQube MCP server', {
    logFile: process.env.LOG_FILE ?? 'not configured',
    logLevel: process.env.LOG_LEVEL ?? 'DEBUG',
  });

  const transport = new StdioServerTransport();
  await (transport as unknown as Connectable).connect();
  await mcpServer.connect(transport);

  logger.info('SonarQube MCP server started successfully');
}

// nullToUndefined is already exported at line 33
