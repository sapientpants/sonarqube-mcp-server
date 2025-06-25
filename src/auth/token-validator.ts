import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';
import { ExternalIdPManager } from './external-idp-manager.js';

const logger = createLogger('TokenValidator');

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
 * Token validation error codes
 */
export enum TokenValidationErrorCode {
  INVALID_TOKEN = 'invalid_token',
  EXPIRED_TOKEN = 'expired_token',
  INVALID_AUDIENCE = 'invalid_audience',
  INVALID_ISSUER = 'invalid_issuer',
  INVALID_SIGNATURE = 'invalid_signature',
  INVALID_RESOURCE = 'invalid_resource',
  TOKEN_NOT_ACTIVE = 'token_not_active',
}

/**
 * Token validation error
 */
export class TokenValidationError extends Error {
  constructor(
    public readonly code: TokenValidationErrorCode,
    message: string,
    public readonly wwwAuthenticateParams?: Record<string, string>
  ) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

/**
 * Options for token validation
 */
export interface TokenValidationOptions {
  /** The expected audience (this MCP server) */
  audience: string | string[];
  /** Accepted token issuers */
  issuers: string[];
  /** JWKS endpoints for each issuer */
  jwksEndpoints: Map<string, string>;
  /** Clock tolerance in seconds */
  clockTolerance?: number;
  /** Whether to validate resource indicators */
  validateResource?: boolean;
  /** Expected resource indicators */
  expectedResources?: string[];
  /** Static public keys for testing (maps issuer to public key) */
  staticPublicKeys?: Map<string, string | Buffer>;
  /** External IdP manager for enhanced token validation */
  externalIdPManager?: ExternalIdPManager;
}

/**
 * JWT public key cache
 */
interface JWKSCache {
  keys: jwt.Jwt[];
  fetchedAt: number;
}

/**
 * Token validator for OAuth 2.0 JWT tokens
 */
export class TokenValidator {
  private readonly jwksCache = new Map<string, JWKSCache>();
  private readonly JWKS_CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor(private readonly options: TokenValidationOptions) {}

  /**
   * Validate a JWT token
   * @param token The JWT token to validate
   * @returns The validated token claims
   * @throws TokenValidationError if validation fails
   */
  async validateToken(token: string): Promise<TokenClaims> {
    try {
      // Step 1: Decode and validate token structure
      const { payload, header } = this.decodeToken(token);

      // Step 2: Validate issuer
      this.validateIssuer(payload.iss);

      // Step 3: Get public key for verification
      const publicKey = await this.getPublicKey(payload.iss, header.kid);

      // Step 4: Build verification options
      const verifyOptions = this.buildVerifyOptions();

      // Step 5: Verify token signature and standard claims
      const verified = jwt.verify(token, publicKey, verifyOptions) as TokenClaims;

      // Step 6: Additional validations
      this.validateAudience(verified);
      this.validateNotBefore(verified);

      // Step 7: Validate resource indicators if configured
      if (this.options.validateResource && this.options.expectedResources) {
        this.validateResourceIndicators(verified);
      }

      // Step 8: Extract and transform claims using external IdP manager
      let finalClaims = verified;
      if (this.options.externalIdPManager) {
        finalClaims = this.options.externalIdPManager.extractClaims(verified.iss, verified);
      }

      logger.debug('Token validated successfully', {
        sub: finalClaims.sub,
        iss: finalClaims.iss,
        aud: finalClaims.aud,
        scope: finalClaims.scope,
        groups: finalClaims.groups,
      });

      return finalClaims;
    } catch (error) {
      throw this.handleValidationError(error);
    }
  }

  /**
   * Decode token and extract payload and header
   */
  private decodeToken(token: string): { payload: TokenClaims; header: jwt.JwtHeader } {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded === 'string') {
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_TOKEN,
        'Invalid token format'
      );
    }

