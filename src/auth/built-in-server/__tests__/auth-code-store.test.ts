import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InMemoryAuthorizationCodeStore, InMemoryRefreshTokenStore } from '../auth-code-store.js';

describe('InMemoryAuthorizationCodeStore', () => {
  let authCodeStore: InMemoryAuthorizationCodeStore;

  beforeEach(() => {
    authCodeStore = new InMemoryAuthorizationCodeStore();
  });

  afterEach(() => {
    authCodeStore.destroy();
  });

  describe('createAuthorizationCode', () => {
    it('should create authorization code', async () => {
      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      const codeData = {
        code,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read', 'write'],
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
      };

      await authCodeStore.createAuthorizationCode(codeData);

      const retrieved = await authCodeStore.getAuthorizationCode(code);
      expect(retrieved).toBeDefined();
      expect(retrieved?.code).toBe(code);
      expect(retrieved?.clientId).toBe('test-client');
      expect(retrieved?.userId).toBe('user123');
      expect(retrieved?.createdAt).toBeInstanceOf(Date);
    });

    it('should create authorization code with PKCE parameters', async () => {
      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      const codeData = {
        code,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read'],
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        codeChallengeMethod: 'S256' as const,
        expiresAt: new Date(Date.now() + 600000),
      };

      await authCodeStore.createAuthorizationCode(codeData);

      const retrieved = await authCodeStore.getAuthorizationCode(code);
      expect(retrieved?.codeChallenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
      expect(retrieved?.codeChallengeMethod).toBe('S256');
    });
  });

  describe('getAuthorizationCode', () => {
    it('should retrieve valid authorization code', async () => {
      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      await authCodeStore.createAuthorizationCode({
        code,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read'],
        expiresAt: new Date(Date.now() + 600000),
      });

      const retrieved = await authCodeStore.getAuthorizationCode(code);

      expect(retrieved).toBeDefined();
      expect(retrieved?.code).toBe(code);
    });

    it('should return null for non-existent code', async () => {
      const retrieved = await authCodeStore.getAuthorizationCode('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should return null for expired code', async () => {
      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      await authCodeStore.createAuthorizationCode({
        code,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read'],
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      const retrieved = await authCodeStore.getAuthorizationCode(code);

      expect(retrieved).toBeNull();
    });
  });

  describe('deleteAuthorizationCode', () => {
    it('should delete authorization code', async () => {
      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      await authCodeStore.createAuthorizationCode({
        code,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read'],
        expiresAt: new Date(Date.now() + 600000),
      });

      await authCodeStore.deleteAuthorizationCode(code);

      const retrieved = await authCodeStore.getAuthorizationCode(code);
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteExpiredCodes', () => {
    it('should delete expired codes', async () => {
      const validCode = InMemoryAuthorizationCodeStore.generateAuthorizationCode();
      const expiredCode = InMemoryAuthorizationCodeStore.generateAuthorizationCode();

      await authCodeStore.createAuthorizationCode({
        code: validCode,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read'],
        expiresAt: new Date(Date.now() + 600000),
      });

      await authCodeStore.createAuthorizationCode({
        code: expiredCode,
        clientId: 'test-client',
        userId: 'user123',
        redirectUri: 'https://example.com/callback',
        scopes: ['read'],
        expiresAt: new Date(Date.now() - 1000),
      });

      await authCodeStore.deleteExpiredCodes();

      const validRetrieved = await authCodeStore.getAuthorizationCode(validCode);
      const expiredRetrieved = await authCodeStore.getAuthorizationCode(expiredCode);

      expect(validRetrieved).toBeDefined();
      expect(expiredRetrieved).toBeNull();
    });
  });

  describe('generateAuthorizationCode', () => {
    it('should generate URL-safe authorization codes', () => {
      const code = InMemoryAuthorizationCodeStore.generateAuthorizationCode();

      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(0);
      expect(/^[A-Za-z0-9_-]+$/.test(code)).toBe(true);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(InMemoryAuthorizationCodeStore.generateAuthorizationCode());
      }

      expect(codes.size).toBe(100);
    });
  });
});

describe('InMemoryRefreshTokenStore', () => {
  let refreshTokenStore: InMemoryRefreshTokenStore;

  beforeEach(() => {
    refreshTokenStore = new InMemoryRefreshTokenStore();
  });

  afterEach(() => {
    refreshTokenStore.destroy();
  });

  describe('createRefreshToken', () => {
    it('should create refresh token', async () => {
      const token = InMemoryRefreshTokenStore.generateRefreshToken();
      const tokenData = {
        token,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read', 'write'],
        expiresAt: new Date(Date.now() + 2592000000), // 30 days
      };

      await refreshTokenStore.createRefreshToken(tokenData);

      const retrieved = await refreshTokenStore.getRefreshToken(token);
      expect(retrieved).toBeDefined();
      expect(retrieved?.token).toBe(token);
      expect(retrieved?.clientId).toBe('test-client');
      expect(retrieved?.userId).toBe('user123');
      expect(retrieved?.scopes).toEqual(['read', 'write']);
      expect(retrieved?.createdAt).toBeInstanceOf(Date);
    });

    it('should create refresh token without expiration', async () => {
      const token = InMemoryRefreshTokenStore.generateRefreshToken();
      const tokenData = {
        token,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
      };

      await refreshTokenStore.createRefreshToken(tokenData);

      const retrieved = await refreshTokenStore.getRefreshToken(token);
      expect(retrieved?.expiresAt).toBeUndefined();
    });
  });

  describe('getRefreshToken', () => {
    it('should retrieve valid refresh token', async () => {
      const token = InMemoryRefreshTokenStore.generateRefreshToken();
      await refreshTokenStore.createRefreshToken({
        token,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
      });

      const retrieved = await refreshTokenStore.getRefreshToken(token);

      expect(retrieved).toBeDefined();
      expect(retrieved?.token).toBe(token);
    });

    it('should return null for non-existent token', async () => {
      const retrieved = await refreshTokenStore.getRefreshToken('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should return null for expired token', async () => {
      const token = InMemoryRefreshTokenStore.generateRefreshToken();
      await refreshTokenStore.createRefreshToken({
        token,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      const retrieved = await refreshTokenStore.getRefreshToken(token);

      expect(retrieved).toBeNull();
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate refresh token', async () => {
      const oldToken = InMemoryRefreshTokenStore.generateRefreshToken();
      const newToken = InMemoryRefreshTokenStore.generateRefreshToken();

      await refreshTokenStore.createRefreshToken({
        token: oldToken,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read', 'write'],
      });

      await refreshTokenStore.rotateRefreshToken(oldToken, newToken);

      const oldRetrieved = await refreshTokenStore.getRefreshToken(oldToken);
      const newRetrieved = await refreshTokenStore.getRefreshToken(newToken);

      expect(oldRetrieved).toBeNull();
      expect(newRetrieved).toBeDefined();
      expect(newRetrieved?.rotatedFrom).toBe(oldToken);
      expect(newRetrieved?.clientId).toBe('test-client');
      expect(newRetrieved?.userId).toBe('user123');
      expect(newRetrieved?.scopes).toEqual(['read', 'write']);
    });

    it('should throw error for non-existent token', async () => {
      await expect(
        refreshTokenStore.rotateRefreshToken('non-existent', 'new-token')
      ).rejects.toThrow('Refresh token not found');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token', async () => {
      const token = InMemoryRefreshTokenStore.generateRefreshToken();
      await refreshTokenStore.createRefreshToken({
        token,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
      });

      await refreshTokenStore.revokeRefreshToken(token);

      const retrieved = await refreshTokenStore.getRefreshToken(token);
      expect(retrieved).toBeNull();
    });

    it('should handle revoking non-existent token gracefully', async () => {
      await expect(refreshTokenStore.revokeRefreshToken('non-existent')).resolves.not.toThrow();
    });
  });

  describe('revokeUserRefreshTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const token1 = InMemoryRefreshTokenStore.generateRefreshToken();
      const token2 = InMemoryRefreshTokenStore.generateRefreshToken();
      const otherUserToken = InMemoryRefreshTokenStore.generateRefreshToken();

      await refreshTokenStore.createRefreshToken({
        token: token1,
        clientId: 'client1',
        userId: 'user123',
        scopes: ['read'],
      });

      await refreshTokenStore.createRefreshToken({
        token: token2,
        clientId: 'client2',
        userId: 'user123',
        scopes: ['write'],
      });

      await refreshTokenStore.createRefreshToken({
        token: otherUserToken,
        clientId: 'client1',
        userId: 'otherUser',
        scopes: ['read'],
      });

      await refreshTokenStore.revokeUserRefreshTokens('user123');

      const retrieved1 = await refreshTokenStore.getRefreshToken(token1);
      const retrieved2 = await refreshTokenStore.getRefreshToken(token2);
      const retrievedOther = await refreshTokenStore.getRefreshToken(otherUserToken);

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
      expect(retrievedOther).toBeDefined();
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const validToken = InMemoryRefreshTokenStore.generateRefreshToken();
      const expiredToken = InMemoryRefreshTokenStore.generateRefreshToken();
      const noExpiryToken = InMemoryRefreshTokenStore.generateRefreshToken();

      await refreshTokenStore.createRefreshToken({
        token: validToken,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      });

      await refreshTokenStore.createRefreshToken({
        token: expiredToken,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await refreshTokenStore.createRefreshToken({
        token: noExpiryToken,
        clientId: 'test-client',
        userId: 'user123',
        scopes: ['read'],
        // No expiration
      });

      await refreshTokenStore.deleteExpiredTokens();

      const validRetrieved = await refreshTokenStore.getRefreshToken(validToken);
      const expiredRetrieved = await refreshTokenStore.getRefreshToken(expiredToken);
      const noExpiryRetrieved = await refreshTokenStore.getRefreshToken(noExpiryToken);

      expect(validRetrieved).toBeDefined();
      expect(expiredRetrieved).toBeNull();
      expect(noExpiryRetrieved).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate URL-safe refresh tokens', () => {
      const token = InMemoryRefreshTokenStore.generateRefreshToken();

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(InMemoryRefreshTokenStore.generateRefreshToken());
      }

      expect(tokens.size).toBe(100);
    });
  });
});
