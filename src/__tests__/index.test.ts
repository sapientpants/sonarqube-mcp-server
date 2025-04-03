/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import nock from 'nock';
import { mcpServer } from '../index.js';

// Save environment variables
const originalEnv = process.env;

describe('MCP Server', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    nock.cleanAll();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  it('should have initialized the MCP server', () => {
    expect(mcpServer).toBeDefined();
    expect(mcpServer.server).toBeDefined();
  });

  describe('Tool registration', () => {
    it('has registered the SonarQube tools', () => {
      const toolNames = Object.keys((mcpServer as any)._registeredTools);
      expect(toolNames).toContain('projects');
      expect(toolNames).toContain('issues');
      expect(toolNames.length).toBe(2);
    });
  });

  // Add tests for sonarqube tools
  describe('sonarqube_projects tool', () => {
    // These would be your SonarQube tests
  });

  describe('sonarqube_issues tool', () => {
    // These would be your SonarQube issues tests
  });
});
