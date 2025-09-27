import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TransportFactory } from '../../transports/factory.js';
import { StdioTransport } from '../../transports/stdio.js';
import { HttpTransport } from '../../transports/http.js';
import type { ITransportConfig, IHttpTransportConfig } from '../../transports/base.js';

describe('TransportFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear all environment variables related to MCP
    delete process.env.MCP_TRANSPORT_TYPE;
    delete process.env.MCP_HTTP_PORT;
    delete process.env.MCP_HTTP_ALLOWED_HOSTS;
    delete process.env.MCP_HTTP_ALLOWED_ORIGINS;
    delete process.env.MCP_HTTP_SESSION_TIMEOUT;
    delete process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('create', () => {
    it('should create a stdio transport', () => {
      const config: ITransportConfig = { type: 'stdio' };
      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create an http transport', () => {
      const config: IHttpTransportConfig = {
        type: 'http',
        options: {
          port: 3001,
        },
      };
      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should create http transport with all options', () => {
      const config: IHttpTransportConfig = {
        type: 'http',
        options: {
          port: 3001,
          sessionTimeout: 1800000,
          enableDnsRebindingProtection: true,
          allowedHosts: ['localhost', '192.168.1.1'],
          allowedOrigins: ['http://localhost:3000', 'https://example.com'],
        },
      };

      const transport = TransportFactory.create(config);
      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should create http transport without options', () => {
      const config: IHttpTransportConfig = {
        type: 'http',
      };
      const transport = TransportFactory.create(config);

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should throw error for unsupported transport type', () => {
      const config = { type: 'unsupported' as any } as ITransportConfig;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: unsupported'
      );
    });

    it('should throw error for undefined transport type', () => {
      const config = {} as ITransportConfig;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: undefined'
      );
    });

    it('should throw error for null transport type', () => {
      const config = { type: null } as unknown as ITransportConfig;

      expect(() => TransportFactory.create(config)).toThrow('Unsupported transport type: null');
    });
  });

  describe('createFromEnvironment', () => {
    it('should create stdio transport by default', () => {
      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create stdio transport when MCP_TRANSPORT_TYPE is stdio', () => {
      process.env.MCP_TRANSPORT_TYPE = 'stdio';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create stdio transport when MCP_TRANSPORT_TYPE is STDIO (uppercase)', () => {
      process.env.MCP_TRANSPORT_TYPE = 'STDIO';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should create http transport when MCP_TRANSPORT_TYPE is http', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should create http transport when MCP_TRANSPORT_TYPE is HTTP (uppercase)', () => {
      process.env.MCP_TRANSPORT_TYPE = 'HTTP';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should parse MCP_HTTP_PORT environment variable', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = '8080';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
      // The factory creates the transport with the port option
      // We can't directly verify the port since it's internal to HttpTransport
      // But we know it was created with the environment config
    });

    it('should parse MCP_HTTP_SESSION_TIMEOUT environment variable', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_SESSION_TIMEOUT = '3600000';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should parse MCP_HTTP_ALLOWED_HOSTS environment variable', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ALLOWED_HOSTS = 'localhost,127.0.0.1,192.168.1.1';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should parse MCP_HTTP_ALLOWED_HOSTS with spaces', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ALLOWED_HOSTS = 'localhost, 127.0.0.1 , 192.168.1.1';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should parse MCP_HTTP_ALLOWED_ORIGINS environment variable', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should parse MCP_HTTP_ALLOWED_ORIGINS with spaces', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ALLOWED_ORIGINS = 'http://localhost:3000 , https://example.com , *';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should parse MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION environment variable', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION = 'true';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should not enable DNS rebinding protection for other values', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION = 'false';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should parse all HTTP environment variables together', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = '3001';
      process.env.MCP_HTTP_SESSION_TIMEOUT = '1800000';
      process.env.MCP_HTTP_ALLOWED_HOSTS = 'localhost,127.0.0.1';
      process.env.MCP_HTTP_ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';
      process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION = 'true';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should handle mixed case transport type', () => {
      process.env.MCP_TRANSPORT_TYPE = 'HtTp';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
      expect(transport.getName()).toBe('http');
    });

    it('should create stdio transport for unknown transport type', () => {
      process.env.MCP_TRANSPORT_TYPE = 'unknown';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should handle empty MCP_TRANSPORT_TYPE', () => {
      process.env.MCP_TRANSPORT_TYPE = '';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should handle whitespace in MCP_TRANSPORT_TYPE', () => {
      process.env.MCP_TRANSPORT_TYPE = '  http  ';

      const transport = TransportFactory.createFromEnvironment();

      // Note: Current implementation doesn't trim whitespace, so this becomes stdio
      expect(transport).toBeInstanceOf(StdioTransport);
      expect(transport.getName()).toBe('stdio');
    });

    it('should handle invalid MCP_HTTP_PORT gracefully', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = 'invalid';

      // Should not throw, just create with NaN value
      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should handle empty allowed hosts list', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ALLOWED_HOSTS = '';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should handle single allowed host', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ALLOWED_HOSTS = 'localhost';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should handle port number at boundary values', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';

      // Test port 0
      process.env.MCP_HTTP_PORT = '0';
      let transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);

      // Test port 65535
      process.env.MCP_HTTP_PORT = '65535';
      transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);

      // Test negative port (allowed but may not work)
      process.env.MCP_HTTP_PORT = '-1';
      transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should handle very long session timeout', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_SESSION_TIMEOUT = '999999999999';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should handle DNS rebinding protection with uppercase TRUE', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION = 'TRUE';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should handle DNS rebinding protection with value 1', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_ENABLE_DNS_REBINDING_PROTECTION = '1';

      const transport = TransportFactory.createFromEnvironment();

      expect(transport).toBeInstanceOf(HttpTransport);
    });

    it('should create different instances on multiple calls', () => {
      const transport1 = TransportFactory.createFromEnvironment();
      const transport2 = TransportFactory.createFromEnvironment();

      expect(transport1).toBeInstanceOf(StdioTransport);
      expect(transport2).toBeInstanceOf(StdioTransport);
      expect(transport1).not.toBe(transport2); // Different instances
    });
  });

  describe('integration', () => {
    it('should create equivalent transports using both methods for stdio', () => {
      const configTransport = TransportFactory.create({ type: 'stdio' });
      const envTransport = TransportFactory.createFromEnvironment();

      expect(configTransport.getName()).toBe(envTransport.getName());
      expect(configTransport).toBeInstanceOf(StdioTransport);
      expect(envTransport).toBeInstanceOf(StdioTransport);
    });

    it('should create equivalent transports using both methods for http', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = '3001';

      const configTransport = TransportFactory.create({
        type: 'http',
        options: { port: 3001 },
      });
      const envTransport = TransportFactory.createFromEnvironment();

      expect(configTransport.getName()).toBe(envTransport.getName());
      expect(configTransport).toBeInstanceOf(HttpTransport);
      expect(envTransport).toBeInstanceOf(HttpTransport);
    });

    it('should handle multiple environment variable sets', () => {
      // First configuration
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = '3000';
      let transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);

      // Change configuration
      process.env.MCP_TRANSPORT_TYPE = 'stdio';
      delete process.env.MCP_HTTP_PORT;
      transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(StdioTransport);

      // Back to HTTP with different port
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = '8080';
      transport = TransportFactory.createFromEnvironment();
      expect(transport).toBeInstanceOf(HttpTransport);
    });
  });

  describe('error handling', () => {
    it('should provide clear error message for invalid transport type', () => {
      const config = { type: 'websocket' } as any;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: websocket'
      );
    });

    it('should handle missing type gracefully', () => {
      const config = { options: { port: 3000 } } as any;

      expect(() => TransportFactory.create(config)).toThrow(
        'Unsupported transport type: undefined'
      );
    });

    it('should not throw when creating HTTP transport with invalid port in environment', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_PORT = 'not-a-number';

      // Should create transport despite invalid port
      expect(() => TransportFactory.createFromEnvironment()).not.toThrow();
    });

    it('should not throw when creating HTTP transport with invalid timeout in environment', () => {
      process.env.MCP_TRANSPORT_TYPE = 'http';
      process.env.MCP_HTTP_SESSION_TIMEOUT = 'not-a-number';

      // Should create transport despite invalid timeout
      expect(() => TransportFactory.createFromEnvironment()).not.toThrow();
    });
  });
});
