export interface User {
  id: string;
  email: string;
  passwordHash: string;
  groups: string[];
  apiKeys: ApiKey[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface OAuthClient {
  clientId: string;
  clientSecretHash?: string;
  clientName: string;
  redirectUris: string[];
  grantTypes: string[];
  scopes: string[];
  tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post' | 'none';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
  expiresAt: Date;
  createdAt: Date;
}

export interface RefreshToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt?: Date;
  createdAt: Date;
  rotatedFrom?: string;
}

export interface UserStore {
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  listUsers(options?: { limit?: number; offset?: number }): Promise<User[]>;

  createApiKey(userId: string, apiKey: Omit<ApiKey, 'id' | 'createdAt'>): Promise<ApiKey>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | null>;
  deleteApiKey(userId: string, apiKeyId: string): Promise<void>;
  updateApiKeyLastUsed(apiKeyId: string): Promise<void>;
}

export interface ClientStore {
  createClient(client: Omit<OAuthClient, 'createdAt' | 'updatedAt'>): Promise<OAuthClient>;
  getClientById(clientId: string): Promise<OAuthClient | null>;
  updateClient(clientId: string, updates: Partial<OAuthClient>): Promise<OAuthClient>;
  deleteClient(clientId: string): Promise<void>;
  listClients(options?: { limit?: number; offset?: number }): Promise<OAuthClient[]>;
}

export interface AuthorizationCodeStore {
  createAuthorizationCode(code: Omit<AuthorizationCode, 'createdAt'>): Promise<void>;
  getAuthorizationCode(code: string): Promise<AuthorizationCode | null>;
  deleteAuthorizationCode(code: string): Promise<void>;
  deleteExpiredCodes(): Promise<void>;
}

export interface RefreshTokenStore {
  createRefreshToken(token: Omit<RefreshToken, 'createdAt'>): Promise<void>;
  getRefreshToken(token: string): Promise<RefreshToken | null>;
  rotateRefreshToken(oldToken: string, newToken: string): Promise<void>;
  revokeRefreshToken(token: string): Promise<void>;
  revokeUserRefreshTokens(userId: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}

export interface TokenValidationResult {
  valid: boolean;
  claims?: Record<string, unknown>;
  error?: string;
}

export interface PKCEValidationResult {
  valid: boolean;
  error?: string;
}
