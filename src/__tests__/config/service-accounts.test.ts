import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { getServiceAccountConfig } from '../../config/service-accounts.js';

describe('Service Accounts Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear relevant environment variables
    delete process.env.SONARQUBE_TOKEN;
    delete process.env.SONARQUBE_URL;
    delete process.env.SONARQUBE_ORGANIZATION;
    // Clear numbered service accounts
    for (let i = 1; i <= 10; i++) {
      delete process.env[`SONARQUBE_SA${i}_TOKEN`];
      delete process.env[`SONARQUBE_SA${i}_URL`];
      delete process.env[`SONARQUBE_SA${i}_ORGANIZATION`];
    }
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getServiceAccountConfig', () => {
    describe('default account', () => {
      it('should return null when no token is set', () => {
        const config = getServiceAccountConfig('default');
        expect(config).toBeNull();
      });

      it('should return basic config with token only', () => {
        process.env.SONARQUBE_TOKEN = 'test-token';

        const config = getServiceAccountConfig('default');

        expect(config).toEqual({
          id: 'default',
          token: 'test-token',
          url: undefined,
          organization: undefined,
        });
      });

      it('should return full config with all environment variables', () => {
        process.env.SONARQUBE_TOKEN = 'test-token';
        process.env.SONARQUBE_URL = 'https://sonarqube.example.com';
        process.env.SONARQUBE_ORGANIZATION = 'my-org';

        const config = getServiceAccountConfig('default');

        expect(config).toEqual({
          id: 'default',
          token: 'test-token',
          url: 'https://sonarqube.example.com',
          organization: 'my-org',
        });
      });

      it('should handle empty token environment variable', () => {
        process.env.SONARQUBE_TOKEN = '';

        const config = getServiceAccountConfig('default');
        expect(config).toBeNull();
      });
    });

    describe('numbered service accounts', () => {
      it('should return null when no token is set for SA1', () => {
        const config = getServiceAccountConfig('SA1');
        expect(config).toBeNull();
      });

      it('should return basic config for SA1 with token only', () => {
        process.env.SONARQUBE_SA1_TOKEN = 'sa1-token';

        const config = getServiceAccountConfig('SA1');

        expect(config).toEqual({
          id: 'SA1',
          token: 'sa1-token',
          url: undefined,
          organization: undefined,
        });
      });

      it('should return full config for SA5 with all environment variables', () => {
        process.env.SONARQUBE_SA5_TOKEN = 'sa5-token';
        process.env.SONARQUBE_SA5_URL = 'https://sonarqube5.example.com';
        process.env.SONARQUBE_SA5_ORGANIZATION = 'sa5-org';

        const config = getServiceAccountConfig('SA5');

        expect(config).toEqual({
          id: 'SA5',
          token: 'sa5-token',
          url: 'https://sonarqube5.example.com',
          organization: 'sa5-org',
        });
      });

      it('should handle SA10 (double digit)', () => {
        process.env.SONARQUBE_SA10_TOKEN = 'sa10-token';
        process.env.SONARQUBE_SA10_URL = 'https://sonarqube10.example.com';

        const config = getServiceAccountConfig('SA10');

        expect(config).toEqual({
          id: 'SA10',
          token: 'sa10-token',
          url: 'https://sonarqube10.example.com',
          organization: undefined,
        });
      });

      it('should return null for SA account with empty token', () => {
        process.env.SONARQUBE_SA3_TOKEN = '';
        process.env.SONARQUBE_SA3_URL = 'https://sonarqube3.example.com';

        const config = getServiceAccountConfig('SA3');
        expect(config).toBeNull();
      });

      it('should handle multiple service accounts independently', () => {
        process.env.SONARQUBE_SA1_TOKEN = 'sa1-token';
        process.env.SONARQUBE_SA2_TOKEN = 'sa2-token';
        process.env.SONARQUBE_SA2_URL = 'https://sa2.example.com';

        const config1 = getServiceAccountConfig('SA1');
        const config2 = getServiceAccountConfig('SA2');

        expect(config1).toEqual({
          id: 'SA1',
          token: 'sa1-token',
          url: undefined,
          organization: undefined,
        });

        expect(config2).toEqual({
          id: 'SA2',
          token: 'sa2-token',
          url: 'https://sa2.example.com',
          organization: undefined,
        });
      });
    });

    describe('invalid account IDs', () => {
      it('should return null for unknown account ID', () => {
        const config = getServiceAccountConfig('unknown');
        expect(config).toBeNull();
      });

      it('should return null for empty account ID', () => {
        const config = getServiceAccountConfig('');
        expect(config).toBeNull();
      });

      it('should return null for SA with invalid number format', () => {
        const config = getServiceAccountConfig('SA');
        expect(config).toBeNull();
      });

      it('should return null for SA with non-numeric suffix', () => {
        const config = getServiceAccountConfig('SAx');
        expect(config).toBeNull();
      });

      it('should return null for SA with zero', () => {
        const config = getServiceAccountConfig('SA0');
        expect(config).toBeNull();
      });

      it('should return null for SA with leading zeros', () => {
        const config = getServiceAccountConfig('SA01');
        expect(config).toBeNull();
      });

      it('should return null for lowercase sa', () => {
        process.env.SONARQUBE_SA1_TOKEN = 'test-token';

        const config = getServiceAccountConfig('sa1');
        expect(config).toBeNull();
      });

      it('should return null for mixed case', () => {
        process.env.SONARQUBE_SA1_TOKEN = 'test-token';

        const config = getServiceAccountConfig('Sa1');
        expect(config).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle null account ID', () => {
        const config = getServiceAccountConfig(null as any);
        expect(config).toBeNull();
      });

      it('should handle undefined account ID', () => {
        const config = getServiceAccountConfig(undefined as any);
        expect(config).toBeNull();
      });

      it('should not interfere between default and numbered accounts', () => {
        process.env.SONARQUBE_TOKEN = 'default-token';
        process.env.SONARQUBE_SA1_TOKEN = 'sa1-token';

        const defaultConfig = getServiceAccountConfig('default');
        const sa1Config = getServiceAccountConfig('SA1');

        expect(defaultConfig?.token).toBe('default-token');
        expect(sa1Config?.token).toBe('sa1-token');
      });
    });
  });
});
