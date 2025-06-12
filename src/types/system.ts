/**
 * Interface for SonarQube health status
 */
export interface SonarQubeHealthStatus {
  health: 'GREEN' | 'YELLOW' | 'RED';
  causes: string[];
}

/**
 * Interface for SonarQube system status
 */
export interface SonarQubeSystemStatus {
  id: string;
  version: string;
  status:
    | 'UP'
    | 'DOWN'
    | 'STARTING'
    | 'RESTARTING'
    | 'DB_MIGRATION_NEEDED'
    | 'DB_MIGRATION_RUNNING';
}
