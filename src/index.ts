#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ISonarQubeClient,
  createSonarQubeClientFromEnv,
  HotspotSearchParams,
  HotspotStatusUpdateParams,
} from './sonarqube.js';
import { z } from 'zod';
import { createLogger } from './utils/logger.js';
import { nullToUndefined, stringToNumberTransform } from './utils/transforms.js';
import { mapToSonarQubeParams } from './utils/parameter-mappers.js';
import { validateEnvironmentVariables, resetDefaultClient } from './utils/client-factory.js';
import {
  handleSonarQubeProjects,
  handleSonarQubeGetIssues,
  handleSonarQubeGetMetrics,
  handleSonarQubeGetHealth,
  handleSonarQubeGetStatus,
  handleSonarQubePing,
  handleSonarQubeComponentMeasures,
  handleSonarQubeComponentsMeasures,
  handleSonarQubeMeasuresHistory,
  handleSonarQubeListQualityGates,
  handleSonarQubeGetQualityGate,
  handleSonarQubeQualityGateStatus,
  handleSonarQubeGetSourceCode,
  handleSonarQubeGetScmBlame,
  handleSonarQubeHotspots,
  handleSonarQubeHotspot,
  handleSonarQubeUpdateHotspotStatus,
} from './handlers/index.js';

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

// Re-export utilities for backward compatibility
export { nullToUndefined, stringToNumberTransform } from './utils/transforms.js';
export { mapToSonarQubeParams } from './utils/parameter-mappers.js';

// Initialize MCP server
export const mcpServer = new McpServer({
  name: 'sonarqube-mcp-server',
  version: '1.3.2',
});

// Create the SonarQube client
export const createDefaultClient = (): ISonarQubeClient => {
  logger.debug('Creating default SonarQube client');
  validateEnvironmentVariables();

  // Use the environment-based factory function
  const client = createSonarQubeClientFromEnv();

  logger.info('SonarQube client created successfully', {
    url: process.env.SONARQUBE_URL ?? 'https://sonarcloud.io',
    organization: process.env.SONARQUBE_ORGANIZATION ?? 'not specified',
  });

  return client;
};

// Re-export resetDefaultClient for backward compatibility
export { resetDefaultClient };

// Re-export handlers for backward compatibility
export {
  handleSonarQubeProjects,
  handleSonarQubeGetIssues,
  handleSonarQubeGetMetrics,
  handleSonarQubeGetHealth,
  handleSonarQubeGetStatus,
  handleSonarQubePing,
  handleSonarQubeComponentMeasures,
  handleSonarQubeComponentsMeasures,
  handleSonarQubeMeasuresHistory,
  handleSonarQubeListQualityGates,
  handleSonarQubeGetQualityGate,
  handleSonarQubeQualityGateStatus,
  handleSonarQubeGetSourceCode,
  handleSonarQubeGetScmBlame,
  handleSonarQubeHotspots,
  handleSonarQubeHotspot,
  handleSonarQubeUpdateHotspotStatus,
} from './handlers/index.js';

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
 * Lambda function for quality_gate_status tool
 */
export const qualityGateStatusHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeQualityGateStatus({
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
export const hotspotsHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeHotspots({
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
export const hotspotHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeHotspot(params.hotspot_key as string);
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
export const projectsMcpHandler = (params: Record<string, unknown>) => projectsHandler(params);
export const metricsMcpHandler = (params: Record<string, unknown>) =>
  metricsHandler(params as { page: number | null; page_size: number | null });
export const issuesMcpHandler = (params: Record<string, unknown>) => issuesHandler(params);
export const healthMcpHandler = () => healthHandler();
export const statusMcpHandler = () => statusHandler();
export const pingMcpHandler = () => pingHandler();
export const componentMeasuresMcpHandler = (params: Record<string, unknown>) =>
  componentMeasuresHandler(params);
export const componentsMeasuresMcpHandler = (params: Record<string, unknown>) =>
  componentsMeasuresHandler(params);
export const measuresHistoryMcpHandler = (params: Record<string, unknown>) =>
  measuresHistoryHandler(params);
export const qualityGatesMcpHandler = () => qualityGatesHandler();
export const qualityGateMcpHandler = (params: Record<string, unknown>) =>
  qualityGateHandler(params);
export const qualityGateStatusMcpHandler = (params: Record<string, unknown>) =>
  qualityGateStatusHandler(params);
export const sourceCodeMcpHandler = (params: Record<string, unknown>) => sourceCodeHandler(params);
export const scmBlameMcpHandler = (params: Record<string, unknown>) => scmBlameHandler(params);
export const hotspotsMcpHandler = (params: Record<string, unknown>) => hotspotsHandler(params);
export const hotspotMcpHandler = (params: Record<string, unknown>) => hotspotHandler(params);
export const updateHotspotStatusMcpHandler = (params: Record<string, unknown>) =>
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
  'quality_gate_status',
  'Get project quality gate status',
  {
    project_key: z.string(),
    branch: z.string().optional(),
    pull_request: z.string().optional(),
  },
  qualityGateStatusMcpHandler
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
  'hotspots',
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
  hotspotsMcpHandler
);

mcpServer.tool(
  'hotspot',
  'Get detailed information about a specific security hotspot',
  {
    hotspot_key: z.string(),
  },
  hotspotMcpHandler
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
