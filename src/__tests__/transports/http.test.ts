import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpTransport } from '../../transports/http.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Server as HttpServer } from 'http';

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
});
