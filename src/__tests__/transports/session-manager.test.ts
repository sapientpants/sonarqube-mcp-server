import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager, ISession } from '../../transports/session-manager.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockServer: Server;

  beforeEach(() => {
    // Reset timers
    vi.useFakeTimers();

    // Create mock MCP server
    mockServer = {
      connect: vi.fn(),
    } as unknown as Server;

    // Create session manager with short timeouts for testing
    sessionManager = new SessionManager({
      sessionTimeout: 1000, // 1 second for testing
      cleanupInterval: 500, // 500ms for testing
      maxSessions: 3,
    });
  });

  afterEach(() => {
    // Cleanup
    sessionManager.shutdown();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session with unique ID', () => {
      const session = sessionManager.createSession(mockServer);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.server).toBe(mockServer);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });

    it('should create session with metadata', () => {
      const metadata = { userId: 'test-user', role: 'admin' };
      const session = sessionManager.createSession(mockServer, metadata);

      expect(session.metadata).toEqual(metadata);
    });

    it('should throw error when max sessions limit is reached', () => {
      // Create max sessions
      sessionManager.createSession(mockServer);
      sessionManager.createSession(mockServer);
      sessionManager.createSession(mockServer);

      // Try to create one more
      expect(() => sessionManager.createSession(mockServer)).toThrow(
        'Maximum number of sessions (3) reached. Please try again later.'
      );
    });

    it('should generate unique session IDs', () => {
      const session1 = sessionManager.createSession(mockServer);
      const session2 = sessionManager.createSession(mockServer);

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', () => {
      const created = sessionManager.createSession(mockServer);
      const retrieved = sessionManager.getSession(created.id);

      expect(retrieved).toBe(created);
    });

    it('should update last activity timestamp when retrieving session', () => {
      const session = sessionManager.createSession(mockServer);
      const originalActivity = session.lastActivityAt;

      // Advance time
      vi.advanceTimersByTime(100);

      sessionManager.getSession(session.id);

      expect(session.lastActivityAt.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    it('should return undefined for non-existent session', () => {
      const session = sessionManager.getSession('non-existent-id');

      expect(session).toBeUndefined();
    });
  });

  describe('removeSession', () => {
    it('should remove an existing session', () => {
      const session = sessionManager.createSession(mockServer);

      const removed = sessionManager.removeSession(session.id);
      expect(removed).toBe(true);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });

    it('should return false when removing non-existent session', () => {
      const removed = sessionManager.removeSession('non-existent-id');

      expect(removed).toBe(false);
    });

    it('should allow creating new session after removing one at max capacity', () => {
      // Create max sessions
      const session1 = sessionManager.createSession(mockServer);
      sessionManager.createSession(mockServer);
      sessionManager.createSession(mockServer);

      // Remove one session
      sessionManager.removeSession(session1.id);

      // Should be able to create a new one
      expect(() => sessionManager.createSession(mockServer)).not.toThrow();
    });
  });

  describe('hasSession', () => {
    it('should return true for existing valid session', () => {
      const session = sessionManager.createSession(mockServer);

      expect(sessionManager.hasSession(session.id)).toBe(true);
    });

    it('should return false for non-existent session', () => {
      expect(sessionManager.hasSession('non-existent-id')).toBe(false);
    });

    it('should return false and remove expired session', () => {
      const session = sessionManager.createSession(mockServer);

      // Advance time beyond session timeout
      vi.advanceTimersByTime(1001);

      expect(sessionManager.hasSession(session.id)).toBe(false);
      expect(sessionManager.getSession(session.id)).toBeUndefined();
    });

    it('should return true for session that was recently accessed', () => {
      const session = sessionManager.createSession(mockServer);

      // Access session to update activity
      vi.advanceTimersByTime(500);
      sessionManager.getSession(session.id);

      // Advance time but not beyond timeout from last activity
      vi.advanceTimersByTime(700);

      expect(sessionManager.hasSession(session.id)).toBe(true);
    });
  });

  describe('getAllSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = sessionManager.getAllSessions();

      expect(sessions).toEqual([]);
    });

    it('should return all active sessions', () => {
      const session1 = sessionManager.createSession(mockServer);
      const session2 = sessionManager.createSession(mockServer);

      const sessions = sessionManager.getAllSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions).toContain(session1);
      expect(sessions).toContain(session2);
    });

    it('should not return removed sessions', () => {
      const session1 = sessionManager.createSession(mockServer);
      const session2 = sessionManager.createSession(mockServer);
      sessionManager.removeSession(session1.id);

      const sessions = sessionManager.getAllSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions).toContain(session2);
    });
  });

  describe('getSessionCount', () => {
    it('should return 0 when no sessions exist', () => {
      expect(sessionManager.getSessionCount()).toBe(0);
    });

    it('should return correct count of active sessions', () => {
      sessionManager.createSession(mockServer);
      expect(sessionManager.getSessionCount()).toBe(1);

      sessionManager.createSession(mockServer);
      expect(sessionManager.getSessionCount()).toBe(2);
    });

    it('should update count when sessions are removed', () => {
      const session = sessionManager.createSession(mockServer);
      sessionManager.createSession(mockServer);

      expect(sessionManager.getSessionCount()).toBe(2);

      sessionManager.removeSession(session.id);

      expect(sessionManager.getSessionCount()).toBe(1);
    });
  });

  describe('automatic cleanup', () => {
    it('should automatically clean up expired sessions', () => {
      const session1 = sessionManager.createSession(mockServer);
      const session2 = sessionManager.createSession(mockServer);

      // Make session1 expire but keep session2 active
      vi.advanceTimersByTime(600);
      sessionManager.getSession(session2.id); // Update activity

      // Advance time past timeout for session1
      vi.advanceTimersByTime(500); // Total 1100ms for session1, 500ms for session2

      // hasSession will remove expired sessions when checking
      expect(sessionManager.hasSession(session1.id)).toBe(false);
      expect(sessionManager.hasSession(session2.id)).toBe(true);

      // Now verify they were actually removed/kept
      expect(sessionManager.getSession(session1.id)).toBeUndefined();
      expect(sessionManager.getSession(session2.id)).toBeDefined();
    });

    it('should run cleanup at specified intervals', () => {
      const session1 = sessionManager.createSession(mockServer);
      const session2 = sessionManager.createSession(mockServer);

      // Make both sessions expire
      vi.advanceTimersByTime(1100);

      // Trigger cleanup interval
      vi.advanceTimersByTime(500);

      // Both should be removed
      expect(sessionManager.getSession(session1.id)).toBeUndefined();
      expect(sessionManager.getSession(session2.id)).toBeUndefined();
      expect(sessionManager.getSessionCount()).toBe(0);
    });

    it('should handle multiple cleanup cycles', () => {
      const session1 = sessionManager.createSession(mockServer);

      // First cleanup cycle - session still valid
      vi.advanceTimersByTime(500);
      expect(sessionManager.hasSession(session1.id)).toBe(true);

      // Make session expire
      vi.advanceTimersByTime(600);

      // Second cleanup cycle - should remove expired session
      vi.advanceTimersByTime(500);
      expect(sessionManager.hasSession(session1.id)).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should clear all sessions on shutdown', () => {
      sessionManager.createSession(mockServer);
      sessionManager.createSession(mockServer);

      expect(sessionManager.getSessionCount()).toBe(2);

      sessionManager.shutdown();

      expect(sessionManager.getSessionCount()).toBe(0);
    });

    it('should stop cleanup timer on shutdown', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      sessionManager.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle multiple shutdown calls gracefully', () => {
      sessionManager.createSession(mockServer);

      sessionManager.shutdown();
      expect(sessionManager.getSessionCount()).toBe(0);

      // Second shutdown should not throw
      expect(() => sessionManager.shutdown()).not.toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for empty session manager', () => {
      const stats = sessionManager.getStatistics();

      expect(stats).toEqual({
        activeSessions: 0,
        maxSessions: 3,
        sessionTimeout: 1000,
      });
    });

    it('should return statistics with active sessions', () => {
      const session1 = sessionManager.createSession(mockServer);

      vi.advanceTimersByTime(100);
      const session2 = sessionManager.createSession(mockServer);

      const stats = sessionManager.getStatistics();

      expect(stats.activeSessions).toBe(2);
      expect(stats.maxSessions).toBe(3);
      expect(stats.sessionTimeout).toBe(1000);
      expect(stats.oldestSession).toEqual(session1.createdAt);
      expect(stats.newestSession).toEqual(session2.createdAt);
    });

    it('should correctly identify oldest and newest sessions', () => {
      const session1 = sessionManager.createSession(mockServer);

      vi.advanceTimersByTime(200);
      sessionManager.createSession(mockServer); // Middle session

      vi.advanceTimersByTime(300);
      const session3 = sessionManager.createSession(mockServer);

      const stats = sessionManager.getStatistics();

      expect(stats.oldestSession).toEqual(session1.createdAt);
      expect(stats.newestSession).toEqual(session3.createdAt);
      expect(stats.oldestSession!.getTime()).toBeLessThan(stats.newestSession!.getTime());
    });

    it('should update statistics when sessions are removed', () => {
      const session1 = sessionManager.createSession(mockServer);

      vi.advanceTimersByTime(100);
      sessionManager.createSession(mockServer);

      let stats = sessionManager.getStatistics();
      expect(stats.activeSessions).toBe(2);

      sessionManager.removeSession(session1.id);

      stats = sessionManager.getStatistics();
      expect(stats.activeSessions).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle session with no metadata', () => {
      const session = sessionManager.createSession(mockServer);

      expect(session.metadata).toBeUndefined();
    });

    it('should handle rapid session creation and removal', () => {
      const sessions: ISession[] = [];

      // Rapidly create and remove sessions
      for (let i = 0; i < 10; i++) {
        const session = sessionManager.createSession(mockServer);
        sessions.push(session);

        if (sessions.length > 2) {
          const removed = sessions.shift()!;
          sessionManager.removeSession(removed.id);
        }
      }

      expect(sessionManager.getSessionCount()).toBeLessThanOrEqual(3);
    });

    it('should handle concurrent access to same session', () => {
      const session = sessionManager.createSession(mockServer);

      // Simulate concurrent access
      const retrieved1 = sessionManager.getSession(session.id);
      const retrieved2 = sessionManager.getSession(session.id);

      expect(retrieved1).toBe(session);
      expect(retrieved2).toBe(session);
    });
  });

  describe('configuration defaults', () => {
    it('should use default configuration when not specified', () => {
      const defaultManager = new SessionManager();

      const stats = defaultManager.getStatistics();
      expect(stats.sessionTimeout).toBe(1800000); // 30 minutes
      expect(stats.maxSessions).toBe(100);

      defaultManager.shutdown();
    });

    it('should allow partial configuration override', () => {
      const customManager = new SessionManager({
        maxSessions: 50,
        // sessionTimeout and cleanupInterval use defaults
      });

      const stats = customManager.getStatistics();
      expect(stats.maxSessions).toBe(50);
      expect(stats.sessionTimeout).toBe(1800000); // default

      customManager.shutdown();
    });
  });
});
