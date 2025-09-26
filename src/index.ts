#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ISonarQubeClient,
  createSonarQubeClientFromEnv,
  setSonarQubeElicitationManager,
  HotspotSearchParams,
  HotspotStatusUpdateParams,
} from './sonarqube.js';
import type { ComponentQualifier } from './types/components.js';
import type {
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AssignIssueParams,
  ConfirmIssueParams,
  UnconfirmIssueParams,
  ResolveIssueParams,
  ReopenIssueParams,
} from './types/issues.js';
import { createLogger } from './utils/logger.js';
import { nullToUndefined, ensureStringArray } from './utils/transforms.js';
import { mapToSonarQubeParams } from './utils/parameter-mappers.js';
import { validateEnvironmentVariables, resetDefaultClient } from './utils/client-factory.js';
import { createElicitationManager } from './utils/elicitation.js';
import { SERVER_VERSION, VERSION_INFO } from './config/versions.js';
import { TransportFactory } from './transports/index.js';
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
  setElicitationManager,
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

// Create elicitation manager instance
const elicitationManager = createElicitationManager();

// Set elicitation manager on handlers that need it
setElicitationManager(elicitationManager);
setSonarQubeElicitationManager(elicitationManager);

// Re-export utilities for backward compatibility
export { nullToUndefined, stringToNumberTransform } from './utils/transforms.js';
export { mapToSonarQubeParams } from './utils/parameter-mappers.js';

