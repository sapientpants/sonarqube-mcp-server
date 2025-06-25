import { describe, it, expect, beforeEach } from '@jest/globals';
import { InMemoryUserStore, PasswordHasher, ApiKeyGenerator } from '../user-store.js';
import type { User } from '../types.js';

describe('InMemoryUserStore', () => {
  let userStore: InMemoryUserStore;

  beforeEach(() => {
    userStore = new InMemoryUserStore();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const userData = {
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      };

      const user = await userStore.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe(passwordHash);
      expect(user.groups).toEqual(['users']);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if email already exists', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const userData = {
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      };

      await userStore.createUser(userData);

      await expect(userStore.createUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should be case-insensitive for email', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const userData = {
        email: 'Test@Example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      };

      await userStore.createUser(userData);

      const lowerCaseData = { ...userData, email: 'test@example.com' };
      await expect(userStore.createUser(lowerCaseData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const createdUser = await userStore.createUser({
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });

      const retrieved = await userStore.getUserById(createdUser.id);

      expect(retrieved).toEqual(createdUser);
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await userStore.getUserById('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve user by email', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const createdUser = await userStore.createUser({
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });

      const retrieved = await userStore.getUserByEmail('test@example.com');

      expect(retrieved).toEqual(createdUser);
    });

    it('should be case-insensitive', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const createdUser = await userStore.createUser({
        email: 'Test@Example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });

      const retrieved = await userStore.getUserByEmail('test@example.com');

      expect(retrieved).toEqual(createdUser);
    });

    it('should return null for non-existent email', async () => {
      const retrieved = await userStore.getUserByEmail('non-existent@example.com');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const user = await userStore.createUser({
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await userStore.updateUser(user.id, {
        groups: ['users', 'admin'],
        lastLoginAt: new Date(),
      });

      expect(updated.groups).toEqual(['users', 'admin']);
      expect(updated.lastLoginAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('should update email and maintain index', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const user = await userStore.createUser({
        email: 'old@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });

      await userStore.updateUser(user.id, {
        email: 'new@example.com',
      });

      const oldEmail = await userStore.getUserByEmail('old@example.com');
      const newEmail = await userStore.getUserByEmail('new@example.com');

      expect(oldEmail).toBeNull();
      expect(newEmail?.email).toBe('new@example.com');
    });

    it('should throw error for non-existent user', async () => {
      await expect(userStore.updateUser('non-existent', { groups: ['admin'] })).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user and clean up indexes', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      const user = await userStore.createUser({
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });

      await userStore.deleteUser(user.id);

      const byId = await userStore.getUserById(user.id);
      const byEmail = await userStore.getUserByEmail('test@example.com');

      expect(byId).toBeNull();
      expect(byEmail).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(userStore.deleteUser('non-existent')).rejects.toThrow('User not found');
    });
  });

  describe('listUsers', () => {
    it('should list all users with pagination', async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');

      for (let i = 0; i < 5; i++) {
        await userStore.createUser({
          email: `user${i}@example.com`,
          passwordHash,
          groups: ['users'],
          apiKeys: [],
          isActive: true,
        });
      }

      const allUsers = await userStore.listUsers();
      expect(allUsers).toHaveLength(5);

      const page1 = await userStore.listUsers({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await userStore.listUsers({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await userStore.listUsers({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);
    });
  });

  describe('API Key management', () => {
    let user: User;

    beforeEach(async () => {
      const passwordHash = await PasswordHasher.hashPassword('test123');
      user = await userStore.createUser({
        email: 'test@example.com',
        passwordHash,
        groups: ['users'],
        apiKeys: [],
        isActive: true,
      });
    });

    it('should create API key for user', async () => {
      const apiKey = ApiKeyGenerator.generateApiKey();
      const keyHash = await ApiKeyGenerator.hashApiKey(apiKey);

      const created = await userStore.createApiKey(user.id, {
        name: 'Test Key',
        keyHash,
        scopes: ['read'],
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Key');
      expect(created.keyHash).toBe(keyHash);
      expect(created.scopes).toEqual(['read']);
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve API key by hash', async () => {
      const apiKey = ApiKeyGenerator.generateApiKey();
      const keyHash = await ApiKeyGenerator.hashApiKey(apiKey);

      const created = await userStore.createApiKey(user.id, {
        name: 'Test Key',
        keyHash,
        scopes: ['read'],
      });

      const retrieved = await userStore.getApiKeyByHash(keyHash);

      expect(retrieved).toEqual(created);
    });

    it('should delete API key', async () => {
      const apiKey = ApiKeyGenerator.generateApiKey();
      const keyHash = await ApiKeyGenerator.hashApiKey(apiKey);

      const created = await userStore.createApiKey(user.id, {
        name: 'Test Key',
        keyHash,
        scopes: ['read'],
      });

      await userStore.deleteApiKey(user.id, created.id);

      const retrieved = await userStore.getApiKeyByHash(keyHash);
      expect(retrieved).toBeNull();
    });

    it('should update API key last used time', async () => {
      const apiKey = ApiKeyGenerator.generateApiKey();
      const keyHash = await ApiKeyGenerator.hashApiKey(apiKey);

      const created = await userStore.createApiKey(user.id, {
        name: 'Test Key',
        keyHash,
        scopes: ['read'],
      });

      expect(created.lastUsedAt).toBeUndefined();

      await userStore.updateApiKeyLastUsed(created.id);

      const retrieved = await userStore.getApiKeyByHash(keyHash);
      expect(retrieved?.lastUsedAt).toBeInstanceOf(Date);
    });
  });
});

describe('PasswordHasher', () => {
  it('should hash and verify passwords correctly', async () => {
    const password = 'mySecretPassword123!';
    const hash = await PasswordHasher.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = await PasswordHasher.verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordHasher.verifyPassword('wrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'mySecretPassword123!';
    const hash1 = await PasswordHasher.hashPassword(password);
    const hash2 = await PasswordHasher.hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});

describe('ApiKeyGenerator', () => {
  it('should generate URL-safe API keys', () => {
    const apiKey = ApiKeyGenerator.generateApiKey();

    expect(apiKey).toBeDefined();
    expect(apiKey.length).toBeGreaterThan(0);
    expect(/^[A-Za-z0-9_-]+$/.test(apiKey)).toBe(true);
  });

  it('should generate unique API keys', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(ApiKeyGenerator.generateApiKey());
    }

    expect(keys.size).toBe(100);
  });

  it('should hash and verify API keys correctly', async () => {
    const apiKey = ApiKeyGenerator.generateApiKey();
    const hash = await ApiKeyGenerator.hashApiKey(apiKey);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(apiKey);

    const isValid = await ApiKeyGenerator.verifyApiKey(apiKey, hash);
    expect(isValid).toBe(true);

    const isInvalid = await ApiKeyGenerator.verifyApiKey('wrongKey', hash);
    expect(isInvalid).toBe(false);
  });
});
