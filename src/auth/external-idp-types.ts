/**
 * External Identity Provider (IdP) integration types
 */

/**
 * Supported external IdP providers
 */
export enum ExternalIdPProvider {
  AZURE_AD = 'azure_ad',
  OKTA = 'okta',
  AUTH0 = 'auth0',
  KEYCLOAK = 'keycloak',
  GENERIC = 'generic',
}

/**
 * External IdP configuration
 */
export interface ExternalIdPConfig {
  /**
   * IdP provider type
   */
  provider: ExternalIdPProvider;

  /**
   * OAuth 2.0 issuer URL
   */
  issuer: string;

  /**
   * JWKS endpoint URL (if different from standard discovery)
   */
  jwksUri?: string;

  /**
   * Expected audience(s) for this IdP
   */
  audience: string | string[];

  /**
   * Claim that contains user groups
   */
  groupsClaim?: string;

  /**
   * Transform function for group claim values
   */
  groupsTransform?: 'none' | 'extract_name' | 'extract_id';

  /**
   * Additional claims to extract
   */
  additionalClaims?: string[];

  /**
   * Whether to enable health monitoring for this IdP
   */
  enableHealthMonitoring?: boolean;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval?: number;

  /**
   * Priority for this IdP (higher = preferred)
   */
  priority?: number;

  /**
   * Custom claim mappings
   */
  claimMappings?: Record<string, string>;

  /**
   * Tenant ID for multi-tenant scenarios
   */
  tenantId?: string;
}

/**
 * JWKS (JSON Web Key Set) response
 */
export interface JWKSResponse {
  keys: JWK[];
}

/**
 * JSON Web Key
 */
export interface JWK {
  kty: string; // Key type (e.g., 'RSA')
  use?: string; // Key use (e.g., 'sig')
  kid: string; // Key ID
  alg?: string; // Algorithm (e.g., 'RS256')
  n?: string; // RSA modulus
  e?: string; // RSA exponent
  x5c?: string[]; // X.509 certificate chain
  x5t?: string; // X.509 certificate thumbprint
}

/**
 * IdP health status
 */
export interface IdPHealthStatus {
  /**
   * IdP issuer URL
   */
  issuer: string;

  /**
   * Provider type
   */
  provider: ExternalIdPProvider;

  /**
   * Whether the IdP is healthy
   */
  isHealthy: boolean;

  /**
   * Last successful health check
   */
  lastHealthCheck?: Date;

  /**
   * Last error encountered
   */
  lastError?: string;

  /**
   * Response time in milliseconds
   */
  responseTime?: number;

  /**
   * JWKS endpoint status
   */
  jwksStatus?: {
    reachable: boolean;
    keyCount?: number;
    lastFetch?: Date;
  };

  /**
   * Discovery endpoint status
   */
  discoveryStatus?: {
    reachable: boolean;
    lastFetch?: Date;
  };
}

/**
 * OpenID Connect Discovery Document
 */
export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  acr_values_supported?: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  id_token_encryption_alg_values_supported?: string[];
  id_token_encryption_enc_values_supported?: string[];
  userinfo_signing_alg_values_supported?: string[];
  userinfo_encryption_alg_values_supported?: string[];
  userinfo_encryption_enc_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  request_object_encryption_alg_values_supported?: string[];
  request_object_encryption_enc_values_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  display_values_supported?: string[];
  claim_types_supported?: string[];
  claims_supported?: string[];
  service_documentation?: string;
  claims_locales_supported?: string[];
  ui_locales_supported?: string[];
  claims_parameter_supported?: boolean;
  request_parameter_supported?: boolean;
  request_uri_parameter_supported?: boolean;
  require_request_uri_registration?: boolean;
  op_policy_uri?: string;
  op_tos_uri?: string;
  check_session_iframe?: string;
  end_session_endpoint?: string;
  [key: string]: unknown; // Allow for custom properties
}

/**
 * Provider-specific configurations
 */
export const PROVIDER_DEFAULTS: Record<ExternalIdPProvider, Partial<ExternalIdPConfig>> = {
  [ExternalIdPProvider.AZURE_AD]: {
    groupsClaim: 'groups',
    groupsTransform: 'extract_name',
    additionalClaims: ['preferred_username', 'name', 'email', 'oid', 'tid'],
  },
  [ExternalIdPProvider.OKTA]: {
    groupsClaim: 'groups',
    groupsTransform: 'none',
    additionalClaims: ['preferred_username', 'name', 'email', 'locale'],
  },
  [ExternalIdPProvider.AUTH0]: {
    groupsClaim: 'https://auth0.com/groups', // Auth0 uses namespaced claims
    groupsTransform: 'none',
    additionalClaims: ['nickname', 'name', 'email', 'picture'],
  },
  [ExternalIdPProvider.KEYCLOAK]: {
    groupsClaim: 'groups',
    groupsTransform: 'extract_name',
    additionalClaims: ['preferred_username', 'name', 'email', 'realm_access'],
  },
  [ExternalIdPProvider.GENERIC]: {
    groupsClaim: 'groups',
    groupsTransform: 'none',
  },
};

/**
 * External IdP error codes
 */
export enum ExternalIdPErrorCode {
  DISCOVERY_FAILED = 'discovery_failed',
  JWKS_FETCH_FAILED = 'jwks_fetch_failed',
  INVALID_JWKS_RESPONSE = 'invalid_jwks_response',
  NO_MATCHING_KEY = 'no_matching_key',
  INVALID_KEY_FORMAT = 'invalid_key_format',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  UNSUPPORTED_ALGORITHM = 'unsupported_algorithm',
}

/**
 * External IdP error
 */
export class ExternalIdPError extends Error {
  constructor(
    public readonly code: ExternalIdPErrorCode,
    message: string,
    public readonly issuer?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ExternalIdPError';
  }
}
