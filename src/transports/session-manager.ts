import { v4 as uuidv4 } from 'uuid';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('session-manager');

/**
 * Represents a single HTTP session with its own MCP server instance.
 */
export interface ISession {
  id: string;
  server: Server;
  createdAt: Date;
  lastActivityAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for the session manager.
 */
export interface ISessionManagerConfig {
  /**
   * Session timeout in milliseconds.
   * Default: 30 minutes (1800000 ms)
   */
  sessionTimeout?: number;

  /**
   * Interval for cleaning up inactive sessions in milliseconds.
   * Default: 5 minutes (300000 ms)
   */
  cleanupInterval?: number;

  /**
   * Maximum number of concurrent sessions.
   * Default: 100
   */
  maxSessions?: number;
}

/**
 * Manages HTTP transport sessions with lifecycle management.
 */
export class SessionManager {
  private readonly sessions: Map<string, ISession> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private readonly config: Required<ISessionManagerConfig>;

  constructor(config: ISessionManagerConfig = {}) {
    this.config = {
      sessionTimeout: config.sessionTimeout ?? 1800000, // 30 minutes
      cleanupInterval: config.cleanupInterval ?? 300000, // 5 minutes
      maxSessions: config.maxSessions ?? 100,
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Create a new session with a unique ID.
   *
   * @param server The MCP server instance for this session
   * @param metadata Optional metadata to associate with the session
   * @returns The created session
   * @throws Error if maximum sessions limit is reached
   */
  createSession(server: Server, metadata?: Record<string, unknown>): ISession {
    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error(
        `Maximum number of sessions (${this.config.maxSessions}) reached. Please try again later.`
      );
    }

    const sessionId = uuidv4();
    const session: ISession = metadata
      ? {
          id: sessionId,
          server,
          createdAt: new Date(),
          lastActivityAt: new Date(),
          metadata,
        }
      : {
          id: sessionId,
          server,
          createdAt: new Date(),
          lastActivityAt: new Date(),
        };

    this.sessions.set(sessionId, session);
    logger.info(`Session created: ${sessionId}`);
    logger.debug(`Active sessions: ${this.sessions.size}`);

    return session;
  }

  /**
   * Get a session by its ID.
   *
   * @param sessionId The session ID
   * @returns The session if found, undefined otherwise
   */
  getSession(sessionId: string): ISession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity timestamp
      session.lastActivityAt = new Date();
    }
    return session;
  }

  /**
   * Remove a session by its ID.
   *
   * @param sessionId The session ID
   * @returns True if the session was removed, false if not found
   */
  removeSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logger.info(`Session removed: ${sessionId}`);
      logger.debug(`Active sessions: ${this.sessions.size}`);
    }
    return deleted;
  }

  /**
   * Check if a session exists and is still valid.
   *
   * @param sessionId The session ID
   * @returns True if the session exists and is valid, false otherwise
   */
  hasSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Check if session has timed out
    const now = Date.now();
    const lastActivity = session.lastActivityAt.getTime();
    if (now - lastActivity > this.config.sessionTimeout) {
      this.removeSession(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Get all active sessions.
   *
   * @returns Array of active sessions
   */
  getAllSessions(): ISession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get the number of active sessions.
   *
   * @returns Number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up inactive sessions based on timeout.
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = session.lastActivityAt.getTime();
      if (now - lastActivity > this.config.sessionTimeout) {
        sessionsToRemove.push(sessionId);
      }
    }

    if (sessionsToRemove.length > 0) {
      logger.info(`Cleaning up ${sessionsToRemove.length} inactive sessions`);
      for (const sessionId of sessionsToRemove) {
        this.removeSession(sessionId);
      }
    }
  }

  /**
   * Start the cleanup timer for inactive sessions.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.config.cleanupInterval);

    // Ensure timer doesn't prevent process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the cleanup timer and clear all sessions.
   * Should be called when shutting down the HTTP transport.
   */
  shutdown(): void {
    logger.info('Shutting down session manager');

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      // Delete the property for exactOptionalPropertyTypes compatibility
      delete this.cleanupTimer;
    }

    // Clear all sessions
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    logger.info(`Cleared ${sessionCount} active sessions`);
  }

  /**
   * Get session statistics for monitoring.
   *
   * @returns Session statistics
   */
  getStatistics(): {
    activeSessions: number;
    maxSessions: number;
    sessionTimeout: number;
    oldestSession?: Date;
    newestSession?: Date;
  } {
    const sessions = this.getAllSessions();
    const stats: {
      activeSessions: number;
      maxSessions: number;
      sessionTimeout: number;
      oldestSession?: Date;
      newestSession?: Date;
    } = {
      activeSessions: sessions.length,
      maxSessions: this.config.maxSessions,
      sessionTimeout: this.config.sessionTimeout,
    };

    if (sessions.length > 0) {
      sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const oldestSession = sessions[0];
      const newestSession = sessions.at(-1);
      if (oldestSession) {
        stats.oldestSession = oldestSession.createdAt;
      }
      if (newestSession) {
        stats.newestSession = newestSession.createdAt;
      }
    }

    return stats;
  }
}
