import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import https from 'https';
import fs from 'fs/promises';
import { ITransport } from './base.js';
import { createLogger } from '../utils/logger.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  TokenValidator,
  TokenValidationError,
  TokenValidationErrorCode,
  TokenClaims,
} from '../auth/token-validator.js';
import { SessionManager } from '../auth/session-manager.js';
import { ServiceAccountMapper } from '../auth/service-account-mapper.js';

const logger = createLogger('HttpTransport');

/**
 * Extended Express Request with authenticated user context
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenClaims;
  sessionId?: string;
}

/**
 * OAuth 2.0 Protected Resource Metadata as per RFC9728
 */
interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported?: string[];
  resource_signing_alg_values_supported?: string[];
  scopes_supported?: string[];
  resource_documentation?: string;
}

/**
 * OAuth 2.0 Authorization Server Metadata as per RFC8414
 */
interface OAuthAuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  jwks_uri?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  response_modes_supported?: string[];
  grant_types_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  service_documentation?: string;
  ui_locales_supported?: string[];
  op_policy_uri?: string;
  op_tos_uri?: string;
  revocation_endpoint?: string;
  revocation_endpoint_auth_methods_supported?: string[];
  revocation_endpoint_auth_signing_alg_values_supported?: string[];
  introspection_endpoint?: string;
  introspection_endpoint_auth_methods_supported?: string[];
  introspection_endpoint_auth_signing_alg_values_supported?: string[];
  code_challenge_methods_supported?: string[];
  signed_metadata?: string;
}

/**
 * Configuration options for HTTP transport
 *
 * SECURITY NOTE: Authentication is REQUIRED for production use.
 * Configure either external OAuth servers via `authorizationServers`
 * or enable the built-in auth server via `builtInAuthServer`.
 *
 * To temporarily disable authentication (DEVELOPMENT ONLY):
 * Set environment variable MCP_HTTP_ALLOW_NO_AUTH=true
 * This is EXTREMELY DANGEROUS and should NEVER be used in production.
 */
export interface HttpTransportOptions {
  /**
   * Port to listen on
   */
  port?: number;

  /**
   * Host to bind to
   */
  host?: string;

  /**
   * Public URL of the MCP server (for metadata endpoints)
   */
  publicUrl?: string;

  /**
   * External authorization server URLs
   */
  authorizationServers?: string[];

  /**
   * Whether to run built-in authorization server
   */
  builtInAuthServer?: boolean;

  /**
   * CORS configuration
   */
  corsOptions?: cors.CorsOptions;

  /**
   * Rate limiting configuration
   */
  rateLimitOptions?: {
    /** Window duration in minutes */
    windowMs?: number;
    /** Maximum number of requests per window */
    max?: number;
    /** Message to send when rate limit is exceeded */
    message?: string;
  };

  /**
   * HTTPS/TLS configuration
   */
  tls?: {
    /** Path to TLS certificate file */
    cert?: string;
    /** Path to TLS key file */
    key?: string;
    /** Path to CA certificate file */
    ca?: string;
    /** Enable HTTPS */
    enabled?: boolean;
  };
}

/**
 * Streamable HTTP transport implementation for MCP server.
 * Implements the MCP Streamable HTTP transport specification with:
 * - POST for client-to-server messages
 * - GET with SSE for server-to-client streaming
 * - OAuth 2.0 metadata endpoints as per RFC9728 and RFC8414
 *
 * SECURITY: This transport REQUIRES OAuth 2.0 authentication in production.
 * Authentication can be bypassed ONLY for development by setting MCP_HTTP_ALLOW_NO_AUTH=true.
 * Never use unauthenticated mode in production as it exposes all MCP endpoints without any access control.
 */
export class HttpTransport implements ITransport {
  private readonly app: Express;
  private server?: ReturnType<Express['listen']> | https.Server;
  private mcpTransport?: SSEServerTransport;
  private readonly options: Required<HttpTransportOptions>;
  private tokenValidator?: TokenValidator;
  private sessionManager?: SessionManager;
  private serviceAccountMapper?: ServiceAccountMapper;

