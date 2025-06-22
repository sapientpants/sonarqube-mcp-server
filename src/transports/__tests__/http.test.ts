import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { HttpTransport } from '../http.js';
import type { Express } from 'express';

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the SSE server transport
jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: jest.fn().mockImplementation(() => ({
    handlePostMessage: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('HttpTransport', () => {
  let transport: HttpTransport;
  let mockServer: jest.Mocked<Server>;
  let app: Express;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.MCP_HTTP_PORT;
    delete process.env.MCP_HTTP_HOST;
    delete process.env.MCP_HTTP_PUBLIC_URL;
    delete process.env.MCP_OAUTH_AUTH_SERVERS;
    delete process.env.MCP_OAUTH_BUILTIN;

    // Create mock server
    mockServer = {
      connect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Server>;
  });

  afterEach(async () => {
    // Shutdown transport if it exists
    if (transport && transport.shutdown) {
      await transport.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create transport with default options', () => {
      transport = new HttpTransport();
      expect(transport.getName()).toBe('http');
    });

    it('should use environment variables for configuration', () => {
      process.env.MCP_HTTP_PORT = '8080';
      process.env.MCP_HTTP_HOST = '0.0.0.0';
      process.env.MCP_HTTP_PUBLIC_URL = 'https://mcp.example.com';
      process.env.MCP_OAUTH_AUTH_SERVERS = 'https://auth1.example.com,https://auth2.example.com';
      process.env.MCP_OAUTH_BUILTIN = 'true';

      transport = new HttpTransport();
      expect(transport.getName()).toBe('http');
    });

    it('should use provided options over environment variables', () => {
      process.env.MCP_HTTP_PORT = '8080';

      transport = new HttpTransport({ port: 3000 });
      expect(transport.getName()).toBe('http');
    });
  });

  describe('OAuth metadata endpoints', () => {
    beforeEach(async () => {
      transport = new HttpTransport({
        port: 0, // Use random port
        publicUrl: 'https://mcp.example.com',
        authorizationServers: ['https://auth.example.com'],
      });

      // Get the Express app before connecting
      // Access private property for testing
      app = (transport as unknown as { app: Express }).app;
    });

    describe('/.well-known/oauth-protected-resource', () => {
      it('should return protected resource metadata', async () => {
        const response = await request(app)
          .get('/.well-known/oauth-protected-resource')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toEqual({
          resource: 'https://mcp.example.com',
          authorization_servers: ['https://auth.example.com'],
          bearer_methods_supported: ['header'],
          resource_signing_alg_values_supported: ['RS256'],
          scopes_supported: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
          resource_documentation:
            'https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md',
        });
      });

      it('should support CORS', async () => {
        const response = await request(app)
          .get('/.well-known/oauth-protected-resource')
          .set('Origin', 'https://client.example.com')
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBeDefined();
      });
    });

    describe('/.well-known/oauth-authorization-server', () => {
      it('should not be available when built-in auth server is disabled', async () => {
        await request(app).get('/.well-known/oauth-authorization-server').expect(404);
      });

      it('should return authorization server metadata when enabled', async () => {
        transport = new HttpTransport({
          port: 0,
          publicUrl: 'https://mcp.example.com',
          builtInAuthServer: true,
        });

        // Access private property for testing
        app = (transport as unknown as { app: Express }).app;

        const response = await request(app)
          .get('/.well-known/oauth-authorization-server')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toEqual({
          issuer: 'https://mcp.example.com',
          authorization_endpoint: 'https://mcp.example.com/oauth/authorize',
          token_endpoint: 'https://mcp.example.com/oauth/token',
          jwks_uri: 'https://mcp.example.com/oauth/jwks',
          scopes_supported: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
          response_types_supported: ['code'],
          response_modes_supported: ['query'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
          token_endpoint_auth_signing_alg_values_supported: ['RS256'],
          service_documentation:
            'https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md',
          code_challenge_methods_supported: ['S256'],
        });
      });
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      transport = new HttpTransport({
        port: 0,
        publicUrl: 'https://mcp.example.com',
        authorizationServers: ['https://auth.example.com'],
      });

      // Get the Express app and connect to trigger middleware setup
      // Access private property for testing
      app = (transport as unknown as { app: Express }).app;
      await transport.connect(mockServer);
    });

    it('should return 401 with WWW-Authenticate header when no token provided', async () => {
      const response = await request(app).get('/mcp').expect(401);

      expect(response.headers['www-authenticate']).toBe(
        'Bearer realm="MCP SonarQube Server" resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"'
      );

      expect(response.body).toEqual({
        error: 'unauthorized',
        error_description: 'Bearer token required',
      });
    });

    it('should return 401 when invalid authorization header provided', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Basic invalid')
        .send({ jsonrpc: '2.0', method: 'test', id: 1 })
        .expect(401);

      expect(response.headers['www-authenticate']).toBeDefined();
    });

    it('should reject invalid Bearer token when validation is configured', async () => {
      // With authorization servers configured, token validation is active
      // An invalid token should be rejected
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token')
        .send({ jsonrpc: '2.0', method: 'test', id: 1 })
        .expect(401);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_token');
      expect(response.headers['www-authenticate']).toContain('error="invalid_token"');
    });

    it('should allow Bearer token when no validation is configured', async () => {
      // Create transport without authorization servers
      const noAuthTransport = new HttpTransport({
        port: 0,
        publicUrl: 'https://mcp.example.com',
        authorizationServers: [],
      });

      const noAuthApp = (noAuthTransport as unknown as { app: Express }).app;
      await noAuthTransport.connect(mockServer);

      // Without auth servers, any Bearer token should pass
      // We expect 503 because no SSE connection is established in tests
      const response = await request(noAuthApp)
        .post('/mcp')
        .set('Authorization', 'Bearer dummy-token')
        .send({ jsonrpc: '2.0', method: 'test', id: 1 })
        .expect(503);

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('service_unavailable');

      await noAuthTransport.shutdown();
    });
  });

  describe('Protocol version', () => {
    beforeEach(async () => {
      transport = new HttpTransport({
        port: 0,
        publicUrl: 'https://mcp.example.com',
      });

      // Access private property for testing
      app = (transport as unknown as { app: Express }).app;
      await transport.connect(mockServer);
    });

    it('should reject invalid protocol version', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer dummy-token')
        .set('MCP-Protocol-Version', '1.0.0')
        .send({ jsonrpc: '2.0', method: 'test', id: 1 })
        .expect(400);

      expect(response.body).toEqual({
        error: 'invalid_protocol_version',
        error_description: 'Unsupported protocol version: 1.0.0',
      });
    });

    it('should accept valid protocol version', async () => {
      // We expect 503 because no SSE connection is established in tests
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer dummy-token')
        .set('MCP-Protocol-Version', '2025-06-18')
        .send({ jsonrpc: '2.0', method: 'test', id: 1 })
        .expect(503);

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('service_unavailable');
    });

    it('should accept requests without protocol version header', async () => {
      // We expect 503 because no SSE connection is established in tests
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer dummy-token')
        .send({ jsonrpc: '2.0', method: 'test', id: 1 })
        .expect(503);

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('service_unavailable');
    });
  });

  describe('Health check', () => {
    beforeEach(async () => {
      transport = new HttpTransport({ port: 0 });
      // Access private property for testing
      app = (transport as unknown as { app: Express }).app;
    });

    it('should return 200 OK for health check', async () => {
      const response = await request(app).get('/health').expect(200).expect('Content-Type', /json/);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('connect', () => {
    it('should connect to MCP server', async () => {
      transport = new HttpTransport({ port: 0 });

      await transport.connect(mockServer);

      // The server.connect is called when a GET request is made to /mcp
      // In the test environment, we're not making that request
      // So we just verify the server starts successfully
      expect(transport.getName()).toBe('http');
    });

    it('should handle connection errors', async () => {
      transport = new HttpTransport({ port: -1 }); // Invalid port

      await expect(transport.connect(mockServer)).rejects.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should gracefully shutdown the server', async () => {
      transport = new HttpTransport({ port: 0 });
      await transport.connect(mockServer);

      await expect(transport.shutdown()).resolves.toBeUndefined();
    });

    it('should handle shutdown when server not started', async () => {
      transport = new HttpTransport();

      await expect(transport.shutdown()).resolves.toBeUndefined();
    });
  });
});
