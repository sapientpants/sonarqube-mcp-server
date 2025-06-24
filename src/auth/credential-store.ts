import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { createLogger } from '../utils/logger.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const logger = createLogger('CredentialStore');

/**
 * Encrypted credential data
 */
interface EncryptedCredential {
  /** Initialization vector for encryption */
  iv: string;
  /** Encrypted data */
  data: string;
  /** Salt used for key derivation */
  salt: string;
  /** Algorithm used for encryption */
  algorithm: string;
}

/**
 * Options for credential store
 */
export interface CredentialStoreOptions {
  /** Master password for encryption (required if using encryption) */
  masterPassword?: string;
  /** Path to store encrypted credentials */
  storagePath?: string;
  /** Encryption algorithm (default: aes-256-gcm) */
  algorithm?: string;
  /** Key derivation iterations (default: 100000) */
  iterations?: number;
  /** Whether to use encryption (default: true if masterPassword provided) */
  useEncryption?: boolean;
}

/**
 * Secure storage for service account credentials
 *
 * SECURITY NOTES:
 * - In production, use external secret management (HashiCorp Vault, AWS Secrets Manager, etc.)
 * - This implementation provides basic encryption for development/testing
 * - Never commit encrypted credentials to version control
 * - Use strong master passwords and rotate them regularly
 * - Consider using hardware security modules (HSM) for key storage
 */
export class CredentialStore {
  private readonly options: Required<CredentialStoreOptions>;
  private readonly encryptionKey?: Buffer;
  private readonly credentials: Map<string, string> = new Map();

  constructor(options: CredentialStoreOptions = {}) {
    this.options = {
      masterPassword: options.masterPassword ?? process.env.MCP_CREDENTIAL_MASTER_PASSWORD ?? '',
      storagePath: options.storagePath ?? process.env.MCP_CREDENTIAL_STORE_PATH ?? '',
      algorithm: options.algorithm ?? 'aes-256-gcm',
      iterations: options.iterations ?? 100000,
      useEncryption: options.useEncryption ?? !!options.masterPassword,
    };

    // Derive encryption key if using encryption
    if (this.options.useEncryption && this.options.masterPassword) {
      const salt = 'sonarqube-mcp-server-v1'; // Fixed salt for consistent key derivation
      this.encryptionKey = scryptSync(this.options.masterPassword, salt, 32, {
        N: this.options.iterations,
      });
      logger.info('Credential store initialized with encryption');
    } else {
      logger.warn(
        'Credential store initialized without encryption - NOT RECOMMENDED for production'
      );
    }

    // Load existing credentials if storage path is provided
    if (this.options.storagePath && existsSync(this.options.storagePath)) {
      this.loadFromFile();
    }
  }

  /**
   * Store a credential securely
   */
  setCredential(id: string, token: string): void {
    if (!token) {
      throw new Error('Token cannot be empty');
    }

    // Store in memory (always encrypted if encryption is enabled)
    const storedValue = this.options.useEncryption ? this.encrypt(token) : token;
    this.credentials.set(id, storedValue);

    // Persist to file if configured
    if (this.options.storagePath) {
      this.saveToFile();
    }

    logger.info('Credential stored', { id, encrypted: this.options.useEncryption });
  }

  /**
   * Retrieve a credential
   */
  getCredential(id: string): string | undefined {
    const storedValue = this.credentials.get(id);
    if (!storedValue) {
      return undefined;
    }

    // Decrypt if encryption is enabled
    try {
      return this.options.useEncryption ? this.decrypt(storedValue) : storedValue;
    } catch (error) {
      logger.error('Failed to decrypt credential', { id, error });
      return undefined;
    }
  }

  /**
   * Remove a credential
   */
  removeCredential(id: string): void {
    if (this.credentials.delete(id)) {
      if (this.options.storagePath) {
        this.saveToFile();
      }
      logger.info('Credential removed', { id });
    }
  }

  /**
   * Check if a credential exists
   */
  hasCredential(id: string): boolean {
    return this.credentials.has(id);
  }

