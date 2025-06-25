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
} from '../auth/token-validator.js';
import { TokenClaims, UserContext } from '../auth/types.js';
import { SessionManager } from '../auth/session-manager.js';
import { ServiceAccountMapper, MappingRule } from '../auth/service-account-mapper.js';
import { PatternMatcher } from '../utils/pattern-matcher.js';
import { getPermissionManager } from '../auth/permission-manager.js';
import { contextProvider } from '../auth/context-provider.js';
import { getAuditLogger } from '../audit/audit-logger.js';
import { AuditEventBuilder } from '../audit/audit-event-builder.js';
import { AuditEventType } from '../audit/types.js';
import { ExternalIdPManager } from '../auth/external-idp-manager.js';
import { ExternalIdPProvider, ExternalIdPConfig } from '../auth/external-idp-types.js';
import { BuiltInAuthServer } from '../auth/built-in-server/auth-server.js';

const logger = createLogger('HttpTransport');
const auditLogger = getAuditLogger();

/**
 * Type for IdP configuration values during parsing
 */
type IdPConfigValue = string | string[] | boolean | undefined;

/**
 * Extended Express Request with authenticated user context
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenClaims;
  sessionId?: string;
  userContext?: UserContext;
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

  /**
   * External IdP configurations
   */
  externalIdPs?: ExternalIdPConfig[];
}

/**
 * Builder interface for constructing mapping rules
 */
