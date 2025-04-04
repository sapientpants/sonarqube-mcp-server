#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  SonarQubeClient,
  IssuesParams,
  ProjectsParams,
  SonarQubeProject,
  MetricsParams,
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
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
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
  const projectsParams: ProjectsParams = {
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
export async function handleSonarQubeGetMetrics(params: MetricsParams) {
  const result = await client.getMetrics(params);

  // Create a properly structured response matching the expected format
  const response = {
    metrics: result.metrics || [],
    paging: result.paging || {
      pageIndex: params.page || 1,
      pageSize: params.pageSize || 100,
      total: (result.metrics || []).length,
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
  handleSonarQubeProjects
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
  async (params: Record<string, unknown>) => {
    const result = await handleSonarQubeGetMetrics({
      page: nullToUndefined(params.page) as number | undefined,
      pageSize: nullToUndefined(params.page_size) as number | undefined,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
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
  async (params: Record<string, unknown>) => {
    return handleSonarQubeGetIssues(mapToSonarQubeParams(params));
  }
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  const transport = new StdioServerTransport();
  await (transport as unknown as Connectable).connect();
  await mcpServer.connect(transport);
}

export { nullToUndefined };