  /**
   * Get all credential IDs (not the actual credentials)
   */
  getCredentialIds(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Clear all credentials
   */
  clearAll(): void {
    this.credentials.clear();
    if (this.options.storagePath) {
      this.saveToFile();
    }
    logger.info('All credentials cleared');
  }

  /**
   * Rotate the master password
   */
  rotateMasterPassword(newPassword: string): void {
    if (!this.options.useEncryption) {
      throw new Error('Cannot rotate password when encryption is disabled');
    }

    // Decrypt all credentials with old key
    const decryptedCredentials = new Map<string, string>();
    for (const [id, encryptedValue] of this.credentials) {
      try {
        decryptedCredentials.set(id, this.decrypt(encryptedValue));
      } catch (error) {
        logger.error('Failed to decrypt credential during rotation', { id, error });
        throw new Error(`Failed to rotate password: could not decrypt credential ${id}`);
      }
    }

    // Update encryption key
    const salt = 'sonarqube-mcp-server-v1';
    // Use type assertion to update readonly property
    const mutable = this as unknown as { encryptionKey?: Buffer };
    mutable.encryptionKey = scryptSync(newPassword, salt, 32, { N: this.options.iterations });
    this.options.masterPassword = newPassword;

    // Re-encrypt all credentials with new key
    this.credentials.clear();
    for (const [id, token] of decryptedCredentials) {
      this.credentials.set(id, this.encrypt(token));
    }

    // Save to file
    if (this.options.storagePath) {
      this.saveToFile();
    }

    logger.info('Master password rotated successfully');
  }

  /**
   * Encrypt a value
   */
  private encrypt(value: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const iv = randomBytes(16);
    const salt = randomBytes(32);
    const cipher = createCipheriv(this.options.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Type assertion for GCM mode ciphers
    const gcmCipher = cipher as typeof cipher & { getAuthTag(): Buffer };
    const authTag = gcmCipher.getAuthTag();

    const result: EncryptedCredential = {
      iv: iv.toString('hex'),
      data: encrypted + ':' + authTag.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: this.options.algorithm,
    };

    return JSON.stringify(result);
  }

  /**
   * Decrypt a value
   */
  private decrypt(encryptedValue: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const encrypted: EncryptedCredential = JSON.parse(encryptedValue);
    const [data, authTag] = encrypted.data.split(':');

    const decipher = createDecipheriv(
      encrypted.algorithm,
      this.encryptionKey,
      Buffer.from(encrypted.iv, 'hex')
    );

    // Type assertion for GCM mode deciphers
    const gcmDecipher = decipher as typeof decipher & { setAuthTag(tag: Buffer): void };
    gcmDecipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Load credentials from file
   */
  private loadFromFile(): void {
    try {
      const data = readFileSync(this.options.storagePath, 'utf8');
      const stored = JSON.parse(data) as Record<string, string>;

      this.credentials.clear();
      for (const [id, value] of Object.entries(stored)) {
        this.credentials.set(id, value);
      }

      logger.info('Credentials loaded from file', {
        path: this.options.storagePath,
        count: this.credentials.size,
      });
    } catch (error) {
      logger.error('Failed to load credentials from file', {
        path: this.options.storagePath,
        error,
      });
    }
  }

  /**
   * Save credentials to file
   */
  private saveToFile(): void {
    try {
      const data: Record<string, string> = {};
      for (const [id, value] of this.credentials) {
        data[id] = value;
      }

      // Ensure directory exists
      const dir = dirname(this.options.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write with restricted permissions
      writeFileSync(this.options.storagePath, JSON.stringify(data, null, 2), {
        mode: 0o600, // Read/write for owner only
      });

      logger.info('Credentials saved to file', {
        path: this.options.storagePath,
        count: this.credentials.size,
      });
    } catch (error) {
      logger.error('Failed to save credentials to file', {
        path: this.options.storagePath,
        error,
      });
    }
  }
}
