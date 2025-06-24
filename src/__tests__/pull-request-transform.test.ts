import { describe, test, expect } from '@jest/globals';
import { z } from 'zod';
import { issuesToolSchema } from '../schemas/issues';
import {
  componentMeasuresToolSchema,
  componentsMeasuresToolSchema,
  measuresHistoryToolSchema,
} from '../schemas/measures';
import { hotspotsToolSchema } from '../schemas/hotspots-tools';
import { sourceCodeToolSchema, scmBlameToolSchema } from '../schemas/source-code';
import { qualityGateStatusToolSchema } from '../schemas/quality-gates';
import { componentsToolSchema } from '../schemas/components';

describe('pull_request parameter transform', () => {
  describe('issues schema', () => {
    test('accepts string pull_request', () => {
      const schema = z.object(issuesToolSchema);
      const result = schema.parse({
        pull_request: '123',
      });
      expect(result.pull_request).toBe('123');
    });

    test('accepts number pull_request and converts to string', () => {
      const schema = z.object(issuesToolSchema);
      const result = schema.parse({
        pull_request: 123,
      });
      expect(result.pull_request).toBe('123');
    });

    test('preserves null values', () => {
      const schema = z.object(issuesToolSchema);
      const result = schema.parse({
        pull_request: null,
      });
      expect(result.pull_request).toBeNull();
    });
  });

  describe('measures schemas', () => {
    test('componentMeasuresToolSchema accepts number and converts to string', () => {
      const schema = z.object(componentMeasuresToolSchema);
      const result = schema.parse({
        component: 'test',
        metric_keys: ['coverage'],
        pull_request: 456,
      });
      expect(result.pull_request).toBe('456');
    });

    test('componentsMeasuresToolSchema accepts number and converts to string', () => {
      const schema = z.object(componentsMeasuresToolSchema);
      const result = schema.parse({
        component_keys: ['test'],
        metric_keys: ['coverage'],
        pull_request: 789,
      });
      expect(result.pull_request).toBe('789');
    });

    test('measuresHistoryToolSchema accepts number and converts to string', () => {
      const schema = z.object(measuresHistoryToolSchema);
      const result = schema.parse({
        component: 'test',
        metrics: ['coverage'],
        pull_request: 999,
      });
      expect(result.pull_request).toBe('999');
    });
  });

  describe('hotspots schema', () => {
    test('accepts number pull_request and converts to string', () => {
      const schema = z.object(hotspotsToolSchema);
      const result = schema.parse({
        pull_request: 111,
      });
      expect(result.pull_request).toBe('111');
    });
  });

  describe('source code schemas', () => {
    test('sourceCodeToolSchema accepts number and converts to string', () => {
      const schema = z.object(sourceCodeToolSchema);
      const result = schema.parse({
        key: 'test',
        pull_request: 222,
      });
      expect(result.pull_request).toBe('222');
    });

    test('scmBlameToolSchema accepts number and converts to string', () => {
      const schema = z.object(scmBlameToolSchema);
      const result = schema.parse({
        key: 'test',
        pull_request: 333,
      });
      expect(result.pull_request).toBe('333');
    });
  });

  describe('quality gates schema', () => {
    test('accepts number pull_request and converts to string', () => {
      const schema = z.object(qualityGateStatusToolSchema);
      const result = schema.parse({
        project_key: 'test',
        pull_request: 444,
      });
      expect(result.pull_request).toBe('444');
    });
  });

  describe('components schema', () => {
    test('accepts number pullRequest and converts to string', () => {
      const schema = z.object(componentsToolSchema);
      const result = schema.parse({
        pullRequest: 555,
      });
      expect(result.pullRequest).toBe('555');
    });

    test('accepts string pullRequest', () => {
      const schema = z.object(componentsToolSchema);
      const result = schema.parse({
        pullRequest: 'pr-666',
      });
      expect(result.pullRequest).toBe('pr-666');
    });
  });

  describe('edge cases', () => {
    test('handles decimal numbers', () => {
      const schema = z.object(issuesToolSchema);
      const result = schema.parse({
        pull_request: 123.456,
      });
      expect(result.pull_request).toBe('123.456');
    });

    test('handles negative numbers', () => {
      const schema = z.object(issuesToolSchema);
      const result = schema.parse({
        pull_request: -123,
      });
      expect(result.pull_request).toBe('-123');
    });

    test('handles zero', () => {
      const schema = z.object(issuesToolSchema);
      const result = schema.parse({
        pull_request: 0,
      });
      expect(result.pull_request).toBe('0');
    });
  });
});
