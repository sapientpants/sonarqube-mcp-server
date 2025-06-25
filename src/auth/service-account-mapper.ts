import { createLogger } from '../utils/logger.js';
import type { TokenClaims } from './types.js';
import type { ISonarQubeClient } from '../types/index.js';
import type { ServiceAccount } from './service-account-types.js';
import { createSonarQubeClient } from '../sonarqube.js';
import { PatternMatcher } from '../utils/pattern-matcher.js';
import { ServiceAccountHealthMonitor } from './service-account-health.js';
import { ServiceAccountAuditor } from './service-account-auditor.js';
import { CredentialStore } from './credential-store.js';

const logger = createLogger('ServiceAccountMapper');

/**
 * Mapping rule for user to service account
 */
export interface MappingRule {
  /** Rule priority (lower number = higher priority) */
  priority: number;
  /** User subject pattern (glob-style: * and ? wildcards) */
  userPattern?: PatternMatcher;
  /** Issuer pattern (glob-style: * and ? wildcards) */
  issuerPattern?: PatternMatcher;
  /** Required scopes */
  requiredScopes?: string[];
  /** Required user groups (if any must match) */
  requiredGroups?: string[];
  /** Service account ID to use */
  serviceAccountId: string;
  /** Environment or team this rule applies to */
  environment?: string;
}

/**
 * Service account mapper options
 */
export interface ServiceAccountMapperOptions {
  /** Default SonarQube URL */
  defaultUrl?: string;
  /** Default organization */
  defaultOrganization?: string;
  /** Service accounts configuration */
  serviceAccounts?: ServiceAccount[];
  /** Mapping rules */
  mappingRules?: MappingRule[];
  /** Default service account ID (fallback) */
  defaultServiceAccountId?: string;
  /** Health monitor instance (optional, will create one if not provided) */
  healthMonitor?: ServiceAccountHealthMonitor;
  /** Auditor instance (optional, will create one if not provided) */
  auditor?: ServiceAccountAuditor;
  /** Credential store instance (optional) */
  credentialStore?: CredentialStore;
  /** Enable automatic failover (default: true) */
  enableFailover?: boolean;
  /** Enable health monitoring (default: true) */
  enableHealthMonitoring?: boolean;
  /** Enable audit logging (default: true) */
  enableAuditLogging?: boolean;
}

/**
 * Maps OAuth user contexts to SonarQube service accounts
 */
export class ServiceAccountMapper {
  private readonly serviceAccounts: Map<string, ServiceAccount> = new Map();
  private readonly mappingRules: MappingRule[];
  private readonly defaultUrl: string;
  private readonly defaultOrganization?: string;
  private readonly defaultServiceAccountId?: string;
  private readonly healthMonitor?: ServiceAccountHealthMonitor;
  private readonly auditor?: ServiceAccountAuditor;
  private readonly credentialStore?: CredentialStore;
  private readonly enableFailover: boolean;
  private readonly enableHealthMonitoring: boolean;
  private readonly enableAuditLogging: boolean;
  private initialHealthCheckTimeout?: NodeJS.Timeout;

  constructor(options: ServiceAccountMapperOptions = {}) {
    this.defaultUrl = options.defaultUrl ?? process.env.SONARQUBE_URL ?? 'https://sonarcloud.io';
    this.defaultOrganization = options.defaultOrganization ?? process.env.SONARQUBE_ORGANIZATION;
    this.defaultServiceAccountId = options.defaultServiceAccountId;
    this.enableFailover = options.enableFailover ?? true;
    this.enableHealthMonitoring = options.enableHealthMonitoring ?? true;
    this.enableAuditLogging = options.enableAuditLogging ?? true;

    // Initialize health monitor if enabled
    if (this.enableHealthMonitoring) {
      this.healthMonitor = options.healthMonitor ?? new ServiceAccountHealthMonitor();
    }

    // Initialize auditor if enabled
    if (this.enableAuditLogging) {
      this.auditor = options.auditor ?? new ServiceAccountAuditor();
    }

    // Set credential store if provided
    this.credentialStore = options.credentialStore;

    // Load service accounts from options or environment
    this.loadServiceAccounts(options.serviceAccounts);

    // Sort mapping rules by priority
    this.mappingRules = (options.mappingRules ?? []).sort((a, b) => a.priority - b.priority);

    // Initialize health for all accounts
    this.initializeAccountHealth();

    logger.info('Service account mapper initialized', {
      serviceAccountCount: this.serviceAccounts.size,
      mappingRuleCount: this.mappingRules.length,
      hasDefaultAccount: !!this.defaultServiceAccountId,
      healthMonitoring: this.enableHealthMonitoring,
      auditLogging: this.enableAuditLogging,
      failover: this.enableFailover,
    });
  }

