import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateSecureToken, generateSecureId } from './utils.js';
import { InMemoryUserStore, PasswordHasher, ApiKeyGenerator } from './user-store.js';
import { InMemoryClientStore, ClientSecretGenerator } from './client-store.js';
import { InMemoryAuthorizationCodeStore, InMemoryRefreshTokenStore } from './auth-code-store.js';
import { KeyManager } from './key-manager.js';
import { PKCEValidator } from './pkce.js';
import type { User, OAuthClient } from './types.js';

interface AuthServerOptions {
  issuer: string;
  audience?: string[];
  sessionSecret?: string;
  accessTokenTTL?: number;
  refreshTokenTTL?: number;
  authCodeTTL?: number;
}

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export class BuiltInAuthServer {
  private readonly userStore: InMemoryUserStore;
  private readonly clientStore: InMemoryClientStore;
  private readonly authCodeStore: InMemoryAuthorizationCodeStore;
  private readonly refreshTokenStore: InMemoryRefreshTokenStore;
  private readonly keyManager: KeyManager;
  private readonly router: Router;
  private readonly options: Required<AuthServerOptions>;
  private readonly pendingAuthorizations = new Map<string, PendingAuthorization>();

  constructor(options: AuthServerOptions) {
    this.userStore = new InMemoryUserStore();
    this.clientStore = new InMemoryClientStore();
    this.authCodeStore = new InMemoryAuthorizationCodeStore();
    this.refreshTokenStore = new InMemoryRefreshTokenStore();
    this.keyManager = new KeyManager();
    this.router = Router();

    this.options = {
      issuer: options.issuer,
      audience: options.audience ?? [],
      sessionSecret: options.sessionSecret ?? generateSecureId(32),
      accessTokenTTL: options.accessTokenTTL ?? 3600,
      refreshTokenTTL: options.refreshTokenTTL ?? 2592000,
      authCodeTTL: options.authCodeTTL ?? 600,
    };

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/register', this.handleClientRegistration.bind(this));
    this.router.get('/authorize', this.handleAuthorize.bind(this));
    this.router.post('/authorize', this.handleAuthorizeSubmit.bind(this));
    this.router.post('/token', this.handleToken.bind(this));
    this.router.post('/revoke', this.handleRevoke.bind(this));
    this.router.get('/jwks', this.handleJWKS.bind(this));

    this.router.post('/admin/users', this.handleCreateUser.bind(this));
    this.router.get('/admin/users', this.handleListUsers.bind(this));
    this.router.delete('/admin/users/:id', this.handleDeleteUser.bind(this));
    this.router.post('/admin/users/:id/api-keys', this.handleCreateApiKey.bind(this));
  }

  getRouter(): Router {
    return this.router;
  }

  private async handleClientRegistration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const schema = z.object({
        client_name: z.string(),
        redirect_uris: z.array(z.string().url()),
        grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])).optional(),
        token_endpoint_auth_method: z
          .enum(['client_secret_basic', 'client_secret_post', 'none'])
          .optional(),
      });

      let body;
      try {
        body = schema.parse(req.body);
      } catch {
        res
          .status(400)
          .json({ error: 'invalid_request', error_description: 'Invalid request parameters' });
        return;
      }

      const clientId = generateSecureId();
      const clientSecret = ClientSecretGenerator.generateClientSecret();
      const clientSecretHash = await ClientSecretGenerator.hashClientSecret(clientSecret);

      const client = await this.clientStore.createClient({
        clientId,
        clientSecretHash,
        clientName: body.client_name,
        redirectUris: body.redirect_uris,
        grantTypes: body.grant_types ?? ['authorization_code'],
        scopes: [],
        tokenEndpointAuthMethod: body.token_endpoint_auth_method ?? 'client_secret_basic',
      });

      res.json({
        client_id: client.clientId,
        client_secret: clientSecret,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      });
    } catch (error) {
      next(error);
    }
  }

  private async handleAuthorize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        response_type: z.literal('code'),
        client_id: z.string(),
        redirect_uri: z.string().url(),
        scope: z.string().optional(),
        state: z.string().optional(),
        code_challenge: z.string().optional(),
        code_challenge_method: z.literal('S256').optional(),
      });

      let query;
      try {
        query = schema.parse(req.query);
      } catch {
        res
          .status(400)
          .json({ error: 'invalid_request', error_description: 'Invalid request parameters' });
        return;
      }

      const client = await this.clientStore.getClientById(query.client_id);
      if (!client) {
        res.status(400).json({ error: 'invalid_client' });
        return;
      }

      if (!client.redirectUris.includes(query.redirect_uri)) {
        res.status(400).json({ error: 'invalid_redirect_uri' });
        return;
      }

      const authId = generateSecureId();
      this.pendingAuthorizations.set(authId, {
        clientId: query.client_id,
        redirectUri: query.redirect_uri,
        scope: query.scope,
        state: query.state,
        codeChallenge: query.code_challenge,
        codeChallengeMethod: query.code_challenge_method,
      });

      res.send(`
        <html>
          <head>
            <title>Authorization</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              .form-group { margin-bottom: 15px; }
              label { display: block; margin-bottom: 5px; }
              input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
              button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
              button:hover { background: #0056b3; }
              .error { color: red; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h2>Sign In</h2>
            <form method="POST" action="/auth/authorize">
              <input type="hidden" name="auth_id" value="${authId}">
              <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
              </div>
              <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
              </div>
              <button type="submit">Sign In</button>
            </form>
          </body>
        </html>
      `);
    } catch (error) {
      next(error);
    }
  }

  private async handleAuthorizeSubmit(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const schema = z.object({
        auth_id: z.string(),
        email: z.string().email(),
        password: z.string(),
      });

      let body;
      try {
        body = schema.parse(req.body);
      } catch {
        res
          .status(400)
          .json({ error: 'invalid_request', error_description: 'Invalid request parameters' });
        return;
      }

      const pendingAuth = this.pendingAuthorizations.get(body.auth_id);
      if (!pendingAuth) {
        res.status(400).send('Invalid authorization request');
        return;
      }

      const user = await this.userStore.getUserByEmail(body.email);
      if (!user || !(await PasswordHasher.verifyPassword(body.password, user.passwordHash))) {
        res.status(401).send(`
          <html>
            <body>
              <h2>Invalid email or password</h2>
              <a href="javascript:history.back()">Go back</a>
            </body>
          </html>
        `);
        return;
      }

      if (!user.isActive) {
        res.status(403).send('User account is disabled');
        return;
      }

      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      await this.authCodeStore.createAuthorizationCode({
        code,
        clientId: pendingAuth.clientId,
        userId: user.id,
        redirectUri: pendingAuth.redirectUri,
        scopes: pendingAuth.scope?.split(' ') ?? [],
        codeChallenge: pendingAuth.codeChallenge,
        codeChallengeMethod: pendingAuth.codeChallengeMethod,
        expiresAt: new Date(Date.now() + this.options.authCodeTTL * 1000),
      });

      await this.userStore.updateUser(user.id, { lastLoginAt: new Date() });
      this.pendingAuthorizations.delete(body.auth_id);

      const redirectUrl = new URL(pendingAuth.redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (pendingAuth.state) {
        redirectUrl.searchParams.set('state', pendingAuth.state);
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      next(error);
    }
  }

  private async handleToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const grantType = req.body.grant_type;

      if (grantType === 'authorization_code') {
        await this.handleAuthorizationCodeGrant(req, res);
      } else if (grantType === 'refresh_token') {
        await this.handleRefreshTokenGrant(req, res);
      } else {
        res.status(400).json({ error: 'unsupported_grant_type' });
      }
    } catch (error) {
      next(error);
    }
  }

  private async validateClient(
    clientId: string,
    clientSecret: string | undefined,
    res: Response
  ): Promise<OAuthClient | null> {
    const client = await this.clientStore.getClientById(clientId);
    if (!client) {
      res.status(401).json({ error: 'invalid_client' });
      return null;
    }

    if (client.tokenEndpointAuthMethod !== 'none' && clientSecret) {
      const validCredentials = await this.clientStore.validateClientCredentials(
        clientId,
        clientSecret
      );
      if (!validCredentials) {
        res.status(401).json({ error: 'invalid_client' });
        return null;
      }
    }

    return client;
  }

  private async handleAuthorizationCodeGrant(req: Request, res: Response): Promise<void> {
    const schema = z.object({
      grant_type: z.literal('authorization_code'),
      code: z.string(),
      redirect_uri: z.string().url(),
      client_id: z.string(),
      client_secret: z.string().optional(),
      code_verifier: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const client = await this.validateClient(body.client_id, body.client_secret, res);
    if (!client) {
      return;
    }

    const authCode = await this.authCodeStore.getAuthorizationCode(body.code);
    if (!authCode) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    if (authCode.clientId !== body.client_id) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    if (authCode.redirectUri !== body.redirect_uri) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    if (authCode.codeChallenge && authCode.codeChallengeMethod) {
      if (!body.code_verifier) {
        res
          .status(400)
          .json({ error: 'invalid_request', error_description: 'code_verifier required' });
        return;
      }

      const pkceResult = PKCEValidator.validateCodeChallenge(
        body.code_verifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod
      );

      if (!pkceResult.valid) {
        res.status(400).json({ error: 'invalid_grant', error_description: pkceResult.error });
        return;
      }
    }

    await this.authCodeStore.deleteAuthorizationCode(body.code);

    const user = await this.userStore.getUserById(authCode.userId);
    if (!user) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    const accessToken = this.keyManager.signToken({
      sub: user.id,
      email: user.email,
      groups: user.groups,
      scope: authCode.scopes.join(' '),
      iss: this.options.issuer,
      aud: this.options.audience,
      exp: Math.floor(Date.now() / 1000) + this.options.accessTokenTTL,
      iat: Math.floor(Date.now() / 1000),
    });

    const refreshToken = InMemoryRefreshTokenStore.generateRefreshToken();
    await this.refreshTokenStore.createRefreshToken({
      token: refreshToken,
      clientId: authCode.clientId,
      userId: user.id,
      scopes: authCode.scopes,
      expiresAt: new Date(Date.now() + this.options.refreshTokenTTL * 1000),
    });

    const response: TokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.options.accessTokenTTL,
      refresh_token: refreshToken,
      scope: authCode.scopes.join(' '),
    };

    res.json(response);
  }

  private async handleRefreshTokenGrant(req: Request, res: Response): Promise<void> {
    const schema = z.object({
      grant_type: z.literal('refresh_token'),
      refresh_token: z.string(),
      client_id: z.string(),
      client_secret: z.string().optional(),
      scope: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const client = await this.validateClient(body.client_id, body.client_secret, res);
    if (!client) {
      return;
    }

    const refreshTokenData = await this.refreshTokenStore.getRefreshToken(body.refresh_token);
    if (!refreshTokenData || refreshTokenData.clientId !== body.client_id) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    const user = await this.userStore.getUserById(refreshTokenData.userId);
    if (!user?.isActive) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    const requestedScopes = body.scope?.split(' ') ?? refreshTokenData.scopes;
    const validScopes = requestedScopes.every((scope) => refreshTokenData.scopes.includes(scope));
    if (!validScopes) {
      res.status(400).json({ error: 'invalid_scope' });
      return;
    }

    const newRefreshToken = InMemoryRefreshTokenStore.generateRefreshToken();
    await this.refreshTokenStore.rotateRefreshToken(body.refresh_token, newRefreshToken);

    const accessToken = this.keyManager.signToken({
      sub: user.id,
      email: user.email,
      groups: user.groups,
      scope: requestedScopes.join(' '),
      iss: this.options.issuer,
      aud: this.options.audience,
      exp: Math.floor(Date.now() / 1000) + this.options.accessTokenTTL,
      iat: Math.floor(Date.now() / 1000),
    });

    const response: TokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.options.accessTokenTTL,
      refresh_token: newRefreshToken,
      scope: requestedScopes.join(' '),
    };

    res.json(response);
  }

  private async handleRevoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        token: z.string(),
        token_type_hint: z.enum(['refresh_token', 'access_token']).optional(),
      });

      const body = schema.parse(req.body);

      await this.refreshTokenStore.revokeRefreshToken(body.token);

      res.status(200).end();
    } catch (error) {
      next(error);
    }
  }

  private async handleJWKS(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jwks = this.keyManager.getJWKS();
      res.json(jwks);
    } catch (error) {
      next(error);
    }
  }

  private async handleCreateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        groups: z.array(z.string()).optional(),
      });

      let body;
      try {
        body = schema.parse(req.body);
      } catch {
        res
          .status(400)
          .json({ error: 'invalid_request', error_description: 'Invalid request parameters' });
        return;
      }

      const passwordHash = await PasswordHasher.hashPassword(body.password);
      const user = await this.userStore.createUser({
        email: body.email,
        passwordHash,
        groups: body.groups ?? [],
        apiKeys: [],
        isActive: true,
      });

      res.json({
        id: user.id,
        email: user.email,
        groups: user.groups,
        createdAt: user.createdAt,
      });
    } catch (error) {
      next(error);
    }
  }

  private async handleListUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userStore.listUsers();
      res.json(
        users.map((u) => ({
          id: u.id,
          email: u.email,
          groups: u.groups,
          isActive: u.isActive,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
        }))
      );
    } catch (error) {
      next(error);
    }
  }

  private async handleDeleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.userStore.deleteUser(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  private async handleCreateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schema = z.object({
        name: z.string(),
        scopes: z.array(z.string()).optional(),
        expiresAt: z.string().datetime().optional(),
      });

      const body = schema.parse(req.body);
      const apiKey = ApiKeyGenerator.generateApiKey();
      const keyHash = await ApiKeyGenerator.hashApiKey(apiKey);

      const created = await this.userStore.createApiKey(req.params.id, {
        name: body.name,
        keyHash,
        scopes: body.scopes ?? [],
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });

      res.json({
        id: created.id,
        name: created.name,
        apiKey,
        scopes: created.scopes,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      });
    } catch (error) {
      next(error);
    }
  }

  async authenticateApiKey(apiKey: string): Promise<User | null> {
    const keyHash = await ApiKeyGenerator.hashApiKey(apiKey);
    const user = await this.userStore.getUserByApiKeyHash(keyHash);

    if (!user) {
      return null;
    }

    // Find the specific API key to check expiration
    const apiKeyRecord = user.apiKeys.find((key) => key.keyHash === keyHash);
    if (!apiKeyRecord) {
      return null;
    }

    if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
      return null;
    }

    await this.userStore.updateApiKeyLastUsed(apiKeyRecord.id);
    return user;
  }

  async createDefaultAdminUser(): Promise<{ email: string; password: string }> {
    const email = 'admin@example.com';
    const password = generateSecureToken(16);
    const passwordHash = await PasswordHasher.hashPassword(password);

    await this.userStore.createUser({
      email,
      passwordHash,
      groups: ['admin'],
      apiKeys: [],
      isActive: true,
    });

    return { email, password };
  }

  destroy(): void {
    this.authCodeStore.destroy();
    this.refreshTokenStore.destroy();
  }
}

interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
}
