import { describe, it, expect, vi } from 'vitest';
import { nullToUndefined, mapToSonarQubeParams } from '../index.js';
vi.mock('../sonarqube.js');
describe('Utility Function Tests', () => {
  describe('nullToUndefined function', () => {
    it('should convert null to undefined but preserve other values', () => {
      expect(nullToUndefined(null)).toBeUndefined();
      expect(nullToUndefined(undefined)).toBeUndefined();
      // Other values should remain the same
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
      expect(nullToUndefined('test')).toBe('test');
      expect(nullToUndefined(123)).toBe(123);
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined(true)).toBe(true);
      // Objects and arrays should be passed through
      const obj = { test: 'value' };
      const arr = [1, 2, 3];
      expect(nullToUndefined(obj)).toBe(obj);
      expect(nullToUndefined(arr)).toBe(arr);
    });
  });
  describe('mapToSonarQubeParams function', () => {
    it('should map MCP tool parameters to SonarQube client parameters', () => {
      const result = mapToSonarQubeParams({
        project_key: 'my-project',
        severity: 'MAJOR',
        page: '10',
        page_size: '25',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE'],
        resolved: 'true',
        types: ['BUG', 'VULNERABILITY'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2023-01-01',
        created_before: '2023-12-31',
        created_at: '2023-06-15',
        created_in_last: '30d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'js'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['ss1', 'ss2'],
        on_component_only: 'true',
        facets: ['facet1', 'facet2'],
        since_leak_period: 'true',
        in_new_code_period: 'true',
      });
      // Check key mappings
      expect(result.projectKey).toBe('my-project');
      expect(result.severity).toBe('MAJOR');
      expect(result.page).toBe('10');
      expect(result.pageSize).toBe('25');
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result.resolutions).toEqual(['FALSE-POSITIVE']);
      expect(result.resolved).toBe('true');
      expect(result.types).toEqual(['BUG', 'VULNERABILITY']);
      expect(result.rules).toEqual(['rule1', 'rule2']);
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.createdAfter).toBe('2023-01-01');
      expect(result.createdBefore).toBe('2023-12-31');
      expect(result.createdAt).toBe('2023-06-15');
      expect(result.createdInLast).toBe('30d');
      expect(result.assignees).toEqual(['user1', 'user2']);
      expect(result.authors).toEqual(['author1', 'author2']);
      expect(result.cwe).toEqual(['cwe1', 'cwe2']);
      expect(result.languages).toEqual(['java', 'js']);
      expect(result.owaspTop10).toEqual(['a1', 'a2']);
      expect(result.sansTop25).toEqual(['sans1', 'sans2']);
      expect(result.sonarsourceSecurity).toEqual(['ss1', 'ss2']);
      expect(result.onComponentOnly).toBe('true');
      expect(result.facets).toEqual(['facet1', 'facet2']);
      expect(result.sinceLeakPeriod).toBe('true');
      expect(result.inNewCodePeriod).toBe('true');
    });
    it('should handle null and undefined values correctly', () => {
      const result = mapToSonarQubeParams({
        project_key: 'my-project',
        severity: null,
        statuses: null,
        resolved: null,
      });
      expect(result.projectKey).toBe('my-project');
      expect(result.severity).toBeUndefined();
      expect(result.statuses).toBeUndefined();
      expect(result.resolved).toBeUndefined();
    });
  });
});
