import { createLogger } from '../utils/logger.js';
import {
  JWKSResponse,
  JWK,
  ExternalIdPError,
  ExternalIdPErrorCode,
  OIDCDiscoveryDocument,
} from './external-idp-types.js';
import crypto from 'crypto';

const logger = createLogger('JWKSClient');

/**
 * Options for JWKS client
 */
export interface JWKSClientOptions {
  /**
   * Cache TTL in milliseconds (default: 1 hour)
   */
  cacheTtl?: number;

  /**
   * Request timeout in milliseconds (default: 5 seconds)
   */
  requestTimeout?: number;

  /**
   * Maximum number of keys to cache per issuer (default: 10)
   */
  maxKeysPerIssuer?: number;

  /**
   * Whether to follow OIDC discovery (default: true)
   */
  useDiscovery?: boolean;

  /**
   * Custom headers for requests
   */
  customHeaders?: Record<string, string>;
}

/**
 * Cached JWKS data
 */
interface CachedJWKS {
  keys: Map<string, string>; // kid -> PEM key
  fetchedAt: number;
  expiresAt: number;
}

/**
 * Cached discovery document
 */
interface CachedDiscovery {
  document: OIDCDiscoveryDocument;
  fetchedAt: number;
  expiresAt: number;
}

/**
 * JWKS client for fetching and caching public keys from IdPs
 */
export class JWKSClient {
  private readonly jwksCache = new Map<string, CachedJWKS>();
  private readonly discoveryCache = new Map<string, CachedDiscovery>();
  private readonly options: Required<JWKSClientOptions>;

  constructor(options: JWKSClientOptions = {}) {
    this.options = {
      cacheTtl: options.cacheTtl ?? 3600000, // 1 hour
      requestTimeout: options.requestTimeout ?? 5000, // 5 seconds
      maxKeysPerIssuer: options.maxKeysPerIssuer ?? 10,
      useDiscovery: options.useDiscovery ?? true,
      customHeaders: options.customHeaders ?? {},
    };
  }

  /**
   * Get public key for a specific issuer and key ID
   */
  async getKey(issuer: string, kid?: string, jwksUri?: string): Promise<string> {
    logger.debug('Getting key for issuer', { issuer, kid });

    // Check cache first
    const cached = this.jwksCache.get(issuer);
    if (cached && cached.expiresAt > Date.now()) {
      if (!kid) {
        // Return first available key if no kid specified
        const firstKey = cached.keys.values().next().value;
        if (firstKey) return firstKey;
      } else if (cached.keys.has(kid)) {
        return cached.keys.get(kid)!;
      }
    }

    // Fetch fresh JWKS
    const jwksEndpoint = await this.getJwksEndpoint(issuer, jwksUri);
    const keys = await this.fetchAndCacheJWKS(issuer, jwksEndpoint);

    // Find the requested key
    if (!kid) {
      const firstKey = keys.values().next().value;
      if (!firstKey) {
        throw new ExternalIdPError(
          ExternalIdPErrorCode.NO_MATCHING_KEY,
          'No keys found in JWKS',
          issuer
        );
      }
      return firstKey;
    }

    const key = keys.get(kid);
    if (!key) {
      throw new ExternalIdPError(
        ExternalIdPErrorCode.NO_MATCHING_KEY,
        `Key with kid '${kid}' not found in JWKS`,
        issuer
      );
    }

    return key;
  }

  /**
   * Get JWKS endpoint URL
   */
  private async getJwksEndpoint(issuer: string, jwksUri?: string): Promise<string> {
    // Use provided JWKS URI if available
    if (jwksUri) {
      return jwksUri;
    }

    // Use OIDC discovery if enabled
    if (this.options.useDiscovery) {
      const discovery = await this.fetchDiscoveryDocument(issuer);
      return discovery.jwks_uri;
    }

    // Fallback to standard JWKS location
    const baseUrl = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;
    return `${baseUrl}/.well-known/jwks.json`;
  }

  /**
   * Fetch OIDC discovery document
   */
  private async fetchDiscoveryDocument(issuer: string): Promise<OIDCDiscoveryDocument> {
    // Check cache
    const cached = this.discoveryCache.get(issuer);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.document;
    }

    const baseUrl = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;
    const discoveryUrl = `${baseUrl}/.well-known/openid-configuration`;

    logger.debug('Fetching discovery document', { issuer, discoveryUrl });

