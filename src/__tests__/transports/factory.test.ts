import { TransportFactory } from '../../transports/factory.js';
import { StdioTransport } from '../../transports/stdio.js';
import { HttpTransport } from '../../transports/http.js';
import { cleanupMetricsService } from '../../monitoring/metrics.js';
import { HealthService } from '../../monitoring/health.js';

describe('TransportFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    cleanupMetricsService();
    HealthService.resetInstance();
  });

  describe('create', () => {
    it('should create STDIO transport', () => {
      const transport = TransportFactory.create({ type: 'stdio' });
      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create HTTP transport', () => {
      const transport = TransportFactory.create({ type: 'http' });
      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should throw error for unsupported transport type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => TransportFactory.create({ type: 'websocket' as any })).toThrow(
        'Unsupported transport type: websocket'
      );
    });
  });

  describe('createFromEnvironment', () => {
    it('should create STDIO transport by default', () => {
      delete process.env.MCP_TRANSPORT;
      const transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create STDIO transport when explicitly specified', () => {
      process.env.MCP_TRANSPORT = 'stdio';
      const transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should handle uppercase environment variable', () => {
      process.env.MCP_TRANSPORT = 'STDIO';
      const transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create HTTP transport from environment', () => {
      process.env.MCP_TRANSPORT = 'http';
      const transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should set HTTP options from environment', () => {
      process.env.MCP_TRANSPORT = 'http';
      process.env.MCP_HTTP_PORT = '8080';
      process.env.MCP_HTTP_HOST = '0.0.0.0';

      const transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });
  });
});
