import { createLogger } from '../utils/logger.js';
import { PermissionService } from './permission-service.js';
import { PermissionConfig, PermissionRule, UserContext } from './types.js';
import { TokenClaims } from './token-validator.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('PermissionManager');

/**
 * Permission manager that handles loading and managing permission configurations
 */
export class PermissionManager {
  private permissionService: PermissionService | null = null;
  private configPath: string | null = null;

  constructor() {
    // Check for permission config from environment
    const configPathFromEnv = process.env.MCP_PERMISSION_CONFIG_PATH;
    if (configPathFromEnv) {
      this.configPath = configPathFromEnv;
      this.loadConfiguration().catch((err) => {
        logger.error('Failed to load permission configuration', err);
      });
    }
  }

  /**
   * Initialize permission manager with configuration
   */
  async initialize(config: PermissionConfig): Promise<void> {
    this.permissionService = new PermissionService(config);
    logger.info('Permission manager initialized', {
      rulesCount: config.rules.length,
      caching: config.enableCaching ?? false,
      audit: config.enableAudit ?? false,
    });
  }

  /**
   * Load configuration from file
   */
  async loadConfiguration(): Promise<void> {
    if (!this.configPath) {
      logger.debug('No permission configuration path specified');
      return;
    }

    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configContent) as PermissionConfig;

      // Validate configuration
      this.validateConfiguration(config);

      await this.initialize(config);
      logger.info('Permission configuration loaded', { path: this.configPath });
    } catch (error) {
      logger.error('Failed to load permission configuration', {
        path: this.configPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate permission configuration
   */
  private validateConfiguration(config: PermissionConfig): void {
    if (!config.rules || !Array.isArray(config.rules)) {
      throw new Error('Permission configuration must have a rules array');
    }

    for (const [index, rule] of config.rules.entries()) {
      this.validateRule(rule, index);
    }

    if (config.defaultRule) {
      this.validateDefaultRule(config.defaultRule);
    }
  }

  /**
   * Validate a permission rule
   */
  private validateRule(rule: PermissionRule, index: number): void {
    if (!Array.isArray(rule.allowedProjects)) {
      throw new Error(`Rule ${index}: allowedProjects must be an array`);
    }

    if (!Array.isArray(rule.allowedTools)) {
      throw new Error(`Rule ${index}: allowedTools must be an array`);
    }

    if (typeof rule.readonly !== 'boolean') {
      throw new Error(`Rule ${index}: readonly must be a boolean`);
    }

    // Validate regex patterns
    for (const pattern of rule.allowedProjects) {
      try {
        new RegExp(pattern);
      } catch {
        throw new Error(`Rule ${index}: Invalid regex pattern '${pattern}'`);
      }
    }
  }

  /**
   * Validate default rule
   */
  private validateDefaultRule(rule: Partial<PermissionRule>): void {
    if (rule.allowedProjects !== undefined && !Array.isArray(rule.allowedProjects)) {
      throw new Error('Default rule: allowedProjects must be an array');
    }

    if (rule.allowedTools !== undefined && !Array.isArray(rule.allowedTools)) {
      throw new Error('Default rule: allowedTools must be an array');
    }

    if (rule.readonly !== undefined && typeof rule.readonly !== 'boolean') {
      throw new Error('Default rule: readonly must be a boolean');
    }
  }

  /**
   * Get permission service
   */
  getPermissionService(): PermissionService | null {
    return this.permissionService;
  }

  /**
   * Check if permissions are enabled
   */
  isEnabled(): boolean {
    return this.permissionService !== null;
  }

  /**
   * Extract user context from token claims
   */
  extractUserContext(claims: TokenClaims): UserContext | null {
    if (!this.permissionService) {
      return null;
    }
    return this.permissionService.extractUserContext(claims);
  }

  /**
   * Create default permission configuration
   */
  static createDefaultConfig(): PermissionConfig {
    return {
      rules: [
        {
          // Admin group - full access
          groups: ['admin', 'sonarqube-admin'],
          allowedProjects: ['.*'], // All projects
          allowedTools: [
            'projects',
            'metrics',
            'issues',
            'markIssueFalsePositive',
            'markIssueWontFix',
            'markIssuesFalsePositive',
            'markIssuesWontFix',
            'addCommentToIssue',
            'assignIssue',
            'confirmIssue',
            'unconfirmIssue',
            'resolveIssue',
            'reopenIssue',
            'system_health',
            'system_status',
            'system_ping',
            'measures_component',
            'measures_components',
            'measures_history',
            'quality_gates',
            'quality_gate',
            'quality_gate_status',
            'source_code',
            'scm_blame',
            'hotspots',
            'hotspot',
            'update_hotspot_status',
            'components',
          ],
          readonly: false,
          priority: 100,
        },
        {
          // Developer group - read/write for specific projects
          groups: ['developer', 'dev'],
          allowedProjects: ['^(dev-|feature-|test-).*'], // Dev/feature/test projects
          allowedTools: [
            'projects',
            'metrics',
            'issues',
            'markIssueFalsePositive',
            'markIssueWontFix',
            'addCommentToIssue',
            'assignIssue',
            'confirmIssue',
            'unconfirmIssue',
            'measures_component',
            'measures_components',
            'measures_history',
            'quality_gate_status',
            'source_code',
            'scm_blame',
            'components',
          ],
          deniedTools: ['system_health', 'system_status'], // No system tools
          readonly: false,
          maxSeverity: 'CRITICAL', // Can't see blockers
          priority: 50,
        },
        {
          // QA group - read-only access
          groups: ['qa', 'quality-assurance'],
          allowedProjects: ['.*'], // All projects
          allowedTools: [
            'projects',
            'metrics',
            'issues',
            'measures_component',
            'measures_components',
            'measures_history',
            'quality_gates',
            'quality_gate',
            'quality_gate_status',
            'source_code',
            'hotspots',
            'hotspot',
            'components',
          ],
          readonly: true,
          priority: 40,
        },
        {
          // Guest group - limited read-only access
          groups: ['guest', 'viewer'],
          allowedProjects: ['^public-.*'], // Only public projects
          allowedTools: ['projects', 'metrics', 'issues', 'quality_gate_status'],
          readonly: true,
          maxSeverity: 'MAJOR', // Can't see critical/blocker issues
          hideSensitiveData: true,
          priority: 10,
        },
      ],
      defaultRule: {
        // Default deny all
        allowedProjects: [],
        allowedTools: [],
        readonly: true,
      },
      enableCaching: true,
      cacheTtl: 300, // 5 minutes
      enableAudit: false, // Enable for debugging
    };
  }

  /**
   * Save example configuration to file
   */
  static async saveExampleConfig(filePath: string): Promise<void> {
    const config = PermissionManager.createDefaultConfig();
    const configJson = JSON.stringify(config, null, 2);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, configJson, 'utf-8');

    logger.info('Example permission configuration saved', { path: filePath });
  }
}

// Global instance
export const permissionManager = new PermissionManager();
