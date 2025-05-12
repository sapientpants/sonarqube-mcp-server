#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  PaginationParams,
  SonarQubeClient,
  IssuesParams,
  SonarQubeProject,
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
} from './sonarqube.js';
import { z } from 'zod';

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

// Initialize MCP server
export const mcpServer = new McpServer({
  name: 'sonarqube-mcp-server',
  version: '1.1.0',
});

const client = new SonarQubeClient(
  process.env.SONARQUBE_TOKEN!,
  process.env.SONARQUBE_URL,
  process.env.SONARQUBE_ORGANIZATION
);

/**
 * Fetches and returns a list of all SonarQube projects
 * @param params Parameters for listing projects, including pagination and organization
 * @returns A response containing the list of projects with their details
 * @throws Error if the SONARQUBE_TOKEN environment variable is not set
 */
export async function handleSonarQubeProjects(params: {
  page?: number | null;
  page_size?: number | null;
}) {
  const projectsParams: PaginationParams = {
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  };

  const result = await client.listProjects(projectsParams);
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
}

/**
 * Maps MCP tool parameters to SonarQube client parameters
 * @param params Parameters from the MCP tool
 * @returns Parameters for the SonarQube client
 */
export function mapToSonarQubeParams(params: Record<string, unknown>): IssuesParams {
  return {
    projectKey: params.project_key as string,
    severity: nullToUndefined(params.severity) as IssuesParams['severity'],
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
    statuses: nullToUndefined(params.statuses) as IssuesParams['statuses'],
    resolutions: nullToUndefined(params.resolutions) as IssuesParams['resolutions'],
    resolved: nullToUndefined(params.resolved) as boolean | undefined,
    types: nullToUndefined(params.types) as IssuesParams['types'],
    rules: nullToUndefined(params.rules) as string[] | undefined,
    tags: nullToUndefined(params.tags) as string[] | undefined,
    createdAfter: nullToUndefined(params.created_after) as string | undefined,
    createdBefore: nullToUndefined(params.created_before) as string | undefined,
    createdAt: nullToUndefined(params.created_at) as string | undefined,
    createdInLast: nullToUndefined(params.created_in_last) as string | undefined,
    assignees: nullToUndefined(params.assignees) as string[] | undefined,
    authors: nullToUndefined(params.authors) as string[] | undefined,
    cwe: nullToUndefined(params.cwe) as string[] | undefined,
    languages: nullToUndefined(params.languages) as string[] | undefined,
    owaspTop10: nullToUndefined(params.owasp_top10) as string[] | undefined,
    sansTop25: nullToUndefined(params.sans_top25) as string[] | undefined,
    sonarsourceSecurity: nullToUndefined(params.sonarsource_security) as string[] | undefined,
    onComponentOnly: nullToUndefined(params.on_component_only) as boolean | undefined,
    facets: nullToUndefined(params.facets) as string[] | undefined,
    sinceLeakPeriod: nullToUndefined(params.since_leak_period) as boolean | undefined,
    inNewCodePeriod: nullToUndefined(params.in_new_code_period) as boolean | undefined,
  };
}

/**
 * Fetches and returns issues from a specified SonarQube project
 * @param params Parameters for fetching issues, including project key, severity, and pagination
 * @returns A response containing the list of issues with their details
 * @throws Error if the SONARQUBE_TOKEN environment variable is not set
 */
export async function handleSonarQubeGetIssues(params: IssuesParams) {
  const result = await client.getIssues(params);

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
}

/**
 * Handler for getting SonarQube metrics
 * @param params Parameters for the metrics request
 * @returns Promise with the metrics result
 */
