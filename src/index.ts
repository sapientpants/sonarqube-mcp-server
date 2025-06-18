#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ISonarQubeClient,
  createSonarQubeClientFromEnv,
  HotspotSearchParams,
  HotspotStatusUpdateParams,
} from './sonarqube.js';
import { createLogger } from './utils/logger.js';
import { nullToUndefined, ensureStringArray } from './utils/transforms.js';
import { mapToSonarQubeParams } from './utils/parameter-mappers.js';
import { validateEnvironmentVariables, resetDefaultClient } from './utils/client-factory.js';
import {
  handleSonarQubeProjects,
  handleSonarQubeGetIssues,
  handleMarkIssueFalsePositive,
  handleMarkIssueWontFix,
  handleMarkIssuesFalsePositive,
  handleMarkIssuesWontFix,
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
  handleAddCommentToIssue,
  handleAssignIssue,
  handleConfirmIssue,
  handleUnconfirmIssue,
  handleResolveIssue,
  handleReopenIssue,
  handleSonarQubeComponents,
} from './handlers/index.js';
import {
  projectsToolSchema,
  metricsToolSchema,
  issuesToolSchema,
  markIssueFalsePositiveToolSchema,
  markIssueWontFixToolSchema,
  markIssuesFalsePositiveToolSchema,
  markIssuesWontFixToolSchema,
  addCommentToIssueToolSchema,
  assignIssueToolSchema,
  confirmIssueToolSchema,
  unconfirmIssueToolSchema,
  resolveIssueToolSchema,
  reopenIssueToolSchema,
  systemHealthToolSchema,
  systemStatusToolSchema,
  systemPingToolSchema,
  componentMeasuresToolSchema,
  componentsMeasuresToolSchema,
  measuresHistoryToolSchema,
  qualityGatesToolSchema,
  qualityGateToolSchema,
  qualityGateStatusToolSchema,
  sourceCodeToolSchema,
  scmBlameToolSchema,
  hotspotsToolSchema,
  hotspotToolSchema,
  updateHotspotStatusToolSchema,
  componentsToolSchema,
} from './schemas/index.js';

// Type alias for parameters that can be string, array of strings, or undefined
type StringOrArrayParam = string | string[] | undefined;

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
  handleMarkIssueFalsePositive,
  handleMarkIssueWontFix,
  handleMarkIssuesFalsePositive,
  handleMarkIssuesWontFix,
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
 * Lambda function for mark issue false positive tool
 */
