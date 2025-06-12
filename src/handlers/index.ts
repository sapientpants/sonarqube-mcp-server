/**
 * Re-export all handlers from their respective modules
 */

export { handleSonarQubeProjects } from './projects.js';

export { handleSonarQubeGetIssues } from './issues.js';

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