    try {
      const response = await this.fetchWithTimeout(discoveryUrl);
      const document = (await response.json()) as OIDCDiscoveryDocument;

      // Validate discovery document
      if (!document.jwks_uri || !document.issuer) {
        throw new ExternalIdPError(
          ExternalIdPErrorCode.DISCOVERY_FAILED,
          'Invalid discovery document: missing required fields',
          issuer
        );
      }

      // Cache the document
      this.discoveryCache.set(issuer, {
        document,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + this.options.cacheTtl,
      });

      logger.debug('Discovery document fetched successfully', { issuer });
      return document;
    } catch (error) {
      if (error instanceof ExternalIdPError) {
        throw error;
      }
      throw new ExternalIdPError(
        ExternalIdPErrorCode.DISCOVERY_FAILED,
        `Failed to fetch discovery document: ${error instanceof Error ? error.message : String(error)}`,
        issuer,
        error
      );
    }
  }

  /**
   * Fetch and cache JWKS
   */
  private async fetchAndCacheJWKS(issuer: string, jwksUri: string): Promise<Map<string, string>> {
    logger.debug('Fetching JWKS', { issuer, jwksUri });

    try {
      const response = await this.fetchWithTimeout(jwksUri);
      const jwks = (await response.json()) as JWKSResponse;

      // Validate JWKS response
      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new ExternalIdPError(
          ExternalIdPErrorCode.INVALID_JWKS_RESPONSE,
          'Invalid JWKS response: missing keys array',
          issuer
        );
      }

      // Convert JWKs to PEM format
      const keys = new Map<string, string>();
      for (const jwk of jwks.keys.slice(0, this.options.maxKeysPerIssuer)) {
        if (!jwk.kid) continue; // Skip keys without kid

        try {
          const pem = await this.jwkToPem(jwk);
          keys.set(jwk.kid, pem);
        } catch (error) {
          logger.warn('Failed to convert JWK to PEM', { issuer, kid: jwk.kid, error });
        }
      }

      if (keys.size === 0) {
        throw new ExternalIdPError(
          ExternalIdPErrorCode.INVALID_KEY_FORMAT,
          'No valid keys found in JWKS',
          issuer
        );
      }

      // Cache the keys
      this.jwksCache.set(issuer, {
        keys,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + this.options.cacheTtl,
      });

      logger.debug('JWKS fetched and cached successfully', { issuer, keyCount: keys.size });
      return keys;
    } catch (error) {
      if (error instanceof ExternalIdPError) {
        throw error;
      }
      throw new ExternalIdPError(
        ExternalIdPErrorCode.JWKS_FETCH_FAILED,
        `Failed to fetch JWKS: ${error instanceof Error ? error.message : String(error)}`,
        issuer,
        error
      );
    }
  }

  /**
   * Convert JWK to PEM format
   */
  private async jwkToPem(jwk: JWK): Promise<string> {
    if (jwk.kty !== 'RSA') {
      throw new ExternalIdPError(
        ExternalIdPErrorCode.UNSUPPORTED_ALGORITHM,
        `Unsupported key type: ${jwk.kty}`
      );
    }

    if (!jwk.n || !jwk.e) {
      throw new ExternalIdPError(
        ExternalIdPErrorCode.INVALID_KEY_FORMAT,
        'RSA key missing required parameters'
      );
    }

    try {
      // Create RSA public key from JWK components
      const publicKey = crypto.createPublicKey({
        key: {
          kty: 'RSA',
          n: jwk.n,
          e: jwk.e,
        },
        format: 'jwk',
      });

      return publicKey.export({ type: 'spki', format: 'pem' }) as string;
    } catch (error) {
      throw new ExternalIdPError(
        ExternalIdPErrorCode.INVALID_KEY_FORMAT,
        `Failed to convert JWK to PEM: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.requestTimeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'sonarqube-mcp-server/1.0',
          ...this.options.customHeaders,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.jwksCache.clear();
    this.discoveryCache.clear();
    logger.debug('JWKS cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    jwksEntries: number;
    discoveryEntries: number;
    totalKeys: number;
  } {
    let totalKeys = 0;
    for (const cached of this.jwksCache.values()) {
      totalKeys += cached.keys.size;
    }

    return {
      jwksEntries: this.jwksCache.size,
      discoveryEntries: this.discoveryCache.size,
      totalKeys,
    };
  }
}
