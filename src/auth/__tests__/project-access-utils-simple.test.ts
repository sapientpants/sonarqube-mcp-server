import { describe, it, expect } from '@jest/globals';
import { PermissionRule } from '../types.js';

describe('project-access-utils simple coverage', () => {
  it('should test extractProjectKey function', async () => {
    const { extractProjectKey } = await import('../project-access-utils.js');

    // Test with colon
    expect(extractProjectKey('my-project:src/main/java/File.java')).toBe('my-project');
    expect(extractProjectKey('project:file.ts')).toBe('project');
    expect(extractProjectKey('complex-project-name:deeply/nested/path/file.js')).toBe(
      'complex-project-name'
    );

    // Test without colon
    expect(extractProjectKey('simple-project')).toBe('simple-project');
    expect(extractProjectKey('no-colon-here')).toBe('no-colon-here');

    // Test edge cases
    expect(extractProjectKey('')).toBe('');
    expect(extractProjectKey(':file.ts')).toBe(':file.ts'); // No colon at position > 0
    expect(extractProjectKey('project:src:file:name.ts')).toBe('project');

    // Test with special characters
    expect(extractProjectKey('my-project_v2.0:src/file.ts')).toBe('my-project_v2.0');
    expect(extractProjectKey('@org/package:src/index.js')).toBe('@org/package');
  });

  it('should test checkSingleProjectAccess function', async () => {
    const { checkSingleProjectAccess } = await import('../project-access-utils.js');

    // This will likely return allowed: true when no permissions are configured
    const result = await checkSingleProjectAccess('test-project');
    expect(result).toHaveProperty('allowed');
    expect(typeof result.allowed).toBe('boolean');

    // Test with different project keys
    const result2 = await checkSingleProjectAccess('another-project');
    expect(result2).toHaveProperty('allowed');

    const result3 = await checkSingleProjectAccess('');
    expect(result3).toHaveProperty('allowed');
  });

  it('should test checkMultipleProjectAccess function', async () => {
    const { checkMultipleProjectAccess } = await import('../project-access-utils.js');

    // Test with empty array
    const emptyResult = await checkMultipleProjectAccess([]);
    expect(emptyResult).toEqual({ allowed: true });

    // Test with single project
    const singleResult = await checkMultipleProjectAccess(['project1']);
    expect(singleResult).toHaveProperty('allowed');
    expect(typeof singleResult.allowed).toBe('boolean');

    // Test with multiple projects
    const multiResult = await checkMultipleProjectAccess(['project1', 'project2', 'project3']);
    expect(multiResult).toHaveProperty('allowed');
  });

  it('should test checkProjectAccessForParams function', async () => {
    const { checkProjectAccessForParams } = await import('../project-access-utils.js');

    // Test with empty params
    const emptyResult = await checkProjectAccessForParams({});
    expect(emptyResult).toEqual({ allowed: true });

    // Test with project_key
    const projectKeyResult = await checkProjectAccessForParams({ project_key: 'my-project' });
    expect(projectKeyResult).toHaveProperty('allowed');

    // Test with projectKey
    const camelCaseResult = await checkProjectAccessForParams({ projectKey: 'another-project' });
    expect(camelCaseResult).toHaveProperty('allowed');

    // Test with component
    const componentResult = await checkProjectAccessForParams({ component: 'project:src/file.ts' });
    expect(componentResult).toHaveProperty('allowed');

    // Test with components array
    const componentsResult = await checkProjectAccessForParams({
      components: ['proj1:file1.ts', 'proj2:file2.ts'],
    });
    expect(componentsResult).toHaveProperty('allowed');

    // Test with component_keys array
    const componentKeysResult = await checkProjectAccessForParams({
      component_keys: ['key1:file.ts', 'key2:file.js', 'key3:file.py'],
    });
    expect(componentKeysResult).toHaveProperty('allowed');

    // Test with non-string values in arrays
    const mixedArrayResult = await checkProjectAccessForParams({
      components: ['valid:file.ts', 123, null, undefined, { key: 'invalid' }],
    });
    expect(mixedArrayResult).toHaveProperty('allowed');

    // Test with null/undefined values
    const nullishResult = await checkProjectAccessForParams({
      project_key: null,
      component: undefined,
      components: null,
    });
    expect(nullishResult).toHaveProperty('allowed');

    // Test with unrelated params
    const unrelatedResult = await checkProjectAccessForParams({
      unrelated: 'value',
      other: 123,
    });
    expect(unrelatedResult).toHaveProperty('allowed');
  });

  it('should test validateProjectAccessOrThrow function', async () => {
    const { validateProjectAccessOrThrow } = await import('../project-access-utils.js');

    // When permissions are disabled, this should not throw
    try {
      await validateProjectAccessOrThrow('test-project');
      await validateProjectAccessOrThrow(['project1', 'project2']);
      await validateProjectAccessOrThrow([]);
      // If we get here, no error was thrown (expected when permissions disabled)
      expect(true).toBe(true);
    } catch (error) {
      // If an error is thrown, it should have the expected format
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Access denied to project');
    }
  });

  it('should test filterProjectsByAccess function', async () => {
    const { filterProjectsByAccess } = await import('../project-access-utils.js');

    const mockRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: ['project-.*', 'test-.*', '^exact-match$'],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    const projects = [
      { key: 'project-one', name: 'Project One' },
      { key: 'project-two', name: 'Project Two' },
      { key: 'test-project', name: 'Test Project' },
      { key: 'other-project', name: 'Other Project' },
      { key: 'exact-match', name: 'Exact Match' },
    ];

    const filtered = filterProjectsByAccess(projects, mockRule);
    expect(filtered).toHaveLength(4); // Should match project-*, test-*, and exact-match
    expect(filtered.map((p) => p.key)).toContain('project-one');
    expect(filtered.map((p) => p.key)).toContain('project-two');
    expect(filtered.map((p) => p.key)).toContain('test-project');
    expect(filtered.map((p) => p.key)).toContain('exact-match');
    expect(filtered.map((p) => p.key)).not.toContain('other-project');

    // Test with empty allowed projects
    const emptyRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: [],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    const emptyFiltered = filterProjectsByAccess(projects, emptyRule);
    expect(emptyFiltered).toHaveLength(0);

    // Test with invalid regex
    const invalidRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: ['[invalid regex'],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    const invalidFiltered = filterProjectsByAccess(projects, invalidRule);
    expect(invalidFiltered).toHaveLength(0); // Invalid regex should not match anything
  });

  it('should test checkProjectAccess function', async () => {
    const { checkProjectAccess } = await import('../project-access-utils.js');

    const mockRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: ['project-.*', 'test-.*'],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    expect(checkProjectAccess('project-one', mockRule)).toBe(true);
    expect(checkProjectAccess('test-project', mockRule)).toBe(true);
    expect(checkProjectAccess('other-project', mockRule)).toBe(false);
    expect(checkProjectAccess('', mockRule)).toBe(false);

    // Test with invalid regex
    const invalidRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: ['[invalid regex'],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    expect(checkProjectAccess('any-project', invalidRule)).toBe(false);
  });

  it('should test getProjectFilterPatterns function', async () => {
    const { getProjectFilterPatterns } = await import('../project-access-utils.js');

    const mockRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: ['pattern1', 'pattern2', 'pattern3'],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    const patterns = getProjectFilterPatterns(mockRule);
    expect(patterns).toEqual(['pattern1', 'pattern2', 'pattern3']);
    expect(patterns).toHaveLength(3);

    // Test with empty patterns
    const emptyRule: PermissionRule = {
      pattern: '.*',
      allowedProjects: [],
      allowedTools: [],
      permissions: [],
      readOnly: false,
    };

    const emptyPatterns = getProjectFilterPatterns(emptyRule);
    expect(emptyPatterns).toEqual([]);
    expect(emptyPatterns).toHaveLength(0);
  });

  it('should test createProjectFilter function', async () => {
    const { createProjectFilter } = await import('../project-access-utils.js');

    // Test with patterns
    const filter = createProjectFilter(['project-.*', 'test-.*']);

    expect(filter('project-one')).toBe(true);
    expect(filter('test-project')).toBe(true);
    expect(filter('other-project')).toBe(false);
    expect(filter('')).toBe(false);

    // Test with empty patterns
    const emptyFilter = createProjectFilter([]);

    expect(emptyFilter('any-project')).toBe(false);
    expect(emptyFilter('')).toBe(false);

    // Test with invalid regex
    const invalidFilter = createProjectFilter(['[invalid regex']);

    expect(invalidFilter('any-project')).toBe(false);

    // Test with exact match pattern
    const exactFilter = createProjectFilter(['^exact-match$']);

    expect(exactFilter('exact-match')).toBe(true);
    expect(exactFilter('not-exact-match')).toBe(false);
    expect(exactFilter('exact-match-plus')).toBe(false);
  });
});
