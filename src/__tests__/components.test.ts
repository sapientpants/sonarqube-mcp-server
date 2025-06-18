/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Save environment variables
const originalEnv = process.env;

describe('Components Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Integration', () => {
    it('should have components handler exported from index', async () => {
      const module = await import('../index.js');
      expect(module.componentsHandler).toBeDefined();
      expect(typeof module.componentsHandler).toBe('function');
    });

    it('should have handleSonarQubeComponents exported from handlers', async () => {
      const module = await import('../handlers/index.js');
      expect(module.handleSonarQubeComponents).toBeDefined();
      expect(typeof module.handleSonarQubeComponents).toBe('function');
    });

    it('should have ComponentsDomain exported from domains', async () => {
      const module = await import('../domains/index.js');
      expect(module.ComponentsDomain).toBeDefined();
      expect(typeof module.ComponentsDomain).toBe('function');
    });

    it('should have components schemas exported', async () => {
      const module = await import('../schemas/index.js');
      expect(module.componentsToolSchema).toBeDefined();
      expect(typeof module.componentsToolSchema).toBe('object');
    });

    it('should have components types exported', async () => {
      const module = await import('../types/index.js');
      // Check that types are available (will be stripped at runtime but validates imports work)
      expect(module).toBeDefined();
    });
  });
});