  constructor(options: HttpTransportOptions = {}) {
    const tlsEnabled = options.tls?.enabled ?? process.env.MCP_HTTP_TLS_ENABLED === 'true';
    const defaultPort = tlsEnabled ? '3443' : '3000';
    const defaultProtocol = tlsEnabled ? 'https' : 'http';

    this.options = {
      port: options.port ?? parseInt(process.env.MCP_HTTP_PORT ?? defaultPort, 10),
      host: options.host ?? process.env.MCP_HTTP_HOST ?? 'localhost',
      publicUrl:
        options.publicUrl ??
        process.env.MCP_HTTP_PUBLIC_URL ??
        process.env.SONARQUBE_MCP_BASE_URL ??
        `${defaultProtocol}://${options.host ?? 'localhost'}:${options.port ?? defaultPort}`,
      authorizationServers:
        options.authorizationServers ??
        process.env.MCP_OAUTH_AUTH_SERVERS?.split(',').map((s) => s.trim()) ??
        [],
      builtInAuthServer: options.builtInAuthServer ?? process.env.MCP_OAUTH_BUILTIN === 'true',
      corsOptions: options.corsOptions ?? {},
      rateLimitOptions: options.rateLimitOptions ?? {},
      tls: {
        enabled: tlsEnabled,
        cert: options.tls?.cert ?? process.env.MCP_HTTP_TLS_CERT,
        key: options.tls?.key ?? process.env.MCP_HTTP_TLS_KEY,
        ca: options.tls?.ca ?? process.env.MCP_HTTP_TLS_CA,
      },
    };

    this.app = express();
    this.setupMiddleware();
    this.setupMetadataEndpoints();
    this.setupTokenValidator();
    this.setupSessionManagement();
  }

  /**
   * Connect the HTTP transport to the MCP server.
   */
  async connect(server: Server): Promise<void> {
    logger.info('Starting HTTP transport', {
      host: this.options.host,
      port: this.options.port,
      publicUrl: this.options.publicUrl,
    });

    // Set up rate limiting for authentication endpoints
    const rateLimitOptions = this.options.rateLimitOptions ?? {};
    const authRateLimiter = rateLimit({
      windowMs: rateLimitOptions.windowMs ?? 15 * 60 * 1000, // 15 minutes default
      max: rateLimitOptions.max ?? 100, // 100 requests per window default
      message:
        rateLimitOptions.message ?? 'Too many authentication attempts, please try again later',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        res.status(429).json({
          error: 'too_many_requests',
          error_description:
            rateLimitOptions.message ?? 'Too many authentication attempts, please try again later',
        });
      },
    });

    // Set up authentication middleware with rate limiting for the MCP endpoint
    this.app.use('/mcp', authRateLimiter, (req, res, next) => {
      this.authMiddleware(req as AuthenticatedRequest, res, next).catch(next);
    });

    // Set up the MCP endpoint that handles both POST and GET
    // GET requests open SSE streams for server-to-client communication
    this.app.get('/mcp', (req, res) => {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

      // Create SSE transport
      this.mcpTransport = new SSEServerTransport('/mcp', res);

      // Connect to MCP server
      server.connect(this.mcpTransport).catch((error) => {
        logger.error('Failed to connect MCP server to SSE transport', error);
      });
    });

