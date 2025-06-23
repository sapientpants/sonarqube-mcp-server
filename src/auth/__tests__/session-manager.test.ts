import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { SessionManager } from '../session-manager.js';
import type { TokenClaims } from '../token-validator.js';
import type { ISonarQubeClient } from '../../types/index.js';

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockClient: ISonarQubeClient;
  let mockClaims: TokenClaims;

  beforeEach(() => {
    sessionManager = new SessionManager({
      sessionTimeout: 1000, // 1 second for testing
      cleanupInterval: 500, // 0.5 seconds for testing
      maxSessions: 3,
    });

    mockClient = {} as ISonarQubeClient;
    mockClaims = {
      sub: 'user123',
      iss: 'https://auth.example.com',
      aud: 'https://mcp.example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
    };
  });

  afterEach(() => {
    sessionManager.shutdown();
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const sessionId = sessionManager.createSession(mockClaims, mockClient, 'sa1');

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should enforce maximum session limit', () => {
      // Create max sessions
      const sessionIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const claims = { ...mockClaims, sub: `user${i}` };
        sessionIds.push(sessionManager.createSession(claims, mockClient));
      }

      // Create one more - should remove oldest
      const newClaims = { ...mockClaims, sub: 'user4' };
      const newSessionId = sessionManager.createSession(newClaims, mockClient);

      // Check that new session exists but oldest doesn't
      expect(sessionManager.getSession(newSessionId)).toBeDefined();
      expect(sessionManager.getSession(sessionIds[0])).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', () => {
      const sessionId = sessionManager.createSession(mockClaims, mockClient);
      const session = sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.claims).toEqual(mockClaims);
      expect(session?.client).toBe(mockClient);
    });

    it('should return undefined for non-existent session', () => {
      const session = sessionManager.getSession('non-existent');
      expect(session).toBeUndefined();
    });

    it('should update last activity timestamp', async () => {
      const sessionId = sessionManager.createSession(mockClaims, mockClient);
      const session1 = sessionManager.getSession(sessionId);
      const lastActivity1 = session1?.lastActivityAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const session2 = sessionManager.getSession(sessionId);
      const lastActivity2 = session2?.lastActivityAt;

      expect(lastActivity2?.getTime()).toBeGreaterThan(lastActivity1?.getTime() ?? 0);
    });

    it('should remove expired sessions', async () => {
      const sessionId = sessionManager.createSession(mockClaims, mockClient);

      // Wait for session to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('getUserSessions', () => {
    it('should return all sessions for a user', () => {
      // Create multiple sessions for same user
      const sessionId1 = sessionManager.createSession(mockClaims, mockClient);
      const sessionId2 = sessionManager.createSession(mockClaims, mockClient);

      const sessions = sessionManager.getUserSessions(mockClaims.sub);
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id)).toContain(sessionId1);
      expect(sessions.map((s) => s.id)).toContain(sessionId2);
    });

    it('should return empty array for user with no sessions', () => {
      const sessions = sessionManager.getUserSessions('unknown-user');
      expect(sessions).toEqual([]);
    });
  });

  describe('removeSession', () => {
    it('should remove a session', () => {
      const sessionId = sessionManager.createSession(mockClaims, mockClient);

      sessionManager.removeSession(sessionId);

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeUndefined();
    });

    it('should handle removing non-existent session gracefully', () => {
      expect(() => {
        sessionManager.removeSession('non-existent');
      }).not.toThrow();
    });
  });

  describe('removeUserSessions', () => {
    it('should remove all sessions for a user', () => {
      // Create multiple sessions
      sessionManager.createSession(mockClaims, mockClient);
      sessionManager.createSession(mockClaims, mockClient);

      sessionManager.removeUserSessions(mockClaims.sub);

      const sessions = sessionManager.getUserSessions(mockClaims.sub);
      expect(sessions).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return session statistics', () => {
      const claims1 = { ...mockClaims, sub: 'user1' };
      const claims2 = { ...mockClaims, sub: 'user2' };

      sessionManager.createSession(claims1, mockClient);
      sessionManager.createSession(claims1, mockClient);
      sessionManager.createSession(claims2, mockClient);

      const stats = sessionManager.getStats();
      expect(stats.totalSessions).toBe(3);
      expect(stats.totalUsers).toBe(2);
      expect(stats.oldestSession).toBeDefined();
      expect(stats.newestSession).toBeDefined();
    });

    it('should return empty stats when no sessions', () => {
      const stats = sessionManager.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.oldestSession).toBeUndefined();
      expect(stats.newestSession).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should automatically clean up expired sessions', async () => {
      const sessionId = sessionManager.createSession(mockClaims, mockClient);

      // Wait for cleanup to run
      await new Promise((resolve) => setTimeout(resolve, 1600));

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeUndefined();
    });

    it('should clean up multiple expired sessions in bulk', async () => {
      // Create multiple sessions
      const sessionIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const claims = { ...mockClaims, sub: `user${i}` };
        sessionIds.push(sessionManager.createSession(claims, mockClient));
      }

      // Wait for sessions to expire and cleanup to run
      await new Promise((resolve) => setTimeout(resolve, 1600));

      // All sessions should be removed
      sessionIds.forEach((id) => {
        expect(sessionManager.getSession(id)).toBeUndefined();
      });

      // Stats should show no sessions
      const stats = sessionManager.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.totalUsers).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle removal of oldest session when finding oldest', () => {
      // Create sessions with small delays to ensure different timestamps
      const sessions: Array<{ id: string; created: Date }> = [];

      // Create max sessions
      for (let i = 0; i < 3; i++) {
        const claims = { ...mockClaims, sub: `user${i}` };
        const id = sessionManager.createSession(claims, mockClient);
        const session = sessionManager.getSession(id);
        sessions.push({ id, created: session!.createdAt });
      }

      // Sort by creation time to find oldest
      sessions.sort((a, b) => a.created.getTime() - b.created.getTime());
      const oldestId = sessions[0].id;

      // Create one more session to trigger removal
      const newClaims = { ...mockClaims, sub: 'user-new' };
      sessionManager.createSession(newClaims, mockClient);

      // Oldest session should be removed
      expect(sessionManager.getSession(oldestId)).toBeUndefined();

      // Other sessions should still exist
      for (let i = 1; i < sessions.length; i++) {
        expect(sessionManager.getSession(sessions[i].id)).toBeDefined();
      }
    });

    it('should handle empty user session cleanup', () => {
      // Create sessions for a user
      const userId = 'test-user';
      const claims = { ...mockClaims, sub: userId };

      const session1 = sessionManager.createSession(claims, mockClient);
      const session2 = sessionManager.createSession(claims, mockClient);

      // Remove one session
      sessionManager.removeSession(session1);

      // User should still have sessions
      expect(sessionManager.getUserSessions(userId)).toHaveLength(1);

      // Remove last session
      sessionManager.removeSession(session2);

      // User should have no sessions
      expect(sessionManager.getUserSessions(userId)).toHaveLength(0);
    });
  });
});
