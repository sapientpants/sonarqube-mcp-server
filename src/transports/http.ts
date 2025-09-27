import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ITransport, IHttpTransportConfig } from './base.js';
import { SessionManager, ISession } from './session-manager.js';
import { createLogger } from '../utils/logger.js';
import { Server as HttpServer } from 'node:http';

const logger = createLogger('http-transport');

/**
 * Default configuration values for HTTP transport.
 */
const DEFAULT_CONFIG = {
  port: 3000,
  sessionTimeout: 1800000, // 30 minutes
  enableDnsRebindingProtection: false,
  allowedHosts: ['localhost', '127.0.0.1', '::1'],
  allowedOrigins: ['*'],
} as const;

/**
 * Request body for MCP over HTTP.
 */
interface McpHttpRequest {
  sessionId?: string;
  method: string;
  params?: unknown;
}

/**
 * Response body for MCP over HTTP.
 */
interface McpHttpResponse {
  sessionId?: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * HTTP transport implementation for MCP server.
 * Provides a REST API interface for MCP communication with session management.
 */
export class HttpTransport implements ITransport {
  private readonly app: Express;
  private httpServer?: HttpServer;
  private readonly sessionManager: SessionManager;
  private mcpServer?: Server;
  private readonly config: {
    port: number;
    sessionTimeout: number;
    enableDnsRebindingProtection: boolean;
    allowedHosts: string[];
    allowedOrigins: string[];
  };

  constructor(config?: IHttpTransportConfig['options']) {
    this.config = {
      port: config?.port ?? DEFAULT_CONFIG.port,
      sessionTimeout: config?.sessionTimeout ?? DEFAULT_CONFIG.sessionTimeout,
      enableDnsRebindingProtection:
        config?.enableDnsRebindingProtection ?? DEFAULT_CONFIG.enableDnsRebindingProtection,
      allowedHosts: config?.allowedHosts ?? [...DEFAULT_CONFIG.allowedHosts],
      allowedOrigins: config?.allowedOrigins ?? [...DEFAULT_CONFIG.allowedOrigins],
    };

    // Initialize Express app
    this.app = express();

    // Initialize session manager
    this.sessionManager = new SessionManager({
      sessionTimeout: this.config.sessionTimeout,
    });

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();
  }

  /**
   * Connect the HTTP transport to the MCP server.
   *
   * @param server The MCP server instance to connect to
   * @returns Promise that resolves when the server is listening
   */
  async connect(server: Server): Promise<void> {
    this.mcpServer = server;

    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.app.listen(this.config.port, () => {
          logger.info(`HTTP transport listening on port ${this.config.port}`);
          resolve();
        });

        this.httpServer.on('error', (error: Error) => {
          logger.error('HTTP server error:', error);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to start HTTP server:', err);
        reject(err);
      }
    });
  }

  /**
   * Get the name of this transport.
   *
   * @returns 'http'
   */
  getName(): string {
    return 'http';
  }