    // POST requests send messages to the server
    this.app.post(
      '/mcp',
      express.json({ limit: '10mb' }),
      async (req: AuthenticatedRequest, res) => {
        const sessionId = req.sessionId ?? (req.headers['mcp-session-id'] as string);
        const protocolVersion = req.headers['mcp-protocol-version'] as string;

        // Validate protocol version
        if (protocolVersion && protocolVersion !== '2025-06-18') {
          res.status(400).json({
            error: 'invalid_protocol_version',
            error_description: `Unsupported protocol version: ${protocolVersion}`,
          });
          return;
        }

        if (!this.mcpTransport) {
          res.status(503).json({
            error: 'service_unavailable',
            error_description: 'SSE connection not established',
          });
          return;
        }

        // Get session client if available
        if (sessionId && this.sessionManager) {
          const session = this.sessionManager.getSession(sessionId);
          if (session) {
            // NOTE: Session client cannot be passed to MCP handlers due to MCP SDK limitation.
            // The SSEServerTransport doesn't support per-request context passing.
            // This is documented below in the handlePostMessage call.
            logger.debug('Using session client for MCP request', {
              sessionId,
              userId: session.claims.sub,
            });
          }
        }

        try {
          // LIMITATION: The MCP SDK's SSEServerTransport doesn't currently support passing
          // per-request context (e.g., session-specific SonarQube clients).
          // This would require extending the SDK or implementing a custom transport.
          // Track this limitation at: https://github.com/modelcontextprotocol/sdk/issues
          await this.mcpTransport.handlePostMessage(req, res, req.body);
        } catch (error) {
          logger.error('Error handling MCP message', error);
          res.status(500).json({ error: 'internal_error' });
        }
      }
    );

