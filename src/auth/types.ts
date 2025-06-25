/**
 * Permission types and interfaces for the SonarQube MCP server
 */

/**
 * Issue severity levels
 */
export type IssueSeverity = 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';

/**
 * Issue status types
 */
export type IssueStatus = 'OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED';

/**
 * Permission rule that defines what a user/group can access
 */
export interface PermissionRule {
  /**
   * Groups that this rule applies to. If undefined, applies to all groups.
   */
  groups?: string[];

  /**
   * Project patterns (regex) that are allowed. Empty array means no projects allowed.
   */
  allowedProjects: string[];

  /**
   * Tools that are allowed. Empty array means no tools allowed.
   */
  allowedTools: string[];

  /**
   * Tools that are explicitly denied (takes precedence over allowedTools).
   */
  deniedTools?: string[];

  /**
   * Whether the user has read-only access
   */
  readonly: boolean;

  /**
   * Maximum issue severity the user can see (optional)
   */
  maxSeverity?: IssueSeverity;

  /**
   * Allowed issue statuses (optional, defaults to all)
   */
  allowedStatuses?: IssueStatus[];

  /**
   * Whether to hide sensitive data (e.g., author information, detailed descriptions)
   */
  hideSensitiveData?: boolean;

  /**
   * Priority of this rule (higher number = higher priority)
   */
  priority?: number;
}

/**
 * Configuration for the permission system
 */
export interface PermissionConfig {
  /**
   * List of permission rules
   */
  rules: PermissionRule[];

  /**
   * Default rule to apply if no other rules match (optional)
   * If not provided, access is denied by default (fail closed)
   */
  defaultRule?: Partial<PermissionRule>;

  /**
   * Whether to enable permission caching
   */
  enableCaching?: boolean;

  /**
   * Cache TTL in seconds (default: 300)
   */
  cacheTtl?: number;

  /**
   * Whether to audit permission checks (for debugging)
   */
  enableAudit?: boolean;
}

/**
 * User context extracted from OAuth token
 */
export interface UserContext {
  /**
   * User ID (sub claim)
   */
  userId: string;

  /**
   * User groups/roles
   */
  groups: string[];

  /**
   * OAuth scopes
   */
  scopes: string[];

  /**
   * Token issuer
   */
  issuer: string;

  /**
   * Original token claims
   */
  claims: Record<string, unknown>;
}

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  /**
   * Whether the action is allowed
   */
  allowed: boolean;

  /**
   * Reason for denial (if not allowed)
   */
  reason?: string;

  /**
   * Applied permission rule (for debugging)
   */
  appliedRule?: PermissionRule;
}

/**
 * Audit log entry for permission checks
 */
export interface PermissionAuditEntry {
  timestamp: Date;
  userId: string;
  groups: string[];
  action: string;
  resource: string;
  allowed: boolean;
  reason?: string;
  appliedRule?: string;
}

/**
 * JWT token claims interface
 */
export interface TokenClaims {
  sub: string; // Subject (user ID)
  iss: string; // Issuer
  aud: string | string[]; // Audience
  exp: number; // Expiration time
  nbf?: number; // Not before
  iat: number; // Issued at
  jti?: string; // JWT ID
  scope?: string; // OAuth 2.0 scopes
  resource?: string | string[]; // Resource indicators (RFC8707)
  [key: string]: unknown; // Additional claims
}

/**
 * Available MCP tools with permission requirements
 */
export type McpTool =
  | 'projects'
  | 'metrics'
  | 'issues'
  | 'markIssueFalsePositive'
  | 'markIssueWontFix'
  | 'markIssuesFalsePositive'
  | 'markIssuesWontFix'
  | 'addCommentToIssue'
  | 'assignIssue'
  | 'confirmIssue'
  | 'unconfirmIssue'
  | 'resolveIssue'
  | 'reopenIssue'
  | 'system_health'
  | 'system_status'
  | 'system_ping'
  | 'measures_component'
  | 'measures_components'
  | 'measures_history'
  | 'quality_gates'
  | 'quality_gate'
  | 'quality_gate_status'
  | 'source_code'
  | 'scm_blame'
  | 'hotspots'
  | 'hotspot'
  | 'update_hotspot_status'
  | 'components';

/**
 * Tool operation types for permission checking
 */
export type ToolOperation = 'read' | 'write' | 'admin';

/**
 * Map of tools to their operation types
 */
export const TOOL_OPERATIONS: Record<McpTool, ToolOperation> = {
  // Read operations
  projects: 'read',
  metrics: 'read',
  issues: 'read',
  system_health: 'read',
  system_status: 'read',
  system_ping: 'read',
  measures_component: 'read',
  measures_components: 'read',
  measures_history: 'read',
  quality_gates: 'read',
  quality_gate: 'read',
  quality_gate_status: 'read',
  source_code: 'read',
  scm_blame: 'read',
  hotspots: 'read',
  hotspot: 'read',
  components: 'read',

  // Write operations
  markIssueFalsePositive: 'write',
  markIssueWontFix: 'write',
  markIssuesFalsePositive: 'write',
  markIssuesWontFix: 'write',
  addCommentToIssue: 'write',
  assignIssue: 'write',
  confirmIssue: 'write',
  unconfirmIssue: 'write',
  resolveIssue: 'write',
  reopenIssue: 'write',
  update_hotspot_status: 'write',
};
