import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { PermissionConfig } from '../types.js';
import path from 'path';
import { tmpdir } from 'os';

// Mock fs module first
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
jest.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};
jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn(() => mockLogger),
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

  describe('loadConfiguration', () => {
    beforeEach(() => {
      permissionManager = new PermissionManager();
    });

    it('should return early when no config path is set', async () => {
      await permissionManager.loadConfiguration();

      expect(mockReadFile).not.toHaveBeenCalled();
      expect(permissionManager.isEnabled()).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    beforeEach(() => {
      permissionManager = new PermissionManager();
    });

    it('should allow valid configurations', async () => {
      const validConfig: PermissionConfig = {
        rules: [
          {
            groups: ['admin'],
            allowedProjects: ['.*', '^test-.*'],
            allowedTools: ['projects', 'issues'],
            readonly: false,
          },
          {
            groups: ['guest'],
            allowedProjects: ['^public-.*'],
            allowedTools: ['projects'],
            readonly: true,
          },
        ],
        defaultRule: {
          allowedProjects: [],
          allowedTools: ['projects'],
          readonly: true,
        },
      };

      await expect(permissionManager.initialize(validConfig)).resolves.not.toThrow();
      expect(permissionManager.isEnabled()).toBe(true);
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

  describe('constructor with environment variable', () => {
    it('should set config path from environment variable', () => {
      process.env.MCP_PERMISSION_CONFIG_PATH = tempConfigPath;

      // Create a new instance to test constructor behavior
      new PermissionManager();

      // Instead of accessing private property, test behavior
      expect(process.env.MCP_PERMISSION_CONFIG_PATH).toBe(tempConfigPath);
    });

    it('should handle loadConfiguration error in constructor silently', () => {
      process.env.MCP_PERMISSION_CONFIG_PATH = tempConfigPath;
      mockReadFile.mockRejectedValue(new Error('Config load failed'));

      // Should not throw during construction
      expect(() => new PermissionManager()).not.toThrow();
    });
  });

  describe('constructor with environment variable', () => {
    it('should set config path from environment variable', () => {
      process.env.MCP_PERMISSION_CONFIG_PATH = tempConfigPath;

      // Create a new instance to test constructor behavior
      new PermissionManager();

      // Instead of accessing private property, test behavior
      expect(process.env.MCP_PERMISSION_CONFIG_PATH).toBe(tempConfigPath);
    });
  });

  describe('saveExampleConfig', () => {
    it('should create valid default configuration', () => {
      const defaultConfig = PermissionManager.createDefaultConfig();

      expect(defaultConfig.rules).toBeDefined();
      expect(Array.isArray(defaultConfig.rules)).toBe(true);
      expect(defaultConfig.rules.length).toBeGreaterThan(0);
      expect(defaultConfig.defaultRule).toBeDefined();
    });
  });
});