  /**
   * Get a SonarQube client for the given user context
   */
  async getClientForUser(claims: TokenClaims): Promise<{
    client: ISonarQubeClient;
    serviceAccountId: string;
  }> {
    // Find matching service account
    const primaryAccountId = this.findServiceAccountForUser(claims);
    if (!primaryAccountId) {
      const error = `No service account mapping found for user ${claims.sub} from issuer ${claims.iss}`;
      this.auditor?.logAccountAccessDenied(claims, 'no-mapping', error);
      throw new Error(error);
    }

    // Try primary account and failover if needed
    const { client, accountId } = await this.getClientWithFailover(primaryAccountId, claims);

    logger.info('Created client for user', {
      userId: claims.sub,
      issuer: claims.iss,
      serviceAccountId: accountId,
      serviceAccountName: this.serviceAccounts.get(accountId)?.name,
    });

    return { client, serviceAccountId: accountId };
  }

  /**
   * Add or update a service account
   */
  addServiceAccount(account: ServiceAccount): void {
    this.serviceAccounts.set(account.id, account);
    logger.info('Service account added/updated', {
      id: account.id,
      name: account.name,
    });
  }

  /**
   * Remove a service account
   */
  removeServiceAccount(accountId: string): void {
    if (this.serviceAccounts.delete(accountId)) {
      logger.info('Service account removed', { id: accountId });
    }
  }

  /**
   * Add a mapping rule
   */
  addMappingRule(rule: MappingRule): void {
    this.mappingRules.push(rule);
    // Re-sort by priority
    this.mappingRules.sort((a, b) => a.priority - b.priority);
    logger.info('Mapping rule added', {
      priority: rule.priority,
      serviceAccountId: rule.serviceAccountId,
    });
  }

  /**
   * Get all service accounts
   */
  getServiceAccounts(): ServiceAccount[] {
    return Array.from(this.serviceAccounts.values());
  }

  /**
   * Get all mapping rules
   */
  getMappingRules(): MappingRule[] {
    return [...this.mappingRules];
  }

  /**
   * Find service account for user based on mapping rules
   */
  private findServiceAccountForUser(claims: TokenClaims): string | undefined {
    const userContext = this.extractUserContext(claims);

    for (const rule of this.mappingRules) {
      if (this.isRuleMatchingUser(rule, claims, userContext)) {
        return rule.serviceAccountId;
      }
    }

    // Return default if no rules match
    return this.defaultServiceAccountId;
  }

  /**
   * Extract user context from claims
   */
  private extractUserContext(claims: TokenClaims): {
    scopes: string[];
    groups: string[];
  } {
    return {
      scopes: claims.scope?.split(' ') ?? [],
      groups: Array.isArray(claims.groups) ? claims.groups : [],
    };
  }

  /**
   * Check if a rule matches the user
   */
  private isRuleMatchingUser(
    rule: MappingRule,
    claims: TokenClaims,
    userContext: { scopes: string[]; groups: string[] }
  ): boolean {
    // Check all rule criteria
    if (!this.isUserPatternMatching(rule, claims.sub)) return false;
    if (!this.isIssuerPatternMatching(rule, claims.iss)) return false;
    if (!this.areScopesMatching(rule, userContext.scopes)) return false;
    if (!this.areGroupsMatching(rule, userContext.groups)) return false;
    if (!this.isAccountHealthy(rule.serviceAccountId)) return false;

    return true;
  }

  /**
   * Check if user pattern matches
   */
  private isUserPatternMatching(rule: MappingRule, userSub: string): boolean {
    if (!rule.userPattern) return true;
    return rule.userPattern.test(userSub);
  }

  /**
   * Check if issuer pattern matches
   */
  private isIssuerPatternMatching(rule: MappingRule, issuer: string): boolean {
    if (!rule.issuerPattern) return true;
    return rule.issuerPattern.test(issuer);
  }

  /**
   * Check if required scopes are present
   */
  private areScopesMatching(rule: MappingRule, userScopes: string[]): boolean {
    if (!rule.requiredScopes) return true;
    return rule.requiredScopes.every((scope) => userScopes.includes(scope));
  }

  /**
   * Check if required groups are present
   */
  private areGroupsMatching(rule: MappingRule, userGroups: string[]): boolean {
    if (!rule.requiredGroups || rule.requiredGroups.length === 0) return true;
    return rule.requiredGroups.some((group) => userGroups.includes(group));
  }

  /**
   * Check if the service account is healthy
   */
  private isAccountHealthy(accountId: string): boolean {
    if (!this.enableHealthMonitoring) return true;

    const account = this.serviceAccounts.get(accountId);
    if (account && account.isHealthy === false) {
      logger.warn('Skipping unhealthy service account', {
        accountId,
        accountName: account.name,
      });
      return false;
    }

    return true;
  }

