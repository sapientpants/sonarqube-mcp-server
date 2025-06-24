import { describe, it, expect } from '@jest/globals';
import {
  validateAllowedProjects,
  validateAllowedTools,
  validateReadonlyFlag,
  validateRegexPatterns,
  validatePermissionRule,
  validatePartialPermissionRule,
} from '../validation-utils.js';
import { PermissionRule } from '../types.js';

describe('validation-utils comprehensive tests', () => {
  describe('validateAllowedProjects', () => {
    it('should not throw when allowedProjects is an array', () => {
      expect(() => validateAllowedProjects([], 'test context')).not.toThrow();
      expect(() => validateAllowedProjects(['project1', 'project2'], 'test')).not.toThrow();
    });

    it('should throw when allowedProjects is not an array', () => {
      expect(() => validateAllowedProjects('not-array', 'test')).toThrow(
        'test: allowedProjects must be an array'
      );
      expect(() => validateAllowedProjects({}, 'context')).toThrow(
        'context: allowedProjects must be an array'
      );
      expect(() => validateAllowedProjects(123, 'rule')).toThrow(
        'rule: allowedProjects must be an array'
      );
      expect(() => validateAllowedProjects(null, 'null-test')).toThrow(
        'null-test: allowedProjects must be an array'
      );
      expect(() => validateAllowedProjects(undefined, 'undefined-test')).toThrow(
        'undefined-test: allowedProjects must be an array'
      );
    });
  });

  describe('validateAllowedTools', () => {
    it('should not throw when allowedTools is an array', () => {
      expect(() => validateAllowedTools([], 'test context')).not.toThrow();
      expect(() => validateAllowedTools(['issues', 'projects'], 'test')).not.toThrow();
    });

    it('should throw when allowedTools is not an array', () => {
      expect(() => validateAllowedTools('not-array', 'test')).toThrow(
        'test: allowedTools must be an array'
      );
      expect(() => validateAllowedTools({}, 'context')).toThrow(
        'context: allowedTools must be an array'
      );
      expect(() => validateAllowedTools(123, 'rule')).toThrow(
        'rule: allowedTools must be an array'
      );
      expect(() => validateAllowedTools(null, 'null-test')).toThrow(
        'null-test: allowedTools must be an array'
      );
      expect(() => validateAllowedTools(undefined, 'undefined-test')).toThrow(
        'undefined-test: allowedTools must be an array'
      );
    });
  });

  describe('validateReadonlyFlag', () => {
    it('should not throw when readonly is a boolean', () => {
      expect(() => validateReadonlyFlag(true, 'test')).not.toThrow();
      expect(() => validateReadonlyFlag(false, 'test')).not.toThrow();
    });

    it('should throw when readonly is not a boolean', () => {
      expect(() => validateReadonlyFlag('true', 'test')).toThrow(
        'test: readonly must be a boolean'
      );
      expect(() => validateReadonlyFlag(1, 'context')).toThrow(
        'context: readonly must be a boolean'
      );
      expect(() => validateReadonlyFlag(null, 'null-test')).toThrow(
        'null-test: readonly must be a boolean'
      );
      expect(() => validateReadonlyFlag(undefined, 'undefined-test')).toThrow(
        'undefined-test: readonly must be a boolean'
      );
      expect(() => validateReadonlyFlag({}, 'object-test')).toThrow(
        'object-test: readonly must be a boolean'
      );
      expect(() => validateReadonlyFlag([], 'array-test')).toThrow(
        'array-test: readonly must be a boolean'
      );
    });
  });

  describe('validateRegexPatterns', () => {
    it('should not throw for valid regex patterns', () => {
      expect(() => validateRegexPatterns([], 'test')).not.toThrow();
      expect(() => validateRegexPatterns(['.*', '^test-.*', 'project$'], 'test')).not.toThrow();
      expect(() => validateRegexPatterns(['[a-z]+', '\\d+', '(foo|bar)'], 'test')).not.toThrow();
    });

    it('should throw for invalid regex patterns', () => {
      expect(() => validateRegexPatterns(['['], 'test')).toThrow("test: Invalid regex pattern '['");
      expect(() => validateRegexPatterns(['valid', '[invalid'], 'context')).toThrow(
        "context: Invalid regex pattern '[invalid'"
      );
      expect(() => validateRegexPatterns(['(unclosed'], 'rule')).toThrow(
        "rule: Invalid regex pattern '(unclosed'"
      );
      expect(() => validateRegexPatterns(['*invalid'], 'pattern')).toThrow(
        "pattern: Invalid regex pattern '*invalid'"
      );
    });

    it('should validate all patterns in array', () => {
      const patterns = ['valid1', '[invalid', 'valid2'];
      expect(() => validateRegexPatterns(patterns, 'test')).toThrow(
        "test: Invalid regex pattern '[invalid'"
      );
    });
  });

  describe('validatePermissionRule', () => {
    it('should not throw for valid permission rule', () => {
      const validRule: PermissionRule = {
        groups: ['admin'],
        allowedProjects: ['.*'],
        allowedTools: ['issues'],
        readonly: false,
      };

      expect(() => validatePermissionRule(validRule, 0)).not.toThrow();
    });

    it('should validate all fields of the rule', () => {
      const invalidRule = {
        groups: ['admin'],
        allowedProjects: 'not-array' as unknown as string[], // Invalid
        allowedTools: ['issues'],
        readonly: false,
      };

      expect(() => validatePermissionRule(invalidRule, 1)).toThrow(
        'Rule 1: allowedProjects must be an array'
      );
    });

    it('should validate readonly flag', () => {
      const invalidRule = {
        groups: ['admin'],
        allowedProjects: ['.*'],
        allowedTools: ['issues'],
        readonly: 'false' as unknown as boolean, // Invalid
      };

      expect(() => validatePermissionRule(invalidRule, 2)).toThrow(
        'Rule 2: readonly must be a boolean'
      );
    });

    it('should validate regex patterns', () => {
      const invalidRule: PermissionRule = {
        groups: ['admin'],
        allowedProjects: ['valid', '[invalid'],
        allowedTools: ['issues'],
        readonly: false,
      };

      expect(() => validatePermissionRule(invalidRule, 3)).toThrow(
        "Rule 3: Invalid regex pattern '[invalid'"
      );
    });

    it('should include index in error context', () => {
      const invalidRule = {
        groups: ['admin'],
        allowedProjects: null as unknown as string[],
        allowedTools: ['issues'],
        readonly: false,
      };

      expect(() => validatePermissionRule(invalidRule, 5)).toThrow(
        'Rule 5: allowedProjects must be an array'
      );
    });
  });

  describe('validatePartialPermissionRule', () => {
    it('should not throw for empty partial rule', () => {
      expect(() => validatePartialPermissionRule({})).not.toThrow();
    });

    it('should validate allowedProjects when present', () => {
      const partialRule: Partial<PermissionRule> = {
        allowedProjects: 'not-array' as unknown as string[],
      };

      expect(() => validatePartialPermissionRule(partialRule)).toThrow(
        'Default rule: allowedProjects must be an array'
      );
    });

    it('should validate allowedTools when present', () => {
      const partialRule: Partial<PermissionRule> = {
        allowedTools: 123 as unknown as string[],
      };

      expect(() => validatePartialPermissionRule(partialRule)).toThrow(
        'Default rule: allowedTools must be an array'
      );
    });

    it('should validate readonly when present', () => {
      const partialRule: Partial<PermissionRule> = {
        readonly: 'true' as unknown as boolean,
      };

      expect(() => validatePartialPermissionRule(partialRule)).toThrow(
        'Default rule: readonly must be a boolean'
      );
    });

    it('should skip validation for undefined fields', () => {
      const partialRule: Partial<PermissionRule> = {
        allowedProjects: ['valid'],
        // allowedTools is undefined - should not be validated
        readonly: true,
      };

      expect(() => validatePartialPermissionRule(partialRule)).not.toThrow();
    });

    it('should use custom context when provided', () => {
      const partialRule: Partial<PermissionRule> = {
        allowedProjects: null as unknown as string[],
      };

      expect(() => validatePartialPermissionRule(partialRule, 'Custom context')).toThrow(
        'Custom context: allowedProjects must be an array'
      );
    });

    it('should validate multiple fields', () => {
      const partialRule: Partial<PermissionRule> = {
        allowedProjects: ['valid'],
        allowedTools: null as unknown as string[], // Invalid
        readonly: false,
      };

      expect(() => validatePartialPermissionRule(partialRule)).toThrow(
        'Default rule: allowedTools must be an array'
      );
    });

    it('should not validate regex patterns for partial rules', () => {
      // Note: validatePartialPermissionRule doesn't call validateRegexPatterns
      const partialRule: Partial<PermissionRule> = {
        allowedProjects: ['[invalid'], // Invalid regex but should not be validated here
      };

      expect(() => validatePartialPermissionRule(partialRule)).not.toThrow();
    });
  });
});
