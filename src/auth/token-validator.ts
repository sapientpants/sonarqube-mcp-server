import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';

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
      // Decode token without verification first to get the header
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new TokenValidationError(
          TokenValidationErrorCode.INVALID_TOKEN,
          'Invalid token format'
        );
      }

      const payload = decoded.payload as TokenClaims;
      const header = decoded.header;

      // Validate issuer
      if (!payload.iss || !this.options.issuers.includes(payload.iss)) {
        throw new TokenValidationError(
          TokenValidationErrorCode.INVALID_ISSUER,
          `Invalid issuer: ${payload.iss}`,
          { error_description: 'Token issuer not recognized' }
        );
      }

      // Get the public key for verification
      const publicKey = await this.getPublicKey(payload.iss, header.kid);

      // Verify the token with all validations
      const verifyOptions: jwt.VerifyOptions = {
        clockTolerance: this.options.clockTolerance ?? 5,
        complete: false,
      };

      // Set audience if provided
      if (this.options.audience) {
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

      // Set issuers
      if (this.options.issuers.length === 1) {
        verifyOptions.issuer = this.options.issuers[0];
      } else if (this.options.issuers.length > 1) {
        verifyOptions.issuer = this.options.issuers as [string, ...string[]];
      }

      const verified = jwt.verify(token, publicKey, verifyOptions) as TokenClaims;

      // Additional audience validation (ensure our server is in the audience)
      this.validateAudience(verified);

      // Validate not-before if present
      if (verified.nbf) {
        const now = Math.floor(Date.now() / 1000);
        const clockTolerance = this.options.clockTolerance ?? 5;
        if (verified.nbf > now + clockTolerance) {
          throw new TokenValidationError(
            TokenValidationErrorCode.TOKEN_NOT_ACTIVE,
            'Token not yet active',
            { error_description: 'Token nbf claim is in the future' }
          );
        }
      }

      // Validate resource indicators if configured
      if (this.options.validateResource && this.options.expectedResources) {
        this.validateResourceIndicators(verified);
      }

      logger.debug('Token validated successfully', {
        sub: verified.sub,
        iss: verified.iss,
        aud: verified.aud,
        scope: verified.scope,
      });

      return verified;
    } catch (error) {
      if (error instanceof TokenValidationError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenValidationError(
          TokenValidationErrorCode.EXPIRED_TOKEN,
          'Token has expired',
          { error_description: 'Token exp claim has passed' }
        );
      }

      if (error instanceof jwt.NotBeforeError) {
        throw new TokenValidationError(
          TokenValidationErrorCode.TOKEN_NOT_ACTIVE,
          'Token not yet active',
          { error_description: 'Token nbf claim is in the future' }
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        // Parse the error message to determine the specific error type
        const message = error.message.toLowerCase();

        if (message.includes('jwt audience invalid')) {
          throw new TokenValidationError(
            TokenValidationErrorCode.INVALID_AUDIENCE,
            'Token audience does not include this server',
            { error_description: error.message }
          );
        }

        if (message.includes('jwt issuer invalid')) {
          throw new TokenValidationError(
            TokenValidationErrorCode.INVALID_ISSUER,
            'Invalid issuer',
            { error_description: error.message }
          );
        }

        // Default to signature error for other JsonWebTokenError instances
        throw new TokenValidationError(
          TokenValidationErrorCode.INVALID_SIGNATURE,
          'Invalid token signature',
          { error_description: error.message }
        );
      }

      logger.error('Unexpected token validation error', error);
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_TOKEN,
        'Token validation failed'
      );
    }
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
   * TODO: Implement JWKS endpoint fetching with caching
   * - Fetch JWKS from the configured endpoint
   * - Cache the keys with TTL
   * - Find the matching key by kid (key ID)
   * - Convert JWK to PEM format for verification
   *
   * For testing environments, consider using:
   * - Static public keys configured via environment variables
   * - Mock JWKS endpoints
   * - Test-specific key pairs
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getPublicKey(issuer: string, _kid?: string): Promise<string | Buffer> {
    const jwksEndpoint = this.options.jwksEndpoints.get(issuer);
    if (!jwksEndpoint) {
      throw new TokenValidationError(
        TokenValidationErrorCode.INVALID_ISSUER,
        `No JWKS endpoint configured for issuer: ${issuer}`
      );
    }

    // TODO: Implement JWKS fetching logic here
    // This is a placeholder implementation that will be replaced
    // when HTTP client functionality is added to the project

    // Check if a static public key is configured for this issuer
    if (this.options.staticPublicKeys?.has(issuer)) {
      logger.debug('Using static public key for issuer', { issuer });
      return this.options.staticPublicKeys.get(issuer)!;
    }

    // For now, check if a static public key is provided via environment
    const staticPublicKey = process.env[`JWT_PUBLIC_KEY_${issuer.replace(/[^a-zA-Z0-9]/g, '_')}`];
    if (staticPublicKey) {
      logger.debug('Using static public key from environment for issuer', { issuer });
      return staticPublicKey;
    }

    throw new TokenValidationError(
      TokenValidationErrorCode.INVALID_TOKEN,
      'JWKS endpoint fetching not yet implemented. Configure a static public key via staticPublicKeys option or JWT_PUBLIC_KEY_<issuer> environment variable for testing.'
    );
  }

  /**
   * Clear the JWKS cache
   */
  clearCache(): void {
    this.jwksCache.clear();
  }
}