export async function handleSonarQubeGetMetrics(params: PaginationParams) {
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
 * @returns Promise with the health status result
 */
export async function handleSonarQubeGetHealth() {
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
 * @returns Promise with the system status result
 */
export async function handleSonarQubeGetStatus() {
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
 * @returns Promise with the ping result
 */
export async function handleSonarQubePing() {
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
 * @returns Promise with the component measures result
 */
export async function handleSonarQubeComponentMeasures(params: ComponentMeasuresParams) {
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
 * @returns Promise with the components measures result
 */
export async function handleSonarQubeComponentsMeasures(params: ComponentsMeasuresParams) {
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
 * @returns Promise with the measures history result
 */
export async function handleSonarQubeMeasuresHistory(params: MeasuresHistoryParams) {
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

// Define SonarQube severity schema for validation
const severitySchema = z
  .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
  .nullable()
  .optional();
const statusSchema = z
  .array(
    z.enum([
      'OPEN',
      'CONFIRMED',
      'REOPENED',
      'RESOLVED',
      'CLOSED',
      'TO_REVIEW',
      'IN_REVIEW',
      'REVIEWED',
    ])
  )
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

// Lambda functions for the MCP tools
/**
 * Lambda function for projects tool
 */
export const projectsLambdaHandler = handleSonarQubeProjects;

/**
 * Lambda function for metrics tool
 */
export const metricsLambdaHandler = async (params: {
  page: number | null;
  page_size: number | null;
}) => {
  const result = await handleSonarQubeGetMetrics({
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Lambda function for issues tool
 */
export const issuesLambdaHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeGetIssues(mapToSonarQubeParams(params));
};

/**
 * Lambda function for system_health tool
 */
export const healthLambdaHandler = handleSonarQubeGetHealth;

/**
 * Lambda function for system_status tool
 */
export const statusLambdaHandler = handleSonarQubeGetStatus;

/**
 * Lambda function for system_ping tool
 */
export const pingLambdaHandler = handleSonarQubePing;

/**
 * Lambda function for measures_component tool
 */
export const componentMeasuresLambdaHandler = async (params: Record<string, unknown>) => {
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
export const componentsMeasuresLambdaHandler = async (params: Record<string, unknown>) => {
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
export const measuresHistoryLambdaHandler = async (params: Record<string, unknown>) => {
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

// Register SonarQube tools
mcpServer.tool(
  'projects',
  'List all SonarQube projects',
  {
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
    page_size: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
  },
  projectsLambdaHandler
);

mcpServer.tool(
  'metrics',
  'Get available metrics from SonarQube',
  {
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
    page_size: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
  },
  metricsLambdaHandler
);

mcpServer.tool(
  'issues',
  'Get issues for a SonarQube project',
  {
    project_key: z.string(),
    severity: severitySchema,
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
    page_size: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
    statuses: statusSchema,
    resolutions: resolutionSchema,
    resolved: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    types: typeSchema,
    rules: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    created_after: z.string().nullable().optional(),
    created_before: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    created_in_last: z.string().nullable().optional(),
    assignees: z.array(z.string()).nullable().optional(),
    authors: z.array(z.string()).nullable().optional(),
    cwe: z.array(z.string()).nullable().optional(),
    languages: z.array(z.string()).nullable().optional(),
    owasp_top10: z.array(z.string()).nullable().optional(),
    sans_top25: z.array(z.string()).nullable().optional(),
    sonarsource_security: z.array(z.string()).nullable().optional(),
    on_component_only: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    facets: z.array(z.string()).nullable().optional(),
    since_leak_period: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
    in_new_code_period: z
      .union([z.boolean(), z.string().transform((val) => val === 'true')])
      .nullable()
      .optional(),
  },
  issuesLambdaHandler
);

// Register system API tools
mcpServer.tool(
  'system_health',
  'Get the health status of the SonarQube instance',
  {},
  healthLambdaHandler
);

mcpServer.tool(
  'system_status',
  'Get the status of the SonarQube instance',
  {},
  statusLambdaHandler
);

mcpServer.tool(
  'system_ping',
  'Ping the SonarQube instance to check if it is up',
  {},
  pingLambdaHandler
);

// Register measures API tools
mcpServer.tool(
  'measures_component',
  'Get measures for a specific component',
  {
    component: z.string(),
    metric_keys: z.union([z.string(), z.array(z.string())]),
    additional_fields: z.array(z.string()).optional(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
    period: z.string().optional(),
  },
  componentMeasuresLambdaHandler
);

mcpServer.tool(
  'measures_components',
  'Get measures for multiple components',
  {
    component_keys: z.union([z.string(), z.array(z.string())]),
    metric_keys: z.union([z.string(), z.array(z.string())]),
    additional_fields: z.array(z.string()).optional(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
    period: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
    page_size: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
  },
  componentsMeasuresLambdaHandler
);

mcpServer.tool(
  'measures_history',
  'Get measures history for a component',
  {
    component: z.string(),
    metrics: z.union([z.string(), z.array(z.string())]),
    from: z.string().optional(),
    to: z.string().optional(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
    page_size: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) || null : null)),
  },
  measuresHistoryLambdaHandler
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  await (transport as unknown as Connectable).connect();
  await mcpServer.connect(transport);
}

// Export statement for nullToUndefined is redundant since it's already exported above
