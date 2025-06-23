import { createLogger } from '../utils/logger.js';
import type { TokenClaims } from './token-validator.js';
import type { ISonarQubeClient } from '../types/index.js';
import { randomUUID } from 'crypto';

const logger = createLogger('SessionManager');

/**
 * Session data for a user
 */
export interface UserSession {
  /** Unique session ID */
  id: string;
  /** User's token claims */
  claims: TokenClaims;
  /** SonarQube client for this session */
  client: ISonarQubeClient;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Service account used for this session */
  serviceAccountId?: string;
}

/**
 * Session manager options
 */
export interface SessionManagerOptions {
  /** Session timeout in milliseconds (default: 1 hour) */
  sessionTimeout?: number;
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupInterval?: number;
  /** Maximum concurrent sessions (default: 1000) */
  maxSessions?: number;
}

/**
 * Manages user sessions for concurrent access
 */
export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private userToSessions: Map<string, Set<string>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private readonly options: Required<SessionManagerOptions>;

  constructor(options: SessionManagerOptions = {}) {
    this.options = {
      sessionTimeout: options.sessionTimeout ?? 60 * 60 * 1000, // 1 hour
      cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000, // 5 minutes
      maxSessions: options.maxSessions ?? 1000,
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Create a new session for a user
   */
  createSession(claims: TokenClaims, client: ISonarQubeClient, serviceAccountId?: string): string {
    const sessionId = randomUUID();
    const userId = claims.sub;

    // Check session limit
    if (this.sessions.size >= this.options.maxSessions) {
      // Remove oldest session
      const oldestSession = this.findOldestSession();
      if (oldestSession) {
        this.removeSession(oldestSession.id);
      }
    }

    const session: UserSession = {
      id: sessionId,
      claims,
      client,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      serviceAccountId,
    };

    this.sessions.set(sessionId, session);

    // Track sessions by user
    if (!this.userToSessions.has(userId)) {
      this.userToSessions.set(userId, new Set());
    }
    this.userToSessions.get(userId)!.add(sessionId);

    logger.info('Session created', {
      sessionId,
      userId,
      serviceAccountId,
      totalSessions: this.sessions.size,
    });

    return sessionId;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): UserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Check if session is expired
      if (this.isSessionExpired(session)) {
        this.removeSession(sessionId);
        return undefined;
      }
      // Update last activity
      session.lastActivityAt = new Date();
    }
    return session;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    const sessionIds = this.userToSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    const sessions: UserSession[] = [];
    for (const sessionId of sessionIds) {
      const session = this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const userId = session.claims.sub;
      this.sessions.delete(sessionId);

      // Remove from user tracking
      const userSessions = this.userToSessions.get(userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userToSessions.delete(userId);
        }
      }

      logger.info('Session removed', {
        sessionId,
        userId,
        remainingSessions: this.sessions.size,
      });
    }
  }

  /**
   * Remove all sessions for a user
   */
  removeUserSessions(userId: string): void {
    const sessionIds = this.userToSessions.get(userId);
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userToSessions.delete(userId);

      logger.info('All user sessions removed', {
        userId,
        removedCount: sessionIds.size,
        remainingSessions: this.sessions.size,
      });
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    totalUsers: number;
    oldestSession?: Date;
    newestSession?: Date;
  } {
    let oldestSession: Date | undefined;
    let newestSession: Date | undefined;

    for (const session of this.sessions.values()) {
      if (!oldestSession || session.createdAt < oldestSession) {
        oldestSession = session.createdAt;
      }
      if (!newestSession || session.createdAt > newestSession) {
        newestSession = session.createdAt;
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userToSessions.size,
      oldestSession,
      newestSession,
    };
  }

  /**
   * Shutdown the session manager
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.sessions.clear();
    this.userToSessions.clear();
    logger.info('Session manager shut down');
  }

  /**
   * Check if a session is expired
   */
  private isSessionExpired(session: UserSession): boolean {
    const now = Date.now();
    const lastActivity = session.lastActivityAt.getTime();
    return now - lastActivity > this.options.sessionTimeout;
  }

  /**
   * Find the oldest session
   */
  private findOldestSession(): UserSession | undefined {
    let oldest: UserSession | undefined;
    for (const session of this.sessions.values()) {
      if (!oldest || session.lastActivityAt < oldest.lastActivityAt) {
        oldest = session;
      }
    }
    return oldest;
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.options.cleanupInterval);

    // Don't block Node.js from exiting
    this.cleanupTimer.unref();
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const expiredSessions: string[] = [];
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      logger.info('Cleaning up expired sessions', { count: expiredSessions.length });
      for (const sessionId of expiredSessions) {
        this.removeSession(sessionId);
      }
    }
  }
}
