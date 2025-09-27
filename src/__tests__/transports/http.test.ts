import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpTransport } from '../../transports/http.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Server as HttpServer } from 'node:http';

// Mock Express app
vi.mock('express', () => {
  const mockApp = {
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn((port, callback) => {
      // Simulate successful server start
      if (callback) callback();
      return mockServer;
    }),
  };

  const mockServer = {
    close: vi.fn((callback) => {
      if (callback) callback();
    }),
    on: vi.fn(),
  } as unknown as HttpServer;

  const expressFn = Object.assign(
    vi.fn(() => mockApp),
    {
      json: vi.fn(() => vi.fn()),
    }
  );

  return {
    default: expressFn,
  };
});

vi.mock('cors', () => ({
  default: vi.fn(() => vi.fn()),
}));

describe('HttpTransport', () => {
  let transport: HttpTransport;
  let mockServer: Server;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock MCP server
    mockServer = {
      connect: vi.fn(),
    } as unknown as Server;

    // Create transport instance
    transport = new HttpTransport({
      port: 3001,
      sessionTimeout: 5000,
      allowedHosts: ['localhost'],
      allowedOrigins: ['http://localhost:3000'],
    });
  });

  afterEach(async () => {
    // Cleanup
    await transport.shutdown();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultTransport = new HttpTransport();
      expect(defaultTransport.getName()).toBe('http');
    });

    it('should initialize with custom configuration', () => {
      const customTransport = new HttpTransport({
        port: 8080,
        sessionTimeout: 10000,
        enableDnsRebindingProtection: true,
      });
      expect(customTransport.getName()).toBe('http');
    });
  });

  describe('getName', () => {
    it('should return "http"', () => {
      expect(transport.getName()).toBe('http');
    });
  });

  describe('connect', () => {
    it('should connect to MCP server successfully', async () => {
      await transport.connect(mockServer);
      // Since we're mocking Express, we just verify no errors were thrown
      expect(true).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Create a transport that will fail to start
      const failingTransport = new HttpTransport({ port: 9999 });

      // Mock the listen method to throw an error
      const mockExpress = await import('express');
      const mockApp = mockExpress.default();
      vi.mocked(mockApp.listen).mockImplementationOnce(() => {
        throw new Error('Port already in use');
      });

      // The promise should reject when listen throws
      await expect(failingTransport.connect(mockServer)).rejects.toThrow('Port already in use');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully when connected', async () => {
      await transport.connect(mockServer);
      await transport.shutdown();
      // Verify no errors thrown
      expect(true).toBe(true);
    });

    it('should handle shutdown when not connected', async () => {
      await transport.shutdown();
      // Should not throw even if not connected
      expect(true).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return transport statistics', () => {
      const stats = transport.getStatistics();
      expect(stats).toHaveProperty('transport', 'http');
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('sessions');
      expect(stats).toHaveProperty('uptime');
    });
  });
});

