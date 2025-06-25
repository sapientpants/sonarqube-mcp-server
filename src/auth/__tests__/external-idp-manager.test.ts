import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { ExternalIdPManager } from '../external-idp-manager.js';
import { JWKSClient } from '../jwks-client.js';
import { ExternalIdPConfig } from '../external-idp-types.js';
import { TokenClaims } from '../token-validator.js';

describe('ExternalIdPManager', () => {
  let manager: ExternalIdPManager;
  let mockJWKSClient: jest.Mocked<JWKSClient>;

  beforeEach(() => {
    mockJWKSClient = {
      getKey: jest.fn(),
      clearCache: jest.fn(),
      getCacheStats: jest.fn(),
    } as unknown as jest.Mocked<JWKSClient>;

    manager = new ExternalIdPManager({
      jwksClient: mockJWKSClient,
      healthCheckInterval: 100, // Short interval for testing
    });
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('addIdP', () => {
    it('should add an IdP configuration', () => {
      const config: ExternalIdPConfig = {
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://my-app',
      };

      manager.addIdP(config);

      const idps = manager.getIdPs();
      expect(idps).toHaveLength(1);
      expect(idps[0]).toMatchObject({
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://my-app',
        groupsClaim: 'groups', // Default from provider
        groupsTransform: 'extract_id', // Default from provider
      });
    });

    it('should override provider defaults with config', () => {
      const config: ExternalIdPConfig = {
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://my-app',
        groupsClaim: 'custom-groups',
        groupsTransform: 'none',
      };

      manager.addIdP(config);

      const idps = manager.getIdPs();
      expect(idps[0]).toMatchObject({
        groupsClaim: 'custom-groups',
        groupsTransform: 'none',
      });
    });

    it('should initialize health status', () => {
      const config: ExternalIdPConfig = {
        provider: 'okta',
        issuer: 'https://dev.okta.com',
        audience: 'api://default',
      };

      manager.addIdP(config);

      const status = manager.getIdPHealthStatus('https://dev.okta.com');
      expect(status).toMatchObject({
        issuer: 'https://dev.okta.com',
        healthy: true,
        consecutiveFailures: 0,
      });
    });
  });

  describe('removeIdP', () => {
    it('should remove an IdP', () => {
      const config: ExternalIdPConfig = {
        provider: 'auth0',
        issuer: 'https://example.auth0.com',
        audience: 'https://api',
      };

      manager.addIdP(config);
      expect(manager.getIdPs()).toHaveLength(1);

      manager.removeIdP('https://example.auth0.com');
      expect(manager.getIdPs()).toHaveLength(0);
    });

    it('should remove health status when removing IdP', () => {
      const config: ExternalIdPConfig = {
        provider: 'keycloak',
        issuer: 'https://keycloak.example.com',
        audience: 'account',
      };

      manager.addIdP(config);
      manager.removeIdP('https://keycloak.example.com');

      const status = manager.getIdPHealthStatus('https://keycloak.example.com');
      expect(status).toBeUndefined();
    });
  });

  describe('getPublicKey', () => {
    it('should get public key from JWKS client', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
        jwksUri: 'https://idp.example.com/jwks',
      };

      manager.addIdP(config);
      mockJWKSClient.getKey.mockResolvedValue('-----BEGIN PUBLIC KEY-----...');

      const key = await manager.getPublicKey('https://idp.example.com', 'key-id');

      expect(key).toBe('-----BEGIN PUBLIC KEY-----...');
      expect(mockJWKSClient.getKey).toHaveBeenCalledWith(
        'https://idp.example.com',
        'key-id',
        'https://idp.example.com/jwks'
      );
    });

    it('should update health status on success', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
      };

      manager.addIdP(config);
      mockJWKSClient.getKey.mockResolvedValue('-----BEGIN PUBLIC KEY-----...');

      await manager.getPublicKey('https://idp.example.com');

      const status = manager.getIdPHealthStatus('https://idp.example.com');
      expect(status).toMatchObject({
        healthy: true,
        consecutiveFailures: 0,
      });
      expect(status?.lastSuccess).toBeDefined();
    });

    it('should update health status on failure', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
      };

      manager.addIdP(config);
      mockJWKSClient.getKey.mockRejectedValue(new Error('Network error'));

      await expect(manager.getPublicKey('https://idp.example.com')).rejects.toThrow(
        'Network error'
      );

      const status = manager.getIdPHealthStatus('https://idp.example.com');
      expect(status).toMatchObject({
        healthy: false,
        consecutiveFailures: 1,
        error: 'Network error',
      });
      expect(status?.lastFailure).toBeDefined();
    });

    it('should throw error for unknown issuer', async () => {
      await expect(manager.getPublicKey('https://unknown.com')).rejects.toThrow(
        'No IdP configured for issuer: https://unknown.com'
      );
    });
  });

  describe('extractClaims', () => {
    it('should extract groups from configured claim', () => {
      const config: ExternalIdPConfig = {
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://my-app',
      };

      manager.addIdP(config);

      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://login.microsoftonline.com/tenant/v2.0',
        aud: 'api://my-app',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        groups: ['group1', 'group2'],
      };

      const extracted = manager.extractClaims(claims.iss, claims);

      expect(extracted).toMatchObject({
        ...claims,
        groups: ['group1', 'group2'],
        idp_provider: 'azure-ad',
      });
    });

    it('should transform groups with extract_name', () => {
      const config: ExternalIdPConfig = {
        provider: 'keycloak',
        issuer: 'https://keycloak.example.com',
        audience: 'account',
      };

      manager.addIdP(config);

      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://keycloak.example.com',
        aud: 'account',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        groups: ['cn=admins,ou=groups,dc=example,dc=com', 'cn=users,ou=groups,dc=example,dc=com'],
      };

      const extracted = manager.extractClaims(claims.iss, claims);

      expect(extracted.groups).toEqual(['admins', 'users']);
    });

    it('should transform groups with extract_id', () => {
      const config: ExternalIdPConfig = {
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://my-app',
      };

      manager.addIdP(config);

      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://login.microsoftonline.com/tenant/v2.0',
        aud: 'api://my-app',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        groups: ['/tenant/groups/123/admins', '/tenant/groups/456/users'],
      };

      const extracted = manager.extractClaims(claims.iss, claims);

      expect(extracted.groups).toEqual(['admins', 'users']);
    });

    it('should handle non-array groups', () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
      };

      manager.addIdP(config);

      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://idp.example.com',
        aud: 'api',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        groups: 'single-group',
      };

      const extracted = manager.extractClaims(claims.iss, claims);

      expect(extracted.groups).toBe('single-group');
    });

    it('should add tenant ID if configured', () => {
      const config: ExternalIdPConfig = {
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://my-app',
        tenantId: 'tenant-123',
      };

      manager.addIdP(config);

      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://login.microsoftonline.com/tenant/v2.0',
        aud: 'api://my-app',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
      };

      const extracted = manager.extractClaims(claims.iss, claims);

      expect(extracted.idp_tenant).toBe('tenant-123');
    });

    it('should return claims unchanged for unknown issuer', () => {
      const claims: TokenClaims = {
        sub: 'user123',
        iss: 'https://unknown.com',
        aud: 'api',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
      };

      const extracted = manager.extractClaims(claims.iss, claims);

      expect(extracted).toEqual(claims);
    });
  });

  describe('health monitoring', () => {
    it('should start health monitoring when enabled', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
        enableHealthMonitoring: true,
      };

      mockJWKSClient.getKey.mockResolvedValue('-----BEGIN PUBLIC KEY-----...');

      manager.addIdP(config);

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockJWKSClient.getKey).toHaveBeenCalledWith(
        'https://idp.example.com',
        undefined,
        undefined
      );
    });

    it('should not start monitoring when disabled', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
        enableHealthMonitoring: false,
      };

      manager.addIdP(config);

      // Wait to ensure no health check runs
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockJWKSClient.getKey).not.toHaveBeenCalled();
    });

    it('should handle health check failures', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
        enableHealthMonitoring: true,
      };

      mockJWKSClient.getKey.mockRejectedValue(new Error('Connection refused'));

      manager.addIdP(config);

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 150));

      const status = manager.getIdPHealthStatus('https://idp.example.com');
      expect(status).toMatchObject({
        healthy: false,
        error: 'Connection refused',
      });
    });

    it('should stop monitoring when last monitored IdP is removed', async () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
        enableHealthMonitoring: true,
      };

      manager.addIdP(config);

      // Clear mock calls from initial health check
      mockJWKSClient.getKey.mockClear();

      manager.removeIdP('https://idp.example.com');

      // Wait to ensure no more health checks run
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockJWKSClient.getKey).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should clean up resources', () => {
      const config: ExternalIdPConfig = {
        provider: 'generic',
        issuer: 'https://idp.example.com',
        audience: 'api',
        enableHealthMonitoring: true,
      };

      manager.addIdP(config);
      manager.shutdown();

      expect(manager.getIdPs()).toHaveLength(0);
      expect(manager.getHealthStatus()).toHaveLength(0);
      expect(mockJWKSClient.clearCache).toHaveBeenCalled();
    });
  });
});
