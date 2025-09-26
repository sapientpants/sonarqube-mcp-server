import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mocked } from 'vitest';
import {
  createSonarQubeClientFromEnvWithElicitation,
  setSonarQubeElicitationManager,
} from '../sonarqube.js';
import { ElicitationManager } from '../utils/elicitation.js';

describe('SonarQube Client with Elicitation', () => {
  const originalEnv = process.env;
  let mockElicitationManager: Mocked<ElicitationManager>;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };

    // Clear any existing auth
    delete process.env.SONARQUBE_TOKEN;
    delete process.env.SONARQUBE_USERNAME;
    delete process.env.SONARQUBE_PASSWORD;
    delete process.env.SONARQUBE_PASSCODE;

    // Create mock elicitation manager
    mockElicitationManager = {
      isEnabled: vi.fn(),
      collectAuthentication: vi.fn(),
      setServer: vi.fn(),
      getOptions: vi.fn(),
      updateOptions: vi.fn(),
      confirmBulkOperation: vi.fn(),
      collectResolutionComment: vi.fn(),
      disambiguateSelection: vi.fn(),
    } as unknown as Mocked<ElicitationManager>;

    // Set the mock manager
    setSonarQubeElicitationManager(mockElicitationManager);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createSonarQubeClientFromEnvWithElicitation', () => {
    it('should create client when environment is already configured', async () => {
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_URL = 'https://test.sonarqube.com';

      const client = await createSonarQubeClientFromEnvWithElicitation();

      expect(client).toBeDefined();
      expect(mockElicitationManager.isEnabled).not.toHaveBeenCalled();
      expect(mockElicitationManager.collectAuthentication).not.toHaveBeenCalled();
    });

    it('should collect token authentication when no auth configured and elicitation enabled', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'accept',
        content: {
          method: 'token',
          token: 'elicited-token',
        },
      });

      const client = await createSonarQubeClientFromEnvWithElicitation();

      expect(client).toBeDefined();
      expect(mockElicitationManager.isEnabled).toHaveBeenCalled();
      expect(mockElicitationManager.collectAuthentication).toHaveBeenCalled();
      expect(process.env.SONARQUBE_TOKEN).toBe('elicited-token');
    });

    it('should collect basic authentication when elicitation provides it', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'accept',
        content: {
          method: 'basic',
          username: 'test-user',
          password: 'test-pass',
        },
      });

      const client = await createSonarQubeClientFromEnvWithElicitation();

      expect(client).toBeDefined();
      expect(process.env.SONARQUBE_USERNAME).toBe('test-user');
      expect(process.env.SONARQUBE_PASSWORD).toBe('test-pass');
    });

    it('should collect passcode authentication when elicitation provides it', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'accept',
        content: {
          method: 'passcode',
          passcode: 'test-passcode',
        },
      });

      const client = await createSonarQubeClientFromEnvWithElicitation();

      expect(client).toBeDefined();
      expect(process.env.SONARQUBE_PASSCODE).toBe('test-passcode');
    });

    it('should throw error when elicitation is cancelled', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'cancel',
      });

      await expect(createSonarQubeClientFromEnvWithElicitation()).rejects.toThrow(
        'No SonarQube authentication configured'
      );
    });

    it('should throw error when elicitation is rejected', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'reject',
      });

      await expect(createSonarQubeClientFromEnvWithElicitation()).rejects.toThrow(
        'No SonarQube authentication configured'
      );
    });

    it('should throw error when elicitation is disabled and no auth configured', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(false);

      await expect(createSonarQubeClientFromEnvWithElicitation()).rejects.toThrow(
        'No SonarQube authentication configured'
      );

      expect(mockElicitationManager.collectAuthentication).not.toHaveBeenCalled();
    });

    it('should handle missing token in elicitation response', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'accept',
        content: {
          method: 'token',
          // token is missing
        },
      });

      await expect(createSonarQubeClientFromEnvWithElicitation()).rejects.toThrow(
        'No SonarQube authentication configured'
      );
    });

    it('should handle missing credentials in basic auth elicitation', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'accept',
        content: {
          method: 'basic',
          username: 'test-user',
          // password is missing
        },
      });

      await expect(createSonarQubeClientFromEnvWithElicitation()).rejects.toThrow(
        'No SonarQube authentication configured'
      );
    });

    it('should handle missing passcode in elicitation response', async () => {
      mockElicitationManager.isEnabled.mockReturnValue(true);
      mockElicitationManager.collectAuthentication.mockResolvedValue({
        action: 'accept',
        content: {
          method: 'passcode',
          // passcode is missing
        },
      });

      await expect(createSonarQubeClientFromEnvWithElicitation()).rejects.toThrow(
        'No SonarQube authentication configured'
      );
    });
  });
});
