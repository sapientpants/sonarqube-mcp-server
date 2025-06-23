import { describe, it, expect } from '@jest/globals';
import {
  validateGroups,
  validateProjects,
  validateTools,
  isProjectAllowed,
  isToolAllowed,
} from '../validation-utils.js';
import { PermissionRule } from '../types.js';

describe('validation-utils', () => {
  const mockRule: PermissionRule = {
    groups: ['developer', 'admin'],
    allowedProjects: ['dev-.*', 'test-project'],
    allowedTools: ['issues', 'projects'],
    deniedTools: ['markIssueWontFix'],
    readonly: false,
  };

  describe('validateGroups', () => {
    it('should return true when user groups match rule groups', () => {
      const userGroups = ['developer', 'tester'];
      const result = validateGroups(userGroups, mockRule);
      expect(result).toBe(true);
    });

    it('should return false when user groups do not match rule groups', () => {
      const userGroups = ['guest', 'external'];
      const result = validateGroups(userGroups, mockRule);
      expect(result).toBe(false);
    });

    it('should return true when rule has no group restrictions', () => {
      const userGroups = ['any-group'];
      const ruleWithoutGroups: PermissionRule = {
        ...mockRule,
        groups: undefined,
      };
      const result = validateGroups(userGroups, ruleWithoutGroups);
      expect(result).toBe(true);
    });

    it('should return true when rule has empty groups array', () => {
      const userGroups = ['any-group'];
      const ruleWithEmptyGroups: PermissionRule = {
        ...mockRule,
        groups: [],
      };
      const result = validateGroups(userGroups, ruleWithEmptyGroups);
      expect(result).toBe(true);
    });

    it('should handle empty user groups', () => {
      const userGroups: string[] = [];
      const result = validateGroups(userGroups, mockRule);
      expect(result).toBe(false);
    });

    it('should handle case-sensitive group matching', () => {
      const userGroups = ['Developer']; // Different case
      const result = validateGroups(userGroups, mockRule);
      expect(result).toBe(false);
    });
  });

  describe('validateProjects', () => {
    it('should return true for projects matching regex patterns', () => {
      expect(validateProjects('dev-project-1', mockRule)).toBe(true);
      expect(validateProjects('dev-test-app', mockRule)).toBe(true);
      expect(validateProjects('test-project', mockRule)).toBe(true);
    });

    it('should return false for projects not matching regex patterns', () => {
      expect(validateProjects('prod-project', mockRule)).toBe(false);
      expect(validateProjects('random-project', mockRule)).toBe(false);
    });

    it('should handle empty allowed projects array', () => {
      const ruleWithNoProjects: PermissionRule = {
        ...mockRule,
        allowedProjects: [],
      };
      expect(validateProjects('any-project', ruleWithNoProjects)).toBe(false);
    });

    it('should handle complex regex patterns', () => {
      const ruleWithComplexRegex: PermissionRule = {
        ...mockRule,
        allowedProjects: ['^(dev|test)-.*-v\\d+$', 'special-[a-z]+'],
      };
      expect(validateProjects('dev-app-v1', ruleWithComplexRegex)).toBe(true);
      expect(validateProjects('test-service-v2', ruleWithComplexRegex)).toBe(true);
      expect(validateProjects('special-feature', ruleWithComplexRegex)).toBe(true);
      expect(validateProjects('dev-app', ruleWithComplexRegex)).toBe(false);
      expect(validateProjects('prod-app-v1', ruleWithComplexRegex)).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const ruleWithInvalidRegex: PermissionRule = {
        ...mockRule,
        allowedProjects: ['[invalid-regex'],
      };
      expect(validateProjects('any-project', ruleWithInvalidRegex)).toBe(false);
    });
  });

  describe('validateTools', () => {
    it('should return true for allowed tools not in denied list', () => {
      expect(validateTools('issues', mockRule)).toBe(true);
      expect(validateTools('projects', mockRule)).toBe(true);
    });

    it('should return false for tools not in allowed list', () => {
      expect(validateTools('system_health', mockRule)).toBe(false);
      expect(validateTools('metrics', mockRule)).toBe(false);
    });

    it('should return false for denied tools even if in allowed list', () => {
      const ruleWithConflict: PermissionRule = {
        ...mockRule,
        allowedTools: ['issues', 'markIssueWontFix'],
        deniedTools: ['markIssueWontFix'],
      };
      expect(validateTools('markIssueWontFix', ruleWithConflict)).toBe(false);
    });

    it('should handle empty allowed tools array', () => {
      const ruleWithNoTools: PermissionRule = {
        ...mockRule,
        allowedTools: [],
      };
      expect(validateTools('issues', ruleWithNoTools)).toBe(false);
    });

    it('should handle missing denied tools array', () => {
      const ruleWithoutDeniedTools: PermissionRule = {
        ...mockRule,
        deniedTools: undefined,
      };
      expect(validateTools('issues', ruleWithoutDeniedTools)).toBe(true);
    });

    it('should handle empty denied tools array', () => {
      const ruleWithEmptyDeniedTools: PermissionRule = {
        ...mockRule,
        deniedTools: [],
      };
      expect(validateTools('issues', ruleWithEmptyDeniedTools)).toBe(true);
    });
  });

  describe('isProjectAllowed', () => {
    it('should return true for matching project patterns', () => {
      expect(isProjectAllowed('dev-project-1', ['dev-.*', 'test-project'])).toBe(true);
      expect(isProjectAllowed('test-project', ['dev-.*', 'test-project'])).toBe(true);
    });

    it('should return false for non-matching project patterns', () => {
      expect(isProjectAllowed('prod-project', ['dev-.*', 'test-project'])).toBe(false);
    });

    it('should handle empty patterns array', () => {
      expect(isProjectAllowed('any-project', [])).toBe(false);
    });

    it('should handle multiple patterns with partial matches', () => {
      const patterns = ['^dev-', '-test$', 'special'];
      expect(isProjectAllowed('dev-app', patterns)).toBe(true);
      expect(isProjectAllowed('my-test', patterns)).toBe(true);
      expect(isProjectAllowed('special-case', patterns)).toBe(true);
      expect(isProjectAllowed('production', patterns)).toBe(false);
    });
  });

  describe('isToolAllowed', () => {
    it('should return true for allowed tools not in denied list', () => {
      expect(isToolAllowed('issues', ['issues', 'projects'], [])).toBe(true);
      expect(isToolAllowed('projects', ['issues', 'projects'], [])).toBe(true);
    });

    it('should return false for tools not in allowed list', () => {
      expect(isToolAllowed('metrics', ['issues', 'projects'], [])).toBe(false);
    });

    it('should return false for denied tools even if in allowed list', () => {
      expect(isToolAllowed('issues', ['issues', 'projects'], ['issues'])).toBe(false);
    });

    it('should handle empty allowed tools array', () => {
      expect(isToolAllowed('issues', [], [])).toBe(false);
    });

    it('should handle undefined denied tools array', () => {
      expect(isToolAllowed('issues', ['issues'], undefined)).toBe(true);
    });

    it('should handle empty denied tools array', () => {
      expect(isToolAllowed('issues', ['issues'], [])).toBe(true);
    });

    it('should be case-sensitive for tool names', () => {
      expect(isToolAllowed('Issues', ['issues'], [])).toBe(false);
      expect(isToolAllowed('ISSUES', ['issues'], [])).toBe(false);
    });
  });
});