// Initialize MCP server
export const mcpServer = new McpServer({
  name: 'sonarqube-mcp-server',
  version: SERVER_VERSION,
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
  return handleSonarQubeGetMetrics({
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  });
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
  const handleParams: MarkIssueFalsePositiveParams = {
    issueKey: params.issue_key as string,
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleMarkIssueFalsePositive(handleParams);
};

/**
 * Lambda function for mark issue won't fix tool
 */
export const markIssueWontFixHandler = async (params: Record<string, unknown>) => {
  const handleParams: MarkIssueWontFixParams = {
    issueKey: params.issue_key as string,
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleMarkIssueWontFix(handleParams);
};

/**
 * Lambda function for mark issues false positive (bulk) tool
 */
export const markIssuesFalsePositiveHandler = async (params: Record<string, unknown>) => {
  const handleParams: BulkIssueMarkParams = {
    issueKeys: params.issue_keys as string[],
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleMarkIssuesFalsePositive(handleParams);
};

/**
 * Lambda function for mark issues won't fix (bulk) tool
 */
export const markIssuesWontFixHandler = async (params: Record<string, unknown>) => {
  const handleParams: BulkIssueMarkParams = {
    issueKeys: params.issue_keys as string[],
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleMarkIssuesWontFix(handleParams);
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
  const handleParams: AssignIssueParams = {
    issueKey: params.issueKey as string,
  };
  if (params.assignee !== undefined) {
    (handleParams as any).assignee = params.assignee as string;
  }
  return handleAssignIssue(handleParams);
};

/**
 * Lambda function for confirm issue tool
 */
export const confirmIssueHandler = async (params: Record<string, unknown>) => {
  const handleParams: ConfirmIssueParams = {
    issueKey: params.issue_key as string,
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleConfirmIssue(handleParams);
};

/**
 * Lambda function for unconfirm issue tool
 */
export const unconfirmIssueHandler = async (params: Record<string, unknown>) => {
  const handleParams: UnconfirmIssueParams = {
    issueKey: params.issue_key as string,
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleUnconfirmIssue(handleParams);
};

/**
 * Lambda function for resolve issue tool
 */
export const resolveIssueHandler = async (params: Record<string, unknown>) => {
  const handleParams: ResolveIssueParams = {
    issueKey: params.issue_key as string,
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleResolveIssue(handleParams);
};

/**
 * Lambda function for reopen issue tool
 */
export const reopenIssueHandler = async (params: Record<string, unknown>) => {
  const handleParams: ReopenIssueParams = {
    issueKey: params.issue_key as string,
  };
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }
  return handleReopenIssue(handleParams);
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
  const handleParams: {
    component: string;
    metricKeys: string[];
    additionalFields?: string[];
    branch?: string;
    pullRequest?: string;
    period?: string;
  } = {
    component: params.component as string,
    metricKeys: ensureStringArray(params.metric_keys as StringOrArrayParam),
  };

  if (params.additional_fields !== undefined) {
    handleParams.additionalFields = params.additional_fields as string[];
  }
  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    handleParams.pullRequest = params.pull_request as string;
  }
  if (params.period !== undefined) {
    handleParams.period = params.period as string;
  }

  return handleSonarQubeComponentMeasures(handleParams);
};

/**
 * Lambda function for measures_components tool
 */
export const componentsMeasuresHandler = async (params: Record<string, unknown>) => {
  const handleParams: {
    componentKeys: string[];
    metricKeys: string[];
    additionalFields?: string[];
    branch?: string;
    pullRequest?: string;
    period?: string;
    page: number | undefined;
    pageSize: number | undefined;
  } = {
    componentKeys: ensureStringArray(params.component_keys as StringOrArrayParam),
    metricKeys: ensureStringArray(params.metric_keys as StringOrArrayParam),
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  };

  if (params.additional_fields !== undefined) {
    handleParams.additionalFields = params.additional_fields as string[];
  }
  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    handleParams.pullRequest = params.pull_request as string;
  }
  if (params.period !== undefined) {
    handleParams.period = params.period as string;
  }

  return handleSonarQubeComponentsMeasures(handleParams);
};

/**
 * Lambda function for measures_history tool
 */
export const measuresHistoryHandler = async (params: Record<string, unknown>) => {
  const handleParams: {
    component: string;
    metrics: string[];
    from?: string;
    to?: string;
    branch?: string;
    pullRequest?: string;
    page: number | undefined;
    pageSize: number | undefined;
  } = {
    component: params.component as string,
    metrics: ensureStringArray(params.metrics as StringOrArrayParam),
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  };

  if (params.from !== undefined) {
    handleParams.from = params.from as string;
  }
  if (params.to !== undefined) {
    handleParams.to = params.to as string;
  }
  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    handleParams.pullRequest = params.pull_request as string;
  }

  return handleSonarQubeMeasuresHistory(handleParams);
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
  const handleParams: {
    projectKey: string;
    branch?: string;
    pullRequest?: string;
  } = {
    projectKey: params.project_key as string,
  };

  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    handleParams.pullRequest = params.pull_request as string;
  }

  return handleSonarQubeQualityGateStatus(handleParams);
};

/**
 * Lambda function for source_code tool
 */
export const sourceCodeHandler = async (params: Record<string, unknown>) => {
  const handleParams: {
    key: string;
    from?: number;
    to?: number;
    branch?: string;
    pullRequest?: string;
  } = {
    key: params.key as string,
  };

  if (params.from !== undefined) {
    handleParams.from = nullToUndefined(params.from) as number;
  }
  if (params.to !== undefined) {
    handleParams.to = nullToUndefined(params.to) as number;
  }
  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    handleParams.pullRequest = params.pull_request as string;
  }

  return handleSonarQubeGetSourceCode(handleParams);
};

/**
 * Lambda function for scm_blame tool
 */
export const scmBlameHandler = async (params: Record<string, unknown>) => {
  const handleParams: {
    key: string;
    from?: number;
    to?: number;
    branch?: string;
    pullRequest?: string;
  } = {
    key: params.key as string,
  };

  if (params.from !== undefined) {
    handleParams.from = nullToUndefined(params.from) as number;
  }
  if (params.to !== undefined) {
    handleParams.to = nullToUndefined(params.to) as number;
  }
  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    handleParams.pullRequest = params.pull_request as string;
  }

  return handleSonarQubeGetScmBlame(handleParams);
};

/**
 * Lambda function for search_hotspots tool
 */
export const hotspotsHandler = async (params: Record<string, unknown>) => {
  const handleParams: HotspotSearchParams = {
    page: nullToUndefined(params.page) as number | undefined,
    pageSize: nullToUndefined(params.page_size) as number | undefined,
  };

  if (params.project_key !== undefined) {
    (handleParams as any).projectKey = params.project_key as string;
  }
  if (params.branch !== undefined) {
    (handleParams as any).branch = params.branch as string;
  }
  if (params.pull_request !== undefined) {
    (handleParams as any).pullRequest = params.pull_request as string;
  }
  if (params.status !== undefined) {
    (handleParams as any).status = params.status as HotspotSearchParams['status'];
  }
  if (params.resolution !== undefined) {
    (handleParams as any).resolution = params.resolution as HotspotSearchParams['resolution'];
  }
  if (params.files !== undefined) {
    (handleParams as any).files = nullToUndefined(params.files) as string[];
  }
  if (params.assigned_to_me !== undefined) {
    (handleParams as any).assignedToMe = nullToUndefined(params.assigned_to_me) as boolean;
  }
  if (params.since_leak_period !== undefined) {
    (handleParams as any).sinceLeakPeriod = nullToUndefined(params.since_leak_period) as boolean;
  }
  if (params.in_new_code_period !== undefined) {
    (handleParams as any).inNewCodePeriod = nullToUndefined(params.in_new_code_period) as boolean;
  }

  return handleSonarQubeHotspots(handleParams);
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
  const handleParams: HotspotStatusUpdateParams = {
    hotspot: params.hotspot_key as string,
    status: params.status as HotspotStatusUpdateParams['status'],
  };

  if (params.resolution !== undefined) {
    (handleParams as any).resolution = params.resolution as HotspotStatusUpdateParams['resolution'];
  }
  if (params.comment !== undefined) {
    (handleParams as any).comment = params.comment as string;
  }

  return handleSonarQubeUpdateHotspotStatus(handleParams);
};

/**
 * Lambda function for components tool
 */
export const componentsHandler = async (params: Record<string, unknown>) => {
  const handleParams: {
    query?: string;
    qualifiers?: ComponentQualifier[];
    language?: string;
    component?: string;
    strategy?: 'all' | 'children' | 'leaves';
    key?: string;
    asc?: boolean;
    ps?: number;
    p?: number;
    branch?: string;
    pullRequest?: string;
  } = {};

  if (params.query !== undefined) {
    handleParams.query = params.query as string;
  }
  if (params.qualifiers !== undefined) {
    handleParams.qualifiers = params.qualifiers as ComponentQualifier[];
  }
  if (params.language !== undefined) {
    handleParams.language = params.language as string;
  }
  if (params.component !== undefined) {
    handleParams.component = params.component as string;
  }
  if (params.strategy !== undefined) {
    handleParams.strategy = params.strategy as 'all' | 'children' | 'leaves';
  }
  if (params.key !== undefined) {
    handleParams.key = params.key as string;
  }
  if (params.asc !== undefined) {
    handleParams.asc = params.asc as boolean;
  }
  if (params.ps !== undefined) {
    handleParams.ps = params.ps as number;
  }
  if (params.p !== undefined) {
    handleParams.p = params.p as number;
  }
  if (params.branch !== undefined) {
    handleParams.branch = params.branch as string;
  }
  if (params.pullRequest !== undefined) {
    handleParams.pullRequest = params.pullRequest as string;
  }

  return handleSonarQubeComponents(handleParams);
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
mcpServer.tool(
  'projects',
  'List all SonarQube projects with metadata. Essential for project discovery, inventory management, and accessing project-specific analysis data (requires admin permissions)',
  projectsToolSchema,
  {
    title: 'List Projects',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  projectsMcpHandler
);

mcpServer.tool(
  'metrics',
  'Get available metrics from SonarQube. Use this to discover all measurable code quality dimensions (lines of code, complexity, coverage, duplications, etc.) for reports and dashboards',
  metricsToolSchema,
  {
    title: 'Get Metrics',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  metricsMcpHandler
);

mcpServer.tool(
  'issues',
  'Search and filter SonarQube issues by severity, status, assignee, tag, file path, directory, scope, and more. Critical for dashboards, targeted clean-up sprints, security audits, and regression testing. Supports faceted search for aggregations.',
  issuesToolSchema,
  {
    title: 'Search Issues',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  issuesMcpHandler
);

mcpServer.tool(
  'markIssueFalsePositive',
  'Mark an issue as false positive',
  markIssueFalsePositiveToolSchema,
  {
    title: 'Mark Issue False Positive',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  markIssueFalsePositiveMcpHandler
);

mcpServer.tool(
  'markIssueWontFix',
  "Mark an issue as won't fix",
  markIssueWontFixToolSchema,
  {
    title: "Mark Issue Won't Fix",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  markIssueWontFixMcpHandler
);

mcpServer.tool(
  'markIssuesFalsePositive',
  'Mark multiple issues as false positive (bulk operation)',
  markIssuesFalsePositiveToolSchema,
  {
    title: 'Mark Issues False Positive',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  markIssuesFalsePositiveMcpHandler
);

mcpServer.tool(
  'markIssuesWontFix',
  "Mark multiple issues as won't fix (bulk operation)",
  markIssuesWontFixToolSchema,
  {
    title: "Mark Issues Won't Fix",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  markIssuesWontFixMcpHandler
);

mcpServer.tool(
  'addCommentToIssue',
  'Add a comment to a SonarQube issue',
  addCommentToIssueToolSchema,
  {
    title: 'Add Comment to Issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  addCommentToIssueMcpHandler
);

mcpServer.tool(
  'assignIssue',
  'Assign a SonarQube issue to a user or unassign it',
  assignIssueToolSchema,
  {
    title: 'Assign Issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  assignIssueMcpHandler
);

mcpServer.tool(
  'confirmIssue',
  'Confirm a SonarQube issue',
  confirmIssueToolSchema,
  {
    title: 'Confirm Issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  confirmIssueMcpHandler
);

mcpServer.tool(
  'unconfirmIssue',
  'Unconfirm a SonarQube issue',
  unconfirmIssueToolSchema,
  {
    title: 'Unconfirm Issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  unconfirmIssueMcpHandler
);

mcpServer.tool(
  'resolveIssue',
  'Resolve a SonarQube issue',
  resolveIssueToolSchema,
  {
    title: 'Resolve Issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  resolveIssueMcpHandler
);

mcpServer.tool(
  'reopenIssue',
  'Reopen a SonarQube issue',
  reopenIssueToolSchema,
  {
    title: 'Reopen Issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  reopenIssueMcpHandler
);

// Register system API tools
mcpServer.tool(
  'system_health',
  'Get the health status of the SonarQube instance. Monitor system components, database connectivity, and overall service availability for operational insights',
  systemHealthToolSchema,
  {
    title: 'Get System Health',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  healthMcpHandler
);

mcpServer.tool(
  'system_status',
  'Get the status of the SonarQube instance',
  systemStatusToolSchema,
  {
    title: 'Get System Status',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  statusMcpHandler
);

mcpServer.tool(
  'system_ping',
  'Ping the SonarQube instance to check if it is up',
  systemPingToolSchema,
  {
    title: 'Ping System',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  pingMcpHandler
);

// Register measures API tools
mcpServer.tool(
  'measures_component',
  'Get measures for a specific component (project, directory, or file). Essential for tracking code quality metrics, technical debt, and trends over time',
  componentMeasuresToolSchema,
  {
    title: 'Get Component Measures',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  componentMeasuresMcpHandler
);

mcpServer.tool(
  'measures_components',
  'Get measures for multiple components',
  componentsMeasuresToolSchema,
  {
    title: 'Get Components Measures',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  componentsMeasuresMcpHandler
);

mcpServer.tool(
  'measures_history',
  'Get measures history for a component',
  measuresHistoryToolSchema,
  {
    title: 'Get Measures History',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  measuresHistoryMcpHandler
);

// Register Quality Gates API tools
mcpServer.tool(
  'quality_gates',
  'List available quality gates',
  qualityGatesToolSchema,
  {
    title: 'List Quality Gates',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  qualityGatesMcpHandler
);

mcpServer.tool(
  'quality_gate',
  'Get quality gate conditions',
  qualityGateToolSchema,
  {
    title: 'Get Quality Gate',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  qualityGateMcpHandler
);

mcpServer.tool(
  'quality_gate_status',
  'Get project quality gate status',
  qualityGateStatusToolSchema,
  {
    title: 'Get Quality Gate Status',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  qualityGateStatusMcpHandler
);

// Register Source Code API tools
mcpServer.tool(
  'source_code',
  'View source code with issues highlighted',
  sourceCodeToolSchema,
  {
    title: 'View Source Code',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  sourceCodeMcpHandler
);

mcpServer.tool(
  'scm_blame',
  'Get SCM blame information for source code',
  scmBlameToolSchema,
  {
    title: 'Get SCM Blame',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  scmBlameMcpHandler
);

// Register Security Hotspot tools
mcpServer.tool(
  'hotspots',
  'Search for security hotspots with filtering options',
  hotspotsToolSchema,
  {
    title: 'Search Hotspots',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  hotspotsMcpHandler
);

mcpServer.tool(
  'hotspot',
  'Get detailed information about a specific security hotspot',
  hotspotToolSchema,
  {
    title: 'Get Hotspot Details',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  hotspotMcpHandler
);

mcpServer.tool(
  'update_hotspot_status',
  'Update the status of a security hotspot (requires appropriate permissions)',
  updateHotspotStatusToolSchema,
  {
    title: 'Update Hotspot Status',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  updateHotspotStatusMcpHandler
);

// Register Components tool
mcpServer.tool(
  'components',
  'Search and navigate SonarQube components (projects, directories, files). Supports text search, filtering by type/language, and tree navigation',
  componentsToolSchema,
  {
    title: 'Search Components',
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  componentsMcpHandler
);

// Only start the server if not in test mode
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    logger.info('Starting SonarQube MCP server', {
      ...VERSION_INFO,
      logFile: process.env.LOG_FILE ?? 'not configured',
      logLevel: process.env.LOG_LEVEL ?? 'DEBUG',
      elicitation: elicitationManager.isEnabled() ? 'enabled' : 'disabled',
    });

    // Create transport using the factory
    const transport = TransportFactory.createFromEnvironment();
    logger.info(`Using ${transport.getName()} transport`);

    // Set the underlying Server instance on the elicitation manager
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elicitationManager.setServer((mcpServer as any).server as Server);

    // Connect the transport to the MCP server
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await transport.connect((mcpServer as any).server as Server);

    logger.info('SonarQube MCP server started successfully', {
      mcpProtocolInfo: 'Protocol version will be negotiated with client during initialization',
    });
  })().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

// nullToUndefined is already exported at line 33