  /**
   * Setup Express middleware.
   */
  private setupMiddleware(): void {
    // Enable JSON body parsing
    this.app.use(express.json({ limit: '10mb' }));

    // Enable CORS
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (e.g., Postman, curl)
          if (!origin) {
            return callback(null, true);
          }

          // Check against allowed origins
          const allowedOrigins = this.config.allowedOrigins;
          if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
      })
    );

    // DNS rebinding protection
    if (this.config.enableDnsRebindingProtection) {
      this.app.use(this.dnsRebindingProtection.bind(this));
    }

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.debug(`${req.method} ${req.path}`, {
        headers: req.headers,
        body: req.body as Record<string, unknown>,
      });
      next();
    });

    // Error handling
    this.app.use((err: Error, _req: Request, res: Response): Response | void => {
      logger.error('Express error:', err);
      return res.status(500).json({
        error: {
          code: -32603,
          message: 'Internal server error',
          data: err.message,
        },
      });
    });
  }

  /**
   * Setup Express routes.
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      const stats = this.sessionManager.getStatistics();
      res.json({
        status: 'healthy',
        transport: 'http',
        sessions: stats,
        uptime: process.uptime(),
      });
    });

    // Session initialization endpoint
    this.app.post('/session', (_req: Request, res: Response) => {
      try {
        if (!this.mcpServer) {
          return res.status(503).json({
            error: {
              code: -32603,
              message: 'MCP server not initialized',
            },
          });
        }

        // Create a new session with its own MCP server instance
        // Note: In a real implementation, you'd create separate server instances
        // For now, we'll use the same server for all sessions (stateless)
        const session = this.sessionManager.createSession(this.mcpServer);

        res.json({
          sessionId: session.id,
          message: 'Session created successfully',
        });
      } catch (error) {
        logger.error('Failed to create session:', error);
        res.status(500).json({
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Failed to create session',
          },
        });
      }
    });

    // Main MCP endpoint
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        const body = req.body as McpHttpRequest;

        // Validate request
        if (!body.sessionId) {
          return res.status(400).json({
            error: {
              code: -32600,
              message: 'Session ID is required',
            },
          });
        }

        if (!body.method) {
          return res.status(400).json({
            error: {
              code: -32600,
              message: 'Method is required',
            },
          });
        }

        // Get session
        const session = this.sessionManager.getSession(body.sessionId);
        if (!session) {
          return res.status(404).json({
            error: {
              code: -32001,
              message: 'Session not found or expired',
            },
          });
        }

        // Process the request through the MCP server
        // Note: This is a simplified implementation
        // In a real implementation, you'd need to properly route the request
        // through the MCP protocol handler
        const result = await this.handleMcpRequest(session, body.method, body.params);

        res.json({
          sessionId: body.sessionId,
          result,
        } as McpHttpResponse);
      } catch (error) {
        logger.error('MCP request error:', error);
        res.status(500).json({
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal server error',
          },
        } as McpHttpResponse);
      }
    });

    // Session cleanup endpoint
    this.app.delete('/session/:sessionId', (req: Request, res: Response) => {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: {
            code: -32600,
            message: 'Session ID is required',
          },
        });
      }

      if (this.sessionManager.removeSession(sessionId)) {
        res.json({
          message: 'Session closed successfully',
        });
      } else {
        res.status(404).json({
          error: {
            code: -32001,
            message: 'Session not found',
          },
        });
      }
    });

    // Server-sent events endpoint for notifications
    this.app.get('/events/:sessionId', (req: Request, res: Response) => {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: {
            code: -32600,
            message: 'Session ID is required',
          },
        });
      }

      // Validate session
      const session = this.sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: {
            code: -32001,
            message: 'Session not found or expired',
          },
        });
      }

      // Setup SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

      // Keep connection alive with periodic heartbeats
      const heartbeatInterval = setInterval(() => {
        if (!this.sessionManager.hasSession(sessionId)) {
          clearInterval(heartbeatInterval);
          res.end();
          return;
        }
        res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
      }, 30000); // 30 seconds

      // Cleanup on client disconnect
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        logger.debug(`SSE connection closed for session ${sessionId}`);
      });
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: {
          code: -32601,
          message: 'Method not found',
        },
      });
    });
  }

  /**
   * DNS rebinding protection middleware.
   */
  private dnsRebindingProtection(req: Request, res: Response, next: NextFunction): void {
    const hostHeader = req.headers.host;
    if (!hostHeader) {
      logger.warn('Request without host header blocked');
      res.status(403).json({
        error: {
          code: -32000,
          message: 'Forbidden: Missing host header',
        },
      });
      return;
    }

    const host = hostHeader.split(':')[0];
    if (!host || !this.config.allowedHosts.includes(host)) {
      logger.warn(`Blocked request from unauthorized host: ${host}`);
      res.status(403).json({
        error: {
          code: -32000,
          message: 'Forbidden: Invalid host',
        },
      });
      return;
    }

    next();
  }

  /**
   * Handle MCP request through the server.
   * This is a simplified implementation that would need to be expanded
   * to properly handle all MCP protocol methods.
   */
  private handleMcpRequest(session: ISession, method: string, params?: unknown): unknown {
    // This would need to be properly implemented to route requests
    // through the MCP server's protocol handler
    logger.debug(`Handling MCP request: ${method}`, { sessionId: session.id, params });

    // For now, return a placeholder response
    return {
      message: `Method ${method} called successfully`,
      sessionId: session.id,
      params,
    };
  }

  /**
   * Shutdown the HTTP transport.
   * Closes the server and cleans up all sessions.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down HTTP transport');

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server:', err);
            reject(err);
          } else {
            logger.info('HTTP server closed');
            resolve();
          }
        });
      });
    }

    // Shutdown session manager
    this.sessionManager.shutdown();
  }

  /**
   * Get transport statistics for monitoring.
   */
  getStatistics(): Record<string, unknown> {
    return {
      transport: 'http',
      config: this.config,
      sessions: this.sessionManager.getStatistics(),
      uptime: process.uptime(),
    };
  }
}
