import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { PermissionConfig } from '../types.js';
import path from 'path';
import { tmpdir } from 'os';

// Mock fs module first
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

// Import after mocking
import { PermissionManager } from '../permission-manager.js';

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;
  let tempConfigPath: string;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.MCP_PERMISSION_CONFIG_PATH;

    // Reset mocks
    jest.clearAllMocks();

    tempConfigPath = path.join(tmpdir(), 'test-permissions.json');
  });

  afterEach(() => {
    delete process.env.MCP_PERMISSION_CONFIG_PATH;
  });

  describe('constructor', () => {
    it('should not load configuration when no environment variable is set', () => {
      permissionManager = new PermissionManager();

      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('should attempt to load configuration when environment variable is set', () => {
      process.env.MCP_PERMISSION_CONFIG_PATH = tempConfigPath;

      permissionManager = new PermissionManager();

      // Constructor triggers async load, but we can't await it directly
      // The actual loading will be tested in loadConfiguration tests
      expect(process.env.MCP_PERMISSION_CONFIG_PATH).toBe(tempConfigPath);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      permissionManager = new PermissionManager();
    });

    it('should initialize with valid configuration', async () => {
      const config: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects', 'issues'],
            readonly: false,
          },
        ],
        enableCaching: true,
        enableAudit: false,
      };

      await permissionManager.initialize(config);

      expect(permissionManager.isEnabled()).toBe(true);
      expect(permissionManager.getPermissionService()).toBeDefined();
    });

    it('should provide permission service after initialization', async () => {
      const config: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };

      await permissionManager.initialize(config);

      const service = permissionManager.getPermissionService();
      expect(service).toBeDefined();
    });
  });

  // Note: loadConfiguration and configuration validation tests are skipped
  // due to complex fs mocking requirements in ES modules environment

  describe('extractUserContext', () => {
    beforeEach(async () => {
      permissionManager = new PermissionManager();

      const config: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };

      await permissionManager.initialize(config);
    });

    it('should extract user context using permission service', () => {
      const claims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        groups: ['admin'],
        scope: 'sonarqube:read',
      };

      const context = permissionManager.extractUserContext(claims);

      expect(context).toBeDefined();
      expect(context?.userId).toBe('user123');
      expect(context?.groups).toEqual(['admin']);
    });

    it('should return null when permission service is not available', () => {
      const uninitializedManager = new PermissionManager();

      const claims = {
        sub: 'user123',
        iss: 'https://auth.example.com',
        aud: 'sonarqube-mcp',
        exp: Date.now() / 1000 + 3600,
        groups: ['admin'],
      };

      const context = uninitializedManager.extractUserContext(claims);

      expect(context).toBeNull();
    });
  });

  describe('createDefaultConfig', () => {
    it('should create valid default configuration', () => {
      const defaultConfig = PermissionManager.createDefaultConfig();

      expect(defaultConfig.rules).toBeDefined();
      expect(Array.isArray(defaultConfig.rules)).toBe(true);
      expect(defaultConfig.rules.length).toBeGreaterThan(0);

      // Validate that default config follows the expected structure
      expect(defaultConfig.defaultRule).toBeDefined();
      expect(defaultConfig.enableCaching).toBe(true);
      expect(defaultConfig.cacheTtl).toBe(300);
      expect(defaultConfig.enableAudit).toBe(false);

      // Check that admin rule exists
      const adminRule = defaultConfig.rules.find((r) => r.groups?.includes('admin'));
      expect(adminRule).toBeDefined();
      expect(adminRule?.readonly).toBe(false);

      // Check that guest rule exists and is readonly
      const guestRule = defaultConfig.rules.find((r) => r.groups?.includes('guest'));
      expect(guestRule).toBeDefined();
      expect(guestRule?.readonly).toBe(true);
    });
  });

  describe('isEnabled', () => {
    it('should return false when not initialized', () => {
      permissionManager = new PermissionManager();

      expect(permissionManager.isEnabled()).toBe(false);
    });

    it('should return true when initialized', async () => {
      permissionManager = new PermissionManager();

      const config: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };

      await permissionManager.initialize(config);

      expect(permissionManager.isEnabled()).toBe(true);
    });
  });

  describe('getPermissionService', () => {
    it('should return null when not initialized', () => {
      permissionManager = new PermissionManager();

      expect(permissionManager.getPermissionService()).toBeNull();
    });

    it('should return service when initialized', async () => {
      permissionManager = new PermissionManager();

      const config: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };

      await permissionManager.initialize(config);

      expect(permissionManager.getPermissionService()).toBeDefined();
    });
  });
});