interface MappingRuleBuilder {
  priority: number;
  userPattern?: PatternMatcher;
  issuerPattern?: PatternMatcher;
  requiredScopes?: string[];
  serviceAccountId?: string;
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
  private externalIdPManager?: ExternalIdPManager;
  private builtInAuthServer?: BuiltInAuthServer;

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
      externalIdPs: options.externalIdPs ?? this.parseExternalIdPsFromEnv(),
    } as Required<HttpTransportOptions>;

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

    // Set up built-in auth server if enabled
    if (this.options.builtInAuthServer) {
      this.builtInAuthServer = new BuiltInAuthServer({
        issuer: this.options.publicUrl,
        audience: ['sonarqube-mcp-server'],
      });

      // Mount auth server routes with rate limiting
      this.app.use('/auth', authRateLimiter, this.builtInAuthServer.getRouter());

      // Create default admin user and log credentials
      const adminCreds = await this.builtInAuthServer.createDefaultAdminUser();
      logger.info('Built-in auth server initialized with default admin user', {
        email: adminCreds.email,
        password: adminCreds.password,
        note: 'Please change this password immediately',
      });

      logger.info('Built-in auth server endpoints available', {
        register: `${this.options.publicUrl}/auth/register`,
        authorize: `${this.options.publicUrl}/auth/authorize`,
        token: `${this.options.publicUrl}/auth/token`,
        revoke: `${this.options.publicUrl}/auth/revoke`,
        jwks: `${this.options.publicUrl}/auth/jwks`,
      });
    }

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
      contextProvider.createExpressMiddleware(),
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
        // Get service account health if available
        let serviceAccountHealth: Record<string, unknown> | undefined;
        if (this.serviceAccountMapper) {
          const healthMonitor = this.serviceAccountMapper.getHealthMonitor();
          if (healthMonitor) {
            const healthStatuses = healthMonitor.getAllHealthStatuses();
            serviceAccountHealth = {
              totalAccounts: this.serviceAccountMapper.getServiceAccounts().length,
              healthyAccounts: Array.from(healthStatuses.values()).filter((h) => h.isHealthy)
                .length,
              accounts: Array.from(healthStatuses.entries()).map(([id, status]) => ({
                id,
                healthy: status.isHealthy,
                lastCheck: status.lastCheck,
                error: status.error,
              })),
            };
          }
        }

        // Get external IdP health if available
        let externalIdPHealth: Record<string, unknown> | undefined;
        if (this.externalIdPManager) {
          const healthStatuses = this.externalIdPManager.getHealthStatus();
          externalIdPHealth = {
            totalIdPs: this.externalIdPManager.getIdPs().length,
            healthyIdPs: healthStatuses.filter((h) => h.healthy).length,
            idps: healthStatuses.map((status) => ({
              issuer: status.issuer,
              healthy: status.healthy,
              lastSuccess: status.lastSuccess,
              lastFailure: status.lastFailure,
              consecutiveFailures: status.consecutiveFailures,
              error: status.error,
            })),
          };
        }

        res.json({
          status: 'ready',
          features: {
            authentication: !!this.tokenValidator,
            sessionManagement: !!this.sessionManager,
            serviceAccountMapping: !!this.serviceAccountMapper,
            externalIdPIntegration: !!this.externalIdPManager,
            tls: this.options.tls.enabled,
          },
          serviceAccountHealth,
          externalIdPHealth,
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
          authorization_endpoint: `${this.options.publicUrl}/auth/authorize`,
          token_endpoint: `${this.options.publicUrl}/auth/token`,
          jwks_uri: `${this.options.publicUrl}/auth/jwks`,
          registration_endpoint: `${this.options.publicUrl}/auth/register`,
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
    if (!this.hasAuthenticationConfigured()) {
      return;
    }

    this.setupExternalIdPManager();
    const { jwksEndpoints, issuers } = this.buildJwksConfiguration();

    this.tokenValidator = new TokenValidator({
      audience: this.options.publicUrl,
      issuers,
      jwksEndpoints,
      clockTolerance: 5,
      validateResource: true,
      expectedResources: [this.options.publicUrl],
      externalIdPManager: this.externalIdPManager,
    });
  }

  /**
   * Check if any authentication method is configured
   */
  private hasAuthenticationConfigured(): boolean {
    return (
      this.options.authorizationServers.length > 0 ||
      this.options.builtInAuthServer ||
      this.options.externalIdPs.length > 0
    );
  }

  /**
   * Set up external IdP manager if configured
   */
  private setupExternalIdPManager(): void {
    if (this.options.externalIdPs.length === 0) {
      return;
    }

    this.externalIdPManager = new ExternalIdPManager({
      healthCheckInterval: 300000, // 5 minutes
    });

    // Add configured external IdPs
    for (const idpConfig of this.options.externalIdPs) {
      this.externalIdPManager.addIdP(idpConfig);
    }
  }

  /**
   * Build JWKS endpoints and issuers configuration
   */
  private buildJwksConfiguration(): {
    jwksEndpoints: Map<string, string>;
    issuers: string[];
  } {
    const jwksEndpoints = new Map<string, string>();
    const issuers: string[] = [];

    this.addExternalAuthServers(jwksEndpoints, issuers);
    this.addBuiltInAuthServer(jwksEndpoints, issuers);
    this.addExternalIdPIssuers(jwksEndpoints, issuers);

    return { jwksEndpoints, issuers };
  }

  /**
   * Add external authorization servers to JWKS configuration
   */
  private addExternalAuthServers(jwksEndpoints: Map<string, string>, issuers: string[]): void {
    this.options.authorizationServers.forEach((server) => {
      const jwksUri = server.endsWith('/')
        ? `${server}.well-known/jwks.json`
        : `${server}/.well-known/jwks.json`;
      jwksEndpoints.set(server, jwksUri);
      issuers.push(server);
    });
  }

  /**
   * Add built-in auth server to JWKS configuration
   */
  private addBuiltInAuthServer(jwksEndpoints: Map<string, string>, issuers: string[]): void {
    if (this.options.builtInAuthServer) {
      jwksEndpoints.set(this.options.publicUrl, `${this.options.publicUrl}/auth/jwks`);
      issuers.push(this.options.publicUrl);
    }
  }

  /**
   * Add external IdP issuers to JWKS configuration
   */
  private addExternalIdPIssuers(jwksEndpoints: Map<string, string>, issuers: string[]): void {
    if (!this.externalIdPManager) {
      return;
    }

    for (const idp of this.externalIdPManager.getIdPs()) {
      jwksEndpoints.set(idp.issuer, idp.jwksUri ?? `${idp.issuer}/.well-known/jwks.json`);
      if (!issuers.includes(idp.issuer)) {
        issuers.push(idp.issuer);
      }
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
    const token = await this.extractBearerToken(req, res);
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
  private async extractBearerToken(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<string | null> {
    const authHeader = req.headers.authorization;

    // Check for API key authentication with built-in auth server
    if (authHeader?.startsWith('ApiKey ') && this.builtInAuthServer) {
      const apiKey = authHeader.substring(7); // Remove 'ApiKey ' prefix
      const user = await this.builtInAuthServer.authenticateApiKey(apiKey);

      if (user) {
        // Generate a temporary JWT for the API key user
        const claims: TokenClaims = {
          sub: user.id,
          email: user.email,
          groups: user.groups,
          iss: this.options.publicUrl,
          aud: ['sonarqube-mcp-server'],
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          iat: Math.floor(Date.now() / 1000),
        };

        req.user = claims;
        return 'api-key'; // Special marker for API key auth
      }

      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid API key',
      });
      return null;
    }

    if (!authHeader?.startsWith('Bearer ')) {
      await this.handleMissingBearerToken(req, res);
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
      let claims: TokenClaims;

      // Check if this is API key authentication
      if (token === 'api-key' && req.user) {
        claims = req.user;
      } else {
        // Validate the JWT token
        claims = await this.tokenValidator!.validateToken(token);
      }

      // Log successful token validation
      await auditLogger.logEvent(
        AuditEventBuilder.authentication('token_validated', claims, true)
          .withActor({
            userId: claims.sub,
            userGroups: claims.groups as string[] | undefined,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          })
          .withContext({
            traceId: req.get('x-request-id'),
          })
          .build()
      );

      // Handle session management
      const sessionHandled = await this.handleSessionManagement(req, res, claims);
      if (!sessionHandled) {
        return; // Error response already sent
      }

      next();
    } catch (error) {
      this.handleAuthenticationError(req, res, error, token);
    }
  }

  /**
   * Handle missing Bearer token in request
   */
  private async handleMissingBearerToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Log authentication attempt without token
    try {
      await auditLogger.logEvent(
        new AuditEventBuilder()
          .withEventType(AuditEventType.AUTH_TOKEN_REJECTED)
          .withActor({
            userId: 'anonymous',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          })
          .withTarget('auth', 'anonymous')
          .withAction('token_validation', 'failure', undefined, 'Bearer token required')
          .withContext({
            traceId: req.get('x-request-id'),
          })
          .build()
      );
    } catch (error) {
      logger.error('Failed to log missing bearer token', { error });
    }

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
    if (await this.tryReuseExistingSession(req, claims)) {
      return true;
    }

    // Create new session if session management is enabled
    if (this.isSessionManagementEnabled()) {
      return await this.createNewSession(req, res, claims);
    }

    // No session management - just attach claims
    await this.attachClaimsWithoutSession(req, claims);
    return true;
  }

  /**
   * Try to reuse an existing session
   * @returns true if existing session was reused
   */
  private async tryReuseExistingSession(
    req: AuthenticatedRequest,
    claims: TokenClaims
  ): Promise<boolean> {
    const sessionId = req.headers['mcp-session-id'] as string;

    if (!sessionId || !this.sessionManager) {
      return false;
    }

    return await this.tryUseExistingSession(req, sessionId, claims);
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
  private async attachClaimsWithoutSession(
    req: AuthenticatedRequest,
    claims: TokenClaims
  ): Promise<void> {
    req.user = claims;

    // Extract user context for permissions
    const manager = await getPermissionManager();
    if (manager.isEnabled()) {
      req.userContext = manager.extractUserContext(claims) ?? undefined;
    }

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
  private async tryUseExistingSession(
    req: AuthenticatedRequest,
    sessionId: string,
    claims: TokenClaims
  ): Promise<boolean> {
    const session = this.sessionManager!.getSession(sessionId);
    if (session && session.claims.sub === claims.sub) {
      // Valid existing session
      req.user = session.claims;
      req.sessionId = sessionId;

      // Extract user context for permissions
      const manager = await getPermissionManager();
      if (manager.isEnabled()) {
        req.userContext = manager.extractUserContext(session.claims) ?? undefined;
      }

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

      // Extract user context for permissions
      const manager = await getPermissionManager();
      if (manager.isEnabled()) {
        req.userContext = manager.extractUserContext(claims) ?? undefined;
      }

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
  private async handleAuthenticationError(
    req: AuthenticatedRequest,
    res: Response,
    error: unknown,
    token: string
  ): Promise<void> {
    if (error instanceof TokenValidationError) {
      // Log token rejection
      try {
        // Try to extract basic claims from the token for logging (even if invalid)
        const tokenParts = token.split('.');
        let userId = 'unknown';
        if (tokenParts.length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            userId = payload.sub ?? 'unknown';
          } catch {
            // Ignore parsing errors
          }
        }

        await auditLogger.logEvent(
          new AuditEventBuilder()
            .withEventType(AuditEventType.AUTH_TOKEN_REJECTED)
            .withActor({
              userId,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            })
            .withTarget('auth', userId)
            .withAction('token_validation', 'failure', undefined, error.message)
            .withContext({
              traceId: req.get('x-request-id'),
            })
            .withSecurity({
              tokenJti: error.wwwAuthenticateParams?.jti,
            })
            .build()
        );
      } catch (auditError) {
        logger.error('Failed to log authentication failure', { error: auditError });
      }

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
   * Parse external IdP configurations from environment variables
   */
  private parseExternalIdPsFromEnv(): ExternalIdPConfig[] {
    const idps: ExternalIdPConfig[] = [];

    // Parse from environment variables like MCP_EXTERNAL_IDP_1, MCP_EXTERNAL_IDP_2, etc.
    for (let i = 1; i <= 10; i++) {
      const idpEnv = process.env[`MCP_EXTERNAL_IDP_${i}`];
      if (!idpEnv) {
        continue;
      }

      try {
        const config = this.parseIdPConfigFromString(idpEnv);
        if (config) {
          idps.push(config);
          logger.info('Loaded external IdP configuration from environment', {
            index: i,
            provider: config.provider,
            issuer: config.issuer,
          });
        }
      } catch (error) {
        logger.error('Failed to parse external IdP configuration', { index: i, error });
      }
    }

    return idps;
  }

  /**
   * Parse a single IdP configuration from a string
   */
  private parseIdPConfigFromString(configStr: string): ExternalIdPConfig | null {
    // Parse format: provider:azure-ad,issuer:https://...,audience:...,tenantId:...
    const parts = configStr.split(',');
    const idpConfig: Record<string, IdPConfigValue> = {};

    for (const part of parts) {
      const [key, ...valueParts] = part.split(':');
      const trimmedKey = key.trim();
      const value = valueParts.join(':').trim(); // Handle URLs with colons

      this.setIdPConfigValue(idpConfig, trimmedKey, value);
    }

    return this.buildIdPConfig(idpConfig);
  }

  /**
   * Set a configuration value based on the key
   */
  private setIdPConfigValue(
    config: Record<string, IdPConfigValue>,
    key: string,
    value: string
  ): void {
    switch (key) {
      case 'provider':
        config.provider = value;
        break;
      case 'issuer':
        config.issuer = value;
        break;
      case 'jwksUri':
        config.jwksUri = value;
        break;
      case 'audience':
        config.audience = value.includes('|') ? value.split('|') : value;
        break;
      case 'groupsClaim':
        config.groupsClaim = value;
        break;
      case 'groupsTransform':
        config.groupsTransform = value;
        break;
      case 'enableHealthMonitoring':
        config.enableHealthMonitoring = value === 'true';
        break;
      case 'tenantId':
        config.tenantId = value;
        break;
    }
  }

  /**
   * Build an ExternalIdPConfig from parsed values
   */
  private buildIdPConfig(config: Record<string, IdPConfigValue>): ExternalIdPConfig | null {
    if (!config.provider || !config.issuer || !config.audience) {
      return null;
    }

    return {
      provider: config.provider as ExternalIdPProvider,
      issuer: config.issuer as string,
      audience: config.audience as string | string[],
      jwksUri: config.jwksUri as string | undefined,
      groupsClaim: config.groupsClaim as string | undefined,
      groupsTransform: config.groupsTransform as 'none' | 'extract_name' | 'extract_id' | undefined,
      enableHealthMonitoring: config.enableHealthMonitoring as boolean | undefined,
      tenantId: config.tenantId as string | undefined,
    };
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

      const rule = this.parseMappingRule(ruleEnv, i);
      if (rule) {
        this.serviceAccountMapper.addMappingRule(rule);
        logger.info('Loaded mapping rule from environment', { index: i, rule });
      }
    }
  }

  /**
   * Parse a single mapping rule from environment variable
   */
  private parseMappingRule(ruleEnv: string, ruleIndex: number): MappingRule | undefined {
    const ruleBuilder = this.createRuleBuilder(ruleIndex);
    const parts = ruleEnv.split(',');
    let hasInvalidPattern = false;

    for (const part of parts) {
      const isValid = this.processRulePart(part, ruleBuilder, ruleIndex);
      if (!isValid) {
        hasInvalidPattern = true;
      }
    }

    return this.validateAndBuildRule(ruleBuilder, hasInvalidPattern);
  }

  /**
   * Create initial rule builder with default priority
   */
  private createRuleBuilder(priority: number): MappingRuleBuilder {
    return { priority };
  }

  /**
   * Process a single rule part (key:value pair)
   */
  private processRulePart(part: string, rule: MappingRuleBuilder, ruleIndex: number): boolean {
    const splitResult = part.split(':');
    if (splitResult.length !== 2) {
      logger.warn('Malformed mapping rule part, skipping', { part });
      return true; // Not a pattern validation failure
    }

    const [key, value] = splitResult;
    return this.applyRuleValue(key, value, rule, ruleIndex);
  }

  /**
   * Apply a key-value pair to the rule builder
   */
  private applyRuleValue(
    key: string,
    value: string,
    rule: MappingRuleBuilder,
    ruleIndex: number
  ): boolean {
    switch (key) {
      case 'priority':
        rule.priority = parseInt(value, 10);
        return true;
      case 'user':
        return this.setPatternField(rule, 'userPattern', value, ruleIndex, 'user');
      case 'issuer':
        return this.setPatternField(rule, 'issuerPattern', value, ruleIndex, 'issuer');
      case 'scopes':
        rule.requiredScopes = value.split('|');
        return true;
      case 'sa':
        rule.serviceAccountId = value;
        return true;
      default:
        return true;
    }
  }

  /**
   * Set a regex pattern field on the rule builder
   */
  private setPatternField(
    rule: MappingRuleBuilder,
    field: 'userPattern' | 'issuerPattern',
    value: string,
    ruleIndex: number,
    patternType: string
  ): boolean {
    const pattern = PatternMatcher.create(value, `MCP_MAPPING_RULE_${ruleIndex}:${patternType}`);
    if (!pattern) {
      logger.warn(`Skipping rule due to invalid ${patternType} pattern`, {
        ruleIndex,
        pattern: value,
      });
      return false;
    }
    rule[field] = pattern;
    return true;
  }

  /**
   * Validate and build the final mapping rule
   */
  private validateAndBuildRule(
    rule: MappingRuleBuilder,
    hasInvalidPattern: boolean
  ): MappingRule | undefined {
    if (!rule.serviceAccountId || hasInvalidPattern) {
      return undefined;
    }

    return {
      priority: rule.priority,
      userPattern: rule.userPattern,
      issuerPattern: rule.issuerPattern,
      requiredScopes: rule.requiredScopes,
      serviceAccountId: rule.serviceAccountId,
    };
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

    // Shut down external IdP manager
    if (this.externalIdPManager) {
      this.externalIdPManager.shutdown();
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
