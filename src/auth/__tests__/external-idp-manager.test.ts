import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ExternalIdPManager } from '../external-idp-manager.js';
import { ExternalIdPConfig, ExternalIdPProvider, ExternalIdPError } from '../external-idp-types.js';
import { TokenClaims } from '../token-validator.js';

// Mock the JWKS client
jest.mock('../jwks-client.js', () => ({
  JWKSClient: jest.fn().mockImplementation(() => ({
    getKey: jest.fn().mockResolvedValue('mock-public-key'),
    clearCache: jest.fn(),
    getCacheStats: jest.fn().mockReturnValue({
      jwksEntries: 1,
      discoveryEntries: 1,
      totalKeys: 2,
    }),
  })),
}));

describe('ExternalIdPManager', () => {
  let manager: ExternalIdPManager;

  beforeEach(() => {
    manager = new ExternalIdPManager({
      autoStartHealthMonitoring: false, // Disable auto health monitoring in tests
    });
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('addIdP', () => {
    it('should add a valid IdP configuration', () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.AZURE_AD,
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://mcp-server',
      };

      manager.addIdP(config);
      const issuers = manager.getIssuers();

      expect(issuers).toContain(config.issuer);
      expect(manager.getIdPConfig(config.issuer)).toMatchObject(config);
    });

    it('should apply provider defaults', () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.AZURE_AD,
        issuer: 'https://login.microsoftonline.com/tenant/v2.0',
        audience: 'api://mcp-server',
      };

      manager.addIdP(config);
      const storedConfig = manager.getIdPConfig(config.issuer);

      expect(storedConfig?.groupsClaim).toBe('groups');
      expect(storedConfig?.groupsTransform).toBe('extract_name');
      expect(storedConfig?.additionalClaims).toContain('preferred_username');
    });

    it('should validate configuration', () => {
      const invalidConfig = {
        provider: ExternalIdPProvider.OKTA,
        // Missing issuer and audience
      } as ExternalIdPConfig;

      expect(() => manager.addIdP(invalidConfig)).toThrow();
    });

    it('should handle invalid issuer URL', () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.OKTA,
        issuer: 'not-a-url',
        audience: 'api://mcp-server',
      };

      expect(() => manager.addIdP(config)).toThrow('Invalid issuer URL');
    });
  });

  describe('removeIdP', () => {
    it('should remove an IdP', () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.AUTH0,
        issuer: 'https://company.auth0.com',
        audience: 'api://mcp-server',
      };

      manager.addIdP(config);
      expect(manager.getIssuers()).toContain(config.issuer);

      manager.removeIdP(config.issuer);
      expect(manager.getIssuers()).not.toContain(config.issuer);
    });
  });

  describe('getPublicKey', () => {
    it('should get public key for known issuer', async () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.OKTA,
        issuer: 'https://company.okta.com',
        audience: 'api://mcp-server',
      };

      manager.addIdP(config);
      const key = await manager.getPublicKey(config.issuer, 'test-kid');

      expect(key).toBe('mock-public-key');
    });

    it('should throw for unknown issuer', async () => {
      await expect(manager.getPublicKey('https://unknown.com', 'test-kid')).rejects.toThrow(
        ExternalIdPError
      );
    });
  });

  describe('extractClaims', () => {
    describe('Azure AD', () => {
      beforeEach(() => {
        const config: ExternalIdPConfig = {
          provider: ExternalIdPProvider.AZURE_AD,
          issuer: 'https://login.microsoftonline.com/tenant/v2.0',
          audience: 'api://mcp-server',
        };
        manager.addIdP(config);
      });

      it('should extract and transform Azure AD groups', () => {
        const claims: TokenClaims = {
          sub: 'user123',
          iss: 'https://login.microsoftonline.com/tenant/v2.0',
          aud: 'api://mcp-server',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          groups: [
            { id: 'group1', displayName: 'Admins' },
            { id: 'group2', displayName: 'Users' },
          ],
          preferred_username: 'user@company.com',
        };

        const extracted = manager.extractClaims(claims.iss, claims);

        expect(extracted.groups).toEqual(['Admins', 'Users']);
        expect(extracted.preferred_username).toBe('user@company.com');
      });
    });

    describe('Auth0', () => {
      beforeEach(() => {
        const config: ExternalIdPConfig = {
          provider: ExternalIdPProvider.AUTH0,
          issuer: 'https://company.auth0.com',
          audience: 'api://mcp-server',
        };
        manager.addIdP(config);
      });

      it('should handle Auth0 namespaced groups claim', () => {
        const claims: TokenClaims = {
          sub: 'auth0|user123',
          iss: 'https://company.auth0.com',
          aud: 'api://mcp-server',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          'https://auth0.com/groups': ['admin', 'developer'],
          nickname: 'john',
        };

        const extracted = manager.extractClaims(claims.iss, claims);

        expect(extracted.groups).toEqual(['admin', 'developer']);
        expect(extracted.nickname).toBe('john');
        expect(extracted['https://auth0.com/groups']).toBeUndefined();
      });
    });

    describe('Custom claim mappings', () => {
      it('should apply custom claim mappings', () => {
        const config: ExternalIdPConfig = {
          provider: ExternalIdPProvider.GENERIC,
          issuer: 'https://custom-idp.com',
          audience: 'api://mcp-server',
          claimMappings: {
            custom_groups: 'groups',
            user_email: 'email',
          },
        };

        manager.addIdP(config);

        const claims: TokenClaims = {
          sub: 'user123',
          iss: 'https://custom-idp.com',
          aud: 'api://mcp-server',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          custom_groups: ['group1', 'group2'],
          user_email: 'user@example.com',
        };

        const extracted = manager.extractClaims(claims.iss, claims);

        expect(extracted.groups).toEqual(['group1', 'group2']);
        expect(extracted.email).toBe('user@example.com');
        expect(extracted.custom_groups).toBeUndefined();
        expect(extracted.user_email).toBeUndefined();
      });
    });
  });

  describe('health monitoring', () => {
    it('should track health status', () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.OKTA,
        issuer: 'https://company.okta.com',
        audience: 'api://mcp-server',
        enableHealthMonitoring: true,
      };

      manager.addIdP(config);
      const healthStatuses = manager.getHealthStatuses();
      const status = healthStatuses.get(config.issuer);

      expect(status).toBeDefined();
      expect(status?.issuer).toBe(config.issuer);
      expect(status?.provider).toBe(ExternalIdPProvider.OKTA);
      expect(status?.isHealthy).toBe(false); // Initially unhealthy until first check
    });

    it('should perform health check', async () => {
      const config: ExternalIdPConfig = {
        provider: ExternalIdPProvider.OKTA,
        issuer: 'https://company.okta.com',
        audience: 'api://mcp-server',
        enableHealthMonitoring: true,
      };

      manager.addIdP(config);

      // Manually trigger health check
      manager.startHealthMonitoring(config.issuer);

      // Wait for health check to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const healthStatuses = manager.getHealthStatuses();
      const status = healthStatuses.get(config.issuer);

      expect(status?.isHealthy).toBe(true);
      expect(status?.lastHealthCheck).toBeDefined();
      expect(status?.responseTime).toBeDefined();
    });
  });

  describe('multi-tenant support', () => {
    it('should support multiple IdPs', () => {
      const azureConfig: ExternalIdPConfig = {
        provider: ExternalIdPProvider.AZURE_AD,
        issuer: 'https://login.microsoftonline.com/tenant1/v2.0',
        audience: 'api://mcp-server',
        tenantId: 'tenant1',
      };

      const oktaConfig: ExternalIdPConfig = {
        provider: ExternalIdPProvider.OKTA,
        issuer: 'https://company.okta.com',
        audience: 'api://mcp-server',
      };

      manager.addIdP(azureConfig);
      manager.addIdP(oktaConfig);

      const issuers = manager.getIssuers();
      expect(issuers).toHaveLength(2);
      expect(issuers).toContain(azureConfig.issuer);
      expect(issuers).toContain(oktaConfig.issuer);
    });
  });
});
