import { z } from 'zod';
import { componentsToolSchema } from '../../schemas/components.js';

describe('componentsToolSchema', () => {
  it('should validate minimal parameters', () => {
    const input = {};
    const result = z.object(componentsToolSchema).parse(input);
    expect(result).toEqual({});
  });

  it('should validate search parameters', () => {
    const input = {
      query: 'UserService',
      qualifiers: ['TRK', 'FIL'],
      language: 'java',
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result.query).toBe('UserService');
    expect(result.qualifiers).toEqual(['TRK', 'FIL']);
    expect(result.language).toBe('java');
  });

  it('should validate tree navigation parameters', () => {
    const input = {
      component: 'com.example:project',
      strategy: 'children',
      qualifiers: ['DIR', 'FIL'],
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result.component).toBe('com.example:project');
    expect(result.strategy).toBe('children');
    expect(result.qualifiers).toEqual(['DIR', 'FIL']);
  });

  it('should validate pagination parameters with transformation', () => {
    const input = {
      asc: 'true',
      ps: '50',
      p: '2',
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result.asc).toBe(true);
    expect(result.ps).toBe(50);
    expect(result.p).toBe(2);
  });

  it('should validate branch and pull request parameters', () => {
    const input = {
      component: 'com.example:project',
      branch: 'feature-branch',
      pullRequest: '123',
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result.component).toBe('com.example:project');
    expect(result.branch).toBe('feature-branch');
    expect(result.pullRequest).toBe('123');
  });

  it('should validate all parameters together', () => {
    const input = {
      query: 'test',
      qualifiers: ['TRK', 'DIR', 'FIL'],
      language: 'typescript',
      component: 'com.example:project',
      strategy: 'all',
      asc: 'false',
      ps: '100',
      p: '1',
      branch: 'main',
      pullRequest: '456',
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result).toMatchObject({
      query: 'test',
      qualifiers: ['TRK', 'DIR', 'FIL'],
      language: 'typescript',
      component: 'com.example:project',
      strategy: 'all',
      asc: false,
      ps: 100,
      p: 1,
      branch: 'main',
      pullRequest: '456',
    });
  });

  it('should reject invalid qualifiers', () => {
    const input = {
      qualifiers: ['INVALID'],
    };
    expect(() => z.object(componentsToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid strategy', () => {
    const input = {
      strategy: 'invalid',
    };
    expect(() => z.object(componentsToolSchema).parse(input)).toThrow();
  });

  it('should handle boolean string transformations', () => {
    const testCases = [
      { asc: 'true', expected: true },
      { asc: 'false', expected: false },
    ];

    testCases.forEach((testCase) => {
      const result = z.object(componentsToolSchema).parse(testCase);
      expect(result.asc).toBe(testCase.expected);
    });
  });

  it('should handle number string transformations', () => {
    const input = {
      ps: '25',
      p: '3',
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result.ps).toBe(25);
    expect(result.p).toBe(3);
  });

  it('should handle null values for pagination', () => {
    const input = {
      ps: undefined,
      p: undefined,
    };
    const result = z.object(componentsToolSchema).parse(input);
    expect(result.ps).toBeUndefined();
    expect(result.p).toBeUndefined();
  });
});
