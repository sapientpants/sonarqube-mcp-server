/**
 * Re-export all handlers from their respective modules
 */

export { handleSonarQubeProjects } from './projects.js';
export { handleSonarQubeProjectsWithPermissions } from './projects-with-permissions.js';

export {
  handleSonarQubeGetIssues,
  handleMarkIssueFalsePositive,
  handleMarkIssueWontFix,
  handleMarkIssuesFalsePositive,
  handleMarkIssuesWontFix,
  handleAddCommentToIssue,
  handleAssignIssue,
  handleConfirmIssue,
  handleUnconfirmIssue,
  handleResolveIssue,
  handleReopenIssue,
  setElicitationManager,
} from './issues.js';
export { handleSonarQubeGetIssuesWithPermissions } from './issues-with-permissions.js';

export { handleSonarQubeGetMetrics } from './metrics.js';

export {
  handleSonarQubeGetHealth,
  handleSonarQubeGetStatus,
  handleSonarQubePing,
} from './system.js';

export {
  handleSonarQubeComponentMeasures,
  handleSonarQubeComponentsMeasures,
  handleSonarQubeMeasuresHistory,
} from './measures.js';

export {
  handleSonarQubeListQualityGates,
  handleSonarQubeGetQualityGate,
  handleSonarQubeQualityGateStatus,
} from './quality-gates.js';

export { handleSonarQubeGetSourceCode, handleSonarQubeGetScmBlame } from './source-code.js';

export {
  handleSonarQubeHotspots,
  handleSonarQubeHotspot,
  handleSonarQubeUpdateHotspotStatus,
} from './hotspots.js';

export { handleSonarQubeComponents } from './components.js';
