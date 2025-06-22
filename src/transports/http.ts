import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ITransport } from './base.js';
import { createLogger } from '../utils/logger.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const logger = createLogger('HttpTransport');

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
}

/**
 * Streamable HTTP transport implementation for MCP server.
 * Implements the MCP Streamable HTTP transport specification with:
 * - POST for client-to-server messages
 * - GET with SSE for server-to-client streaming
 * - OAuth 2.0 metadata endpoints as per RFC9728 and RFC8414
 */
export class HttpTransport implements ITransport {
  private app: Express;
  private server?: ReturnType<Express['listen']>;
  private mcpTransport?: SSEServerTransport;
  private options: Required<HttpTransportOptions>;

  constructor(options: HttpTransportOptions = {}) {
    this.options = {
      port: options.port ?? parseInt(process.env.MCP_HTTP_PORT ?? '3000', 10),
      host: options.host ?? process.env.MCP_HTTP_HOST ?? 'localhost',
      publicUrl:
        options.publicUrl ??
        process.env.MCP_HTTP_PUBLIC_URL ??
        `http://${options.host ?? 'localhost'}:${options.port ?? 3000}`,
      authorizationServers:
        options.authorizationServers ??
        process.env.MCP_OAUTH_AUTH_SERVERS?.split(',').map((s) => s.trim()) ??
        [],
      builtInAuthServer: options.builtInAuthServer ?? process.env.MCP_OAUTH_BUILTIN === 'true',
      corsOptions: options.corsOptions ?? {},
    };

    this.app = express();
    this.setupMiddleware();
    this.setupMetadataEndpoints();
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

    // Set up authentication middleware for the MCP endpoint
    this.app.use('/mcp', this.authMiddleware.bind(this));

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
    this.app.post('/mcp', express.json({ limit: '10mb' }), async (req, res) => {
      // Check for session ID if we're using sessions
      // TODO: Implement session management in future
      // const sessionId = req.headers['mcp-session-id'] as string;
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

      try {
        await this.mcpTransport.handlePostMessage(req, res, req.body);
      } catch (error) {
        logger.error('Error handling MCP message', error);
        res.status(500).json({ error: 'internal_error' });
      }
    });

    // Start Express server
    await new Promise<void>((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, this.options.host, () => {
          logger.info(`HTTP transport listening on ${this.options.host}:${this.options.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('HTTP server error', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start HTTP server', error);
        reject(error);
      }
    });
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
   * Authentication middleware for MCP endpoints.
   * Implements RFC6750 Bearer Token Usage.
   */
  private authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // For now, we're just setting up the structure for OAuth
    // Actual authentication will be implemented in a future story
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      return;
    }

    // Token validation will be implemented in a future story
    // For now, we'll log and pass through
    logger.debug('Bearer token received (validation not yet implemented)');
    next();
  }

  /**
   * Gracefully shut down the HTTP transport.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down HTTP transport');

    if (this.server && this.server.listening) {
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
