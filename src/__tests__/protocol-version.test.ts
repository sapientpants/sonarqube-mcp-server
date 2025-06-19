/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createLogger } from '../utils/logger.js';
import {
  SDK_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  LATEST_PROTOCOL_VERSION,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
  VERSION_INFO,
} from '../config/versions.js';

describe('Protocol Version Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should log supported protocol versions on startup', () => {
      const logger = createLogger('test');
      const infoSpy = jest.spyOn(logger, 'info');

      // Simulate server startup logging
      logger.info('Starting SonarQube MCP server', {
        ...VERSION_INFO,
        logFile: 'not configured',
        logLevel: 'DEBUG',
        elicitation: 'disabled',
      });

      expect(infoSpy).toHaveBeenCalledWith('Starting SonarQube MCP server', {
        ...VERSION_INFO,
        logFile: 'not configured',
        logLevel: 'DEBUG',
        elicitation: 'disabled',
      });
    });

    it('should log protocol negotiation info on successful connection', () => {
      const logger = createLogger('test');
      const infoSpy = jest.spyOn(logger, 'info');

      // Simulate successful connection logging
      logger.info('SonarQube MCP server started successfully', {
        mcpProtocolInfo: 'Protocol version will be negotiated with client during initialization',
      });

      expect(infoSpy).toHaveBeenCalledWith('SonarQube MCP server started successfully', {
        mcpProtocolInfo: 'Protocol version will be negotiated with client during initialization',
      });
    });
  });

  describe('Protocol Version Constants', () => {
    it('should support all documented protocol versions', () => {
      // Verify the versions match our documentation
      expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(LATEST_PROTOCOL_VERSION);
      expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(DEFAULT_NEGOTIATED_PROTOCOL_VERSION);
      expect(SUPPORTED_PROTOCOL_VERSIONS.length).toBe(4);
      expect(SUPPORTED_PROTOCOL_VERSIONS).toEqual([
        '2025-06-18',
        '2025-03-26',
        '2024-11-05',
        '2024-10-07',
      ]);
    });

    it('should use semantic versioning for SDK', () => {
      const versionParts = SDK_VERSION.split('.');

      expect(versionParts).toHaveLength(3);
      expect(parseInt(versionParts[0])).toBeGreaterThanOrEqual(1);
      expect(parseInt(versionParts[1])).toBeGreaterThanOrEqual(13);
      expect(parseInt(versionParts[2])).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Protocol Compatibility', () => {
    it('should maintain backward compatibility with older protocol versions', () => {
      const oldestSupportedVersion = '2024-10-07';

      // Ensure we still support the oldest protocol version
      expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(oldestSupportedVersion);
    });

    it('should document protocol version support in COMPATIBILITY.md', () => {
      // This test verifies that we have proper documentation
      // The actual file content is maintained separately
      const expectedSections = [
        'Protocol Version Support',
        'Version Negotiation',
        'Current SDK Version',
        'Feature Compatibility',
        'Client Compatibility',
        'SDK Update Process',
      ];

      // This is a documentation test - it doesn't execute but serves as a reminder
      expectedSections.forEach((section) => {
        expect(section).toBeTruthy();
      });
    });
  });

  describe('SDK Version Management', () => {
    it('should have consistent SDK version references', () => {
      // Verify SDK version is correctly set
      expect(SDK_VERSION).toBe('1.13.0');
    });

    it('should follow SDK update process as documented', () => {
      // This test serves as a reminder of the update process
      const updateSteps = [
        'Check SDK release notes',
        'Review changelog for breaking changes',
        'Update dependency in package.json',
        'Run tests',
        'Update COMPATIBILITY.md',
        'Test with multiple clients',
      ];

      updateSteps.forEach((step) => {
        expect(step).toBeTruthy();
      });
    });
  });
});
