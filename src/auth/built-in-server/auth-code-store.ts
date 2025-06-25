import { randomBytes } from 'crypto';
import type {
  AuthorizationCode,
  AuthorizationCodeStore as IAuthorizationCodeStore,
  RefreshToken,
  RefreshTokenStore as IRefreshTokenStore,
} from './types.js';

export class InMemoryAuthorizationCodeStore implements IAuthorizationCodeStore {
  private codes = new Map<string, AuthorizationCode>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.deleteExpiredCodes();
    }, 60 * 1000);
  }

  async createAuthorizationCode(codeData: Omit<AuthorizationCode, 'createdAt'>): Promise<void> {
    const code: AuthorizationCode = {
      ...codeData,
      createdAt: new Date(),
    };
    this.codes.set(code.code, code);
  }

  async getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
    const authCode = this.codes.get(code);
    if (!authCode) return null;

    if (new Date() > authCode.expiresAt) {
      this.codes.delete(code);
      return null;
    }

    return authCode;
  }

  async deleteAuthorizationCode(code: string): Promise<void> {
    this.codes.delete(code);
  }

  async deleteExpiredCodes(): Promise<void> {
    const now = new Date();
    for (const [code, authCode] of this.codes.entries()) {
      if (now > authCode.expiresAt) {
        this.codes.delete(code);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  static generateAuthorizationCode(): string {
    return randomBytes(32).toString('base64url');
  }
}

export class InMemoryRefreshTokenStore implements IRefreshTokenStore {
  private tokens = new Map<string, RefreshToken>();
  private userTokens = new Map<string, Set<string>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => {
        this.deleteExpiredTokens();
      },
      60 * 60 * 1000
    );
  }

  async createRefreshToken(tokenData: Omit<RefreshToken, 'createdAt'>): Promise<void> {
    const token: RefreshToken = {
      ...tokenData,
      createdAt: new Date(),
    };
    this.tokens.set(token.token, token);

    if (!this.userTokens.has(token.userId)) {
      this.userTokens.set(token.userId, new Set());
    }
    this.userTokens.get(token.userId)!.add(token.token);
  }

  async getRefreshToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = this.tokens.get(token);
    if (!refreshToken) return null;

    if (refreshToken.expiresAt && new Date() > refreshToken.expiresAt) {
      await this.revokeRefreshToken(token);
      return null;
    }

    return refreshToken;
  }

  async rotateRefreshToken(oldToken: string, newToken: string): Promise<void> {
    const refreshToken = await this.getRefreshToken(oldToken);
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    await this.createRefreshToken({
      ...refreshToken,
      token: newToken,
      rotatedFrom: oldToken,
    });

    await this.revokeRefreshToken(oldToken);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const refreshToken = this.tokens.get(token);
    if (refreshToken) {
      this.tokens.delete(token);
      const userTokens = this.userTokens.get(refreshToken.userId);
      if (userTokens) {
        userTokens.delete(token);
        if (userTokens.size === 0) {
          this.userTokens.delete(refreshToken.userId);
        }
      }
    }
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    const userTokens = this.userTokens.get(userId);
    if (userTokens) {
      for (const token of userTokens) {
        this.tokens.delete(token);
      }
      this.userTokens.delete(userId);
    }
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    for (const [token, refreshToken] of this.tokens.entries()) {
      if (refreshToken.expiresAt && now > refreshToken.expiresAt) {
        await this.revokeRefreshToken(token);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  static generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }
}
