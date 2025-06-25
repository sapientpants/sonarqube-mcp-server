import { describe, it, expect, beforeEach } from '@jest/globals';
import { InMemoryClientStore, ClientSecretGenerator } from '../client-store.js';

describe('InMemoryClientStore', () => {
  let clientStore: InMemoryClientStore;

  beforeEach(() => {
    clientStore = new InMemoryClientStore();
  });

  describe('createClient', () => {
    it('should create a new client successfully', async () => {
      const clientSecretHash = await ClientSecretGenerator.hashClientSecret('secret123');
      const clientData = {
        clientId: 'test-client-001',
        clientSecretHash,
        clientName: 'Test Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code', 'refresh_token'] as string[],
        scopes: ['read', 'write'],
        tokenEndpointAuthMethod: 'client_secret_basic' as const,
      };

      const client = await clientStore.createClient(clientData);

      expect(client.clientId).toBe('test-client-001');
      expect(client.clientName).toBe('Test Client');
      expect(client.redirectUris).toEqual(['https://example.com/callback']);
      expect(client.grantTypes).toEqual(['authorization_code', 'refresh_token']);
      expect(client.scopes).toEqual(['read', 'write']);
      expect(client.tokenEndpointAuthMethod).toBe('client_secret_basic');
      expect(client.createdAt).toBeInstanceOf(Date);
      expect(client.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if client ID already exists', async () => {
      const clientData = {
        clientId: 'duplicate-client',
        clientName: 'Test Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      };

      await clientStore.createClient(clientData);

      await expect(clientStore.createClient(clientData)).rejects.toThrow(
        'Client with this ID already exists'
      );
    });

    it('should create public client without secret', async () => {
      const clientData = {
        clientId: 'public-client',
        clientName: 'Public Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      };

      const client = await clientStore.createClient(clientData);

      expect(client.clientSecretHash).toBeUndefined();
      expect(client.tokenEndpointAuthMethod).toBe('none');
    });
  });

  describe('getClientById', () => {
    it('should retrieve client by ID', async () => {
      const createdClient = await clientStore.createClient({
        clientId: 'test-client',
        clientName: 'Test Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      });

      const retrieved = await clientStore.getClientById('test-client');

      expect(retrieved).toEqual(createdClient);
    });

    it('should return null for non-existent client', async () => {
      const retrieved = await clientStore.getClientById('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateClient', () => {
    it('should update client fields', async () => {
      const client = await clientStore.createClient({
        clientId: 'test-client',
        clientName: 'Test Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await clientStore.updateClient('test-client', {
        clientName: 'Updated Client',
        redirectUris: ['https://example.com/new-callback', 'https://example.com/another'],
        scopes: ['read', 'write', 'admin'],
      });

      expect(updated.clientName).toBe('Updated Client');
      expect(updated.redirectUris).toEqual([
        'https://example.com/new-callback',
        'https://example.com/another',
      ]);
      expect(updated.scopes).toEqual(['read', 'write', 'admin']);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(client.updatedAt.getTime());
    });

    it('should preserve clientId and createdAt during update', async () => {
      const client = await clientStore.createClient({
        clientId: 'test-client',
        clientName: 'Test Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      });

      const updated = await clientStore.updateClient('test-client', {
        clientId: 'should-not-change',
        clientName: 'Updated',
      } as Partial<import('../types.js').OAuthClient>);

      expect(updated.clientId).toBe('test-client');
      expect(updated.createdAt).toEqual(client.createdAt);
    });

    it('should throw error for non-existent client', async () => {
      await expect(
        clientStore.updateClient('non-existent', { clientName: 'Updated' })
      ).rejects.toThrow('Client not found');
    });
  });

  describe('deleteClient', () => {
    it('should delete client', async () => {
      await clientStore.createClient({
        clientId: 'test-client',
        clientName: 'Test Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      });

      await clientStore.deleteClient('test-client');

      const retrieved = await clientStore.getClientById('test-client');
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent client', async () => {
      await expect(clientStore.deleteClient('non-existent')).rejects.toThrow('Client not found');
    });
  });

  describe('listClients', () => {
    it('should list all clients with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await clientStore.createClient({
          clientId: `client-${i}`,
          clientName: `Client ${i}`,
          redirectUris: [`https://example.com/callback${i}`],
          grantTypes: ['authorization_code'] as string[],
          scopes: [],
          tokenEndpointAuthMethod: 'none' as const,
        });
      }

      const allClients = await clientStore.listClients();
      expect(allClients).toHaveLength(5);

      const page1 = await clientStore.listClients({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);
      expect(page1[0].clientId).toBe('client-0');
      expect(page1[1].clientId).toBe('client-1');

      const page2 = await clientStore.listClients({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);
      expect(page2[0].clientId).toBe('client-2');
      expect(page2[1].clientId).toBe('client-3');

      const page3 = await clientStore.listClients({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);
      expect(page3[0].clientId).toBe('client-4');
    });
  });

  describe('validateClientCredentials', () => {
    it('should validate correct client credentials', async () => {
      const clientSecret = 'super-secret-value';
      const clientSecretHash = await ClientSecretGenerator.hashClientSecret(clientSecret);

      await clientStore.createClient({
        clientId: 'confidential-client',
        clientSecretHash,
        clientName: 'Confidential Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'client_secret_basic' as const,
      });

      const isValid = await clientStore.validateClientCredentials(
        'confidential-client',
        clientSecret
      );

      expect(isValid).toBe(true);
    });

    it('should reject incorrect client secret', async () => {
      const clientSecret = 'super-secret-value';
      const clientSecretHash = await ClientSecretGenerator.hashClientSecret(clientSecret);

      await clientStore.createClient({
        clientId: 'confidential-client',
        clientSecretHash,
        clientName: 'Confidential Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'client_secret_basic' as const,
      });

      const isValid = await clientStore.validateClientCredentials(
        'confidential-client',
        'wrong-secret'
      );

      expect(isValid).toBe(false);
    });

    it('should return false for non-existent client', async () => {
      const isValid = await clientStore.validateClientCredentials('non-existent', 'any-secret');

      expect(isValid).toBe(false);
    });

    it('should return false for public client', async () => {
      await clientStore.createClient({
        clientId: 'public-client',
        clientName: 'Public Client',
        redirectUris: ['https://example.com/callback'],
        grantTypes: ['authorization_code'] as string[],
        scopes: [],
        tokenEndpointAuthMethod: 'none' as const,
      });

      const isValid = await clientStore.validateClientCredentials('public-client', 'any-secret');

      expect(isValid).toBe(false);
    });
  });
});

describe('ClientSecretGenerator', () => {
  it('should generate URL-safe client secrets', () => {
    const secret = ClientSecretGenerator.generateClientSecret();

    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(0);
    expect(/^[A-Za-z0-9_-]+$/.test(secret)).toBe(true);
  });

  it('should generate unique client secrets', () => {
    const secrets = new Set<string>();
    for (let i = 0; i < 100; i++) {
      secrets.add(ClientSecretGenerator.generateClientSecret());
    }

    expect(secrets.size).toBe(100);
  });

  it('should hash and verify client secrets correctly', async () => {
    const secret = ClientSecretGenerator.generateClientSecret();
    const hash = await ClientSecretGenerator.hashClientSecret(secret);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(secret);

    // Should be able to verify with bcrypt
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(secret, hash);
    expect(isValid).toBe(true);

    const isInvalid = await bcrypt.compare('wrong-secret', hash);
    expect(isInvalid).toBe(false);
  });
});
