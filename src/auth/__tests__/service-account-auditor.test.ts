import { jest } from '@jest/globals';
import { ServiceAccountAuditor } from '../service-account-auditor.js';
import type { TokenClaims } from '../token-validator.js';

describe('ServiceAccountAuditor', () => {
  let auditor: ServiceAccountAuditor;
  let mockClaims: TokenClaims;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    auditor = new ServiceAccountAuditor();
    mockClaims = {
      sub: 'user123',
      iss: 'https://auth.example.com',
      aud: 'sonarqube-mcp',
      exp: 1234567890,
      iat: 1234567800,
      scope: 'read write',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('logAccountAccess', () => {
    it('should log successful account access', () => {
      auditor.logAccountAccess(mockClaims, 'sa-123', 'Test Account', 'production');

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.access).toBe(1);
      expect(stats.eventsByAccount['sa-123']).toBe(1);
      expect(stats.eventsByUser['user123']).toBe(1);
    });

    it('should track multiple access events', () => {
      auditor.logAccountAccess(mockClaims, 'sa-123', 'Test Account', 'production');
      auditor.logAccountAccess(mockClaims, 'sa-456', 'Another Account', 'development');

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByAccount['sa-123']).toBe(1);
      expect(stats.eventsByAccount['sa-456']).toBe(1);
    });
  });

  describe('logAccountAccessDenied', () => {
    it('should log access denied events', () => {
      auditor.logAccountAccessDenied(mockClaims, 'no-permission', 'Insufficient permissions');

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.accessDenied).toBe(1);
      expect(stats.deniedReasons['no-permission']).toBe(1);
    });
  });

  describe('logAccountFailure', () => {
    it('should log account failure events', () => {
      auditor.logAccountFailure('sa-123', 'Test Account', 'Connection timeout', 'user123');

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.failure).toBe(1);
      expect(stats.eventsByAccount['sa-123']).toBe(1);
      expect(stats.failuresByAccount['sa-123']).toBe(1);
    });

    it('should track multiple failures', () => {
      auditor.logAccountFailure('sa-123', 'Test Account', 'Error 1', 'user123');
      auditor.logAccountFailure('sa-123', 'Test Account', 'Error 2', 'user456');

      const stats = auditor.getStatistics();
      expect(stats.failuresByAccount['sa-123']).toBe(2);
    });
  });

  describe('logHealthCheck', () => {
    it('should log successful health check', () => {
      auditor.logHealthCheck('sa-123', 'Test Account', true, 150);

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.healthCheck).toBe(1);
      expect(stats.healthChecksByAccount['sa-123']).toEqual({
        total: 1,
        successful: 1,
        failed: 0,
      });
    });

    it('should log failed health check', () => {
      auditor.logHealthCheck('sa-123', 'Test Account', false, 5000, 'Timeout');

      const stats = auditor.getStatistics();
      expect(stats.healthChecksByAccount['sa-123']).toEqual({
        total: 1,
        successful: 0,
        failed: 1,
      });
    });

    it('should track multiple health checks', () => {
      auditor.logHealthCheck('sa-123', 'Test Account', true, 100);
      auditor.logHealthCheck('sa-123', 'Test Account', false, 5000, 'Error');
      auditor.logHealthCheck('sa-123', 'Test Account', true, 200);

      const stats = auditor.getStatistics();
      expect(stats.healthChecksByAccount['sa-123']).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
      });
    });
  });

  describe('logFailover', () => {
    it('should log failover events', () => {
      auditor.logFailover('sa-123', 'sa-456', 'Primary account failed', 'user123');

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.failover).toBe(1);
      expect(stats.failoversByAccount['sa-123']).toBe(1);
    });
  });

  describe('logConfigurationChange', () => {
    it('should log configuration changes', () => {
      auditor.logConfigurationChange('add-account', { id: 'sa-789', name: 'New Account' });

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);
      expect(stats.eventsByType.configChange).toBe(1);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events in reverse chronological order', () => {
      auditor.logAccountAccess(mockClaims, 'sa-123', 'Account 1', 'prod');

      jest.advanceTimersByTime(1000);
      auditor.logAccountFailure('sa-456', 'Account 2', 'Error', 'user123');

      const events = auditor.getRecentEvents(2);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('failure'); // Most recent first
      expect(events[1].type).toBe('access');
    });

    it('should limit returned events', () => {
      for (let i = 0; i < 10; i++) {
        auditor.logAccountAccess(mockClaims, `sa-${i}`, `Account ${i}`, 'prod');
      }

      const events = auditor.getRecentEvents(5);
      expect(events).toHaveLength(5);
    });
  });

  describe('pruneOldEvents', () => {
    it('should remove events older than retention period', () => {
      auditor.logAccountAccess(mockClaims, 'sa-old', 'Old Account', 'prod');

      // Advance time past retention period (default 7 days)
      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      auditor.logAccountAccess(mockClaims, 'sa-new', 'New Account', 'prod');
      auditor.pruneOldEvents();

      const events = auditor.getRecentEvents(100);
      expect(events).toHaveLength(1);
      expect(events[0].serviceAccountId).toBe('sa-new');
    });

    it('should respect custom retention days', () => {
      const customAuditor = new ServiceAccountAuditor({ retentionDays: 1 });

      customAuditor.logAccountAccess(mockClaims, 'sa-old', 'Old Account', 'prod');

      // Advance time past custom retention period
      jest.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);

      customAuditor.logAccountAccess(mockClaims, 'sa-new', 'New Account', 'prod');
      customAuditor.pruneOldEvents();

      const events = customAuditor.getRecentEvents(100);
      expect(events).toHaveLength(1);
    });

    it('should update statistics after pruning', () => {
      auditor.logAccountAccess(mockClaims, 'sa-old', 'Old Account', 'prod');

      let stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(1);

      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      auditor.pruneOldEvents();

      stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(0);
      expect(stats.eventsByAccount['sa-old']).toBeUndefined();
    });
  });

  describe('detectAnomalies', () => {
    it('should detect high failure rate', () => {
      // Create 10 failures for one account
      for (let i = 0; i < 10; i++) {
        auditor.logAccountFailure('sa-failing', 'Failing Account', 'Error', 'user123');
      }

      // Create normal activity for another account
      auditor.logAccountAccess(mockClaims, 'sa-normal', 'Normal Account', 'prod');

      const anomalies = auditor.detectAnomalies();
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        accountId: 'sa-failing',
        type: 'high-failure-rate',
      });
    });

    it('should detect unusual access patterns', () => {
      // Create many accesses from same user to same account
      for (let i = 0; i < 100; i++) {
        auditor.logAccountAccess(mockClaims, 'sa-123', 'Test Account', 'prod');
      }

      const anomalies = auditor.detectAnomalies();
      expect(anomalies.some((a) => a.type === 'unusual-access-pattern')).toBe(true);
    });

    it('should detect frequent failovers', () => {
      // Create multiple failovers for same account
      for (let i = 0; i < 5; i++) {
        auditor.logFailover('sa-unstable', 'sa-backup', 'Primary failed', 'user123');
      }

      const anomalies = auditor.detectAnomalies();
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        accountId: 'sa-unstable',
        type: 'frequent-failovers',
      });
    });

    it('should not report anomalies for normal activity', () => {
      // Create normal, balanced activity
      auditor.logAccountAccess(mockClaims, 'sa-123', 'Account 1', 'prod');
      auditor.logAccountAccess({ ...mockClaims, sub: 'user456' }, 'sa-456', 'Account 2', 'dev');
      auditor.logHealthCheck('sa-123', 'Account 1', true, 100);

      const anomalies = auditor.detectAnomalies();
      expect(anomalies).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should return empty statistics initially', () => {
      const stats = auditor.getStatistics();
      expect(stats).toEqual({
        totalEvents: 0,
        eventsByType: {
          access: 0,
          accessDenied: 0,
          failure: 0,
          healthCheck: 0,
          failover: 0,
          configChange: 0,
        },
        eventsByAccount: {},
        eventsByUser: {},
        failuresByAccount: {},
        failoversByAccount: {},
        healthChecksByAccount: {},
        deniedReasons: {},
      });
    });

    it('should track all event types correctly', () => {
      auditor.logAccountAccess(mockClaims, 'sa-123', 'Account', 'prod');
      auditor.logAccountAccessDenied(mockClaims, 'no-access', 'Denied');
      auditor.logAccountFailure('sa-123', 'Account', 'Error', 'user123');
      auditor.logHealthCheck('sa-123', 'Account', true, 100);
      auditor.logFailover('sa-123', 'sa-456', 'Failed', 'user123');
      auditor.logConfigurationChange('update', { id: 'sa-123' });

      const stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(6);
      expect(stats.eventsByType).toEqual({
        access: 1,
        accessDenied: 1,
        failure: 1,
        healthCheck: 1,
        failover: 1,
        configChange: 1,
      });
    });
  });

  describe('clear', () => {
    it('should clear all events and statistics', () => {
      auditor.logAccountAccess(mockClaims, 'sa-123', 'Account', 'prod');
      auditor.logAccountFailure('sa-123', 'Account', 'Error', 'user123');

      let stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(2);

      auditor.clear();

      stats = auditor.getStatistics();
      expect(stats.totalEvents).toBe(0);
      expect(auditor.getRecentEvents(100)).toHaveLength(0);
    });
  });

  describe('getAccountAccessReport', () => {
    it('should generate access report for specific account', () => {
      const now = Date.now();

      auditor.logAccountAccess(mockClaims, 'sa-123', 'Test Account', 'prod');
      auditor.logAccountAccess({ ...mockClaims, sub: 'user456' }, 'sa-123', 'Test Account', 'prod');
      auditor.logAccountFailure('sa-123', 'Test Account', 'Error', 'user123');
      auditor.logHealthCheck('sa-123', 'Test Account', true, 100);
      auditor.logHealthCheck('sa-123', 'Test Account', false, 5000, 'Timeout');

      const report = auditor.getAccountAccessReport('sa-123');

      expect(report).toMatchObject({
        accountId: 'sa-123',
        totalAccesses: 2,
        uniqueUsers: 2,
        failures: 1,
        healthChecks: {
          total: 2,
          successful: 1,
          failed: 1,
        },
        users: expect.arrayContaining(['user123', 'user456']),
      });
      expect(report.firstAccess).toBeLessThanOrEqual(now);
      expect(report.lastAccess).toBeGreaterThanOrEqual(now);
    });

    it('should return null for non-existent account', () => {
      const report = auditor.getAccountAccessReport('non-existent');
      expect(report).toBeNull();
    });
  });
});
