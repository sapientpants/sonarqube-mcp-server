import { describe, it, expect } from '@jest/globals';
import {
  filterProjectsByAccess,
  checkProjectAccess,
  getProjectFilterPatterns,
  createProjectFilter,
} from '../project-access-utils.js';
import { PermissionRule } from '../types.js';

describe('project-access-utils', () => {
  const mockProjects = [
    { key: 'dev-project-1', name: 'Development Project 1' },
    { key: 'dev-project-2', name: 'Development Project 2' },
    { key: 'test-project', name: 'Test Project' },
    { key: 'prod-project-1', name: 'Production Project 1' },
    { key: 'prod-project-2', name: 'Production Project 2' },
    { key: 'special-case', name: 'Special Case Project' },
  ];

  const mockRule: PermissionRule = {
    groups: ['developer'],
    allowedProjects: ['dev-.*', 'test-project'],
    allowedTools: ['projects'],
    readonly: false,
  };

  describe('filterProjectsByAccess', () => {
    it('should filter projects based on allowed patterns', () => {
      const result = filterProjectsByAccess(mockProjects, mockRule);

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.key)).toEqual(['dev-project-1', 'dev-project-2', 'test-project']);
    });

    it('should return empty array when no projects match', () => {
      const restrictiveRule: PermissionRule = {
        ...mockRule,
        allowedProjects: ['nonexistent-.*'],
      };

      const result = filterProjectsByAccess(mockProjects, restrictiveRule);
      expect(result).toHaveLength(0);
    });

    it('should return all projects when rule allows all patterns', () => {
      const permissiveRule: PermissionRule = {
        ...mockRule,
        allowedProjects: ['.*'], // Match everything
      };

      const result = filterProjectsByAccess(mockProjects, permissiveRule);
      expect(result).toHaveLength(mockProjects.length);
    });

    it('should handle empty projects array', () => {
      const result = filterProjectsByAccess([], mockRule);
      expect(result).toHaveLength(0);
    });

    it('should handle empty allowed projects array', () => {
      const restrictiveRule: PermissionRule = {
        ...mockRule,
        allowedProjects: [],
      };

      const result = filterProjectsByAccess(mockProjects, restrictiveRule);
      expect(result).toHaveLength(0);
    });

    it('should handle complex regex patterns', () => {
      const complexRule: PermissionRule = {
        ...mockRule,
        allowedProjects: ['^(dev|test)-.*', 'special-case$'],
      };

      const result = filterProjectsByAccess(mockProjects, complexRule);
      expect(result.map((p) => p.key)).toEqual([
        'dev-project-1',
        'dev-project-2',
        'test-project',
        'special-case',
      ]);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const invalidRegexRule: PermissionRule = {
        ...mockRule,
        allowedProjects: ['[invalid-regex', 'dev-.*'],
      };

      const result = filterProjectsByAccess(mockProjects, invalidRegexRule);
      // Should still match the valid regex
      expect(result.map((p) => p.key)).toEqual(['dev-project-1', 'dev-project-2']);
    });
  });

  describe('checkProjectAccess', () => {
    it('should return true for allowed project', () => {
      expect(checkProjectAccess('dev-project-1', mockRule)).toBe(true);
      expect(checkProjectAccess('test-project', mockRule)).toBe(true);
    });

    it('should return false for disallowed project', () => {
      expect(checkProjectAccess('prod-project-1', mockRule)).toBe(false);
      expect(checkProjectAccess('random-project', mockRule)).toBe(false);
    });

    it('should return false when rule has empty allowed projects', () => {
      const restrictiveRule: PermissionRule = {
        ...mockRule,
        allowedProjects: [],
      };

      expect(checkProjectAccess('dev-project-1', restrictiveRule)).toBe(false);
    });

    it('should handle complex regex patterns', () => {
      const complexRule: PermissionRule = {
        ...mockRule,
        allowedProjects: ['^dev-project-[12]$', 'test-.*'],
      };

      expect(checkProjectAccess('dev-project-1', complexRule)).toBe(true);
      expect(checkProjectAccess('dev-project-2', complexRule)).toBe(true);
      expect(checkProjectAccess('dev-project-3', complexRule)).toBe(false);
      expect(checkProjectAccess('test-anything', complexRule)).toBe(true);
    });

    it('should handle case-sensitive matching', () => {
      expect(checkProjectAccess('DEV-PROJECT-1', mockRule)).toBe(false);
      expect(checkProjectAccess('Test-Project', mockRule)).toBe(false);
    });
  });

  describe('getProjectFilterPatterns', () => {
    it('should return allowed project patterns', () => {
      const patterns = getProjectFilterPatterns(mockRule);
      expect(patterns).toEqual(['dev-.*', 'test-project']);
    });

    it('should return empty array for rule with no allowed projects', () => {
      const restrictiveRule: PermissionRule = {
        ...mockRule,
        allowedProjects: [],
      };

      const patterns = getProjectFilterPatterns(restrictiveRule);
      expect(patterns).toEqual([]);
    });

    it('should return copy of patterns array', () => {
      const patterns = getProjectFilterPatterns(mockRule);
      patterns.push('new-pattern');

      // Original rule should not be modified
      expect(mockRule.allowedProjects).toEqual(['dev-.*', 'test-project']);
    });
  });

  describe('createProjectFilter', () => {
    it('should create filter function that matches allowed patterns', () => {
      const filter = createProjectFilter(mockRule.allowedProjects);

      expect(filter('dev-project-1')).toBe(true);
      expect(filter('dev-project-2')).toBe(true);
      expect(filter('test-project')).toBe(true);
      expect(filter('prod-project-1')).toBe(false);
    });

    it('should create filter that denies all when no patterns provided', () => {
      const filter = createProjectFilter([]);

      expect(filter('any-project')).toBe(false);
      expect(filter('dev-project-1')).toBe(false);
    });

    it('should create filter that allows all when wildcard pattern provided', () => {
      const filter = createProjectFilter(['.*']);

      expect(filter('any-project')).toBe(true);
      expect(filter('dev-project-1')).toBe(true);
      expect(filter('prod-project-1')).toBe(true);
    });

    it('should handle multiple patterns correctly', () => {
      const filter = createProjectFilter(['dev-.*', 'test-.*', 'special-case']);

      expect(filter('dev-project-1')).toBe(true);
      expect(filter('test-application')).toBe(true);
      expect(filter('special-case')).toBe(true);
      expect(filter('prod-project-1')).toBe(false);
    });

    it('should handle invalid regex patterns gracefully', () => {
      const filter = createProjectFilter(['[invalid-regex', 'dev-.*']);

      // Should not throw and should work with valid patterns
      expect(filter('dev-project-1')).toBe(true);
      expect(filter('invalid-project')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const filter = createProjectFilter(['dev-.*']);

      expect(filter('dev-project-1')).toBe(true);
      expect(filter('DEV-PROJECT-1')).toBe(false);
      expect(filter('Dev-Project-1')).toBe(false);
    });
  });
});
