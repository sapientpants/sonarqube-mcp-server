/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockHttpClient } from './mocks/http-client.mock.js';
import { createDefaultClient } from '../index.js';
import { createSonarQubeClient } from '../sonarqube.js';

// Save original environment variables
const originalEnv = process.env;

describe('Dependency Injection Tests', () => {
  let mockHttpClient: MockHttpClient;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.SONARQUBE_TOKEN = 'test-token';
    process.env.SONARQUBE_URL = 'http://localhost:9000';
    process.env.SONARQUBE_ORGANIZATION = 'test-org';

    // Create fresh mock instances for each test
    mockHttpClient = new MockHttpClient();
    mockHttpClient.mockCommonEndpoints();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Client Factory Functions', () => {
    it('should create a client with default parameters', () => {
      // Test the factory function
      const client = createSonarQubeClient('test-token');
      expect(client).toBeDefined();
    });

    it('should create a client with custom HTTP client', () => {
      // Test that we can inject a custom HTTP client
      const client = createSonarQubeClient('test-token', undefined, undefined, mockHttpClient);
      expect(client).toBeDefined();
    });

    it('should create a default client using environment variables', () => {
      // Test the default client creation function
      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should create a client with custom base URL and organization', () => {
      const customUrl = 'https://custom-sonar.example.com';
      const customOrg = 'custom-org';

      const client = createSonarQubeClient('test-token', customUrl, customOrg, mockHttpClient);
      expect(client).toBeDefined();
    });

    it('should handle null organization parameter', () => {
      const client = createSonarQubeClient('test-token', undefined, null, mockHttpClient);
      expect(client).toBeDefined();
    });
  });

  describe('Environment Variable Configuration', () => {
    it('should use environment variables for default client creation', () => {
      process.env.SONARQUBE_TOKEN = 'env-token';
      process.env.SONARQUBE_URL = 'https://env-sonar.example.com';
      process.env.SONARQUBE_ORGANIZATION = 'env-org';

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });

    it('should handle missing optional environment variables', () => {
      process.env.SONARQUBE_TOKEN = 'env-token';
      delete process.env.SONARQUBE_URL;
      delete process.env.SONARQUBE_ORGANIZATION;

      const client = createDefaultClient();
      expect(client).toBeDefined();
    });
  });
});