export const markIssueFalsePositiveHandler = async (params: Record<string, unknown>) => {
  return handleMarkIssueFalsePositive({
    issueKey: params.issue_key as string,
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for mark issue won't fix tool
 */
export const markIssueWontFixHandler = async (params: Record<string, unknown>) => {
  return handleMarkIssueWontFix({
    issueKey: params.issue_key as string,
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for mark issues false positive (bulk) tool
 */
export const markIssuesFalsePositiveHandler = async (params: Record<string, unknown>) => {
  return handleMarkIssuesFalsePositive({
    issueKeys: params.issue_keys as string[],
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for mark issues won't fix (bulk) tool
 */
export const markIssuesWontFixHandler = async (params: Record<string, unknown>) => {
  return handleMarkIssuesWontFix({
    issueKeys: params.issue_keys as string[],
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for add comment to issue tool
 */
export const addCommentToIssueHandler = async (params: Record<string, unknown>) => {
  return handleAddCommentToIssue({
    issueKey: params.issue_key as string,
    text: params.text as string,
  });
};

/**
 * Lambda function for assign issue tool
 */
export const assignIssueHandler = async (params: Record<string, unknown>) => {
  return handleAssignIssue({
    issueKey: params.issueKey as string,
    assignee: params.assignee as string | undefined,
  });
};

/**
 * Lambda function for confirm issue tool
 */
export const confirmIssueHandler = async (params: Record<string, unknown>) => {
  return handleConfirmIssue({
    issueKey: params.issue_key as string,
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for unconfirm issue tool
 */
export const unconfirmIssueHandler = async (params: Record<string, unknown>) => {
  return handleUnconfirmIssue({
    issueKey: params.issue_key as string,
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for resolve issue tool
 */
export const resolveIssueHandler = async (params: Record<string, unknown>) => {
  return handleResolveIssue({
    issueKey: params.issue_key as string,
    comment: params.comment as string | undefined,
  });
};

/**
 * Lambda function for reopen issue tool
 */
export const reopenIssueHandler = async (params: Record<string, unknown>) => {
  return handleReopenIssue({
    issueKey: params.issue_key as string,
    comment: params.comment as string | undefined,
  });
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
    metricKeys: ensureStringArray(params.metric_keys as StringOrArrayParam),
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
    componentKeys: ensureStringArray(params.component_keys as StringOrArrayParam),
    metricKeys: ensureStringArray(params.metric_keys as StringOrArrayParam),
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
    metrics: ensureStringArray(params.metrics as StringOrArrayParam),
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

/**
 * Lambda function for components tool
 */
export const componentsHandler = async (params: Record<string, unknown>) => {
  return handleSonarQubeComponents({
    query: params.query as string | undefined,
    qualifiers: params.qualifiers as string[] | undefined,
    language: params.language as string | undefined,
    component: params.component as string | undefined,
    strategy: params.strategy as 'all' | 'children' | 'leaves' | undefined,
    asc: params.asc as boolean | undefined,
    ps: params.ps as number | undefined,
    p: params.p as number | undefined,
    branch: params.branch as string | undefined,
    pullRequest: params.pullRequest as string | undefined,
  });
};

// Wrapper functions for MCP registration that don't expose the client parameter
export const projectsMcpHandler = (params: Record<string, unknown>) => projectsHandler(params);
export const metricsMcpHandler = (params: Record<string, unknown>) =>
  metricsHandler(params as { page: number | null; page_size: number | null });
export const issuesMcpHandler = (params: Record<string, unknown>) => issuesHandler(params);
export const markIssueFalsePositiveMcpHandler = (params: Record<string, unknown>) =>
  markIssueFalsePositiveHandler(params);
export const markIssueWontFixMcpHandler = (params: Record<string, unknown>) =>
  markIssueWontFixHandler(params);
export const markIssuesFalsePositiveMcpHandler = (params: Record<string, unknown>) =>
  markIssuesFalsePositiveHandler(params);
export const markIssuesWontFixMcpHandler = (params: Record<string, unknown>) =>
  markIssuesWontFixHandler(params);
export const addCommentToIssueMcpHandler = (params: Record<string, unknown>) =>
  addCommentToIssueHandler(params);
export const assignIssueMcpHandler = (params: Record<string, unknown>) =>
  assignIssueHandler(params);
export const confirmIssueMcpHandler = (params: Record<string, unknown>) =>
  confirmIssueHandler(params);
export const unconfirmIssueMcpHandler = (params: Record<string, unknown>) =>
  unconfirmIssueHandler(params);
export const resolveIssueMcpHandler = (params: Record<string, unknown>) =>
  resolveIssueHandler(params);
export const reopenIssueMcpHandler = (params: Record<string, unknown>) =>
  reopenIssueHandler(params);
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
export const componentsMcpHandler = (params: Record<string, unknown>) => componentsHandler(params);

// Register SonarQube tools
mcpServer.tool('projects', 'List all SonarQube projects', projectsToolSchema, projectsMcpHandler);

mcpServer.tool(
  'metrics',
  'Get available metrics from SonarQube',
  metricsToolSchema,
  metricsMcpHandler
);

mcpServer.tool(
  'issues',
  'Search and filter SonarQube issues by severity, status, assignee, tag, file path, directory, scope, and more. Critical for dashboards, targeted clean-up sprints, security audits, and regression testing. Supports faceted search for aggregations.',
  issuesToolSchema,
  issuesMcpHandler
);

mcpServer.tool(
  'markIssueFalsePositive',
  'Mark an issue as false positive',
  markIssueFalsePositiveToolSchema,
  markIssueFalsePositiveMcpHandler
);

mcpServer.tool(
  'markIssueWontFix',
  "Mark an issue as won't fix",
  markIssueWontFixToolSchema,
  markIssueWontFixMcpHandler
);

mcpServer.tool(
  'markIssuesFalsePositive',
  'Mark multiple issues as false positive (bulk operation)',
  markIssuesFalsePositiveToolSchema,
  markIssuesFalsePositiveMcpHandler
);

mcpServer.tool(
  'markIssuesWontFix',
  "Mark multiple issues as won't fix (bulk operation)",
  markIssuesWontFixToolSchema,
  markIssuesWontFixMcpHandler
);

mcpServer.tool(
  'addCommentToIssue',
  'Add a comment to a SonarQube issue',
  addCommentToIssueToolSchema,
  addCommentToIssueMcpHandler
);

mcpServer.tool(
  'assignIssue',
  'Assign a SonarQube issue to a user or unassign it',
  assignIssueToolSchema,
  assignIssueMcpHandler
);

mcpServer.tool(
  'confirmIssue',
  'Confirm a SonarQube issue',
  confirmIssueToolSchema,
  confirmIssueMcpHandler
);

mcpServer.tool(
  'unconfirmIssue',
  'Unconfirm a SonarQube issue',
  unconfirmIssueToolSchema,
  unconfirmIssueMcpHandler
);

mcpServer.tool(
  'resolveIssue',
  'Resolve a SonarQube issue',
  resolveIssueToolSchema,
  resolveIssueMcpHandler
);

mcpServer.tool(
  'reopenIssue',
  'Reopen a SonarQube issue',
  reopenIssueToolSchema,
  reopenIssueMcpHandler
);

// Register system API tools
mcpServer.tool(
  'system_health',
  'Get the health status of the SonarQube instance',
  systemHealthToolSchema,
  healthMcpHandler
);

mcpServer.tool(
  'system_status',
  'Get the status of the SonarQube instance',
  systemStatusToolSchema,
  statusMcpHandler
);

mcpServer.tool(
  'system_ping',
  'Ping the SonarQube instance to check if it is up',
  systemPingToolSchema,
  pingMcpHandler
);

// Register measures API tools
mcpServer.tool(
  'measures_component',
  'Get measures for a specific component',
  componentMeasuresToolSchema,
  componentMeasuresMcpHandler
);

mcpServer.tool(
  'measures_components',
  'Get measures for multiple components',
  componentsMeasuresToolSchema,
  componentsMeasuresMcpHandler
);

mcpServer.tool(
  'measures_history',
  'Get measures history for a component',
  measuresHistoryToolSchema,
  measuresHistoryMcpHandler
);

// Register Quality Gates API tools
mcpServer.tool(
  'quality_gates',
  'List available quality gates',
  qualityGatesToolSchema,
  qualityGatesMcpHandler
);

mcpServer.tool(
  'quality_gate',
  'Get quality gate conditions',
  qualityGateToolSchema,
  qualityGateMcpHandler
);

mcpServer.tool(
  'quality_gate_status',
  'Get project quality gate status',
  qualityGateStatusToolSchema,
  qualityGateStatusMcpHandler
);

// Register Source Code API tools
mcpServer.tool(
  'source_code',
  'View source code with issues highlighted',
  sourceCodeToolSchema,
  sourceCodeMcpHandler
);

mcpServer.tool(
  'scm_blame',
  'Get SCM blame information for source code',
  scmBlameToolSchema,
  scmBlameMcpHandler
);

// Register Security Hotspot tools
mcpServer.tool(
  'hotspots',
  'Search for security hotspots with filtering options',
  hotspotsToolSchema,
  hotspotsMcpHandler
);

mcpServer.tool(
  'hotspot',
  'Get detailed information about a specific security hotspot',
  hotspotToolSchema,
  hotspotMcpHandler
);

mcpServer.tool(
  'update_hotspot_status',
  'Update the status of a security hotspot (requires appropriate permissions)',
  updateHotspotStatusToolSchema,
  updateHotspotStatusMcpHandler
);

// Register Components tool
mcpServer.tool(
  'components',
  'Search and navigate SonarQube components (projects, directories, files). Supports text search, filtering by type/language, and tree navigation',
  componentsToolSchema,
  componentsMcpHandler
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
