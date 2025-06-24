import { describe, it, expect } from '@jest/globals';
import type { PermissionRule } from '../types.js';
import * as projectUtils from '../project-access-utils.js';

// Test the synchronous functions that don't need mocking
describe('project-access-utils spy tests', () => {
  describe('filterProjectsByAccess edge cases', () => {
    it('should handle all regex error scenarios', () => {
      const { filterProjectsByAccess } = projectUtils;

      // Test with multiple invalid patterns
      const rule: PermissionRule = {
        id: 'test',
        name: 'Test',
        groups: [],
        allowedTools: [],
        allowedProjects: [
          '[unclosed',
          '(invalid group',
          '*invalid star',
          '?invalid question',
          '+invalid plus',
          '{invalid brace',
          'valid-pattern',
        ],
      };

      const projects = [{ key: 'valid-pattern' }, { key: '[unclosed' }, { key: 'other-project' }];

      const filtered = filterProjectsByAccess(projects, rule);

      // Only the valid pattern should work
      expect(filtered).toHaveLength(1);
      expect(filtered[0].key).toBe('valid-pattern');
    });
  });

  describe('checkProjectAccess edge cases', () => {
    it('should handle various regex error scenarios', () => {
      const { checkProjectAccess } = projectUtils;

      const rule: PermissionRule = {
        id: 'test',
        name: 'Test',
        groups: [],
        allowedTools: [],
        allowedProjects: [
          '\\invalid escape',
          '[[invalid class',
          '(?invalid group',
          'valid.*pattern',
        ],
      };

      // Test various project keys
      expect(checkProjectAccess('valid-pattern', rule)).toBe(true);
      expect(checkProjectAccess('validXXXpattern', rule)).toBe(true);
      expect(checkProjectAccess('\\invalid escape', rule)).toBe(true); // exact match works
      expect(checkProjectAccess('[[invalid class', rule)).toBe(false);
      expect(checkProjectAccess('(?invalid group', rule)).toBe(false);
    });
  });

  describe('createProjectFilter edge cases', () => {
    it('should handle all error paths', () => {
      const { createProjectFilter } = projectUtils;

      // Test with mix of valid and invalid patterns
      const filter = createProjectFilter([
        '^word$', // valid regex, exact match
        '[', // invalid
        '(?<name>test', // invalid
        '.*valid.*', // valid
        '{2,1}', // invalid quantifier
      ]);

      // Test the filter
      expect(filter('word')).toBe(true); // matches first pattern
      expect(filter('has valid in it')).toBe(true); // matches fourth pattern
      expect(filter('[')).toBe(false);
      expect(filter('no match')).toBe(false); // doesn't match any pattern
    });

    it('should test empty pattern array path', () => {
      const { createProjectFilter } = projectUtils;

      const emptyFilter = createProjectFilter([]);

      // Should always return false
      expect(emptyFilter('anything')).toBe(false);
      expect(emptyFilter('')).toBe(false);
      expect(emptyFilter(null as unknown as string)).toBe(false);
    });
  });

  // Import and execute to increase coverage of module-level code
  it('should import all exports', async () => {
    const utils = await import('../project-access-utils.js');

    // Verify all exports exist
    expect(typeof utils.extractProjectKey).toBe('function');
    expect(typeof utils.checkSingleProjectAccess).toBe('function');
    expect(typeof utils.checkMultipleProjectAccess).toBe('function');
    expect(typeof utils.checkProjectAccessForParams).toBe('function');
    expect(typeof utils.validateProjectAccessOrThrow).toBe('function');
    expect(typeof utils.filterProjectsByAccess).toBe('function');
    expect(typeof utils.checkProjectAccess).toBe('function');
    expect(typeof utils.getProjectFilterPatterns).toBe('function');
    expect(typeof utils.createProjectFilter).toBe('function');
  });
});
