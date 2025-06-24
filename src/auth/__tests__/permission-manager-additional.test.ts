import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { PermissionConfig } from '../types.js';
import path from 'path';
import { tmpdir } from 'os';
import fs from 'fs/promises';

// Spy on fs methods
const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(async () => undefined);
const mkdirSpy = jest
  .spyOn(fs, 'mkdir')
  .mockImplementation(async () => undefined as unknown as string);
const readFileSpy = jest.spyOn(fs, 'readFile').mockImplementation(async () => '{}');

// Import after setting up spies
import { PermissionManager } from '../permission-manager.js';

describe('PermissionManager additional coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveExampleConfig', () => {
    it('should create directory and save config file', async () => {
      const testPath = path.join(tmpdir(), 'test', 'permissions.json');

      await PermissionManager.saveExampleConfig(testPath);

      expect(mkdirSpy).toHaveBeenCalledWith(path.dirname(testPath), { recursive: true });
      expect(writeFileSpy).toHaveBeenCalledWith(testPath, expect.any(String), 'utf-8');

      // Verify saved content is valid JSON
      const savedContent = writeFileSpy.mock.calls[0][1] as string;
      const config = JSON.parse(savedContent);
      expect(config.rules).toBeDefined();
      expect(Array.isArray(config.rules)).toBe(true);
      expect(config.rules.length).toBeGreaterThan(0);
    });

    it('should create config with all expected rule groups', async () => {
      const testPath = path.join(tmpdir(), 'test-config.json');

      await PermissionManager.saveExampleConfig(testPath);

      const savedContent = writeFileSpy.mock.calls[0][1] as string;
      const config = JSON.parse(savedContent);

      // Check for expected groups
      const groups = config.rules.map((r) => r.groups).flat();
      expect(groups).toContain('admin');
      expect(groups).toContain('developer');
      expect(groups).toContain('qa');
      expect(groups).toContain('guest');
    });
  });

  describe('validateConfiguration edge cases', () => {
    it('should handle configuration with null rules', async () => {
      const manager = new PermissionManager();
      const config = { rules: null } as unknown as PermissionConfig;

      await expect(manager.initialize(config)).rejects.toThrow(
        "Cannot read properties of null (reading 'length')"
      );
    });

    it('should handle configuration with undefined rules', async () => {
      const manager = new PermissionManager();
      const config = { rules: undefined } as unknown as PermissionConfig;

      await expect(manager.initialize(config)).rejects.toThrow(
        "Cannot read properties of undefined (reading 'length')"
      );
    });
  });

  describe('loadConfiguration manual test', () => {
    it('should handle successful config load', async () => {
      const manager = new PermissionManager();
      const validConfig: PermissionConfig = {
        rules: [
          {
            groups: ['test-group'],
            allowedProjects: ['test-.*'],
            allowedTools: ['projects'],
            readonly: false,
          },
        ],
      };

      readFileSpy.mockResolvedValueOnce(JSON.stringify(validConfig));

      // Manually set config path using reflection
      const managerAny = manager as { configPath: string };
      managerAny.configPath = '/test/config.json';

      await manager.loadConfiguration();

      expect(manager.isEnabled()).toBe(true);
    });

    it('should handle JSON parse error', async () => {
      const manager = new PermissionManager();

      readFileSpy.mockResolvedValueOnce('invalid json {');

      // Manually set config path
      const managerAny = manager as { configPath: string };
      managerAny.configPath = '/test/config.json';

      await expect(manager.loadConfiguration()).rejects.toThrow();
    });
  });

  describe('createDefaultConfig structure', () => {
    it('should create config with proper priority values', () => {
      const config = PermissionManager.createDefaultConfig();

      const priorities = config.rules.map((r) => r.priority).filter((p) => p !== undefined);
      expect(priorities).toEqual([100, 50, 40, 10]);
    });

    it('should create config with maxSeverity restrictions', () => {
      const config = PermissionManager.createDefaultConfig();

      const devRule = config.rules.find((r) => r.groups?.includes('developer'));
      expect(devRule?.maxSeverity).toBe('CRITICAL');

      const guestRule = config.rules.find((r) => r.groups?.includes('guest'));
      expect(guestRule?.maxSeverity).toBe('MAJOR');
    });

    it('should set hideSensitiveData for guest rule', () => {
      const config = PermissionManager.createDefaultConfig();

      const guestRule = config.rules.find((r) => r.groups?.includes('guest'));
      expect(guestRule?.hideSensitiveData).toBe(true);
    });

    it('should include deniedTools for developer rule', () => {
      const config = PermissionManager.createDefaultConfig();

      const devRule = config.rules.find((r) => r.groups?.includes('developer'));
      expect(devRule?.deniedTools).toContain('system_health');
      expect(devRule?.deniedTools).toContain('system_status');
    });
  });
});
