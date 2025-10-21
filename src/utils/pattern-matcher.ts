import { createLogger } from './logger.js';

const logger = createLogger('PatternMatcher');

/**
 * A safe pattern matcher that uses glob-style patterns instead of regex.
 * This eliminates regex injection vulnerabilities while providing
 * sufficient flexibility for matching users and issuers.
 *
 * Supported patterns:
 * - * matches zero or more characters
 * - ? matches exactly one character
 * - All other characters match literally
 *
 * Examples:
 * - *@example.com matches any email at example.com
 * - user-? matches user-1, user-a, etc.
 * - https://*.auth.com matches any subdomain of auth.com
 */
export class PatternMatcher {
  private readonly pattern: string;
  private readonly regex: RegExp;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.regex = this.globToRegex(pattern);
  }

  /**
   * Convert a glob pattern to a safe regex
   */
  private globToRegex(pattern: string): RegExp {
    // Escape all regex special characters except * and ?
    const escaped = pattern
      .replaceAll(/[\\^$.()|[\]{}+]/g, '\\$&') // Escape regex special chars
      .replaceAll('*', '.*') // * matches any sequence
      .replaceAll('?', '.'); // ? matches any single character

    // Create regex with anchors for full string matching
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Test if a string matches the pattern
   */
  test(value: string): boolean {
    return this.regex.test(value);
  }

  /**
   * Get the original pattern
   */
  getPattern(): string {
    return this.pattern;
  }

  /**
   * Create a pattern matcher from a string, with error handling
   */
  static create(pattern: string, context: string): PatternMatcher | undefined {
    try {
      const matcher = new PatternMatcher(pattern);
      logger.debug('Created pattern matcher', {
        context,
        pattern,
        regex: matcher.regex.source,
      });
      return matcher;
    } catch (error) {
      logger.warn('Failed to create pattern matcher', {
        pattern,
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }
}
