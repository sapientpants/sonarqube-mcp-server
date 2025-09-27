import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDefaultClient } from '../index.js';

// Mock the sonarqube module
vi.mock('../sonarqube.js', () => ({
  createSonarQubeClientFromEnv: vi.fn(() => ({
    // Mock client implementation
    listProjects: vi.fn(),
    getIssues: vi.fn(),
  })),
  setSonarQubeElicitationManager: vi.fn(),
  createSonarQubeClientFromEnvWithElicitation: vi.fn(() =>
    Promise.resolve({
      // Mock client implementation
      listProjects: vi.fn(),
      getIssues: vi.fn(),
    })
  ),
}));

describe('Environment Validation', () => {
  // Save original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment variables
    process.env = { ...originalEnv };
    delete process.env.SONARQUBE_TOKEN;
    delete process.env.SONARQUBE_USERNAME;
    delete process.env.SONARQUBE_PASSWORD;
    delete process.env.SONARQUBE_PASSCODE;
    delete process.env.SONARQUBE_URL;
    delete process.env.SONARQUBE_ORGANIZATION;
  });

  afterEach(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('createDefaultClient', () => {
    it('should create client with token authentication', () => {
      process.env.SONARQUBE_TOKEN = 'test-token';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should create client with basic authentication', () => {
      process.env.SONARQUBE_USERNAME = 'test-user';
      process.env.SONARQUBE_PASSWORD = 'test-pass';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should create client with passcode authentication', () => {
      process.env.SONARQUBE_PASSCODE = 'test-passcode';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should throw error when no authentication is provided', () => {
      expect(() => createDefaultClient()).toThrow('No SonarQube authentication configured');
    });

    it('should throw error with invalid URL', () => {
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_URL = 'not-a-valid-url';

      expect(() => createDefaultClient()).toThrow('Invalid SONARQUBE_URL');
    });

    it('should accept valid URL', () => {
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_URL = 'https://sonarqube.example.com';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should accept organization parameter', () => {
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_ORGANIZATION = 'my-org';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should prioritize token over other auth methods', () => {
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_USERNAME = 'test-user';
      process.env.SONARQUBE_PASSWORD = 'test-pass';
      process.env.SONARQUBE_PASSCODE = 'test-passcode';

      // Should not throw - uses token auth
      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should create client when only username is provided (legacy token auth)', () => {
      process.env.SONARQUBE_USERNAME = 'test-user';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should throw error when only password is provided', () => {
      process.env.SONARQUBE_PASSWORD = 'test-pass';

      expect(() => createDefaultClient()).toThrow('No SonarQube authentication configured');
    });
  });
});
