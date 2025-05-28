/**
 * @fileoverview Simple logging service for the application.
 * This provides a centralized place for all logging functionality.
 *
 * Configuration:
 * - LOG_LEVEL: Sets the minimum log level (DEBUG, INFO, WARN, ERROR). Defaults to DEBUG.
 * - LOG_FILE: Path to the log file. If not set, no logs will be written.
 *
 * Note: Since MCP servers use stdout for protocol communication, logs are written
 * to a file instead of stdout/stderr to avoid interference.
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Log levels for the application
 * @enum {string}
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Environment-aware logging configuration
 */
const LOG_LEVELS_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Get the log file path from environment
 * @returns {string | null} The log file path or null if not configured
 * @private
 */
function getLogFilePath(): string | null {
  return process.env.LOG_FILE || null;
}

let logFileInitialized = false;

/**
 * Initialize the log file if needed by creating the directory and file
 * Only initializes once per process to avoid redundant file operations
 * @private
 * @returns {void}
 */
function initializeLogFile(): void {
  const logFile = getLogFilePath();
  if (logFile && !logFileInitialized) {
    try {
      // Create directory if it doesn't exist
      const dir = dirname(logFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      // Create or truncate the log file
      writeFileSync(logFile, '');
      logFileInitialized = true;
    } catch {
      // Fail silently if we can't create the log file
      logFileInitialized = true; // Don't retry
    }
  }
}

/**
 * Write a log message to file
 * @param message The formatted log message to write
 * @private
 */
function writeToLogFile(message: string): void {
  const logFile = getLogFilePath();
  if (logFile) {
    try {
      if (!logFileInitialized) {
        initializeLogFile();
      }
      appendFileSync(logFile, `${message}\n`);
    } catch {
      // Fail silently if we can't write to the log file
    }
  }
}

/**
 * Check if a log level should be displayed based on the environment configuration
 * @param level The log level to check
 * @returns {boolean} True if the log level should be displayed
 * @private
 */
function shouldLog(level: LogLevel): boolean {
  const configuredLevel = (process.env.LOG_LEVEL || 'DEBUG') as LogLevel;
  return LOG_LEVELS_PRIORITY[level] >= LOG_LEVELS_PRIORITY[configuredLevel];
}

/**
 * Format a log message with timestamp, level, and context information
 * @param level The log level of the message
 * @param message The log message content
 * @param context Optional context identifier
 * @returns {string} Formatted log message
 * @private
 */
function formatLogMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  return `${timestamp} ${level} ${contextStr}${message}`;
}

/**
 * Logger service for consistent logging throughout the application
 */
export class Logger {
  private context?: string;

  /**
   * Create a new logger instance, optionally with a context
   * @param context Optional context name to identify the log source
   */
  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  debug(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.DEBUG) && getLogFilePath()) {
      const formattedMessage = formatLogMessage(LogLevel.DEBUG, message, this.context);
      const fullMessage =
        data !== undefined
          ? `${formattedMessage} ${JSON.stringify(data, null, 2)}`
          : formattedMessage;
      writeToLogFile(fullMessage);
    }
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  info(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.INFO) && getLogFilePath()) {
      const formattedMessage = formatLogMessage(LogLevel.INFO, message, this.context);
      const fullMessage =
        data !== undefined
          ? `${formattedMessage} ${JSON.stringify(data, null, 2)}`
          : formattedMessage;
      writeToLogFile(fullMessage);
    }
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param data Optional data to include in the log
   */
  warn(message: string, data?: unknown): void {
    if (shouldLog(LogLevel.WARN) && getLogFilePath()) {
      const formattedMessage = formatLogMessage(LogLevel.WARN, message, this.context);
      const fullMessage =
        data !== undefined
          ? `${formattedMessage} ${JSON.stringify(data, null, 2)}`
          : formattedMessage;
      writeToLogFile(fullMessage);
    }
  }

  /**
   * Log an error message with improved error formatting
   * @param message The message to log
   * @param error Optional error to include in the log. The error will be formatted for better readability:
   *        - Error objects will include name, message and stack trace
   *        - Objects will be stringified with proper indentation
   *        - Other values will be converted to strings
   */
  error(message: string, error?: unknown): void {
    if (shouldLog(LogLevel.ERROR) && getLogFilePath()) {
      const formattedMessage = formatLogMessage(LogLevel.ERROR, message, this.context);

      // Format the error for better debugging
      let errorOutput = '';
      if (error !== undefined) {
        if (error instanceof Error) {
          errorOutput = `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
        } else {
          try {
            errorOutput = JSON.stringify(error, null, 2);
          } catch {
            // Fallback to string representation if JSON.stringify fails
            errorOutput = String(error);
          }
        }
      }

      const fullMessage = errorOutput ? `${formattedMessage} ${errorOutput}` : formattedMessage;
      writeToLogFile(fullMessage);
    }
  }
}

/**
 * Default logger instance for the application
 * Pre-configured with the 'SonarQubeMCP' context for quick imports
 * @const {Logger}
 */
export const defaultLogger = new Logger('SonarQubeMCP');

/**
 * Helper function to create a logger with a specific context
 * @param context The context to use for the logger
 * @returns A new logger instance with the specified context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default export for simpler imports
 */
export default defaultLogger;
