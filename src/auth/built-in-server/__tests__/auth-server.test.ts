import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { BuiltInAuthServer } from '../auth-server.js';
import { PKCEValidator } from '../pkce.js';
import jwt from 'jsonwebtoken';

describe('BuiltInAuthServer', () => {
  let authServer: BuiltInAuthServer;
  let app: express.Express;
  let adminCreds: { email: string; password: string };

  beforeEach(async () => {
    authServer = new BuiltInAuthServer({
      issuer: 'https://auth.example.com',
      audience: ['test-audience'],
    });

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/auth', authServer.getRouter());

    adminCreds = await authServer.createDefaultAdminUser();
  });

  afterEach(() => {
    authServer.destroy();
  });

  describe('POST /auth/register', () => {
    it('should register a new OAuth client', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          client_name: 'Test Application',
          redirect_uris: ['https://app.example.com/callback'],
          grant_types: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_method: 'client_secret_basic',
        })
        .expect(200);

      expect(response.body).toHaveProperty('client_id');
      expect(response.body).toHaveProperty('client_secret');
      expect(response.body.client_name).toBe('Test Application');
      expect(response.body.redirect_uris).toEqual(['https://app.example.com/callback']);
      expect(response.body.grant_types).toEqual(['authorization_code', 'refresh_token']);
      expect(response.body.token_endpoint_auth_method).toBe('client_secret_basic');
    });

    it('should require redirect_uris', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          client_name: 'Test Application',
        })
        .expect(400);
    });

    it('should validate redirect_uris are valid URLs', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          client_name: 'Test Application',
          redirect_uris: ['not-a-url'],
        })
        .expect(400);
    });
  });

  describe('GET /auth/authorize', () => {
    let clientId: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          client_name: 'Test App',
          redirect_uris: ['https://app.example.com/callback'],
        });

      clientId = registerResponse.body.client_id;
      clientSecret = registerResponse.body.client_secret;
    });

    it('should display login form for valid authorization request', async () => {
      const response = await request(app)
        .get('/auth/authorize')
        .query({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: 'https://app.example.com/callback',
          state: 'test-state',
        })
        .expect(200);

      expect(response.text).toContain('<form');
      expect(response.text).toContain('email');
      expect(response.text).toContain('password');
    });

    it('should support PKCE parameters', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = PKCEValidator.generateCodeChallenge(codeVerifier);

      const response = await request(app)
        .get('/auth/authorize')
        .query({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: 'https://app.example.com/callback',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        })
        .expect(200);

      expect(response.text).toContain('<form');
    });

    it('should reject invalid client_id', async () => {
      const response = await request(app)
        .get('/auth/authorize')
        .query({
          response_type: 'code',
          client_id: 'invalid-client',
          redirect_uri: 'https://app.example.com/callback',
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_client');
    });

    it('should reject invalid redirect_uri', async () => {
      const response = await request(app)
        .get('/auth/authorize')
        .query({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: 'https://evil.example.com/callback',
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_redirect_uri');
    });

    it('should require response_type=code', async () => {
      await request(app)
        .get('/auth/authorize')
        .query({
          response_type: 'token',
          client_id: clientId,
          redirect_uri: 'https://app.example.com/callback',
        })
        .expect(400);
    });
  });

  describe('POST /auth/authorize', () => {
    let clientId: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          client_name: 'Test App',
          redirect_uris: ['https://app.example.com/callback'],
        });

      clientId = registerResponse.body.client_id;
    });

    it('should authenticate user and redirect with authorization code', async () => {
      // First, get the authorization form
      const authResponse = await request(app).get('/auth/authorize').query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://app.example.com/callback',
        state: 'test-state',
      });

      // Extract auth_id from the form
      const authIdMatch = authResponse.text.match(/name="auth_id" value="([^"]+)"/);
      expect(authIdMatch).toBeTruthy();
      const authId = authIdMatch![1];

      // Submit login credentials
      const loginResponse = await request(app)
        .post('/auth/authorize')
        .type('form')
        .send({
          auth_id: authId,
          email: adminCreds.email,
          password: adminCreds.password,
        })
        .expect(302);

      const location = loginResponse.headers.location;
      expect(location).toContain('https://app.example.com/callback');
      expect(location).toContain('code=');
      expect(location).toContain('state=test-state');

      const url = new URL(location);
      const code = url.searchParams.get('code');
      expect(code).toBeTruthy();
    });

    it('should reject invalid credentials', async () => {
      const authResponse = await request(app).get('/auth/authorize').query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://app.example.com/callback',
      });

      const authIdMatch = authResponse.text.match(/name="auth_id" value="([^"]+)"/);
      const authId = authIdMatch![1];

      const loginResponse = await request(app)
        .post('/auth/authorize')
        .type('form')
        .send({
          auth_id: authId,
          email: adminCreds.email,
          password: 'wrong-password',
        })
        .expect(401);

      expect(loginResponse.text).toContain('Invalid email or password');
    });

    it('should reject invalid auth_id', async () => {
      await request(app)
        .post('/auth/authorize')
        .type('form')
        .send({
          auth_id: 'invalid-auth-id',
          email: adminCreds.email,
          password: adminCreds.password,
        })
        .expect(400);
    });
  });

  describe('POST /auth/token', () => {
    let clientId: string;
    let clientSecret: string;
    let authorizationCode: string;

    beforeEach(async () => {
      // Register client
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          client_name: 'Test App',
          redirect_uris: ['https://app.example.com/callback'],
        });

      clientId = registerResponse.body.client_id;
      clientSecret = registerResponse.body.client_secret;

      // Get authorization code
      const authResponse = await request(app).get('/auth/authorize').query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://app.example.com/callback',
      });

      const authIdMatch = authResponse.text.match(/name="auth_id" value="([^"]+)"/);
      const authId = authIdMatch![1];

      const loginResponse = await request(app).post('/auth/authorize').type('form').send({
        auth_id: authId,
        email: adminCreds.email,
        password: adminCreds.password,
      });

      const location = loginResponse.headers.location;
      const url = new URL(location);
      authorizationCode = url.searchParams.get('code')!;
    });

    it('should exchange authorization code for tokens', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: 'https://app.example.com/callback',
          client_id: clientId,
          client_secret: clientSecret,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBe(3600);

      // Verify the access token
      const decoded = jwt.decode(response.body.access_token, { complete: true }) as jwt.Jwt;
      expect(decoded.payload.sub).toBeDefined();
      expect(decoded.payload.email).toBe(adminCreds.email);
      expect(decoded.payload.groups).toEqual(['admin']);
    });

    it('should support PKCE flow', async () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = PKCEValidator.generateCodeChallenge(codeVerifier);

      // Get authorization code with PKCE
      const authResponse = await request(app).get('/auth/authorize').query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://app.example.com/callback',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      const authIdMatch = authResponse.text.match(/name="auth_id" value="([^"]+)"/);
      const authId = authIdMatch![1];

      const loginResponse = await request(app).post('/auth/authorize').type('form').send({
        auth_id: authId,
        email: adminCreds.email,
        password: adminCreds.password,
      });

      const location = loginResponse.headers.location;
      const url = new URL(location);
      const pkceCode = url.searchParams.get('code')!;

      // Exchange code with code verifier
      const tokenResponse = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: pkceCode,
          redirect_uri: 'https://app.example.com/callback',
          client_id: clientId,
          client_secret: clientSecret,
          code_verifier: codeVerifier,
        })
        .expect(200);

      expect(tokenResponse.body).toHaveProperty('access_token');
      expect(tokenResponse.body).toHaveProperty('refresh_token');
    });

    it('should reject invalid authorization code', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: 'invalid-code',
          redirect_uri: 'https://app.example.com/callback',
          client_id: clientId,
          client_secret: clientSecret,
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_grant');
    });

    it('should reject reused authorization code', async () => {
      await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: 'https://app.example.com/callback',
          client_id: clientId,
          client_secret: clientSecret,
        })
        .expect(200);

      // Try to use the same code again
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: 'https://app.example.com/callback',
          client_id: clientId,
          client_secret: clientSecret,
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_grant');
    });

    it('should reject invalid client credentials', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: 'https://app.example.com/callback',
          client_id: clientId,
          client_secret: 'wrong-secret',
        })
        .expect(401);

      expect(response.body.error).toBe('invalid_client');
    });

    it('should support refresh token grant', async () => {
      // First get tokens
      const tokenResponse = await request(app).post('/auth/token').send({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: 'https://app.example.com/callback',
        client_id: clientId,
        client_secret: clientSecret,
      });

      const refreshToken = tokenResponse.body.refresh_token;

      // Use refresh token
      const refreshResponse = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('access_token');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      expect(refreshResponse.body.refresh_token).not.toBe(refreshToken); // Token rotation
    });
  });

  describe('POST /auth/revoke', () => {
    it('should revoke refresh token', async () => {
      const response = await request(app)
        .post('/auth/revoke')
        .send({
          token: 'some-refresh-token',
          token_type_hint: 'refresh_token',
        })
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('GET /auth/jwks', () => {
    it('should return JWKS', async () => {
      const response = await request(app).get('/auth/jwks').expect(200);

      expect(response.body).toHaveProperty('keys');
      expect(response.body.keys).toBeInstanceOf(Array);
      expect(response.body.keys.length).toBeGreaterThan(0);

      const key = response.body.keys[0];
      expect(key).toHaveProperty('kid');
      expect(key).toHaveProperty('kty', 'RSA');
      expect(key).toHaveProperty('use', 'sig');
      expect(key).toHaveProperty('alg', 'RS256');
      expect(key).toHaveProperty('n');
      expect(key).toHaveProperty('e');
    });
  });

  describe('Admin API', () => {
    describe('POST /auth/admin/users', () => {
      it('should create new user', async () => {
        const response = await request(app)
          .post('/auth/admin/users')
          .send({
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            groups: ['users', 'developers'],
          })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe('newuser@example.com');
        expect(response.body.groups).toEqual(['users', 'developers']);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('passwordHash');
      });

      it('should require strong password', async () => {
        await request(app)
          .post('/auth/admin/users')
          .send({
            email: 'newuser@example.com',
            password: 'weak',
          })
          .expect(400);
      });

      it('should reject duplicate email', async () => {
        await request(app)
          .post('/auth/admin/users')
          .send({
            email: adminCreds.email,
            password: 'SecurePass123!',
          })
          .expect(500);
      });
    });

    describe('GET /auth/admin/users', () => {
      it('should list users', async () => {
        const response = await request(app).get('/auth/admin/users').expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);

        const user = response.body[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('groups');
        expect(user).not.toHaveProperty('passwordHash');
      });
    });

    describe('POST /auth/admin/users/:id/api-keys', () => {
      let userId: string;

      beforeEach(async () => {
        const userResponse = await request(app).get('/auth/admin/users');
        userId = userResponse.body[0].id;
      });

      it('should create API key for user', async () => {
        const response = await request(app)
          .post(`/auth/admin/users/${userId}/api-keys`)
          .send({
            name: 'CI/CD Key',
            scopes: ['read', 'write'],
          })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('apiKey');
        expect(response.body.name).toBe('CI/CD Key');
        expect(response.body.scopes).toEqual(['read', 'write']);
        expect(response.body).not.toHaveProperty('keyHash');

        // Verify the API key format
        expect(/^[A-Za-z0-9_-]+$/.test(response.body.apiKey)).toBe(true);
      });

      it('should support expiring API keys', async () => {
        const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 1 day

        const response = await request(app)
          .post(`/auth/admin/users/${userId}/api-keys`)
          .send({
            name: 'Temporary Key',
            scopes: ['read'],
            expiresAt,
          })
          .expect(200);

        expect(response.body.expiresAt).toBe(expiresAt);
      });
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate with API key', async () => {
      // Create user and API key
      const userResponse = await request(app).get('/auth/admin/users');
      const userId = userResponse.body[0].id;

      const apiKeyResponse = await request(app)
        .post(`/auth/admin/users/${userId}/api-keys`)
        .send({
          name: 'Test Key',
          scopes: ['read'],
        });

      const apiKey = apiKeyResponse.body.apiKey;

      // Verify API key authentication works
      const user = await authServer.authenticateApiKey(apiKey);
      expect(user).toBeDefined();
      expect(user?.email).toBe(adminCreds.email);
    });
  });
});