    // Start Express server (HTTP or HTTPS)
    try {
      if (this.options.tls.enabled && this.options.tls.cert && this.options.tls.key) {
        // Read TLS certificates
        const tlsOptions: https.ServerOptions = {
          cert: await fs.readFile(this.options.tls.cert, 'utf8'),
          key: await fs.readFile(this.options.tls.key, 'utf8'),
        };

        if (this.options.tls.ca) {
          tlsOptions.ca = await fs.readFile(this.options.tls.ca, 'utf8');
        }

        // Create HTTPS server
        await new Promise<void>((resolve, reject) => {
          this.server = https.createServer(tlsOptions, this.app);
          this.server.listen(this.options.port, this.options.host, () => {
            logger.info(`HTTPS transport listening on ${this.options.host}:${this.options.port}`);
            resolve();
          });
          this.server.on('error', (error) => {
            logger.error('HTTP server error', error);
            reject(error);
          });
        });
      } else {
        // Create HTTP server
        await new Promise<void>((resolve, reject) => {
          this.server = this.app.listen(this.options.port, this.options.host, () => {
            logger.info(`HTTP transport listening on ${this.options.host}:${this.options.port}`);
            resolve();
          });
          this.server.on('error', (error) => {
            logger.error('HTTP server error', error);
            reject(error);
          });
        });
      }
    } catch (error) {
      logger.error('Failed to start HTTP server', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get the name of the transport.
   */
  getName(): string {
    return 'http';
  }

  /**
   * Set up Express middleware.
   */
  private setupMiddleware(): void {
    // Enable CORS
    this.app.use(cors(this.options.corsOptions));

    // Parse JSON bodies
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Ready check endpoint
    this.app.get('/ready', (_req: Request, res: Response) => {
      const ready =
        !!this.server &&
        (this.tokenValidator !== undefined || process.env.MCP_HTTP_ALLOW_NO_AUTH === 'true');

      if (ready) {
        res.json({
          status: 'ready',
          features: {
            authentication: !!this.tokenValidator,
            sessionManagement: !!this.sessionManager,
            serviceAccountMapping: !!this.serviceAccountMapper,
            tls: this.options.tls.enabled,
          },
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          message: 'Server is initializing',
        });
      }
    });
  }

  /**
   * Set up OAuth metadata endpoints.
   */
  private setupMetadataEndpoints(): void {
    // RFC9728: Protected Resource Metadata
    this.app.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
      const metadata: OAuthProtectedResourceMetadata = {
        resource: this.options.publicUrl,
        authorization_servers: this.options.authorizationServers,
        bearer_methods_supported: ['header'],
        resource_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
        resource_documentation:
          'https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md',
      };

      res.json(metadata);
    });

    // RFC8414: Authorization Server Metadata (optional built-in auth server)
    if (this.options.builtInAuthServer) {
      this.app.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
        const metadata: OAuthAuthorizationServerMetadata = {
          issuer: this.options.publicUrl,
          authorization_endpoint: `${this.options.publicUrl}/oauth/authorize`,
          token_endpoint: `${this.options.publicUrl}/oauth/token`,
          jwks_uri: `${this.options.publicUrl}/oauth/jwks`,
          scopes_supported: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
          response_types_supported: ['code'],
          response_modes_supported: ['query'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
          token_endpoint_auth_signing_alg_values_supported: ['RS256'],
          service_documentation:
            'https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md',
          code_challenge_methods_supported: ['S256'],
        };

        res.json(metadata);
      });
    }
  }

  /**
   * Set up token validator
   */
  private setupTokenValidator(): void {
    if (this.options.authorizationServers.length > 0 || this.options.builtInAuthServer) {
      // Create JWKS endpoints map
      const jwksEndpoints = new Map<string, string>();

      // Add external authorization servers
      this.options.authorizationServers.forEach((server) => {
        // Assume JWKS endpoint follows OAuth 2.0 metadata convention
        const jwksUri = server.endsWith('/')
          ? `${server}.well-known/jwks.json`
          : `${server}/.well-known/jwks.json`;
        jwksEndpoints.set(server, jwksUri);
      });

      // Add built-in auth server if enabled
      if (this.options.builtInAuthServer) {
        jwksEndpoints.set(this.options.publicUrl, `${this.options.publicUrl}/oauth/jwks`);
      }

      this.tokenValidator = new TokenValidator({
        audience: this.options.publicUrl,
        issuers: [
          ...this.options.authorizationServers,
          ...(this.options.builtInAuthServer ? [this.options.publicUrl] : []),
        ],
        jwksEndpoints,
        clockTolerance: 5,
        validateResource: true,
        expectedResources: [this.options.publicUrl],
      });
    }
  }

  /**
   * Authentication middleware for MCP endpoints.
   * Implements RFC6750 Bearer Token Usage.
   */
  private async authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Extract and validate Bearer token
    const token = this.extractBearerToken(req, res);
    if (!token) {
      return; // Response already sent
    }

    // Check if token validator is configured
    if (!this.tokenValidator) {
      await this.handleMissingTokenValidator(res, next);
      return;
    }

    // Validate token and handle session
    await this.validateTokenAndHandleSession(req, res, next, token);
  }

  /**
   * Extract Bearer token from request
   * @returns token string or null if not found
   */
  private extractBearerToken(req: AuthenticatedRequest, res: Response): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      this.handleMissingBearerToken(res);
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Validate token and handle session management
   */
  private async validateTokenAndHandleSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
    token: string
  ): Promise<void> {
    try {
      // Validate the token
      const claims = await this.tokenValidator!.validateToken(token);

      // Handle session management
      const sessionHandled = await this.handleSessionManagement(req, res, claims);
      if (!sessionHandled) {
        return; // Error response already sent
      }

      next();
    } catch (error) {
      this.handleAuthenticationError(res, error);
    }
  }

  /**
   * Handle missing Bearer token in request
   */
  private handleMissingBearerToken(res: Response): void {
    // RFC6750: Include WWW-Authenticate header on 401 responses
    const wwwAuthenticate = [
      'Bearer',
      'realm="MCP SonarQube Server"',
      `resource_metadata="${this.options.publicUrl}/.well-known/oauth-protected-resource"`,
    ].join(' ');

    res.set('WWW-Authenticate', wwwAuthenticate);
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Bearer token required',
    });
  }

  /**
   * Handle missing token validator (insecure mode)
   */
  private async handleMissingTokenValidator(res: Response, next: NextFunction): Promise<void> {
    // SECURITY WARNING: This bypass is ONLY for backward compatibility
    // DO NOT USE IN PRODUCTION WITHOUT PROPER TOKEN VALIDATION

    if (this.isInsecureModeAllowed()) {
      this.logInsecureModeWarning();
      next();
    } else {
      this.rejectInsecureAccess(res);
    }
  }

  /**
   * Check if insecure mode is explicitly allowed
   */
  private isInsecureModeAllowed(): boolean {
    return process.env.MCP_HTTP_ALLOW_NO_AUTH === 'true';
  }

  /**
   * Log warning about insecure mode
   */
  private logInsecureModeWarning(): void {
    logger.warn(
      '⚠️  SECURITY WARNING: Allowing unauthenticated access to MCP endpoints! ⚠️\n' +
        '    This is EXTREMELY DANGEROUS and should NEVER be used in production.\n' +
        '    Configure proper OAuth 2.0 authentication by setting either:\n' +
        '    - MCP_OAUTH_AUTH_SERVERS: Comma-separated list of OAuth authorization server URLs\n' +
        '    - MCP_OAUTH_BUILTIN=true: Enable built-in OAuth server (for development only)\n' +
        '    See https://github.com/sapientpants/sonarqube-mcp-server#authentication for details'
    );
  }

  /**
   * Reject request when authentication is not properly configured
   */
  private rejectInsecureAccess(res: Response): void {
    logger.error(
      'SECURITY: No token validator configured and insecure mode not explicitly enabled. ' +
        'To allow unauthenticated access (NOT RECOMMENDED FOR PRODUCTION), set MCP_HTTP_ALLOW_NO_AUTH=true'
    );

    const wwwAuthenticate = [
      'Bearer',
      'realm="MCP SonarQube Server"',
      'error="configuration_error"',
      'error_description="Authentication not properly configured"',
    ].join(' ');

    res.set('WWW-Authenticate', wwwAuthenticate);
    res.status(500).json({
      error: 'configuration_error',
      error_description: 'Authentication is not properly configured. Contact your administrator.',
    });
  }

  /**
   * Handle session management for authenticated request
   * @returns true if session handling succeeded, false if error occurred
   */
  private async handleSessionManagement(
    req: AuthenticatedRequest,
    res: Response,
    claims: TokenClaims
  ): Promise<boolean> {
    // Try to use existing session if available
    if (this.tryReuseExistingSession(req, claims)) {
      return true;
    }

    // Create new session if session management is enabled
    if (this.isSessionManagementEnabled()) {
      return await this.createNewSession(req, res, claims);
    }

    // No session management - just attach claims
    this.attachClaimsWithoutSession(req, claims);
    return true;
  }

  /**
   * Try to reuse an existing session
   * @returns true if existing session was reused
   */
  private tryReuseExistingSession(req: AuthenticatedRequest, claims: TokenClaims): boolean {
    const sessionId = req.headers['mcp-session-id'] as string;

    if (!sessionId || !this.sessionManager) {
      return false;
    }

    return this.tryUseExistingSession(req, sessionId, claims);
  }

  /**
   * Check if session management is enabled
   */
  private isSessionManagementEnabled(): boolean {
    return !!(this.sessionManager && this.serviceAccountMapper);
  }

  /**
   * Attach claims without session management
   */
  private attachClaimsWithoutSession(req: AuthenticatedRequest, claims: TokenClaims): void {
    req.user = claims;
    logger.debug('Token validated successfully (no session management)', {
      sub: claims.sub,
      iss: claims.iss,
      scope: claims.scope,
    });
  }

  /**
   * Try to use an existing session
   * @returns true if existing session is valid and used
   */
  private tryUseExistingSession(
    req: AuthenticatedRequest,
    sessionId: string,
    claims: TokenClaims
  ): boolean {
    const session = this.sessionManager!.getSession(sessionId);
    if (session && session.claims.sub === claims.sub) {
      // Valid existing session
      req.user = session.claims;
      req.sessionId = sessionId;
      logger.debug('Using existing session', { sessionId, userId: claims.sub });
      return true;
    }
    return false;
  }

  /**
   * Create a new session for the user
   * @returns true if session created successfully, false if error occurred
   */
  private async createNewSession(
    req: AuthenticatedRequest,
    res: Response,
    claims: TokenClaims
  ): Promise<boolean> {
    try {
      // Get SonarQube client for user
      const { client, serviceAccountId } =
        await this.serviceAccountMapper!.getClientForUser(claims);

      // Create session
      const sessionId = this.sessionManager!.createSession(claims, client, serviceAccountId);

      // Set session ID in response header
      res.setHeader('MCP-Session-ID', sessionId);

      req.user = claims;
      req.sessionId = sessionId;

      logger.debug('Created new session', {
        sessionId,
        userId: claims.sub,
        serviceAccountId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to create session', error);
      res.status(503).json({
        error: 'service_unavailable',
        error_description: 'Failed to create user session',
      });
      return false;
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthenticationError(res: Response, error: unknown): void {
    if (error instanceof TokenValidationError) {
      this.handleTokenValidationError(res, error);
    } else {
      // Unexpected error
      logger.error('Unexpected authentication error', error);
      res.status(500).json({
        error: 'internal_error',
        error_description: 'Authentication failed',
      });
    }
  }

  /**
   * Handle token validation errors
   */
  private handleTokenValidationError(res: Response, error: TokenValidationError): void {
    // Build WWW-Authenticate header with error details
    const wwwAuthParams = [
      'Bearer',
      'realm="MCP SonarQube Server"',
      `error="${error.code}"`,
      `error_description="${error.message}"`,
    ];

    if (error.wwwAuthenticateParams) {
      Object.entries(error.wwwAuthenticateParams).forEach(([key, value]) => {
        wwwAuthParams.push(`${key}="${value}"`);
      });
    }

    res.set('WWW-Authenticate', wwwAuthParams.join(', '));

    // Return appropriate status code
    const statusCode =
      error.code === TokenValidationErrorCode.INVALID_TOKEN ||
      error.code === TokenValidationErrorCode.INVALID_SIGNATURE ||
      error.code === TokenValidationErrorCode.EXPIRED_TOKEN
        ? 401
        : 403;

    res.status(statusCode).json({
      error: error.code,
      error_description: error.message,
    });
  }

  /**
   * Set up session management and service account mapping
   */
  private setupSessionManagement(): void {
    // Only set up if authentication is enabled
    if (this.tokenValidator) {
      this.sessionManager = new SessionManager({
        sessionTimeout: parseInt(process.env.MCP_SESSION_TIMEOUT ?? '3600000', 10), // 1 hour default
        cleanupInterval: parseInt(process.env.MCP_SESSION_CLEANUP_INTERVAL ?? '300000', 10), // 5 min default
        maxSessions: parseInt(process.env.MCP_MAX_SESSIONS ?? '1000', 10),
      });

      this.serviceAccountMapper = new ServiceAccountMapper({
        defaultUrl: process.env.SONARQUBE_URL,
        defaultOrganization: process.env.SONARQUBE_ORGANIZATION,
        defaultServiceAccountId: process.env.MCP_DEFAULT_SERVICE_ACCOUNT ?? 'default',
      });

      // Load mapping rules from environment
      this.loadMappingRulesFromEnv();

      logger.info('Session management and service account mapping initialized');
    }
  }

  /**
   * Safely create a RegExp from a string pattern with validation
   * @param pattern The regex pattern string
   * @param context Context for error messages
   * @returns RegExp object or undefined if invalid
   */
  private safeCreateRegExp(pattern: string, context: string): RegExp | undefined {
    // Check for potentially dangerous patterns that could cause ReDoS
    const dangerousPatterns = [
      /(\w+\+)+\w+/, // Nested quantifiers like (a+)+
      /(\w+\*)+\w+/, // Nested quantifiers like (a*)*
      /(\w+\{[\d,]+\})+/, // Nested quantifiers like (a{1,3})+
      /(\(.*\)\+)+/, // Nested groups with quantifiers
      /(\[.*\]\+)+/, // Nested character classes with quantifiers
    ];

    for (const dangerous of dangerousPatterns) {
      if (dangerous.test(pattern)) {
        logger.warn('Potentially dangerous regex pattern detected', {
          pattern,
          context,
          reason: 'Nested quantifiers can cause ReDoS',
        });
        return undefined;
      }
    }

    // Try to compile the regex
    try {
      const regex = new RegExp(pattern);

      // Test the regex with a sample string to ensure it doesn't hang
      const testString = 'a'.repeat(100);
      const startTime = Date.now();
      regex.test(testString);
      const elapsed = Date.now() - startTime;

      // If the test takes too long, it might be problematic
      if (elapsed > 100) {
        logger.warn('Regex pattern took too long to execute', {
          pattern,
          context,
          elapsed,
          reason: 'Pattern may cause performance issues',
        });
        return undefined;
      }

      return regex;
    } catch (error) {
      logger.warn('Invalid regex pattern', {
        pattern,
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  /**
   * Load service account mapping rules from environment variables
   */
  private loadMappingRulesFromEnv(): void {
    if (!this.serviceAccountMapper) {
      return;
    }

    // Load rules in format: MCP_MAPPING_RULE_1=priority:1,user:.*@company.com,sa:company-sa
    for (let i = 1; i <= 10; i++) {
      const ruleEnv = process.env[`MCP_MAPPING_RULE_${i}`];
      if (!ruleEnv) {
        continue;
      }

      interface MappingRuleBuilder {
        priority: number;
        userPattern?: RegExp;
        issuerPattern?: RegExp;
        requiredScopes?: string[];
        serviceAccountId?: string;
      }

      const rule: MappingRuleBuilder = { priority: i };
      const parts = ruleEnv.split(',');

      let hasInvalidPattern = false;

      for (const part of parts) {
        const splitResult = part.split(':');
        if (splitResult.length !== 2) {
          logger.warn('Malformed mapping rule part, skipping', { part });
          continue;
        }
        const [key, value] = splitResult;
        switch (key) {
          case 'priority':
            rule.priority = parseInt(value, 10);
            break;
          case 'user':
            rule.userPattern = this.safeCreateRegExp(value, `MCP_MAPPING_RULE_${i}:user`);
            if (!rule.userPattern) {
              logger.warn('Skipping rule due to invalid user pattern', {
                ruleIndex: i,
                pattern: value,
              });
              hasInvalidPattern = true;
            }
            break;
          case 'issuer':
            rule.issuerPattern = this.safeCreateRegExp(value, `MCP_MAPPING_RULE_${i}:issuer`);
            if (!rule.issuerPattern) {
              logger.warn('Skipping rule due to invalid issuer pattern', {
                ruleIndex: i,
                pattern: value,
              });
              hasInvalidPattern = true;
            }
            break;
          case 'scopes':
            rule.requiredScopes = value.split('|');
            break;
          case 'sa':
            rule.serviceAccountId = value;
            break;
        }
      }

      if (rule.serviceAccountId && !hasInvalidPattern) {
        this.serviceAccountMapper.addMappingRule({
          priority: rule.priority,
          userPattern: rule.userPattern,
          issuerPattern: rule.issuerPattern,
          requiredScopes: rule.requiredScopes,
          serviceAccountId: rule.serviceAccountId,
        });
        logger.info('Loaded mapping rule from environment', { index: i, rule });
      }
    }
  }

  /**
   * Gracefully shut down the HTTP transport.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down HTTP transport');

    // Shut down session manager
    if (this.sessionManager) {
      this.sessionManager.shutdown();
    }

    if (this.server?.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server', err);
            reject(err);
          } else {
            logger.info('HTTP server closed');
            resolve();
          }
        });
      });
    }
  }
}
