import { jest } from '@jest/globals';
import { CredentialStore } from '../credential-store.js';
import type { CredentialStoreInternal } from './test-helpers.js';

// Create mock functions
const mockExistsSync = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockChmod = jest.fn();

// Mock fs module
jest.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    chmod: mockChmod,
  },
}));

describe('CredentialStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock return values
    mockExistsSync.mockReturnValue(false);
    mockReadFile.mockResolvedValue('{}');
    mockWriteFile.mockResolvedValue(undefined);
    mockChmod.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should initialize without encryption when no master password provided', () => {
      const store = new CredentialStore();
      expect(store).toBeDefined();
      // Store should work without encryption
      store.setCredential('test', 'value');
      expect(store.getCredential('test')).toBe('value');
    });

    it('should derive encryption key when master password provided', () => {
      const store = new CredentialStore({
        masterPassword: 'test-password',
        useEncryption: true,
      });
      expect(store).toBeDefined();
    });

    it('should load existing credentials from file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          encrypted: false,
          credentials: { 'test-id': 'test-token' },
        })
      );

      new CredentialStore({ storagePath: '/test/path' });

      expect(mockExistsSync).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('setCredential and getCredential', () => {
    it('should store and retrieve credentials without encryption', () => {
      const store = new CredentialStore();

      store.setCredential('test-id', 'test-token');
      expect(store.getCredential('test-id')).toBe('test-token');
    });

    it('should store and retrieve credentials with encryption', () => {
      const store = new CredentialStore({
        masterPassword: 'test-password',
        useEncryption: true,
      });

      store.setCredential('test-id', 'test-token');
      const retrieved = store.getCredential('test-id');

      expect(retrieved).toBe('test-token');
    });

    it('should return undefined for non-existent credential', () => {
      const store = new CredentialStore();
      expect(store.getCredential('non-existent')).toBeUndefined();
    });

    it('should return undefined when getting credential without encryption key', () => {
      const store = new CredentialStore({ useEncryption: true });
      // Manually set an encrypted credential string
      const encryptedData = JSON.stringify({
        algorithm: 'aes-256-gcm',
        iv: 'abcdef1234567890',
        data: 'encrypted:authTag',
      });
      (store as unknown as CredentialStoreInternal).credentials.set('test-id', encryptedData);

      // Should return undefined because decryption will fail without key
      expect(store.getCredential('test-id')).toBeUndefined();
    });
  });

  describe('hasCredential', () => {
    it('should return true for existing credential', () => {
      const store = new CredentialStore();
      store.setCredential('test-id', 'test-token');
      expect(store.hasCredential('test-id')).toBe(true);
    });

    it('should return false for non-existent credential', () => {
      const store = new CredentialStore();
      expect(store.hasCredential('non-existent')).toBe(false);
    });
  });

  describe('removeCredential', () => {
    it('should remove credential', () => {
      const store = new CredentialStore();
      store.setCredential('test-id', 'test-token');

      store.removeCredential('test-id');
      expect(store.hasCredential('test-id')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should remove all credentials', () => {
      const store = new CredentialStore();
      store.setCredential('id1', 'token1');
      store.setCredential('id2', 'token2');

      store.clearAll();
      expect(store.hasCredential('id1')).toBe(false);
      expect(store.hasCredential('id2')).toBe(false);
    });
  });

  describe('rotateMasterPassword', () => {
    it('should re-encrypt all credentials with new password', () => {
      const store = new CredentialStore({
        masterPassword: 'old-password',
        useEncryption: true,
      });

      // Add some credentials
      store.setCredential('test-id1', 'test-token1');
      store.setCredential('test-id2', 'test-token2');

      // Rotate password
      store.rotateMasterPassword('new-password');

      // Should still be able to retrieve credentials
      expect(store.getCredential('test-id1')).toBe('test-token1');
      expect(store.getCredential('test-id2')).toBe('test-token2');
    });

    it('should throw error when rotating without encryption enabled', () => {
      const store = new CredentialStore();
      expect(() => store.rotateMasterPassword('new-password')).toThrow(
        'Cannot rotate password when encryption is disabled'
      );
    });
  });

  describe('saveToFile and loadFromFile', () => {
    it('should save credentials to file', async () => {
      const store = new CredentialStore({ storagePath: '/test/path' });
      store.setCredential('test-id', 'test-token');

      await store.saveToFile();

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/path',
        expect.stringContaining('"test-id":"test-token"'),
        'utf8'
      );
      expect(mockChmod).toHaveBeenCalledWith('/test/path', 0o600);
    });

    it('should handle save errors gracefully', async () => {
      const store = new CredentialStore({ storagePath: '/test/path' });
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      // Should not throw
      await expect(store.saveToFile()).resolves.toBeUndefined();
    });

    it('should load credentials from file', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          encrypted: false,
          credentials: { 'test-id': 'test-token' },
        })
      );

      const store = new CredentialStore({ storagePath: '/test/path' });
      await (store as unknown as CredentialStoreInternal).loadFromFile();

      expect(store.getCredential('test-id')).toBe('test-token');
    });

    it('should handle incompatible file versions', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          version: 2,
          encrypted: false,
          credentials: {},
        })
      );

      const store = new CredentialStore({ storagePath: '/test/path' });
      await (store as unknown as CredentialStoreInternal).loadFromFile();

      // Should log warning but not throw
      expect(store.hasCredential('test-id')).toBe(false);
    });

    it('should handle encryption mismatch', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          encrypted: true,
          credentials: { 'test-id': { encrypted: true, data: {} } },
        })
      );

      const store = new CredentialStore({ storagePath: '/test/path', useEncryption: false });
      await (store as unknown as CredentialStoreInternal).loadFromFile();

      // Should log error but not throw
      expect(store.hasCredential('test-id')).toBe(false);
    });

    it('should load encrypted credentials with matching encryption', async () => {
      // First create and save encrypted credentials
      const store1 = new CredentialStore({
        storagePath: '/test/path',
        masterPassword: 'test-password',
        useEncryption: true,
      });
      store1.setCredential('test-id', 'test-token');

      // Get the saved data
      let savedData: string = '';
      mockWriteFile.mockImplementation((path, data) => {
        savedData = data as string;
        return Promise.resolve();
      });

      await store1.saveToFile();

      // Now load with same password
      mockReadFile.mockResolvedValue(savedData);
      const store2 = new CredentialStore({
        storagePath: '/test/path',
        masterPassword: 'test-password',
        useEncryption: true,
      });

      // Force reload
      await (store2 as unknown as CredentialStoreInternal).loadFromFile();

      expect(store2.getCredential('test-id')).toBe('test-token');
    });
  });

  describe('error handling', () => {
    it('should handle invalid encrypted data gracefully', () => {
      const store = new CredentialStore({
        masterPassword: 'test-password',
        useEncryption: true,
      });

      // Manually set invalid encrypted credential
      (store as unknown as CredentialStoreInternal).credentials.set('test-id', {
        encrypted: true,
        data: {
          iv: 'invalid-base64!@#',
          authTag: 'invalid-base64!@#',
          encrypted: 'invalid-base64!@#',
        },
      });

      expect(() => store.getCredential('test-id')).toThrow('Failed to decrypt credential');
    });

    it('should handle missing data fields in encrypted credential', () => {
      const store = new CredentialStore({
        masterPassword: 'test-password',
        useEncryption: true,
      });

      // Set credential with missing fields
      (store as unknown as CredentialStoreInternal).credentials.set('test-id', {
        encrypted: true,
        data: {},
      });

      expect(() => store.getCredential('test-id')).toThrow('Failed to decrypt credential');
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed encrypted and unencrypted credentials', () => {
      const store = new CredentialStore();

      // Add unencrypted
      store.setCredential('plain-id', 'plain-token');

      // Enable encryption and add encrypted
      const storeInternal = store as unknown as CredentialStoreInternal;
      storeInternal.options.useEncryption = true;
      storeInternal.options.masterPassword = 'password';
      storeInternal.encryptionKey = storeInternal.deriveKey('password');

      store.setCredential('encrypted-id', 'encrypted-token');

      // Should retrieve both
      expect(store.getCredential('plain-id')).toBe('plain-token');
      expect(store.getCredential('encrypted-id')).toBe('encrypted-token');
    });

    it('should maintain credentials through multiple operations', () => {
      const store = new CredentialStore({
        masterPassword: 'password',
        useEncryption: true,
      });

      // Add multiple credentials
      for (let i = 0; i < 10; i++) {
        store.setCredential(`id-${i}`, `token-${i}`);
      }

      // Remove some
      store.removeCredential('id-3');
      store.removeCredential('id-7');

      // Update some
      store.setCredential('id-1', 'updated-token-1');
      store.setCredential('id-5', 'updated-token-5');

      // Verify state
      expect(store.hasCredential('id-3')).toBe(false);
      expect(store.hasCredential('id-7')).toBe(false);
      expect(store.getCredential('id-1')).toBe('updated-token-1');
      expect(store.getCredential('id-5')).toBe('updated-token-5');
      expect(store.getCredential('id-9')).toBe('token-9');
    });
  });
});
