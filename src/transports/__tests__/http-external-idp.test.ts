import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { HttpTransport } from '../http.js';
import { ExternalIdPConfig } from '../../auth/external-idp-types.js';
import { cleanupMetricsService } from '../../monitoring/metrics.js';
import { HealthService } from '../../monitoring/health.js';

// Access private methods via type casting
interface HttpTransportPrivate {
  parseExternalIdPsFromEnv(): ExternalIdPConfig[];
}

describe('HttpTransport - External IdP Configuration', () => {
  let transport: HttpTransport;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set MCP_HTTP_ALLOW_NO_AUTH to avoid auth initialization
    process.env.MCP_HTTP_ALLOW_NO_AUTH = 'true';

    transport = new HttpTransport({ port: 0 });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    cleanupMetricsService();
    HealthService.resetInstance();
  });

  describe('parseExternalIdPsFromEnv', () => {
    it('should parse a single IdP configuration', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:azure-ad,issuer:https://login.microsoftonline.com/tenant,audience:api://my-app';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0]).toEqual({
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant',
        audience: 'api://my-app',
        jwksUri: undefined,
        groupsClaim: undefined,
        groupsTransform: undefined,
        enableHealthMonitoring: undefined,
        tenantId: undefined,
      });
    });

    it('should parse multiple IdP configurations', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:azure-ad,issuer:https://login.microsoftonline.com/tenant1,audience:api://app1';
      process.env.MCP_EXTERNAL_IDP_2 =
        'provider:okta,issuer:https://dev-123.okta.com,audience:api://app2';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(2);
      expect(idps[0].provider).toBe('azure-ad');
      expect(idps[1].provider).toBe('okta');
    });

    it('should handle all configuration properties', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:keycloak,issuer:https://keycloak.example.com/realms/myrealm,audience:my-client,jwksUri:https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs,groupsClaim:groups,groupsTransform:extract_name,enableHealthMonitoring:true,tenantId:tenant123';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0]).toEqual({
        provider: 'keycloak',
        issuer: 'https://keycloak.example.com/realms/myrealm',
        audience: 'my-client',
        jwksUri: 'https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs',
        groupsClaim: 'groups',
        groupsTransform: 'extract_name',
        enableHealthMonitoring: true,
        tenantId: 'tenant123',
      });
    });

    it('should handle multiple audiences separated by |', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:auth0,issuer:https://myapp.auth0.com/,audience:api://app1|api://app2|api://app3';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0].audience).toEqual(['api://app1', 'api://app2', 'api://app3']);
    });

    it('should trim whitespace from keys and values', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        ' provider : azure-ad , issuer : https://login.microsoftonline.com/tenant , audience : api://my-app ';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0]).toEqual({
        provider: 'azure-ad',
        issuer: 'https://login.microsoftonline.com/tenant',
        audience: 'api://my-app',
        jwksUri: undefined,
        groupsClaim: undefined,
        groupsTransform: undefined,
        enableHealthMonitoring: undefined,
        tenantId: undefined,
      });
    });

    it('should handle URLs with colons correctly', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:generic,issuer:https://idp.example.com:8443/auth,audience:my-app,jwksUri:https://idp.example.com:8443/auth/jwks';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0].issuer).toBe('https://idp.example.com:8443/auth');
      expect(idps[0].jwksUri).toBe('https://idp.example.com:8443/auth/jwks');
    });

    it('should skip invalid configurations missing required fields', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:azure-ad,issuer:https://login.microsoftonline.com/tenant'; // Missing audience
      process.env.MCP_EXTERNAL_IDP_2 = 'issuer:https://okta.com,audience:api://app'; // Missing provider
      process.env.MCP_EXTERNAL_IDP_3 = 'provider:auth0,audience:api://app'; // Missing issuer
      process.env.MCP_EXTERNAL_IDP_4 =
        'provider:keycloak,issuer:https://keycloak.com,audience:my-app'; // Valid

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0].provider).toBe('keycloak');
    });

    it('should handle boolean values correctly', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:azure-ad,issuer:https://login.microsoftonline.com/tenant,audience:api://app,enableHealthMonitoring:true';
      process.env.MCP_EXTERNAL_IDP_2 =
        'provider:okta,issuer:https://okta.com,audience:api://app,enableHealthMonitoring:false';
      process.env.MCP_EXTERNAL_IDP_3 =
        'provider:auth0,issuer:https://auth0.com,audience:api://app,enableHealthMonitoring:invalid';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(3);
      expect(idps[0].enableHealthMonitoring).toBe(true);
      expect(idps[1].enableHealthMonitoring).toBe(false);
      expect(idps[2].enableHealthMonitoring).toBe(false);
    });

    it('should skip empty environment variables', () => {
      process.env.MCP_EXTERNAL_IDP_1 = '';
      process.env.MCP_EXTERNAL_IDP_2 = 'provider:okta,issuer:https://okta.com,audience:api://app';
      process.env.MCP_EXTERNAL_IDP_3 = '';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0].provider).toBe('okta');
    });

    it('should handle malformed configurations gracefully', () => {
      process.env.MCP_EXTERNAL_IDP_1 = 'invalid:config:without:proper:format';
      process.env.MCP_EXTERNAL_IDP_2 = 'provider:okta,issuer:https://okta.com,audience:api://app';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(1);
      expect(idps[0].provider).toBe('okta');
    });

    it('should parse up to 10 IdP configurations', () => {
      for (let i = 1; i <= 12; i++) {
        process.env[`MCP_EXTERNAL_IDP_${i}`] =
          `provider:generic,issuer:https://idp${i}.example.com,audience:app${i}`;
      }

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      // Should only parse the first 10
      expect(idps).toHaveLength(10);
      expect(idps[9].issuer).toBe('https://idp10.example.com');
    });

    it('should handle different group transform values', () => {
      process.env.MCP_EXTERNAL_IDP_1 =
        'provider:azure-ad,issuer:https://login.microsoftonline.com/tenant,audience:api://app,groupsTransform:extract_id';
      process.env.MCP_EXTERNAL_IDP_2 =
        'provider:keycloak,issuer:https://keycloak.com,audience:app,groupsTransform:extract_name';
      process.env.MCP_EXTERNAL_IDP_3 =
        'provider:okta,issuer:https://okta.com,audience:app,groupsTransform:none';

      const idps = (transport as unknown as HttpTransportPrivate).parseExternalIdPsFromEnv();

      expect(idps).toHaveLength(3);
      expect(idps[0].groupsTransform).toBe('extract_id');
      expect(idps[1].groupsTransform).toBe('extract_name');
      expect(idps[2].groupsTransform).toBe('none');
    });
  });
});
