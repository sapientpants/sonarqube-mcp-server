import { z } from 'zod';
import { issuesToolSchema } from '../../schemas/issues.js';

describe('issuesToolSchema', () => {
  it('should validate minimal issues parameters', () => {
    const input = {};
    const result = z.object(issuesToolSchema).parse(input);
    expect(result).toEqual({});
  });

  it('should validate issues with project key', () => {
    const input = {
      project_key: 'my-project',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.project_key).toBe('my-project');
  });

  it('should validate issues with all filter parameters', () => {
    const input = {
      project_key: 'my-project',
      projects: ['proj1', 'proj2'],
      branch: 'main',
      pull_request: '123',
      issues: ['ISSUE-1', 'ISSUE-2'],
      severities: ['BLOCKER', 'CRITICAL'],
      severity: 'MAJOR',
      statuses: ['OPEN', 'CONFIRMED'],
      issue_statuses: ['OPEN', 'CONFIRMED'],
      resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
      resolved: true,
      rules: ['java:S1234', 'java:S5678'],
      tags: ['security', 'performance'],
      types: ['BUG', 'VULNERABILITY'],
      languages: ['java', 'javascript'],
      component_keys: ['comp1', 'comp2'],
      components: ['comp3', 'comp4'],
      on_component_only: false,
      created_after: '2023-01-01',
      created_before: '2023-12-31',
      created_at: '2023-06-15',
      created_in_last: '7d',
      assigned: true,
      assignees: ['user1', 'user2'],
      author: 'author1',
      authors: ['author1', 'author2'],
      cwe: ['79', '89'],
      owasp_top10: ['a1', 'a3'],
      owasp_top10_v2021: ['a01', 'a03'],
      sans_top25: ['insecure-interaction', 'risky-resource'],
      sonarsource_security: ['sql-injection', 'xss'],
      sonarsource_security_category: ['injection'],
      clean_code_attribute_categories: ['INTENTIONAL', 'RESPONSIBLE'],
      impact_severities: ['HIGH', 'MEDIUM'],
      impact_software_qualities: ['SECURITY', 'RELIABILITY'],
      facets: ['severities', 'types'],
      facet_mode: 'effort',
      additional_fields: ['_all'],
      in_new_code_period: true,
      since_leak_period: false,
      s: 'FILE_LINE',
      asc: false,
      page: '2',
      page_size: '50',
    };

    const result = z.object(issuesToolSchema).parse(input);
    expect(result.project_key).toBe('my-project');
    expect(result.projects).toEqual(['proj1', 'proj2']);
    expect(result.severities).toEqual(['BLOCKER', 'CRITICAL']);
    expect(result.impact_severities).toEqual(['HIGH', 'MEDIUM']);
    expect(result.clean_code_attribute_categories).toEqual(['INTENTIONAL', 'RESPONSIBLE']);
  });

  it('should handle null values for optional arrays', () => {
    const input = {
      projects: null,
      severities: null,
      tags: null,
      rules: null,
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.projects).toBeNull();
    expect(result.severities).toBeNull();
    expect(result.tags).toBeNull();
    expect(result.rules).toBeNull();
  });

  it('should handle boolean string conversions', () => {
    const input = {
      resolved: 'true',
      assigned: 'false',
      on_component_only: 'true',
      in_new_code_period: 'false',
      since_leak_period: 'true',
      asc: 'false',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.resolved).toBe(true);
    expect(result.assigned).toBe(false);
    expect(result.on_component_only).toBe(true);
    expect(result.in_new_code_period).toBe(false);
    expect(result.since_leak_period).toBe(true);
    expect(result.asc).toBe(false);
  });

  it('should handle page number string conversions', () => {
    const input = {
      page: '3',
      page_size: '25',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.page).toBe(3);
    expect(result.page_size).toBe(25);
  });

  it('should reject invalid severity values', () => {
    const input = {
      severities: ['INVALID'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid status values', () => {
    const input = {
      statuses: ['INVALID_STATUS'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid impact severity values', () => {
    const input = {
      impact_severities: ['VERY_HIGH'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid clean code categories', () => {
    const input = {
      clean_code_attribute_categories: ['INVALID_CATEGORY'],
    };
    expect(() => z.object(issuesToolSchema).parse(input)).toThrow();
  });

  it('should handle empty arrays', () => {
    const input = {
      projects: [],
      tags: [],
      rules: [],
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.projects).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.rules).toEqual([]);
  });

  it('should handle partial parameters', () => {
    const input = {
      project_key: 'test',
      severities: ['MAJOR'],
      page: '1',
    };
    const result = z.object(issuesToolSchema).parse(input);
    expect(result.project_key).toBe('test');
    expect(result.severities).toEqual(['MAJOR']);
    expect(result.page).toBe(1);
    expect(result.branch).toBeUndefined();
    expect(result.tags).toBeUndefined();
  });
});