  /**
   * Create a SonarQube client for a service account
   */
  private async createClientForServiceAccount(account: ServiceAccount): Promise<ISonarQubeClient> {
    // Create and return the client
    return createSonarQubeClient(
      account.token,
      account.url ?? this.defaultUrl,
      account.organization ?? this.defaultOrganization
    );
  }

  /**
   * Load service accounts from configuration or environment
   */
  private loadServiceAccounts(accounts?: ServiceAccount[]): void {
    if (accounts) {
      // Load from configuration
      for (const account of accounts) {
        this.serviceAccounts.set(account.id, account);
      }
    } else {
      // Load from environment variables (backward compatibility)
      // Support multiple service accounts via indexed environment variables
      this.loadServiceAccountFromEnv('default');

      // Load additional service accounts (SA1, SA2, etc.)
      for (let i = 1; i <= 10; i++) {
        if (process.env[`SONARQUBE_SA${i}_TOKEN`]) {
          this.loadServiceAccountFromEnv(`sa${i}`, `_SA${i}`);
        }
      }
    }
  }

  /**
   * Load a service account from environment variables
   */
  private loadServiceAccountFromEnv(id: string, suffix: string = ''): void {
    const token = process.env[`SONARQUBE${suffix}_TOKEN`];
    if (!token) {
      return;
    }

    const account: ServiceAccount = {
      id,
      name: process.env[`SONARQUBE${suffix}_NAME`] ?? `Service Account ${id}`,
      token,
      url: process.env[`SONARQUBE${suffix}_URL`],
      organization: process.env[`SONARQUBE${suffix}_ORGANIZATION`],
      environment: process.env[`SONARQUBE${suffix}_ENVIRONMENT`],
      fallbackAccountId: process.env[`SONARQUBE${suffix}_FALLBACK`],
    };

    // Parse allowed scopes if provided
    const scopesEnv = process.env[`SONARQUBE${suffix}_SCOPES`];
    if (scopesEnv) {
      account.allowedScopes = scopesEnv.split(',').map((s) => s.trim());
    }

    this.serviceAccounts.set(id, account);
    logger.info('Loaded service account from environment', {
      id,
      name: account.name,
      hasUrl: !!account.url,
      hasOrg: !!account.organization,
      scopeCount: account.allowedScopes?.length ?? 0,
    });
  }

  /**
   * Initialize health status for all accounts
   */
  private initializeAccountHealth(): void {
    if (!this.enableHealthMonitoring || !this.healthMonitor) {
      return;
    }

    // Mark all accounts as healthy initially
    for (const account of this.serviceAccounts.values()) {
      account.isHealthy = true;
      account.failureCount = 0;
    }

    // Schedule initial health checks
    this.initialHealthCheckTimeout = setTimeout(() => {
      this.checkAllAccountsHealth().catch((error) => {
        logger.error('Failed to perform initial health check', error);
      });
    }, 5000); // Check after 5 seconds
  }

