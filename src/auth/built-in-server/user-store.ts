import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { generateSecureToken } from './utils.js';
import type { User, ApiKey, UserStore as IUserStore } from './types.js';

const SALT_ROUNDS = 12;

export class InMemoryUserStore implements IUserStore {
  private readonly users = new Map<string, User>();
  private readonly emailIndex = new Map<string, string>();
  private readonly apiKeyIndex = new Map<string, { userId: string; apiKey: ApiKey }>();

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (await this.getUserByEmail(userData.email)) {
      throw new Error('User with this email already exists');
    }

    const user: User = {
      ...userData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) ?? null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      ...updates,
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    };

    if (updates.email && updates.email !== user.email) {
      this.emailIndex.delete(user.email.toLowerCase());
      this.emailIndex.set(updates.email.toLowerCase(), id);
    }

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    this.users.delete(id);
    this.emailIndex.delete(user.email.toLowerCase());

    for (const [keyHash, data] of this.apiKeyIndex.entries()) {
      if (data.userId === id) {
        this.apiKeyIndex.delete(keyHash);
      }
    }
  }

  async listUsers(options?: { limit?: number; offset?: number }): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    return allUsers.slice(offset, offset + limit);
  }

  async createApiKey(
    userId: string,
    apiKeyData: Omit<ApiKey, 'id' | 'createdAt'>
  ): Promise<ApiKey> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const apiKey: ApiKey = {
      ...apiKeyData,
      id: uuidv4(),
      createdAt: new Date(),
    };

    user.apiKeys.push(apiKey);
    this.users.set(userId, { ...user, updatedAt: new Date() });
    this.apiKeyIndex.set(apiKeyData.keyHash, { userId, apiKey });

    return apiKey;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    const data = this.apiKeyIndex.get(keyHash);
    return data?.apiKey ?? null;
  }

  async deleteApiKey(userId: string, apiKeyId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const apiKeyIndex = user.apiKeys.findIndex((key) => key.id === apiKeyId);
    if (apiKeyIndex === -1) {
      throw new Error('API key not found');
    }

    user.apiKeys.splice(apiKeyIndex, 1);
    this.users.set(userId, { ...user, updatedAt: new Date() });

    // Remove from index using the key hash
    for (const [hash, data] of this.apiKeyIndex.entries()) {
      if (data.apiKey.id === apiKeyId) {
        this.apiKeyIndex.delete(hash);
        break;
      }
    }
  }

  async updateApiKeyLastUsed(apiKeyId: string): Promise<void> {
    for (const [, data] of this.apiKeyIndex.entries()) {
      if (data.apiKey.id === apiKeyId) {
        data.apiKey.lastUsedAt = new Date();
        const user = this.users.get(data.userId);
        if (user) {
          const keyIndex = user.apiKeys.findIndex((k) => k.id === apiKeyId);
          if (keyIndex !== -1) {
            user.apiKeys[keyIndex].lastUsedAt = new Date();
            this.users.set(data.userId, { ...user, updatedAt: new Date() });
          }
        }
        break;
      }
    }
  }

  async getUserByApiKeyHash(keyHash: string): Promise<User | null> {
    const data = this.apiKeyIndex.get(keyHash);
    if (!data) return null;
    return this.users.get(data.userId) ?? null;
  }
}

export class PasswordHasher {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export class ApiKeyGenerator {
  static generateApiKey(): string {
    return generateSecureToken();
  }

  static async hashApiKey(apiKey: string): Promise<string> {
    // Use SHA256 for deterministic hashing of API keys
    return createHash('sha256').update(apiKey).digest('hex');
  }

  static async verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashApiKey(apiKey);
    return computedHash === hash;
  }
}
