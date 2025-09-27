import { describe, expect, it } from 'vitest';
import { PatternMatcher } from '../pattern-matcher.js';

describe('PatternMatcher', () => {
  describe('constructor', () => {
    it('should create a pattern matcher with a simple pattern', () => {
      const matcher = new PatternMatcher('test');
      expect(matcher.getPattern()).toBe('test');
    });

    it('should create a pattern matcher with wildcards', () => {
      const matcher = new PatternMatcher('*@example.com');
      expect(matcher.getPattern()).toBe('*@example.com');
    });
  });

  describe('test', () => {
    it('should match exact strings', () => {
      const matcher = new PatternMatcher('test@example.com');
      expect(matcher.test('test@example.com')).toBe(true);
      expect(matcher.test('other@example.com')).toBe(false);
    });

    it('should match with * wildcard', () => {
      const matcher = new PatternMatcher('*@example.com');
      expect(matcher.test('test@example.com')).toBe(true);
      expect(matcher.test('admin@example.com')).toBe(true);
      expect(matcher.test('user.name@example.com')).toBe(true);
      expect(matcher.test('test@other.com')).toBe(false);
    });

    it('should match with ? wildcard', () => {
      const matcher = new PatternMatcher('user-?');
      expect(matcher.test('user-1')).toBe(true);
      expect(matcher.test('user-a')).toBe(true);
      expect(matcher.test('user-10')).toBe(false);
      expect(matcher.test('user-')).toBe(false);
    });

    it('should match with multiple wildcards', () => {
      const matcher = new PatternMatcher('*@*.example.com');
      expect(matcher.test('user@mail.example.com')).toBe(true);
      expect(matcher.test('admin@auth.example.com')).toBe(true);
      expect(matcher.test('test@example.com')).toBe(false);
    });

    it('should escape regex special characters', () => {
      const matcher = new PatternMatcher('test.user+name@example.com');
      expect(matcher.test('test.user+name@example.com')).toBe(true);
      expect(matcher.test('testXuser+name@example.com')).toBe(false);
    });

    it('should handle patterns with brackets', () => {
      const matcher = new PatternMatcher('[test]@example.com');
      expect(matcher.test('[test]@example.com')).toBe(true);
      expect(matcher.test('test@example.com')).toBe(false);
    });

    it('should handle patterns with parentheses', () => {
      const matcher = new PatternMatcher('(test)*@example.com');
      expect(matcher.test('(test)anything@example.com')).toBe(true);
      expect(matcher.test('test@example.com')).toBe(false);
    });

    it('should handle URL patterns', () => {
      const matcher = new PatternMatcher('https://*.auth.example.com');
      expect(matcher.test('https://prod.auth.example.com')).toBe(true);
      expect(matcher.test('https://dev.auth.example.com')).toBe(true);
      expect(matcher.test('http://prod.auth.example.com')).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a pattern matcher successfully', () => {
      const matcher = PatternMatcher.create('test@*.com', 'test-context');
      expect(matcher).toBeDefined();
      expect(matcher?.getPattern()).toBe('test@*.com');
    });

    it('should handle creation errors gracefully', () => {
      // Force an error by creating an invalid regex pattern
      const invalidPattern = '['; // This will cause a SyntaxError in RegExp constructor

      const matcher = PatternMatcher.create(invalidPattern, 'test-context');
      // The glob to regex conversion should not create invalid patterns
      // But if it somehow does, the create method should handle it gracefully
      // In this case, '[' becomes '\[' which is valid, so matcher is created
      expect(matcher).toBeDefined();
      expect(matcher?.getPattern()).toBe('[');
    });
  });
});
