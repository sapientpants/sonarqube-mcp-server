import { jest } from '@jest/globals';
import { CredentialStore } from '../credential-store.js';
import type { CredentialStoreInternal } from './test-helpers.js';

// Manually mock the fs module
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    chmod: jest.fn(),
  },
}));

// Mock the path module
jest.unstable_mockModule('path', () => ({
  dirname: jest.fn().mockImplementation((p: string) => {
    const lastSlash = p.lastIndexOf('/');
    return lastSlash === -1 ? '.' : p.slice(0, lastSlash);
  }),
}));

// Import the mocked module after mocking
const { existsSync, readFileSync, writeFileSync, mkdirSync, promises: fs } = await import('fs');
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
const mockChmod = fs.chmod as jest.MockedFunction<typeof fs.chmod>;

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
      mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-id': 'test-token' }));

      const store = new CredentialStore({ storagePath: '/test/path' });

      expect(mockExistsSync).toHaveBeenCalledWith('/test/path');
      expect(mockReadFileSync).toHaveBeenCalledWith('/test/path', 'utf8');
      expect(store.getCredential('test-id')).toBe('test-token');
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
    it('should save credentials to file', () => {
      mockExistsSync.mockReturnValue(false); // Directory doesn't exist
      const store = new CredentialStore({ storagePath: '/test/path/creds.json' });
      store.setCredential('test-id', 'test-token');

      // setCredential triggers saveToFile automatically when storagePath is set
      expect(mockExistsSync).toHaveBeenCalledWith('/test/path');
      expect(mockMkdirSync).toHaveBeenCalledWith('/test/path', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/test/path/creds.json',
        expect.stringContaining('"test-id": "test-token"'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('should handle save errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const store = new CredentialStore({ storagePath: '/test/path' });
      // Should not throw when setCredential tries to save
      expect(() => store.setCredential('test', 'value')).not.toThrow();
    });

    it('should load credentials from file', () => {
      // The loadFromFile is called from constructor if file exists
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-id': 'test-token' }));

      const store = new CredentialStore({ storagePath: '/test/path' });

      expect(store.getCredential('test-id')).toBe('test-token');
    });

    it('should handle incompatible file versions', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 2,
          encrypted: false,
          credentials: {},
        })
      );

      // Should not throw even with incompatible file format
      const store = new CredentialStore({ storagePath: '/test/path' });

      // Store should be initialized (but possibly empty if format is incompatible)
      expect(store).toBeDefined();
    });

    it('should handle encryption mismatch', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          encrypted: true,
          credentials: { 'test-id': { encrypted: true, data: {} } },
        })
      );

      const store = new CredentialStore({ storagePath: '/test/path', useEncryption: false });

      // Should log error but not throw during construction
      expect(store).toBeDefined();
    });

    it('should load encrypted credentials with matching encryption', () => {
      // First store an encrypted credential
      mockExistsSync.mockReturnValue(false); // No existing file
      const store1 = new CredentialStore({
        storagePath: '/test/path',
        masterPassword: 'test-password',
        useEncryption: true,
      });
      store1.setCredential('test-id', 'test-token');

      // Get what was saved - find the last writeFileSync call
      const writeCall = mockWriteFileSync.mock.calls.find((call) => call[0] === '/test/path');
      expect(writeCall).toBeDefined();
      const savedData = writeCall![1] as string;

      // Clear mocks and set up for loading
      jest.clearAllMocks();
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(savedData);

      const store2 = new CredentialStore({
        storagePath: '/test/path',
        masterPassword: 'test-password',
        useEncryption: true,
      });

      expect(store2.getCredential('test-id')).toBe('test-token');
    });
  });

  describe('error handling', () => {
    it('should handle invalid encrypted data gracefully', () => {
      const store = new CredentialStore({
        masterPassword: 'test-password',
        useEncryption: true,
      });

      // Manually set invalid encrypted credential - should be a JSON string
      (store as unknown as CredentialStoreInternal).credentials.set(
        'test-id',
        JSON.stringify({
          iv: 'invalid-base64!@#',
          data: 'invalid-base64!@#:invalid',
          salt: 'invalid-base64!@#',
          algorithm: 'aes-256-gcm',
        })
      );

      // getCredential catches decryption errors and returns undefined
      expect(store.getCredential('test-id')).toBeUndefined();
    });

    it('should handle missing data fields in encrypted credential', () => {
      const store = new CredentialStore({
        masterPassword: 'test-password',
        useEncryption: true,
      });

      // Set credential with missing fields
      (store as unknown as CredentialStoreInternal).credentials.set(
        'test-id',
        JSON.stringify({
          encrypted: true,
          data: {},
        })
      );

      // getCredential catches errors and returns undefined
      expect(store.getCredential('test-id')).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed encrypted and unencrypted credentials', () => {
      // Start with no encryption
      const store = new CredentialStore({ useEncryption: false });

      // Add unencrypted
      store.setCredential('plain-id', 'plain-token');

      // Now create a new store with encryption and add encrypted credential
      const encStore = new CredentialStore({
        masterPassword: 'password',
        useEncryption: true,
      });

      // Copy the plain credential
      encStore.setCredential('plain-id', 'plain-token');
      // Add new encrypted credential
      encStore.setCredential('encrypted-id', 'encrypted-token');

      // Both should work
      expect(encStore.getCredential('plain-id')).toBe('plain-token');
      expect(encStore.getCredential('encrypted-id')).toBe('encrypted-token');
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
