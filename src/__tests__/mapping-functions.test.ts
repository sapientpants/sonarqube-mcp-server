import { describe, it, expect, beforeEach } from 'vitest';
describe('Mapping Functions', () => {
  let mapToSonarQubeParams: any;
  beforeEach(async () => {
    // Import the function fresh for each test
    const module = await import('../index.js');
    mapToSonarQubeParams = module.mapToSonarQubeParams;
  });
  it('should properly map basic required parameters', () => {
    const params = mapToSonarQubeParams({ project_key: 'my-project' });
    expect(params.projectKey).toBe('my-project');
    expect(params.severity).toBeUndefined();
    expect(params.statuses).toBeUndefined();
  });
  it('should map pagination parameters', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      page: 2,
      page_size: 20,
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(20);
  });
  it('should map severity parameter', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      severity: 'MAJOR',
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.severity).toBe('MAJOR');
  });
  it('should map array parameters', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      statuses: ['OPEN', 'CONFIRMED'],
      types: ['BUG', 'VULNERABILITY'],
      rules: ['rule1', 'rule2'],
      tags: ['tag1', 'tag2'],
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.statuses).toEqual(['OPEN', 'CONFIRMED']);
    expect(params.types).toEqual(['BUG', 'VULNERABILITY']);
    expect(params.rules).toEqual(['rule1', 'rule2']);
    expect(params.tags).toEqual(['tag1', 'tag2']);
  });
  it('should map boolean parameters', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      resolved: true,
      on_component_only: false,
      since_leak_period: true,
      in_new_code_period: false,
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.resolved).toBe(true);
    expect(params.onComponentOnly).toBe(false);
    expect(params.sinceLeakPeriod).toBe(true);
    expect(params.inNewCodePeriod).toBe(false);
  });
  it('should map date parameters', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      created_after: '2023-01-01',
      created_before: '2023-12-31',
      created_at: '2023-06-15',
      created_in_last: '7d',
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.createdAfter).toBe('2023-01-01');
    expect(params.createdBefore).toBe('2023-12-31');
    expect(params.createdAt).toBe('2023-06-15');
    expect(params.createdInLast).toBe('7d');
  });
  it('should map assignees and authors', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      assignees: ['user1', 'user2'],
      authors: ['author1', 'author2'],
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.assignees).toEqual(['user1', 'user2']);
    expect(params.authors).toEqual(['author1', 'author2']);
  });
  it('should map security-related parameters', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      cwe: ['cwe1', 'cwe2'],
      languages: ['java', 'typescript'],
      owasp_top10: ['a1', 'a2'],
      sans_top25: ['sans1', 'sans2'],
      sonarsource_security: ['sec1', 'sec2'],
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.cwe).toEqual(['cwe1', 'cwe2']);
    expect(params.languages).toEqual(['java', 'typescript']);
    expect(params.owaspTop10).toEqual(['a1', 'a2']);
    expect(params.sansTop25).toEqual(['sans1', 'sans2']);
    expect(params.sonarsourceSecurity).toEqual(['sec1', 'sec2']);
  });
  it('should map facets parameter', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      facets: ['facet1', 'facet2'],
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.facets).toEqual(['facet1', 'facet2']);
  });
  it('should correctly handle null values', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      severity: null,
      statuses: null,
      rules: null,
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.severity).toBeUndefined();
    expect(params.statuses).toBeUndefined();
    expect(params.rules).toBeUndefined();
  });
  it('should handle a mix of parameter types', () => {
    const params = mapToSonarQubeParams({
      project_key: 'my-project',
      severity: 'MAJOR',
      page: 2,
      statuses: ['OPEN'],
      resolved: true,
      created_after: '2023-01-01',
      assignees: ['user1'],
      cwe: ['cwe1'],
      facets: ['facet1'],
    });
    expect(params.projectKey).toBe('my-project');
    expect(params.severity).toBe('MAJOR');
    expect(params.page).toBe(2);
    expect(params.statuses).toEqual(['OPEN']);
    expect(params.resolved).toBe(true);
    expect(params.createdAfter).toBe('2023-01-01');
    expect(params.assignees).toEqual(['user1']);
    expect(params.cwe).toEqual(['cwe1']);
    expect(params.facets).toEqual(['facet1']);
  });
});