  /**
   * Check health of all service accounts
   */
  async checkAllAccountsHealth(): Promise<void> {
    if (!this.enableHealthMonitoring || !this.healthMonitor) {
      return;
    }

    logger.info('Checking health of all service accounts');
    const promises: Promise<void>[] = [];

    for (const account of this.serviceAccounts.values()) {
      const promise = this.healthMonitor
        .checkAccount(account, this.defaultUrl, this.defaultOrganization)
        .then((result) => {
          this.auditor?.logHealthCheck(
            account.id,
            account.name,
            result.isHealthy,
            result.latency,
            result.error
          );
        })
        .catch((error) => {
          logger.error('Health check failed for account', {
            accountId: account.id,
            error,
          });
        });
      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get client with automatic failover support
   */
  private async getClientWithFailover(
    primaryAccountId: string,
    claims: TokenClaims
  ): Promise<{ client: ISonarQubeClient; accountId: string }> {
    const attemptedAccounts = new Set<string>();
    let currentAccountId: string | undefined = primaryAccountId;
    let lastError: Error | undefined;
    let hasFailover = false;

    while (currentAccountId && !attemptedAccounts.has(currentAccountId)) {
      attemptedAccounts.add(currentAccountId);

      const result = await this.tryCreateClientForAccount(currentAccountId, claims);
      if (result.success) {
        return result;
      }

      // Store the error
      lastError = result.error ?? new Error(result.errorMessage);

      // Get next account to try
      const nextAccountId = this.getFailoverAccountId(
        currentAccountId,
        result.errorMessage,
        claims
      );

      // If no failover is available and this is the first attempt, throw the original error
      if (!nextAccountId && attemptedAccounts.size === 1) {
        throw lastError;
      }

      if (nextAccountId) {
        hasFailover = true;
      }

      currentAccountId = nextAccountId;
    }

    // If we had failover attempts (including circular), throw generic error
    if (hasFailover || attemptedAccounts.size > 1) {
      throw new Error('All service accounts failed, no failover available');
    }

    // Otherwise throw the specific error
    throw lastError ?? new Error('All service accounts failed, no failover available');
  }

  /**
   * Try to create a client for a specific account
   */
  private async tryCreateClientForAccount(
    accountId: string,
    claims: TokenClaims
  ): Promise<
    | { success: true; client: ISonarQubeClient; accountId: string }
    | { success: false; errorMessage: string; error?: Error }
  > {
    const account = this.serviceAccounts.get(accountId);
    if (!account) {
      const errorMessage = `Service account ${accountId} not found`;
      return {
        success: false,
        errorMessage,
        error: new Error(errorMessage),
      };
    }

    try {
      const client = await this.createAndValidateClient(account);
      this.logSuccessfulAccess(claims, accountId, account);
      return { success: true, client, accountId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.handleAccountFailure(accountId, account, errorMessage, claims);
      return {
        success: false,
        errorMessage,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Create and validate a client for a service account
   */
  private async createAndValidateClient(account: ServiceAccount): Promise<ISonarQubeClient> {
    // Get token from credential store if available
    const token = this.getAccountToken(account);
    const accountWithToken = { ...account, token };

    // Create client
    const client = await this.createClientForServiceAccount(accountWithToken);

    // Validate client health if enabled
    await this.validateClientHealth(accountWithToken);

    return client;
  }

  /**
   * Validate client health if health monitoring is enabled
   */
  private async validateClientHealth(account: ServiceAccount): Promise<void> {
    if (!this.enableHealthMonitoring || !this.healthMonitor) {
      return;
    }

    const healthResult = await this.healthMonitor.checkAccount(
      account,
      this.defaultUrl,
      this.defaultOrganization
    );

    if (!healthResult.isHealthy) {
      throw new Error(`Service account health check failed: ${healthResult.error}`);
    }
  }

  /**
   * Log successful account access
   */
  private logSuccessfulAccess(
    claims: TokenClaims,
    accountId: string,
    account: ServiceAccount
  ): void {
    this.auditor?.logAccountAccess(claims, accountId, account.name, account.environment);
  }

  /**
   * Handle account failure
   */
  private handleAccountFailure(
    accountId: string,
    account: ServiceAccount,
    errorMessage: string,
    claims: TokenClaims
  ): void {
    logger.error('Failed to create client for service account', {
      accountId,
      error: errorMessage,
    });

    this.healthMonitor?.markAccountFailed(accountId, errorMessage);
    this.auditor?.logAccountFailure(accountId, account.name, errorMessage, claims.sub);
  }

  /**
   * Get failover account ID if available
   */
  private getFailoverAccountId(
    currentAccountId: string,
    errorMessage: string,
    claims: TokenClaims
  ): string | undefined {
    if (!this.enableFailover) {
      return undefined;
    }

    const account = this.serviceAccounts.get(currentAccountId);
    if (!account?.fallbackAccountId) {
      return undefined;
    }

    logger.info('Attempting failover to backup account', {
      fromAccount: currentAccountId,
      toAccount: account.fallbackAccountId,
    });

    this.auditor?.logFailover(
      currentAccountId,
      account.fallbackAccountId,
      errorMessage,
      claims.sub
    );

    return account.fallbackAccountId;
  }

  /**
   * Get token for a service account (from credential store or direct)
   */
  private getAccountToken(account: ServiceAccount): string {
    // Try credential store first
    if (this.credentialStore?.hasCredential(account.id)) {
      const token = this.credentialStore.getCredential(account.id);
      if (token) {
        return token;
      }
    }

    // Fall back to account token
    if (!account.token) {
      throw new Error(`No token available for service account ${account.id}`);
    }

    return account.token;
  }

  /**
   * Get health monitor instance
   */
  getHealthMonitor(): ServiceAccountHealthMonitor | undefined {
    return this.healthMonitor;
  }

  /**
   * Get auditor instance
   */
  getAuditor(): ServiceAccountAuditor | undefined {
    return this.auditor;
  }

  /**
   * Shutdown the mapper and its components
   */
  shutdown(): void {
    if (this.initialHealthCheckTimeout) {
      clearTimeout(this.initialHealthCheckTimeout);
      this.initialHealthCheckTimeout = undefined;
    }
    this.healthMonitor?.stop();
    logger.info('Service account mapper shut down');
  }
}
