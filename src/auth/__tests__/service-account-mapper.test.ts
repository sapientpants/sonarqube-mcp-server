import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ServiceAccountMapper } from '../service-account-mapper.js';
import type { TokenClaims } from '../token-validator.js';
import type { ISonarQubeClient } from '../../types/index.js';
import { ServiceAccountHealthMonitor } from '../service-account-health.js';
import { ServiceAccountAuditor } from '../service-account-auditor.js';
import { CredentialStore } from '../credential-store.js';
import { PatternMatcher } from '../../utils/pattern-matcher.js';

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

// Mock the health monitor
jest.mock('../service-account-health.js', () => ({
  ServiceAccountHealthMonitor: jest.fn().mockImplementation(() => ({
    checkAccount: jest.fn().mockResolvedValue({ isHealthy: true, latency: 100 }),
    markAccountFailed: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Mock the auditor
jest.mock('../service-account-auditor.js', () => ({
  ServiceAccountAuditor: jest.fn().mockImplementation(() => ({
    logAccountAccess: jest.fn(),
    logAccountAccessDenied: jest.fn(),
    logAccountFailure: jest.fn(),
    logHealthCheck: jest.fn(),
    logFailover: jest.fn(),
  })),
}));

// Mock the credential store
jest.mock('../credential-store.js', () => ({
  CredentialStore: jest.fn().mockImplementation(() => ({
    hasCredential: jest.fn().mockReturnValue(false),
    getCredential: jest.fn(),
  })),
}));

describe('ServiceAccountMapper', () => {
  let mapper: ServiceAccountMapper;
  let mockClaims: TokenClaims;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

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

  afterEach(() => {
    jest.useRealTimers();
    if (mapper) {
      mapper.shutdown();
    }
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
            userPattern: new PatternMatcher('*@dev.example.com'),
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
        userPattern: new PatternMatcher('*@dev.company.com'),
        serviceAccountId: 'dev',
      });

      const claims = { ...mockClaims, sub: 'john@dev.company.com' };
      const result = await mapper.getClientForUser(claims);
      expect(result.serviceAccountId).toBe('dev');
    });

    it('should match by issuer pattern', async () => {
      mapper.addMappingRule({
        priority: 1,
        issuerPattern: new PatternMatcher('*auth.qa.company.com*'),
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
        userPattern: new PatternMatcher('*'),
        serviceAccountId: 'dev',
      });

      mapper.addMappingRule({
        priority: 1,
        userPattern: new PatternMatcher('*@example.com'),
        serviceAccountId: 'qa',
      });

      const result = await mapper.getClientForUser(mockClaims);
      expect(result.serviceAccountId).toBe('qa'); // Lower priority number wins
    });

    it('should match combined conditions', async () => {
      mapper.addMappingRule({
        priority: 1,
        userPattern: new PatternMatcher('*@dev.company.com'),
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
            userPattern: new PatternMatcher('*'),
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

  describe('health monitoring integration', () => {
    it('should skip unhealthy accounts during mapping', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          { id: 'default', name: 'Default', token: 'token1' },
          { id: 'unhealthy', name: 'Unhealthy', token: 'token2', isHealthy: false },
        ],
        mappingRules: [
          {
            priority: 1,
            userPattern: new PatternMatcher('*'),
            serviceAccountId: 'unhealthy',
          },
        ],
        enableHealthMonitoring: true,
        enableFailover: false, // Disable failover to test skipping behavior
      });

      const result = await mapper.getClientForUser(mockClaims);
      expect(result.serviceAccountId).toBe('default'); // Should skip unhealthy and use default
    });

    it('should perform health check before returning client', async () => {
      const mockHealthMonitor = new ServiceAccountHealthMonitor();
      const checkAccountSpy = jest.spyOn(mockHealthMonitor, 'checkAccount');

      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        healthMonitor: mockHealthMonitor,
        enableHealthMonitoring: true,
      });

      await mapper.getClientForUser(mockClaims);
      expect(checkAccountSpy).toHaveBeenCalled();
    });

    it('should handle health check failures', async () => {
      const mockHealthMonitor = new ServiceAccountHealthMonitor();
      jest.spyOn(mockHealthMonitor, 'checkAccount').mockResolvedValue({
        isHealthy: false,
        latency: 0,
        error: 'Health check failed',
      });

      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        healthMonitor: mockHealthMonitor,
        enableHealthMonitoring: true,
        enableFailover: false,
      });

      await expect(mapper.getClientForUser(mockClaims)).rejects.toThrow(
        'Service account health check failed'
      );
    });

    it('should initialize account health on startup', async () => {
      mapper = new ServiceAccountMapper({
        serviceAccounts: [
          { id: 'sa1', name: 'SA1', token: 'token1' },
          { id: 'sa2', name: 'SA2', token: 'token2' },
        ],
        enableHealthMonitoring: true,
      });

      // Wait for initial health check timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      const accounts = mapper.getServiceAccounts();
      expect(accounts.every((a) => a.isHealthy === true)).toBe(true);
      expect(accounts.every((a) => a.failureCount === 0)).toBe(true);
    });
  });

  describe('audit logging integration', () => {
    it('should log successful access', async () => {
      const mockAuditor = new ServiceAccountAuditor();
      const logAccessSpy = jest.spyOn(mockAuditor, 'logAccountAccess');

      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        auditor: mockAuditor,
        enableAuditLogging: true,
      });

      await mapper.getClientForUser(mockClaims);
      expect(logAccessSpy).toHaveBeenCalledWith(mockClaims, 'default', 'Default', undefined);
    });

    it('should log access denied', async () => {
      const mockAuditor = new ServiceAccountAuditor();
      const logDeniedSpy = jest.spyOn(mockAuditor, 'logAccountAccessDenied');

      mapper = new ServiceAccountMapper({
        serviceAccounts: [],
        auditor: mockAuditor,
        enableAuditLogging: true,
      });

      await expect(mapper.getClientForUser(mockClaims)).rejects.toThrow();
      expect(logDeniedSpy).toHaveBeenCalledWith(
        mockClaims,
        'no-mapping',
        expect.stringContaining('No service account mapping found')
      );
    });

    it('should log health checks', async () => {
      const mockAuditor = new ServiceAccountAuditor();
      const logHealthSpy = jest.spyOn(mockAuditor, 'logHealthCheck');

      mapper = new ServiceAccountMapper({
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        auditor: mockAuditor,
        enableAuditLogging: true,
        enableHealthMonitoring: true,
      });

      await mapper.checkAllAccountsHealth();
      expect(logHealthSpy).toHaveBeenCalled();
    });
  });

  describe('failover support', () => {
    it('should failover to backup account on failure', async () => {
      const mockHealthMonitor = new ServiceAccountHealthMonitor();
      jest
        .spyOn(mockHealthMonitor, 'checkAccount')
        .mockResolvedValueOnce({ isHealthy: false, latency: 0, error: 'Primary failed' })
        .mockResolvedValueOnce({ isHealthy: true, latency: 100 });

      mapper = new ServiceAccountMapper({
        serviceAccounts: [
          { id: 'primary', name: 'Primary', token: 'token1', fallbackAccountId: 'backup' },
          { id: 'backup', name: 'Backup', token: 'token2' },
        ],
        mappingRules: [
          { priority: 1, userPattern: new PatternMatcher('*'), serviceAccountId: 'primary' },
        ],
        healthMonitor: mockHealthMonitor,
        enableFailover: true,
        enableHealthMonitoring: true,
      });

      const result = await mapper.getClientForUser(mockClaims);
      expect(result.serviceAccountId).toBe('backup');
    });

    it('should detect circular failover dependencies', async () => {
      mapper = new ServiceAccountMapper({
        serviceAccounts: [
          { id: 'sa1', name: 'SA1', token: 'token1', fallbackAccountId: 'sa2' },
          { id: 'sa2', name: 'SA2', token: 'token2', fallbackAccountId: 'sa1' },
        ],
        defaultServiceAccountId: 'sa1',
        enableFailover: true,
      });

      // Mock both accounts to fail
      const mockHealthMonitor = mapper.getHealthMonitor();
      if (mockHealthMonitor) {
        jest
          .spyOn(mockHealthMonitor, 'checkAccount')
          .mockResolvedValue({ isHealthy: false, latency: 0, error: 'Failed' });
      }

      await expect(mapper.getClientForUser(mockClaims)).rejects.toThrow(
        'All service accounts failed'
      );
    });

    it('should log failover events', async () => {
      const mockAuditor = new ServiceAccountAuditor();
      const logFailoverSpy = jest.spyOn(mockAuditor, 'logFailover');

      const mockHealthMonitor = new ServiceAccountHealthMonitor();
      jest
        .spyOn(mockHealthMonitor, 'checkAccount')
        .mockResolvedValueOnce({ isHealthy: false, latency: 0, error: 'Primary failed' })
        .mockResolvedValueOnce({ isHealthy: true, latency: 100 });

      mapper = new ServiceAccountMapper({
        serviceAccounts: [
          { id: 'primary', name: 'Primary', token: 'token1', fallbackAccountId: 'backup' },
          { id: 'backup', name: 'Backup', token: 'token2' },
        ],
        mappingRules: [
          { priority: 1, userPattern: new PatternMatcher('*'), serviceAccountId: 'primary' },
        ],
        healthMonitor: mockHealthMonitor,
        auditor: mockAuditor,
        enableFailover: true,
        enableHealthMonitoring: true,
        enableAuditLogging: true,
      });

      await mapper.getClientForUser(mockClaims);
      expect(logFailoverSpy).toHaveBeenCalledWith(
        'primary',
        'backup',
        expect.stringContaining('Primary failed'),
        mockClaims.sub
      );
    });
  });

  describe('credential store integration', () => {
    it('should use credential from store if available', async () => {
      const mockCredentialStore = new CredentialStore();
      jest.spyOn(mockCredentialStore, 'hasCredential').mockReturnValue(true);
      jest.spyOn(mockCredentialStore, 'getCredential').mockReturnValue('store-token');

      const { createSonarQubeClient } = await import('../../sonarqube.js');
      const createClientSpy = createSonarQubeClient as jest.MockedFunction<
        typeof createSonarQubeClient
      >;

      mapper = new ServiceAccountMapper({
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'original-token' }],
        defaultServiceAccountId: 'default',
        credentialStore: mockCredentialStore,
      });

      await mapper.getClientForUser(mockClaims);

      expect(createClientSpy).toHaveBeenCalledWith(
        'store-token', // Should use token from store
        expect.any(String),
        expect.any(String)
      );
    });

    it('should fall back to account token when store returns undefined', async () => {
      const mockCredentialStore = new CredentialStore();
      jest.spyOn(mockCredentialStore, 'hasCredential').mockReturnValue(true);
      jest.spyOn(mockCredentialStore, 'getCredential').mockReturnValue(undefined);

      const { createSonarQubeClient } = await import('../../sonarqube.js');
      const createClientSpy = createSonarQubeClient as jest.MockedFunction<
        typeof createSonarQubeClient
      >;

      mapper = new ServiceAccountMapper({
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'account-token' }],
        defaultServiceAccountId: 'default',
        credentialStore: mockCredentialStore,
      });

      await mapper.getClientForUser(mockClaims);

      expect(createClientSpy).toHaveBeenCalledWith(
        'account-token', // Should use account token
        expect.any(String),
        expect.any(String)
      );
    });

    it('should throw when no token is available', async () => {
      const mockCredentialStore = new CredentialStore();
      jest.spyOn(mockCredentialStore, 'hasCredential').mockReturnValue(false);

      mapper = new ServiceAccountMapper({
        serviceAccounts: [{ id: 'default', name: 'Default', token: '' }],
        defaultServiceAccountId: 'default',
        credentialStore: mockCredentialStore,
      });

      await expect(mapper.getClientForUser(mockClaims)).rejects.toThrow(
        'No token available for service account default'
      );
    });
  });

  describe('group-based mapping', () => {
    it('should match by required groups', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          { id: 'default', name: 'Default', token: 'token1' },
          { id: 'admin', name: 'Admin', token: 'token2' },
        ],
        mappingRules: [
          {
            priority: 1,
            requiredGroups: ['admins', 'developers'],
            serviceAccountId: 'admin',
          },
        ],
      });

      const claimsWithGroups = {
        ...mockClaims,
        groups: ['users', 'developers'],
      };

      const result = await mapper.getClientForUser(claimsWithGroups);
      expect(result.serviceAccountId).toBe('admin');
    });

    it('should skip rule when groups do not match', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          { id: 'default', name: 'Default', token: 'token1' },
          { id: 'admin', name: 'Admin', token: 'token2' },
        ],
        mappingRules: [
          {
            priority: 1,
            requiredGroups: ['admins'],
            serviceAccountId: 'admin',
          },
        ],
      });

      const claimsWithGroups = {
        ...mockClaims,
        groups: ['users', 'developers'],
      };

      const result = await mapper.getClientForUser(claimsWithGroups);
      expect(result.serviceAccountId).toBe('default');
    });

    it('should handle claims without groups', async () => {
      mapper = new ServiceAccountMapper({
        defaultServiceAccountId: 'default',
        serviceAccounts: [
          { id: 'default', name: 'Default', token: 'token1' },
          { id: 'admin', name: 'Admin', token: 'token2' },
        ],
        mappingRules: [
          {
            priority: 1,
            requiredGroups: ['admins'],
            serviceAccountId: 'admin',
          },
        ],
      });

      const result = await mapper.getClientForUser(mockClaims);
      expect(result.serviceAccountId).toBe('default');
    });
  });

  describe('environment variable support for new features', () => {
    it('should load environment and fallback account from env vars', () => {
      process.env.SONARQUBE_SA1_TOKEN = 'token1';
      process.env.SONARQUBE_SA1_ENVIRONMENT = 'production';
      process.env.SONARQUBE_SA1_FALLBACK = 'sa2';
      process.env.SONARQUBE_SA2_TOKEN = 'token2';

      mapper = new ServiceAccountMapper();

      const accounts = mapper.getServiceAccounts();
      const sa1 = accounts.find((a) => a.id === 'sa1');

      expect(sa1?.environment).toBe('production');
      expect(sa1?.fallbackAccountId).toBe('sa2');
    });
  });

  describe('shutdown', () => {
    it('should stop health monitor on shutdown', () => {
      const mockHealthMonitor = new ServiceAccountHealthMonitor();
      const stopSpy = jest.spyOn(mockHealthMonitor, 'stop');

      mapper = new ServiceAccountMapper({
        serviceAccounts: [{ id: 'default', name: 'Default', token: 'token' }],
        healthMonitor: mockHealthMonitor,
        enableHealthMonitoring: true,
      });

      mapper.shutdown();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return health monitor instance', () => {
      const mockHealthMonitor = new ServiceAccountHealthMonitor();
      mapper = new ServiceAccountMapper({
        healthMonitor: mockHealthMonitor,
        enableHealthMonitoring: true,
      });

      expect(mapper.getHealthMonitor()).toBe(mockHealthMonitor);
    });

    it('should return auditor instance', () => {
      const mockAuditor = new ServiceAccountAuditor();
      mapper = new ServiceAccountMapper({
        auditor: mockAuditor,
        enableAuditLogging: true,
      });

      expect(mapper.getAuditor()).toBe(mockAuditor);
    });
  });
});
