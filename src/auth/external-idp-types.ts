/**
 * External Identity Provider (IdP) types and interfaces
 */

/**
 * Supported external IdP providers
 */
export type ExternalIdPProvider = 'azure-ad' | 'okta' | 'auth0' | 'keycloak' | 'generic';

/**
 * Configuration for an external identity provider
 */
export interface ExternalIdPConfig {
  /** The IdP provider type */
  provider: ExternalIdPProvider;

  /** The IdP issuer URL */
  issuer: string;

  /** JWKS URI (optional - will be discovered via OIDC if not provided) */
  jwksUri?: string;

  /** Expected audience(s) for tokens from this IdP */
  audience: string | string[];

  /** Claim to use for extracting groups (defaults based on provider) */
  groupsClaim?: string;

  /** Transform to apply to group values */
  groupsTransform?: 'none' | 'extract_name' | 'extract_id';

  /** Whether to enable health monitoring for this IdP */
  enableHealthMonitoring?: boolean;

  /** Tenant ID for multi-tenant providers (e.g., Azure AD) */
  tenantId?: string;
}

/**
 * Provider-specific defaults for common configurations
 */
export const PROVIDER_DEFAULTS: Record<ExternalIdPProvider, Partial<ExternalIdPConfig>> = {
  'azure-ad': {
    groupsClaim: 'groups',
    groupsTransform: 'extract_id',
  },
  okta: {
    groupsClaim: 'groups',
    groupsTransform: 'none',
  },
  auth0: {
    groupsClaim: 'https://auth0.com/groups',
    groupsTransform: 'none',
  },
  keycloak: {
    groupsClaim: 'groups',
    groupsTransform: 'extract_name',
  },
  generic: {
    groupsClaim: 'groups',
    groupsTransform: 'none',
  },
};

/**
 * Health status of an external IdP
 */
export interface IdPHealthStatus {
  /** The IdP issuer */
  issuer: string;

  /** Whether the IdP is healthy */
  healthy: boolean;

  /** Last successful health check */
  lastSuccess?: Date;

  /** Last failed health check */
  lastFailure?: Date;

  /** Error message if unhealthy */
  error?: string;

  /** Number of consecutive failures */
  consecutiveFailures: number;
}

/**
 * OIDC discovery document
 */
export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
  response_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  scopes_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  claims_supported?: string[];
}

/**
 * JSON Web Key Set (JWKS) response
 */
export interface JWKSResponse {
  keys: JWK[];
}

/**
 * JSON Web Key (JWK)
 */
export interface JWK {
  kty: string; // Key type (e.g., 'RSA', 'EC')
  use?: string; // Key use (e.g., 'sig', 'enc')
  key_ops?: string[]; // Key operations
  alg?: string; // Algorithm
  kid?: string; // Key ID
  x5c?: string[]; // X.509 certificate chain
  x5t?: string; // X.509 certificate SHA-1 thumbprint
  x5t256?: string; // X.509 certificate SHA-256 thumbprint
  n?: string; // RSA modulus
  e?: string; // RSA exponent
  x?: string; // EC x coordinate
  y?: string; // EC y coordinate
  crv?: string; // EC curve
  [key: string]: unknown; // Additional properties
}

/**
 * Cached JWKS data
 */
export interface CachedJWKS {
  keys: JWKSResponse;
  fetchedAt: Date;
  expiresAt: Date;
}
