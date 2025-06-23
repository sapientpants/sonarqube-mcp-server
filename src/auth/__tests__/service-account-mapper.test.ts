import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ServiceAccountMapper } from '../service-account-mapper.js';
import type { TokenClaims } from '../token-validator.js';
import type { ISonarQubeClient } from '../../types/index.js';

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mock the SonarQube client creation
jest.mock('../../sonarqube.js', () => ({
  createSonarQubeClient: jest.fn(() => ({}) as ISonarQubeClient),
}));

describe('ServiceAccountMapper', () => {
  let mapper: ServiceAccountMapper;
  let mockClaims: TokenClaims;

  beforeEach(() => {
    // Clear environment variables
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('SONARQUBE_') || key.startsWith('MCP_')) {
        delete process.env[key];
      }
    });

    mockClaims = {
      sub: 'user@example.com',
      iss: 'https://auth.example.com',
      aud: 'https://mcp.example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      scope: 'sonarqube:read sonarqube:write',
    };
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      mapper = new ServiceAccountMapper();
      expect(mapper).toBeDefined();
    });

    it('should load service accounts from environment', () => {
      process.env.SONARQUBE_TOKEN = 'default-token';
      process.env.SONARQUBE_SA1_TOKEN = 'sa1-token';
      process.env.SONARQUBE_SA1_NAME = 'Service Account 1';

      mapper = new ServiceAccountMapper();

      const accounts = mapper.getServiceAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts.find((a) => a.id === 'default')).toBeDefined();
      expect(accounts.find((a) => a.id === 'sa1')).toBeDefined();
    });

    it('should initialize with provided service accounts', () => {
      mapper = new ServiceAccountMapper({
        serviceAccounts: [
          {
            id: 'test-sa',
            name: 'Test Service Account',
            token: 'test-token',
          },
        ],
      });

      const accounts = mapper.getServiceAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].id).toBe('test-sa');
    });
  });

  describe('getClientForUser', () => {
    beforeEach(() => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          {
            id: 'default',
            name: 'Default SA',
            token: 'default-token',
          },
          {
            id: 'dev-sa',
            name: 'Dev SA',
            token: 'dev-token',
          },
        ],
        mappingRules: [
          {
            priority: 1,
            userPattern: /.*@dev\.example\.com/,
            serviceAccountId: 'dev-sa',
          },
        ],
      });
    });

    it('should return client for matching user', async () => {
      const devClaims = { ...mockClaims, sub: 'developer@dev.example.com' };
      const result = await mapper.getClientForUser(devClaims);

      expect(result.serviceAccountId).toBe('dev-sa');
      expect(result.client).toBeDefined();
    });

    it('should return default client for non-matching user', async () => {
      const result = await mapper.getClientForUser(mockClaims);

      expect(result.serviceAccountId).toBe('default');
      expect(result.client).toBeDefined();
    });

    it('should throw error if no mapping found and no default', async () => {
      const mapperNoDefault = new ServiceAccountMapper({
        serviceAccounts: [
          {
            id: 'dev-sa',
            name: 'Dev SA',
            token: 'dev-token',
          },
        ],
      });

      await expect(mapperNoDefault.getClientForUser(mockClaims)).rejects.toThrow(
        'No service account mapping found'
      );
    });

    it('should throw error if mapped service account not found', async () => {
      const mapperBadMapping = new ServiceAccountMapper({
        defaultServiceAccountId: 'non-existent',
      });

      await expect(mapperBadMapping.getClientForUser(mockClaims)).rejects.toThrow(
        'Service account non-existent not found'
      );
    });
  });

  describe('mapping rules', () => {
    beforeEach(() => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          { id: 'default', name: 'Default', token: 'token1' },
          { id: 'dev', name: 'Dev', token: 'token2' },
          { id: 'qa', name: 'QA', token: 'token3' },
          { id: 'admin', name: 'Admin', token: 'token4' },
        ],
      });
    });

    it('should match by user pattern', async () => {
      mapper.addMappingRule({
        priority: 1,
        userPattern: /.*@dev\.company\.com/,
        serviceAccountId: 'dev',
      });

      const claims = { ...mockClaims, sub: 'john@dev.company.com' };
      const result = await mapper.getClientForUser(claims);
      expect(result.serviceAccountId).toBe('dev');
    });

    it('should match by issuer pattern', async () => {
      mapper.addMappingRule({
        priority: 1,
        issuerPattern: /auth\.qa\.company\.com/,
        serviceAccountId: 'qa',
      });

      const claims = { ...mockClaims, iss: 'https://auth.qa.company.com' };
      const result = await mapper.getClientForUser(claims);
      expect(result.serviceAccountId).toBe('qa');
    });

    it('should match by required scopes', async () => {
      mapper.addMappingRule({
        priority: 1,
        requiredScopes: ['sonarqube:admin'],
        serviceAccountId: 'admin',
      });

      const claims = { ...mockClaims, scope: 'sonarqube:read sonarqube:write sonarqube:admin' };
      const result = await mapper.getClientForUser(claims);
      expect(result.serviceAccountId).toBe('admin');
    });

    it('should respect priority order', async () => {
      mapper.addMappingRule({
        priority: 10,
        userPattern: /.*/,
        serviceAccountId: 'dev',
      });

      mapper.addMappingRule({
        priority: 1,
        userPattern: /.*@example\.com/,
        serviceAccountId: 'qa',
      });

      const result = await mapper.getClientForUser(mockClaims);
      expect(result.serviceAccountId).toBe('qa'); // Lower priority number wins
    });

    it('should match combined conditions', async () => {
      mapper.addMappingRule({
        priority: 1,
        userPattern: /.*@dev\.company\.com/,
        requiredScopes: ['sonarqube:write'],
        serviceAccountId: 'dev',
      });

      // Should match - has both pattern and scope
      const claims1 = { ...mockClaims, sub: 'john@dev.company.com', scope: 'sonarqube:write' };
      const result1 = await mapper.getClientForUser(claims1);
      expect(result1.serviceAccountId).toBe('dev');

      // Should not match - missing scope
      const claims2 = { ...mockClaims, sub: 'john@dev.company.com', scope: 'sonarqube:read' };
      const result2 = await mapper.getClientForUser(claims2);
      expect(result2.serviceAccountId).toBe('default');
    });
  });

  describe('addServiceAccount', () => {
    it('should add a new service account', () => {
      mapper = new ServiceAccountMapper();

      mapper.addServiceAccount({
        id: 'new-sa',
        name: 'New Service Account',
        token: 'new-token',
      });

      const accounts = mapper.getServiceAccounts();
      expect(accounts.find((a) => a.id === 'new-sa')).toBeDefined();
    });

    it('should update existing service account', () => {
      mapper = new ServiceAccountMapper({
        serviceAccounts: [{ id: 'sa1', name: 'Old Name', token: 'old-token' }],
      });

      mapper.addServiceAccount({
        id: 'sa1',
        name: 'New Name',
        token: 'new-token',
      });

      const accounts = mapper.getServiceAccounts();
      const sa1 = accounts.find((a) => a.id === 'sa1');
      expect(sa1?.name).toBe('New Name');
      expect(sa1?.token).toBe('new-token');
    });
  });

  describe('removeServiceAccount', () => {
    it('should remove a service account', () => {
      mapper = new ServiceAccountMapper({
        serviceAccounts: [
          { id: 'sa1', name: 'SA1', token: 'token1' },
          { id: 'sa2', name: 'SA2', token: 'token2' },
        ],
      });

      mapper.removeServiceAccount('sa1');

      const accounts = mapper.getServiceAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts.find((a) => a.id === 'sa1')).toBeUndefined();
    });
  });

  describe('environment variable loading', () => {
    it('should load service accounts from environment', () => {
      process.env.SONARQUBE_TOKEN = 'default-token';
      process.env.SONARQUBE_SA1_TOKEN = 'dev-token';
      process.env.SONARQUBE_SA1_NAME = 'Dev Account';
      process.env.SONARQUBE_SA2_TOKEN = 'qa-token';
      process.env.SONARQUBE_SA2_NAME = 'QA Account';

      mapper = new ServiceAccountMapper();

      const accounts = mapper.getServiceAccounts();
      expect(accounts).toHaveLength(3); // default, sa1, sa2

      expect(accounts.find((a) => a.id === 'default')).toBeDefined();
      expect(accounts.find((a) => a.id === 'sa1')).toBeDefined();
      expect(accounts.find((a) => a.id === 'sa2')).toBeDefined();
    });

    it('should parse service account configuration from environment', () => {
      process.env.SONARQUBE_SA1_TOKEN = 'sa1-token';
      process.env.SONARQUBE_SA1_NAME = 'Service Account 1';
      process.env.SONARQUBE_SA1_URL = 'https://sonarqube.example.com';
      process.env.SONARQUBE_SA1_ORGANIZATION = 'my-org';
      process.env.SONARQUBE_SA1_SCOPES = 'read,write,admin';

      mapper = new ServiceAccountMapper();

      const accounts = mapper.getServiceAccounts();
      const sa1 = accounts.find((a) => a.id === 'sa1');

      expect(sa1).toBeDefined();
      expect(sa1?.name).toBe('Service Account 1');
      expect(sa1?.url).toBe('https://sonarqube.example.com');
      expect(sa1?.organization).toBe('my-org');
      expect(sa1?.allowedScopes).toEqual(['read', 'write', 'admin']);
    });

    it('should parse allowed scopes with whitespace from environment', () => {
      process.env.SONARQUBE_SA1_TOKEN = 'token';
      process.env.SONARQUBE_SA1_SCOPES = ' read , write , admin ';

      mapper = new ServiceAccountMapper();

      const accounts = mapper.getServiceAccounts();
      const sa1 = accounts.find((a) => a.id === 'sa1');

      expect(sa1?.allowedScopes).toEqual(['read', 'write', 'admin']);
    });
  });

  describe('error handling', () => {
    it('should throw when mapped service account does not exist', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        mappingRules: [
          {
            priority: 1,
            userPattern: /.*/,
            serviceAccountId: 'non-existent-sa',
          },
        ],
      });

      await expect(mapper.getClientForUser(mockClaims)).rejects.toThrow(
        'Service account non-existent-sa not found'
      );
    });

    it('should skip rules when required scopes do not match', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          { id: 'default', name: 'Default', token: 'default-token' },
          { id: 'admin', name: 'Admin', token: 'admin-token' },
        ],
        mappingRules: [
          {
            priority: 1,
            requiredScopes: ['admin:full', 'system:write'],
            serviceAccountId: 'admin',
          },
        ],
      });

      // User has different scopes
      const claims = { ...mockClaims, scope: 'read:basic write:basic' };
      const result = await mapper.getClientForUser(claims);

      // Should fall back to default
      expect(result.serviceAccountId).toBe('default');
    });

    it('should handle missing scope in claims', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        mappingRules: [
          {
            priority: 1,
            requiredScopes: ['admin'],
            serviceAccountId: 'default',
          },
        ],
      });

      // Claims without scope property
      const claimsNoScope = { ...mockClaims };
      delete (claimsNoScope as { scope?: string }).scope;

      const result = await mapper.getClientForUser(claimsNoScope);
      expect(result.serviceAccountId).toBe('default');
    });
  });
});
