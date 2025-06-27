import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { HttpTransport } from '../http.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import jwt from 'jsonwebtoken';
import { cleanupMetricsService } from '../../monitoring/metrics.js';
import { HealthService } from '../../monitoring/health.js';

// Mock the Server class
jest.mock('@modelcontextprotocol/sdk/server/index.js');

describe('HttpTransport Authentication', () => {
  let transport: HttpTransport;
  let app: Application;
  let mockServer: jest.Mocked<Server>;
  const testSecret = 'test-secret';
  const testIssuer = 'https://auth.example.com';
  const testPublicUrl = 'https://mcp.example.com';

  beforeEach(() => {
    // Create mock server
    mockServer = {
      connect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Server>;

    // Create transport with auth configuration
    transport = new HttpTransport({
      port: 0, // Use random port
      host: 'localhost',
      publicUrl: testPublicUrl,
      authorizationServers: [testIssuer],
    });

    // Get the Express app for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app = (transport as any).app;
  });

  afterEach(async () => {
    await transport.shutdown();
    cleanupMetricsService();
    HealthService.resetInstance();
  });

  describe('OAuth metadata endpoints', () => {
    it('should return protected resource metadata', async () => {
      const response = await request(app).get('/.well-known/oauth-protected-resource');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        resource: testPublicUrl,
        authorization_servers: [testIssuer],
        bearer_methods_supported: ['header'],
        resource_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
        resource_documentation:
          'https://github.com/sapientpants/sonarqube-mcp-server/blob/main/README.md',
      });
    });

    it('should not return authorization server metadata when built-in auth is disabled', async () => {
      const response = await request(app).get('/.well-known/oauth-authorization-server');
      expect(response.status).toBe(404);
    });

    it('should return authorization server metadata when built-in auth is enabled', async () => {
      // Create transport with built-in auth server
      const authTransport = new HttpTransport({
        port: 0,
        host: 'localhost',
        publicUrl: testPublicUrl,
        builtInAuthServer: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authApp = (authTransport as any).app;
      const response = await request(authApp).get('/.well-known/oauth-authorization-server');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        issuer: testPublicUrl,
        authorization_endpoint: `${testPublicUrl}/auth/authorize`,
        token_endpoint: `${testPublicUrl}/auth/token`,
        jwks_uri: `${testPublicUrl}/auth/jwks`,
        scopes_supported: ['sonarqube:read', 'sonarqube:write', 'sonarqube:admin'],
      });

      await authTransport.shutdown();
    });
  });

  describe('MCP endpoint authentication', () => {
    beforeEach(async () => {
      await transport.connect(mockServer);
    });

    it('should require Bearer token for /mcp endpoint', async () => {
      const response = await request(app).post('/mcp').send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toContain('Bearer');
      expect(response.headers['www-authenticate']).toContain('realm="MCP SonarQube Server"');
      expect(response.headers['www-authenticate']).toContain(
        `resource_metadata="${testPublicUrl}/.well-known/oauth-protected-resource"`
      );
      expect(response.body).toEqual({
        error: 'unauthorized',
        error_description: 'Bearer token required',
      });
    });

    it('should reject request with invalid Authorization header format', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Basic dXNlcjpwYXNz') // Basic auth instead of Bearer
        .send({ test: 'data' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should allow access when no validator is configured and insecure mode enabled', async () => {
      // Enable insecure mode
      process.env.MCP_HTTP_ALLOW_NO_AUTH = 'true';

      // Create transport without auth servers
      const noAuthTransport = new HttpTransport({
        port: 0,
        host: 'localhost',
        publicUrl: testPublicUrl,
        authorizationServers: [],
      });

      await noAuthTransport.connect(mockServer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noAuthApp = (noAuthTransport as any).app;

      const response = await request(noAuthApp)
        .post('/mcp')
        .set('Authorization', 'Bearer any-token')
        .send({ test: 'data' });

      // Should get 503 because SSE transport is not established in test
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('service_unavailable');

      await noAuthTransport.shutdown();

      // Clean up
      delete process.env.MCP_HTTP_ALLOW_NO_AUTH;
    });

    it('should handle expired token with proper error response', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user123',
          aud: testPublicUrl,
          iss: testIssuer,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        testSecret
      );

      const response = await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ test: 'data' });

      // Should fail with 401 due to invalid token
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_token');
    });

    it('should handle token with invalid audience', async () => {
      const invalidAudToken = jwt.sign(
        {
          sub: 'user123',
          aud: 'https://wrong-audience.com',
          iss: testIssuer,
        },
        testSecret
      );

      const response = await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${invalidAudToken}`)
        .send({ test: 'data' });

      // Should fail with 401 due to invalid token
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_token');
    });

    it('should handle malformed JWT', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer not-a-jwt')
        .send({ test: 'data' });

      // Should fail with 401 due to invalid token
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('invalid_token');
    });
  });

  describe('Health check endpoint', () => {
    it('should not require authentication for /health', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(503); // Unhealthy because no SonarQube configured
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        dependencies: expect.objectContaining({
          sonarqube: expect.objectContaining({
            status: 'unhealthy',
          }),
        }),
      });
    });
  });

  describe('Rate limiting', () => {
    it('should rate limit authentication attempts', async () => {
      // Create transport with strict rate limiting
      const rateLimitedTransport = new HttpTransport({
        port: 0,
        host: 'localhost',
        publicUrl: testPublicUrl,
        authorizationServers: [testIssuer],
        rateLimitOptions: {
          windowMs: 60 * 1000, // 1 minute
          max: 3, // Only 3 requests per minute
        },
      });

      await rateLimitedTransport.connect(mockServer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateLimitedApp = (rateLimitedTransport as any).app;

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        const response = await request(rateLimitedApp)
          .post('/mcp')
          .set('Authorization', 'Bearer invalid-token')
          .send({ test: 'data' });
        expect(response.status).toBe(401);
      }

      // Next request should be rate limited
      const rateLimitedResponse = await request(rateLimitedApp)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token')
        .send({ test: 'data' });

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body).toEqual({
        error: 'too_many_requests',
        error_description: 'Too many authentication attempts, please try again later',
      });
      expect(rateLimitedResponse.headers['ratelimit-limit']).toBe('3');
      expect(rateLimitedResponse.headers['ratelimit-remaining']).toBe('0');

      await rateLimitedTransport.shutdown();
    });

    it('should use custom rate limit message', async () => {
      const customMessage = 'Custom rate limit message';
      const rateLimitedTransport = new HttpTransport({
        port: 0,
        host: 'localhost',
        publicUrl: testPublicUrl,
        authorizationServers: [testIssuer],
        rateLimitOptions: {
          windowMs: 60 * 1000,
          max: 1,
          message: customMessage,
        },
      });

      await rateLimitedTransport.connect(mockServer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateLimitedApp = (rateLimitedTransport as any).app;

      // First request is OK
      await request(rateLimitedApp)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token')
        .send({ test: 'data' })
        .expect(401);

      // Second request should be rate limited with custom message
      const response = await request(rateLimitedApp)
        .post('/mcp')
        .set('Authorization', 'Bearer invalid-token')
        .send({ test: 'data' });

      expect(response.status).toBe(429);
      expect(response.body.error_description).toBe(customMessage);

      await rateLimitedTransport.shutdown();
    });
  });
});
