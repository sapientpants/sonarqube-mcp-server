import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSonarQubeClient,
  createSonarQubeClientWithBasicAuth,
  createSonarQubeClientWithPasscode,
  createSonarQubeClientFromEnv,
  SonarQubeClient,
} from '../sonarqube.js';

describe('Authentication Methods', () => {
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

  describe('createSonarQubeClient', () => {
    it('should create a client with token authentication', () => {
      const client = createSonarQubeClient('test-token', 'https://sonarqube.example.com', 'org1');
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should use default URL when not provided', () => {
      const client = createSonarQubeClient('test-token');
      expect(client).toBeDefined();
    });
  });

  describe('createSonarQubeClientWithBasicAuth', () => {
    it('should create a client with basic authentication', () => {
      const client = createSonarQubeClientWithBasicAuth(
        'username',
        'password',
        'https://sonarqube.example.com',
        'org1'
      );
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should use default URL when not provided', () => {
      const client = createSonarQubeClientWithBasicAuth('username', 'password');
      expect(client).toBeDefined();
    });
  });

  describe('createSonarQubeClientWithPasscode', () => {
    it('should create a client with passcode authentication', () => {
      const client = createSonarQubeClientWithPasscode(
        'test-passcode',
        'https://sonarqube.example.com',
        'org1'
      );
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should use default URL when not provided', () => {
      const client = createSonarQubeClientWithPasscode('test-passcode');
      expect(client).toBeDefined();
    });
  });

  describe('createSonarQubeClientFromEnv', () => {
    it('should create a client with token from environment', () => {
      process.env.SONARQUBE_TOKEN = 'env-token';
      process.env.SONARQUBE_URL = 'https://sonarqube.example.com';
      process.env.SONARQUBE_ORGANIZATION = 'org1';

      const client = createSonarQubeClientFromEnv();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should create a client with basic auth from environment', () => {
      process.env.SONARQUBE_USERNAME = 'env-user';
      process.env.SONARQUBE_PASSWORD = 'env-pass';
      process.env.SONARQUBE_URL = 'https://sonarqube.example.com';

      const client = createSonarQubeClientFromEnv();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should create a client with passcode from environment', () => {
      process.env.SONARQUBE_PASSCODE = 'env-passcode';
      process.env.SONARQUBE_URL = 'https://sonarqube.example.com';

      const client = createSonarQubeClientFromEnv();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should prioritize token auth when multiple methods are available', () => {
      process.env.SONARQUBE_TOKEN = 'env-token';
      process.env.SONARQUBE_USERNAME = 'env-user';
      process.env.SONARQUBE_PASSWORD = 'env-pass';
      process.env.SONARQUBE_PASSCODE = 'env-passcode';

      // Should not throw and use token auth
      const client = createSonarQubeClientFromEnv();
      expect(client).toBeDefined();
    });

    it('should use default URL when not provided', () => {
      process.env.SONARQUBE_TOKEN = 'env-token';

      const client = createSonarQubeClientFromEnv();
      expect(client).toBeDefined();
    });

    it('should throw error when no authentication is configured', () => {
      expect(() => createSonarQubeClientFromEnv()).toThrow(
        'No SonarQube authentication configured'
      );
    });

    it('should create client with basic auth when only username is provided (legacy token auth)', () => {
      process.env.SONARQUBE_USERNAME = 'env-user';

      const client = createSonarQubeClientFromEnv();
      expect(client).toBeDefined();
    });

    it('should throw error when only password is provided', () => {
      process.env.SONARQUBE_PASSWORD = 'env-pass';

      expect(() => createSonarQubeClientFromEnv()).toThrow(
        'No SonarQube authentication configured'
      );
    });
  });

  describe('SonarQubeClient static factory methods', () => {
    it('should create client with withBasicAuth', () => {
      const client = SonarQubeClient.withBasicAuth(
        'username',
        'password',
        'https://sonarqube.example.com',
        'org1'
      );
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should create client with withPasscode', () => {
      const client = SonarQubeClient.withPasscode(
        'passcode',
        'https://sonarqube.example.com',
        'org1'
      );
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SonarQubeClient);
    });

    it('should use default URL in static methods', () => {
      const basicClient = SonarQubeClient.withBasicAuth('username', 'password');
      expect(basicClient).toBeDefined();

      const passcodeClient = SonarQubeClient.withPasscode('passcode');
      expect(passcodeClient).toBeDefined();
    });
  });
});
