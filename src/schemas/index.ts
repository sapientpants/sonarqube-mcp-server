// Re-export all schemas from their respective files

// Common schemas
export * from './common.js';

// Domain schemas
export * from './hotspots.js';

// Tool schemas
export { projectsToolSchema } from './projects.js';
export { metricsToolSchema } from './metrics.js';
export {
  issuesToolSchema,
  markIssueFalsePositiveToolSchema,
  markIssueWontFixToolSchema,
  markIssuesFalsePositiveToolSchema,
  markIssuesWontFixToolSchema,
} from './issues.js';
export { systemHealthToolSchema, systemStatusToolSchema, systemPingToolSchema } from './system.js';
export {
  componentMeasuresToolSchema,
  componentsMeasuresToolSchema,
  measuresHistoryToolSchema,
} from './measures.js';
export {
  qualityGatesToolSchema,
  qualityGateToolSchema,
  qualityGateStatusToolSchema,
} from './quality-gates.js';
export { sourceCodeToolSchema, scmBlameToolSchema } from './source-code.js';
export {
  hotspotsToolSchema,
  hotspotToolSchema,
  updateHotspotStatusToolSchema,
} from './hotspots-tools.js';
