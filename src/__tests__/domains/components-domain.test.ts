/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { ComponentsDomain } from '../../domains/components.js';
import { createSonarQubeClient } from '../../sonarqube.js';

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
    nock.cleanAll();
    const client = createSonarQubeClient(token, baseUrl, organization);
    domain = new ComponentsDomain(client['webApiClient'], organization);
  });

  afterEach(() => {
    nock.cleanAll();
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
});