    return {
      payload: decoded.payload as TokenClaims,
      header: decoded.header,
    };
  }

  /**
   * Validate the token issuer
   */
  private validateIssuer(issuer: string | undefined): void {
    if (!issuer || !this.options.issuers.includes(issuer)) {
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_ISSUER,
        `Invalid issuer: ${issuer}`,
        { error_description: 'Token issuer not recognized' }
      );
    }
  }

  /**
   * Build JWT verification options
   */
  private buildVerifyOptions(): jwt.VerifyOptions {
    const verifyOptions: jwt.VerifyOptions = {
      clockTolerance: this.options.clockTolerance ?? 5,
      complete: false,
    };

    // Configure audience
    this.configureAudienceOption(verifyOptions);

    // Configure issuers
    this.configureIssuerOption(verifyOptions);

    return verifyOptions;
  }

  /**
   * Configure audience in verify options
   */
  private configureAudienceOption(verifyOptions: jwt.VerifyOptions): void {
    if (!this.options.audience) {
      return;
    }

    // jwt library expects a single string or array with at least one element
    if (Array.isArray(this.options.audience)) {
      if (this.options.audience.length === 1) {
        verifyOptions.audience = this.options.audience[0];
      } else if (this.options.audience.length > 1) {
        verifyOptions.audience = this.options.audience as [string, ...string[]];
      }
    } else {
      verifyOptions.audience = this.options.audience;
    }
  }

  /**
   * Configure issuer in verify options
   */
  private configureIssuerOption(verifyOptions: jwt.VerifyOptions): void {
    if (this.options.issuers.length === 1) {
      verifyOptions.issuer = this.options.issuers[0];
    } else if (this.options.issuers.length > 1) {
      verifyOptions.issuer = this.options.issuers as [string, ...string[]];
    }
  }

  /**
   * Validate not-before claim
   */
  private validateNotBefore(claims: TokenClaims): void {
    if (!claims.nbf) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const clockTolerance = this.options.clockTolerance ?? 5;

    if (claims.nbf > now + clockTolerance) {
      throw new TokenValidationError(
        TokenValidationErrorCode.TOKEN_NOT_ACTIVE,
        'Token not yet active',
        { error_description: 'Token nbf claim is in the future' }
      );
    }
  }

  /**
   * Handle validation errors and convert to TokenValidationError
   */
  private handleValidationError(error: unknown): TokenValidationError {
    if (error instanceof TokenValidationError) {
      return error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      return new TokenValidationError(TokenValidationErrorCode.EXPIRED_TOKEN, 'Token has expired', {
        error_description: 'Token exp claim has passed',
      });
    }

    if (error instanceof jwt.NotBeforeError) {
      return new TokenValidationError(
        TokenValidationErrorCode.TOKEN_NOT_ACTIVE,
        'Token not yet active',
        { error_description: 'Token nbf claim is in the future' }
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return this.handleJwtError(error);
    }

    logger.error('Unexpected token validation error', error);
    return new TokenValidationError(
      TokenValidationErrorCode.INVALID_TOKEN,
      'Token validation failed'
    );
  }

  /**
   * Handle specific JWT errors
   */
  private handleJwtError(error: jwt.JsonWebTokenError): TokenValidationError {
    const message = error.message.toLowerCase();

    if (message.includes('jwt audience invalid')) {
      return new TokenValidationError(
        TokenValidationErrorCode.INVALID_AUDIENCE,
        'Token audience does not include this server',
        { error_description: error.message }
      );
    }

    if (message.includes('jwt issuer invalid')) {
      return new TokenValidationError(TokenValidationErrorCode.INVALID_ISSUER, 'Invalid issuer', {
        error_description: error.message,
      });
    }

    // Default to signature error for other JsonWebTokenError instances
    return new TokenValidationError(
      TokenValidationErrorCode.INVALID_SIGNATURE,
      'Invalid token signature',
      { error_description: error.message }
    );
  }

  /**
   * Validate audience claim
   */
  private validateAudience(claims: TokenClaims): void {
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const expectedAudience = Array.isArray(this.options.audience)
      ? this.options.audience
      : [this.options.audience];

    const hasValidAudience = expectedAudience.some((expected) => audience.includes(expected));

    if (!hasValidAudience) {
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_AUDIENCE,
        'Token audience does not include this server',
        { error_description: 'Token aud claim does not match' }
      );
    }
  }

  /**
   * Validate resource indicators (RFC8707)
   */
  private validateResourceIndicators(claims: TokenClaims): void {
    if (!claims.resource) {
      return; // Resource indicator is optional
    }

    const resources = Array.isArray(claims.resource) ? claims.resource : [claims.resource];
    const expectedResources = this.options.expectedResources ?? [];

    const hasValidResource = resources.some((resource) =>
      expectedResources.some((expected) => {
        // Exact match or prefix match for hierarchical resources
        return resource === expected || resource.startsWith(`${expected}/`);
      })
    );

    if (!hasValidResource) {
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_RESOURCE,
        'Token resource indicator does not match',
        { error_description: 'Token resource claim does not match expected resources' }
      );
    }
  }

  /**
   * Get public key for token verification
   *
   * NOTE: JWKS endpoint fetching is not yet implemented. The current implementation
   * supports two fallback mechanisms for obtaining public keys:
   *
   * 1. Static public keys configured programmatically via the `staticPublicKeys` option
   * 2. Environment variables in the format `JWT_PUBLIC_KEY_<issuer>` where special
   *    characters in the issuer URL are replaced with underscores
   *
   * For detailed information about the token validation implementation and future
   * enhancements, see docs/oauth-token-validation.md
   *
   * When JWKS fetching is implemented in the future, it will:
   * - Fetch JWKS from the configured endpoint
   * - Cache the keys with TTL
   * - Find the matching key by kid (key ID)
   * - Convert JWK to PEM format for verification
   */
  private async getPublicKey(issuer: string, kid?: string): Promise<string | Buffer> {
    // Try to use external IdP manager if available
    if (this.options.externalIdPManager) {
      const idp = this.options.externalIdPManager.getIdP(issuer);
      if (idp) {
        logger.debug('Using external IdP manager for public key', { issuer, kid });
        return await this.options.externalIdPManager.getPublicKey(issuer, kid);
      }
    }

    const jwksEndpoint = this.options.jwksEndpoints.get(issuer);
    if (!jwksEndpoint) {
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_ISSUER,
        `No JWKS endpoint configured for issuer: ${issuer}`
      );
    }

    // NOTE: Direct JWKS fetching implementation is replaced by external IdP manager.
    // The following are fallback mechanisms for backward compatibility.

    // FALLBACK 1: Check if a static public key is configured for this issuer
    // This is the recommended approach for testing environments
    if (this.options.staticPublicKeys?.has(issuer)) {
      logger.debug('Using static public key for issuer', { issuer });
      return this.options.staticPublicKeys.get(issuer)!;
    }

    // FALLBACK 2: Check if a static public key is provided via environment variable
    // This allows configuration without code changes, useful for CI/CD pipelines
    const staticPublicKey = process.env[`JWT_PUBLIC_KEY_${issuer.replace(/[^a-zA-Z0-9]/g, '_')}`];
    if (staticPublicKey) {
      logger.debug('Using static public key from environment for issuer', { issuer });
      return staticPublicKey;
    }

    // NOTE: Direct JWKS endpoint fetching is not implemented here.
    // Use external IdP manager for production deployments with dynamic JWKS fetching.
    throw new TokenValidationError(
      TokenValidationErrorCode.INVALID_TOKEN,
      `Public key not configured for issuer: ${issuer}. ` +
        'For testing: Configure via staticPublicKeys option or JWT_PUBLIC_KEY_<issuer> env var. ' +
        'For production: Configure external IdP manager with JWKS support.'
    );
  }

  /**
   * Clear the JWKS cache
   */
  clearCache(): void {
    this.jwksCache.clear();
  }
}
