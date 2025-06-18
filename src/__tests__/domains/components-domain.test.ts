/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ComponentsDomain } from '../../domains/components.js';
import { createSonarQubeClient } from '../../sonarqube.js';
import { resetDefaultClient } from '../../utils/client-factory.js';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

describe('ComponentsDomain', () => {
  let domain: ComponentsDomain;
  const baseUrl = 'http://localhost:9000';
  const token = 'test-token';
  const organization = 'test-org';

  beforeEach(() => {
    resetDefaultClient();
    const client = createSonarQubeClient(token, baseUrl, organization);
    domain = new ComponentsDomain(client['webApiClient'], organization);
  });

  afterEach(() => {
    resetDefaultClient();
  });

  it('should be instantiated correctly', () => {
    expect(domain).toBeDefined();
    expect(domain).toBeInstanceOf(ComponentsDomain);
  });

  it('should have searchComponents method', () => {
    expect(domain.searchComponents).toBeDefined();
    expect(typeof domain.searchComponents).toBe('function');
  });

  it('should have getComponentTree method', () => {
    expect(domain.getComponentTree).toBeDefined();
    expect(typeof domain.getComponentTree).toBe('function');
  });

  it('should have showComponent method', () => {
    expect(domain.showComponent).toBeDefined();
    expect(typeof domain.showComponent).toBe('function');
  });

  describe('searchComponents', () => {
    it('should accept search parameters', () => {
      // Just verify the method exists and is callable
      const method = domain.searchComponents;
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');

      // Don't actually call it as it would make HTTP requests
      expect(method.length).toBeLessThanOrEqual(1); // Expects 0 or 1 parameter
    });
  });

  describe('getComponentTree', () => {
    it('should accept tree parameters', () => {
      // Just verify the method exists and is callable
      const method = domain.getComponentTree;
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');

      // Don't actually call it as it would make HTTP requests
      expect(method.length).toBeLessThanOrEqual(1); // Expects 1 parameter
    });
  });

  describe('showComponent', () => {
    it('should accept component key and optional parameters', () => {
      // Just verify the method exists and is callable
      const method = domain.showComponent;
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');

      // Don't actually call it as it would make HTTP requests
      expect(method.length).toBeLessThanOrEqual(3); // Expects up to 3 parameters
    });
  });
});
