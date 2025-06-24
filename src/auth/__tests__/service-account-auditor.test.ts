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
      expect(events[0].eventType).toBe('ACCOUNT_FAILED'); // Most recent first
      expect(events[1].eventType).toBe('ACCOUNT_ACCESSED');
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
      // Create mix of successful and failed accesses for one account
      // Need more than 10 total accesses with >30% failure rate
      for (let i = 0; i < 8; i++) {
        auditor.logAccountAccess(mockClaims, 'sa-failing', 'Failing Account', 'prod');
      }
      for (let i = 0; i < 5; i++) {
        auditor.logAccountAccessDenied(mockClaims, 'sa-failing', 'Auth error');
      }

      // Create normal activity for another account
      for (let i = 0; i < 15; i++) {
        auditor.logAccountAccess(mockClaims, 'sa-normal', 'Normal Account', 'prod');
      }

      const anomalies = auditor.detectAnomalies();
      const highFailureAnomalies = anomalies.filter((a) => a.type === 'high_failure_rate');
      expect(highFailureAnomalies).toHaveLength(1);
      expect(highFailureAnomalies[0]).toMatchObject({
        accountId: 'sa-failing',
        type: 'high_failure_rate',
      });
    });

    it('should detect excessive usage by single user', () => {
      // Create many accesses from same user to same account
      for (let i = 0; i < 100; i++) {
        auditor.logAccountAccess(mockClaims, 'sa-123', 'Test Account', 'prod');
      }

      const anomalies = auditor.detectAnomalies();
      expect(anomalies.some((a) => a.type === 'excessive_usage')).toBe(true);
      expect(
        anomalies.some((a) => a.accountId === 'sa-123' && a.description.includes('user123'))
      ).toBe(true);
    });

    it('should not report anomalies for normal activity', () => {
      // Create balanced activity with multiple users
      const users = ['user1', 'user2', 'user3', 'user4', 'user5'];

      // Distribute accesses among multiple users for each account
      for (let i = 0; i < 20; i++) {
        const user = users[i % users.length];
        auditor.logAccountAccess({ ...mockClaims, sub: user }, 'sa-123', 'Account 1', 'prod');
        auditor.logAccountAccess({ ...mockClaims, sub: user }, 'sa-456', 'Account 2', 'dev');
      }

      // Add some successful operations
      auditor.logHealthCheck('sa-123', 'Account 1', true, 100);
      auditor.logHealthCheck('sa-456', 'Account 2', true, 150);

      const anomalies = auditor.detectAnomalies();
      // Should not detect anomalies for well-distributed usage
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
        deniedReasons: {},
        failuresByAccount: {},
        healthChecksByAccount: {},
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
      expect(auditor.getAllEvents()).toHaveLength(0);
    });
  });

  describe('getAccountAccessReport', () => {
    it('should generate access report for specific account', () => {
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
        successfulAccesses: 2,
        failedAccesses: 0,
        failureRate: 0,
      });
      expect(report.recentEvents).toBeInstanceOf(Array);
      expect(report.recentEvents.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent account', () => {
      const report = auditor.getAccountAccessReport('non-existent');
      expect(report).toBeNull();
    });
  });
});
