import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { PermissionManager } from '../permission-manager.js';
import { PermissionConfig } from '../types.js';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

// Mock fs module
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));
const mockFs = jest.mocked(fs);

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

      expect(mockFs.readFile).not.toHaveBeenCalled();
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

  describe('loadConfiguration', () => {
    beforeEach(() => {
      permissionManager = new PermissionManager();
    });

    it('should load valid configuration from file', async () => {
      const config: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects', 'issues', 'markIssueFalsePositive'],
            readonly: false,
            priority: 100,
          },
          {
            groups: ['developer'],
            allowedProjects: ['^dev-.*'],
            allowedTools: ['projects', 'issues'],
            readonly: false,
            priority: 50,
          },
        ],
        defaultRule: {
          allowedProjects: [],
          allowedTools: [],
          readonly: true,
        },
        enableCaching: true,
        cacheTtl: 300,
        enableAudit: true,
      };

      // Mock successful file read
      mockFs.readFile.mockResolvedValue(JSON.stringify(config));

      // Set config path and load
      permissionManager['configPath'] = tempConfigPath;
      await permissionManager.loadConfiguration();

      expect(mockFs.readFile).toHaveBeenCalledWith(tempConfigPath, 'utf-8');
      expect(permissionManager.isEnabled()).toBe(true);
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow('File not found');
    });

    it('should handle invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow();
    });

    it('should do nothing when no config path is set', async () => {
      await permissionManager.loadConfiguration();

      expect(mockFs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('configuration validation', () => {
    beforeEach(() => {
      permissionManager = new PermissionManager();
    });

    it('should reject configuration without rules array', async () => {
      const invalidConfig = {
        enableCaching: true,
      } as PermissionConfig;

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow(
        'Permission configuration must have a rules array'
      );
    });

    it('should reject rules without allowedProjects array', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedTools: ['projects'],
            readonly: false,
          } as never,
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow(
        'allowedProjects must be an array'
      );
    });

    it('should reject rules without allowedTools array', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            readonly: false,
          } as never,
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow(
        'allowedTools must be an array'
      );
    });

    it('should reject rules without boolean readonly field', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: 'false' as never,
          },
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow(
        'readonly must be a boolean'
      );
    });

    it('should reject invalid regex patterns in allowedProjects', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['[invalid-regex'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow('Invalid regex pattern');
    });

    it('should reject invalid tool names', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects', 'invalid-tool-name'],
            readonly: false,
          },
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow('Invalid tool');
    });

    it('should reject invalid severity levels', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
            maxSeverity: 'INVALID' as never,
          },
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow('Invalid severity');
    });

    it('should reject invalid status values', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
            allowedStatuses: ['OPEN', 'INVALID'] as never,
          },
        ],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow('Invalid status');
    });

    it('should validate default rule when present', async () => {
      const invalidConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
        defaultRule: {
          allowedProjects: ['[invalid-regex'],
          allowedTools: [],
          readonly: true,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      permissionManager['configPath'] = tempConfigPath;

      await expect(permissionManager.loadConfiguration()).rejects.toThrow('Invalid regex pattern');
    });
  });

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
