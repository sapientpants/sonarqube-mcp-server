import { Logger, LogLevel, createLogger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Logger', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
  const logFile = path.join(tempDir, 'test.log');
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clean up any existing log file
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Logger initialization', () => {
    it('should create logger with context', () => {
      const logger = new Logger('TestContext');
      expect(logger).toBeDefined();
    });

    it('should create logger without context', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
    });

    it('should create logger using createLogger helper', () => {
      const logger = createLogger('TestContext');
      expect(logger).toBeDefined();
    });
  });

  describe('Log file initialization', () => {
    it('should create log file when LOG_FILE is set', () => {
      process.env.LOG_FILE = logFile;
      process.env.LOG_LEVEL = 'DEBUG';

      const logger = new Logger();
      logger.debug('test message');

      expect(fs.existsSync(logFile)).toBe(true);
    });

    it('should handle nested directories', () => {
      // Create a nested directory manually to test path parsing
      const nestedDir = path.join(tempDir, 'nested', 'dir');
      fs.mkdirSync(nestedDir, { recursive: true });

      const nestedLogFile = path.join(nestedDir, 'test.log');
      process.env.LOG_FILE = nestedLogFile;
      process.env.LOG_LEVEL = 'DEBUG';

      const logger = new Logger();
      logger.debug('test message');

      // The logger should work with existing nested directories
      expect(fs.existsSync(nestedLogFile)).toBe(true);

      // Clean up
      if (fs.existsSync(path.join(tempDir, 'nested'))) {
        fs.rmSync(path.join(tempDir, 'nested'), { recursive: true });
      }
    });
  });

  describe('Log level filtering', () => {
    beforeEach(() => {
      process.env.LOG_FILE = logFile;
    });

    it('should log DEBUG messages when LOG_LEVEL is DEBUG', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const logger = new Logger();

      logger.debug('debug message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('DEBUG');
      expect(content).toContain('debug message');
    });

    it('should not log DEBUG messages when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger();

      logger.debug('debug message');

      expect(fs.existsSync(logFile)).toBe(false);
    });

    it('should log INFO messages when LOG_LEVEL is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const logger = new Logger();

      logger.info('info message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('INFO');
      expect(content).toContain('info message');
    });

    it('should not log INFO messages when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger();

      logger.info('info message');

      expect(fs.existsSync(logFile)).toBe(false);
    });

    it('should log WARN messages when LOG_LEVEL is WARN', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = new Logger();

      logger.warn('warn message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('WARN');
      expect(content).toContain('warn message');
    });

    it('should not log WARN messages when LOG_LEVEL is ERROR', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger();

      logger.warn('warn message');

      expect(fs.existsSync(logFile)).toBe(false);
    });

    it('should log ERROR messages when LOG_LEVEL is ERROR', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const logger = new Logger();

      logger.error('error message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('ERROR');
      expect(content).toContain('error message');
    });

    it('should default to DEBUG level when LOG_LEVEL is not set', () => {
      delete process.env.LOG_LEVEL;
      const logger = new Logger();

      logger.debug('debug message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('DEBUG');
      expect(content).toContain('debug message');
    });
  });

  describe('Log message formatting', () => {
    beforeEach(() => {
      process.env.LOG_FILE = logFile;
      process.env.LOG_LEVEL = 'DEBUG';
    });

    it('should format log message with timestamp, level, and context', () => {
      const logger = new Logger('TestContext');

      logger.debug('test message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z DEBUG \[TestContext\] test message/
      );
    });

    it('should format log message without context', () => {
      const logger = new Logger();

      logger.info('test message');

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z INFO test message/);
    });

    it('should include data in log message', () => {
      const logger = new Logger();
      const data = { key: 'value', number: 42 };

      logger.debug('test message', data);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('test message');
      expect(content).toContain('"key": "value"');
      expect(content).toContain('"number": 42');
    });

    it('should handle Error objects specially', () => {
      const logger = new Logger();
      const error = new Error('Test error');

      logger.error('An error occurred', error);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('ERROR');
      expect(content).toContain('An error occurred');
      expect(content).toContain('Error: Test error');
    });

    it('should handle errors without stack traces', () => {
      const logger = new Logger();
      const error = new Error('Test error');
      delete error.stack;

      logger.error('An error occurred', error);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('Error: Test error');
    });

    it('should handle non-Error objects in error logging', () => {
      const logger = new Logger();
      const errorData = { code: 'ERR_001', message: 'Something went wrong' };

      logger.error('An error occurred', errorData);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('"code": "ERR_001"');
      expect(content).toContain('"message": "Something went wrong"');
    });

    it('should handle circular references in error data', () => {
      const logger = new Logger();
      const obj: Record<string, unknown> = { a: 1 };
      obj.circular = obj;

      logger.error('An error occurred', obj);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('[object Object]');
    });
  });

  describe('No logging when LOG_FILE not set', () => {
    beforeEach(() => {
      delete process.env.LOG_FILE;
      process.env.LOG_LEVEL = 'DEBUG';
    });

    it('should not create log file when LOG_FILE is not set', () => {
      const logger = new Logger();

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(fs.existsSync(logFile)).toBe(false);
    });
  });

  describe('Multiple log entries', () => {
    it('should append multiple log entries', () => {
      process.env.LOG_FILE = logFile;
      process.env.LOG_LEVEL = 'DEBUG';

      const logger = new Logger();

      logger.debug('first message');
      logger.info('second message');
      logger.warn('third message');
      logger.error('fourth message');

      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(4);
      expect(lines[0]).toContain('DEBUG');
      expect(lines[0]).toContain('first message');
      expect(lines[1]).toContain('INFO');
      expect(lines[1]).toContain('second message');
      expect(lines[2]).toContain('WARN');
      expect(lines[2]).toContain('third message');
      expect(lines[3]).toContain('ERROR');
      expect(lines[3]).toContain('fourth message');
    });
  });
});

describe('LogLevel enum', () => {
  it('should have correct log levels', () => {
    expect(LogLevel.DEBUG).toBe('DEBUG');
    expect(LogLevel.INFO).toBe('INFO');
    expect(LogLevel.WARN).toBe('WARN');
    expect(LogLevel.ERROR).toBe('ERROR');
  });
});

describe('Default logger export', () => {
  it('should export a default logger with SonarQubeMCP context', async () => {
    // Import the default export
    const module = await import('../utils/logger.js');
    const defaultLogger = module.default;
    expect(defaultLogger).toBeDefined();
    expect(defaultLogger).toBeInstanceOf(Logger);
  });
});
