import { createLogger } from '../utils/logger.js';
import type { TokenClaims } from './token-validator.js';
import type { ISonarQubeClient } from '../types/index.js';
import { createSonarQubeClient } from '../sonarqube.js';
import { PatternMatcher } from '../utils/pattern-matcher.js';

const logger = createLogger('ServiceAccountMapper');

/**
 * Service account configuration
 */
export interface ServiceAccount {
  /** Unique identifier for the service account */
  id: string;
  /** Display name for the service account */
  name: string;
  /** SonarQube API token */
  token: string;
  /** Optional SonarQube URL (overrides default) */
  url?: string;
  /** Optional organization (for SonarCloud) */
  organization?: string;
  /** Allowed scopes for this service account */
  allowedScopes?: string[];
}

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
  /** Service account ID to use */
  serviceAccountId: string;
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

  constructor(options: ServiceAccountMapperOptions = {}) {
    this.defaultUrl = options.defaultUrl ?? process.env.SONARQUBE_URL ?? 'https://sonarcloud.io';
    this.defaultOrganization = options.defaultOrganization ?? process.env.SONARQUBE_ORGANIZATION;
    this.defaultServiceAccountId = options.defaultServiceAccountId;

    // Load service accounts from options or environment
    this.loadServiceAccounts(options.serviceAccounts);

    // Sort mapping rules by priority
    this.mappingRules = (options.mappingRules ?? []).sort((a, b) => a.priority - b.priority);

    logger.info('Service account mapper initialized', {
      serviceAccountCount: this.serviceAccounts.size,
      mappingRuleCount: this.mappingRules.length,
      hasDefaultAccount: !!this.defaultServiceAccountId,
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
    const serviceAccountId = this.findServiceAccountForUser(claims);
    if (!serviceAccountId) {
      throw new Error(
        `No service account mapping found for user ${claims.sub} from issuer ${claims.iss}`
      );
    }

    const serviceAccount = this.serviceAccounts.get(serviceAccountId);
    if (!serviceAccount) {
      throw new Error(`Service account ${serviceAccountId} not found`);
    }

    // Create client for the service account
    const client = await this.createClientForServiceAccount(serviceAccount);

    logger.info('Created client for user', {
      userId: claims.sub,
      issuer: claims.iss,
      serviceAccountId,
      serviceAccountName: serviceAccount.name,
    });

    return { client, serviceAccountId };
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
    const userScopes = claims.scope?.split(' ') ?? [];

    for (const rule of this.mappingRules) {
      // Check user pattern
      if (rule.userPattern && !rule.userPattern.test(claims.sub)) {
        continue;
      }

      // Check issuer pattern
      if (rule.issuerPattern && !rule.issuerPattern.test(claims.iss)) {
        continue;
      }

      // Check required scopes
      if (rule.requiredScopes) {
        const hasAllScopes = rule.requiredScopes.every((scope) => userScopes.includes(scope));
        if (!hasAllScopes) {
          continue;
        }
      }

      // Rule matches
      return rule.serviceAccountId;
    }

    // Return default if no rules match
    return this.defaultServiceAccountId;
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
}