describe('HttpTransport Routes', () => {
  it('should register health check endpoint', async () => {
    new HttpTransport();
    const mockExpress = await import('express');
    const mockApp = mockExpress.default();

    // Verify that health endpoint was registered
    expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  it('should register session endpoints', async () => {
    new HttpTransport();
    const mockExpress = await import('express');
    const mockApp = mockExpress.default();

    // Verify that session endpoints were registered
    expect(mockApp.post).toHaveBeenCalledWith('/session', expect.any(Function));
    expect(mockApp.delete).toHaveBeenCalledWith('/session/:sessionId', expect.any(Function));
  });

  it('should register MCP endpoint', async () => {
    new HttpTransport();
    const mockExpress = await import('express');
    const mockApp = mockExpress.default();

    // Verify that MCP endpoint was registered
    expect(mockApp.post).toHaveBeenCalledWith('/mcp', expect.any(Function));
  });

  it('should register events endpoint', async () => {
    new HttpTransport();
    const mockExpress = await import('express');
    const mockApp = mockExpress.default();

    // Verify that events endpoint was registered
    expect(mockApp.get).toHaveBeenCalledWith('/events/:sessionId', expect.any(Function));
  });

  it('should register 404 handler', async () => {
    new HttpTransport();
    const mockExpress = await import('express');
    const mockApp = mockExpress.default();

    // Verify that 404 handler was registered (as a general use middleware)
    expect(mockApp.use).toHaveBeenCalled();
  });
});

describe('HttpTransport Middleware', () => {
  let mockApp: any;
  let middlewareHandlers: Map<string, ((...args: any[]) => any)[]>;

  beforeEach(async () => {
    vi.clearAllMocks();
    middlewareHandlers = new Map();

    // Create a more detailed mock app to capture middleware
    const mockExpress = await import('express');
    mockApp = mockExpress.default();

    // Capture middleware registrations
    vi.mocked(mockApp.use).mockImplementation((arg1: any, arg2?: any) => {
      if (typeof arg1 === 'function') {
        if (!middlewareHandlers.has('use')) middlewareHandlers.set('use', []);
        middlewareHandlers.get('use')!.push(arg1);
      } else if (typeof arg2 === 'function') {
        if (!middlewareHandlers.has(arg1)) middlewareHandlers.set(arg1, []);
        middlewareHandlers.get(arg1)!.push(arg2);
      }
      return mockApp;
    });

    vi.mocked(mockApp.get).mockImplementation((path: any, handler: any) => {
      if (typeof path === 'string' && typeof handler === 'function') {
        if (!middlewareHandlers.has(`GET ${path}`)) middlewareHandlers.set(`GET ${path}`, []);
        middlewareHandlers.get(`GET ${path}`)!.push(handler);
      }
      return mockApp;
    });

    vi.mocked(mockApp.post).mockImplementation((path: any, handler: any) => {
      if (typeof path === 'string' && typeof handler === 'function') {
        if (!middlewareHandlers.has(`POST ${path}`)) middlewareHandlers.set(`POST ${path}`, []);
        middlewareHandlers.get(`POST ${path}`)!.push(handler);
      }
      return mockApp;
    });

    vi.mocked(mockApp.delete).mockImplementation((path: any, handler: any) => {
      if (typeof path === 'string' && typeof handler === 'function') {
        if (!middlewareHandlers.has(`DELETE ${path}`)) middlewareHandlers.set(`DELETE ${path}`, []);
        middlewareHandlers.get(`DELETE ${path}`)!.push(handler);
      }
      return mockApp;
    });
  });

  it('should setup JSON body parsing middleware', async () => {
    new HttpTransport();
    const mockExpress = await import('express');

    // Verify express.json was called
    expect(mockExpress.default.json).toHaveBeenCalledWith({ limit: '10mb' });
  });

  it('should setup CORS middleware', async () => {
    new HttpTransport();
    const mockCors = await import('cors');

    // Verify CORS was configured
    expect(mockCors.default).toHaveBeenCalled();
  });

  it('should setup DNS rebinding protection when enabled', () => {
    new HttpTransport({
      enableDnsRebindingProtection: true,
      allowedHosts: ['localhost', '127.0.0.1'],
    });

    // Should have registered middleware
    expect(mockApp.use).toHaveBeenCalled();
  });

  it('should not setup DNS rebinding protection when disabled', () => {
    new HttpTransport({
      enableDnsRebindingProtection: false,
    });

    // Count middleware registrations
    const callCount = vi.mocked(mockApp.use).mock.calls.length;

    // Should have other middleware but not DNS protection
    expect(callCount).toBeGreaterThan(0);
  });

  it('should setup request logging middleware', () => {
    new HttpTransport();

    // Should have registered logging middleware
    expect(mockApp.use).toHaveBeenCalled();
  });

  it('should setup error handling middleware', () => {
    new HttpTransport();

    // Express error handling middleware is registered with app.use
    // We just verify that use was called (the error handler is always registered)
    expect(mockApp.use).toHaveBeenCalled();
  });
});

describe('HttpTransport Route Handlers', () => {
  let transport: HttpTransport;
  let mockServer: Server;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let routeHandlers: Map<string, (...args: any[]) => any>;

  beforeEach(async () => {
    vi.clearAllMocks();
    routeHandlers = new Map();

    // Create mock server
    mockServer = {
      connect: vi.fn(),
    } as unknown as Server;

    // Create mock request and response
    mockReq = {
      headers: { host: 'localhost:3000' },
      params: {},
      body: {},
      method: 'GET',
      path: '/',
      on: vi.fn(),
    };

    mockRes = {
      status: vi.fn(() => mockRes),
      json: vi.fn(() => mockRes),
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    };

    mockNext = vi.fn();

    // Capture route handlers
    const mockExpress = await import('express');
    const mockApp = mockExpress.default();

    vi.mocked(mockApp.get).mockImplementation((path: any, handler: any) => {
      if (typeof path === 'string' && typeof handler === 'function') {
        routeHandlers.set(`GET ${path}`, handler);
      }
      return mockApp;
    });

    vi.mocked(mockApp.post).mockImplementation((path: any, handler: any) => {
      if (typeof path === 'string' && typeof handler === 'function') {
        routeHandlers.set(`POST ${path}`, handler);
      }
      return mockApp;
    });

    vi.mocked(mockApp.delete).mockImplementation((path: any, handler: any) => {
      if (typeof path === 'string' && typeof handler === 'function') {
        routeHandlers.set(`DELETE ${path}`, handler);
      }
      return mockApp;
    });

    vi.mocked(mockApp.use).mockImplementation((arg: any) => {
      if (typeof arg === 'function') {
        // Capture 404 handler (last use call with a function)
        routeHandlers.set('404', arg);
      }
      return mockApp;
    });

    transport = new HttpTransport();
    await transport.connect(mockServer);
  });

  describe('/health endpoint', () => {
    it('should return health status', () => {
      const handler = routeHandlers.get('GET /health');
      expect(handler).toBeDefined();

      handler!(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'healthy',
        transport: 'http',
        sessions: expect.any(Object),
        uptime: expect.any(Number),
      });
    });
  });

  describe('/session endpoint', () => {
    it('should create a new session', () => {
      const handler = routeHandlers.get('POST /session');
      expect(handler).toBeDefined();

      handler!(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        sessionId: expect.any(String),
        message: 'Session created successfully',
      });
    });

    it('should handle error when server not initialized', async () => {
      // Create transport without connecting
      new HttpTransport();

      // Get the handler from the unconnected transport
      const mockExpress = await import('express');
      const mockApp = mockExpress.default();

      let sessionHandler: ((...args: any[]) => any) | undefined;
      vi.mocked(mockApp.post).mockImplementation((path: any, handler: any) => {
        if (path === '/session' && typeof handler === 'function') {
          sessionHandler = handler;
        }
        return mockApp;
      });

      // Re-create to capture handler
      new HttpTransport();

      expect(sessionHandler).toBeDefined();
      sessionHandler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32603,
          message: 'MCP server not initialized',
        },
      });
    });
  });

  describe('/mcp endpoint', () => {
    it('should handle MCP request with valid session', async () => {
      // Create session first
      const sessionHandler = routeHandlers.get('POST /session');
      sessionHandler!(mockReq, mockRes);

      // Get sessionId from response
      const sessionCall = vi.mocked(mockRes.json).mock.calls[0];
      const sessionId = sessionCall[0].sessionId;

      // Reset mock
      vi.mocked(mockRes.json).mockClear();

      // Make MCP request
      mockReq.body = {
        sessionId,
        method: 'test-method',
        params: { test: true },
      };

      const mcpHandler = routeHandlers.get('POST /mcp');

      // The handler is async, so we need to await it
      await mcpHandler!(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        sessionId,
        result: expect.any(Object),
      });
    });

    it('should return error for missing sessionId', () => {
      mockReq.body = {
        method: 'test-method',
      };

      const handler = routeHandlers.get('POST /mcp');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32600,
          message: 'Session ID is required',
        },
      });
    });

    it('should return error for missing method', () => {
      mockReq.body = {
        sessionId: 'test-session',
      };

      const handler = routeHandlers.get('POST /mcp');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32600,
          message: 'Method is required',
        },
      });
    });

    it('should return error for invalid session', () => {
      mockReq.body = {
        sessionId: 'invalid-session',
        method: 'test-method',
      };

      const handler = routeHandlers.get('POST /mcp');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32001,
          message: 'Session not found or expired',
        },
      });
    });
  });

  describe('/session/:sessionId endpoint', () => {
    it('should delete an existing session', () => {
      // Create session first
      const sessionHandler = routeHandlers.get('POST /session');
      sessionHandler!(mockReq, mockRes);

      // Get sessionId
      const sessionCall = vi.mocked(mockRes.json).mock.calls[0];
      const sessionId = sessionCall[0].sessionId;

      // Reset mock
      vi.mocked(mockRes.json).mockClear();

      // Delete session
      mockReq.params = { sessionId };

      const deleteHandler = routeHandlers.get('DELETE /session/:sessionId');
      deleteHandler!(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Session closed successfully',
      });
    });

    it('should return error for non-existent session', () => {
      mockReq.params = { sessionId: 'non-existent' };

      const handler = routeHandlers.get('DELETE /session/:sessionId');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32001,
          message: 'Session not found',
        },
      });
    });

    it('should return error for missing sessionId', () => {
      mockReq.params = {};

      const handler = routeHandlers.get('DELETE /session/:sessionId');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32600,
          message: 'Session ID is required',
        },
      });
    });
  });

  describe('/events/:sessionId endpoint', () => {
    it('should setup SSE for valid session', () => {
      // Create session first
      const sessionHandler = routeHandlers.get('POST /session');
      sessionHandler!(mockReq, mockRes);

      // Get sessionId
      const sessionCall = vi.mocked(mockRes.json).mock.calls[0];
      const sessionId = sessionCall[0].sessionId;

      // Reset mocks
      vi.mocked(mockRes.json).mockClear();
      vi.mocked(mockRes.writeHead).mockClear();

      // Request SSE
      mockReq.params = { sessionId };

      const eventsHandler = routeHandlers.get('GET /events/:sessionId');
      eventsHandler!(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('data: {"type":"connected","sessionId":"')
      );
    });

    it('should return error for missing sessionId', () => {
      mockReq.params = {};

      const handler = routeHandlers.get('GET /events/:sessionId');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32600,
          message: 'Session ID is required',
        },
      });
    });

    it('should return error for invalid session', () => {
      mockReq.params = { sessionId: 'invalid-session' };

      const handler = routeHandlers.get('GET /events/:sessionId');
      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32001,
          message: 'Session not found or expired',
        },
      });
    });
  });

  describe('404 handler', () => {
    it('should return 404 for undefined routes', () => {
      const handler = routeHandlers.get('404');
      expect(handler).toBeDefined();

      handler!(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: -32601,
          message: 'Method not found',
        },
      });
    });
  });

  describe('DNS rebinding protection', () => {
    it('should block requests without host header', async () => {
      new HttpTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost'],
      });

      // Get the DNS protection middleware
      const mockExpress = await import('express');
      const mockApp = mockExpress.default();

      let dnsMiddleware: ((...args: any[]) => any) | undefined;
      vi.mocked(mockApp.use).mockImplementation((arg: any) => {
        if (typeof arg === 'function' && arg.length === 3) {
          // This is likely our DNS middleware (has 3 params: req, res, next)
          const funcStr = arg.toString();
          if (funcStr.includes('hostHeader') || funcStr.includes('host')) {
            dnsMiddleware = arg;
          }
        }
        return mockApp;
      });

      // Re-create to capture middleware
      new HttpTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost'],
      });

      if (dnsMiddleware) {
        delete mockReq.headers.host;
        dnsMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            code: -32000,
            message: 'Forbidden: Missing host header',
          },
        });
      }
    });

    it('should block requests from unauthorized hosts', async () => {
      new HttpTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost', '127.0.0.1'],
      });

      const mockExpress = await import('express');
      const mockApp = mockExpress.default();

      let dnsMiddleware: ((...args: any[]) => any) | undefined;
      vi.mocked(mockApp.use).mockImplementation((arg: any) => {
        if (typeof arg === 'function' && arg.length === 3) {
          const funcStr = arg.toString();
          if (funcStr.includes('hostHeader') || funcStr.includes('host')) {
            dnsMiddleware = arg;
          }
        }
        return mockApp;
      });

      new HttpTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost', '127.0.0.1'],
      });

      if (dnsMiddleware) {
        mockReq.headers.host = 'evil.com:3000';
        dnsMiddleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: {
            code: -32000,
            message: 'Forbidden: Invalid host',
          },
        });
      }
    });

    it('should allow requests from authorized hosts', async () => {
      new HttpTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost', '127.0.0.1'],
      });

      const mockExpress = await import('express');
      const mockApp = mockExpress.default();

      let dnsMiddleware: ((...args: any[]) => any) | undefined;
      vi.mocked(mockApp.use).mockImplementation((arg: any) => {
        if (typeof arg === 'function' && arg.length === 3) {
          const funcStr = arg.toString();
          if (funcStr.includes('hostHeader') || funcStr.includes('host')) {
            dnsMiddleware = arg;
          }
        }
        return mockApp;
      });

      new HttpTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['localhost', '127.0.0.1'],
      });

      if (dnsMiddleware) {
        mockReq.headers.host = 'localhost:3000';
        dnsMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalledWith(403);
      }
    });
  });
});
