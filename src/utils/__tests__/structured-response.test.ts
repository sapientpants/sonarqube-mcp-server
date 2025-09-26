import { describe, it, expect } from 'vitest';
import {
  createStructuredResponse,
  createTextResponse,
  createErrorResponse,
} from '../structured-response.js';

describe('structured-response', () => {
  describe('createStructuredResponse', () => {
    it('should create response with text and structured content', () => {
      const data = { foo: 'bar', count: 42 };
      const result = createStructuredResponse(data);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        structuredContent: data,
      });
    });

    it('should handle null data', () => {
      const result = createStructuredResponse(null);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'null',
          },
        ],
        structuredContent: null,
      });
    });

    it('should handle undefined data', () => {
      const result = createStructuredResponse(undefined);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: undefined, // JSON.stringify(undefined) returns undefined
          },
        ],
        structuredContent: undefined,
      });
    });

    it('should handle array data', () => {
      const data = [1, 2, 3, 'test'];
      const result = createStructuredResponse(data);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        structuredContent: data,
      });
    });

    it('should handle complex nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: ['a', 'b', 'c'],
            number: 123,
          },
        },
        array: [{ id: 1 }, { id: 2 }],
      };
      const result = createStructuredResponse(data);

      expect(result.content[0]?.text).toBe(JSON.stringify(data, null, 2));
      expect(result.structuredContent).toBe(data);
    });

    it('should handle circular references gracefully', () => {
      const data: Record<string, unknown> = { name: 'test' };
      data.circular = data;

      expect(() => createStructuredResponse(data)).toThrow();
    });

    it('should preserve Date objects in structured content', () => {
      const date = new Date('2023-01-01');
      const data = { created: date };
      const result = createStructuredResponse(data);

      expect(result.structuredContent).toEqual({ created: date });
      expect(result.content[0]?.text).toBe(JSON.stringify(data, null, 2));
    });
  });

  describe('createTextResponse', () => {
    it('should create response with only text content', () => {
      const text = 'Hello, world!';
      const result = createTextResponse(text);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text,
          },
        ],
      });
    });

    it('should handle empty string', () => {
      const result = createTextResponse('');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '',
          },
        ],
      });
    });

    it('should handle multiline text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = createTextResponse(text);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text,
          },
        ],
      });
    });

    it('should handle special characters', () => {
      const text = 'Special chars: < > & " \' \\ \n \t';
      const result = createTextResponse(text);

      expect(result.content[0]?.text).toBe(text);
    });

    it('should not include structuredContent', () => {
      const result = createTextResponse('test');

      expect(result.structuredContent).toBeUndefined();
      expect(result.isError).toBeUndefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message only', () => {
      const message = 'Something went wrong';
      const result = createErrorResponse(message);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        structuredContent: {
          error: message,
        },
        isError: true,
      });
    });

    it('should create error response with message and details', () => {
      const message = 'Validation failed';
      const details = {
        field: 'email',
        reason: 'invalid format',
      };
      const result = createErrorResponse(message, details);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        structuredContent: {
          error: message,
          details,
        },
        isError: true,
      });
    });

    it('should handle null details', () => {
      const message = 'Error occurred';
      const result = createErrorResponse(message, null);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
        structuredContent: {
          error: message,
          details: null,
        },
        isError: true,
      });
    });

    it('should handle undefined details explicitly', () => {
      const message = 'Error occurred';
      const result = createErrorResponse(message, undefined);

      expect(result.structuredContent).toEqual({
        error: message,
      });
      expect('details' in result.structuredContent!).toBe(false);
    });

    it('should handle complex error details', () => {
      const message = 'Multiple errors';
      const details = {
        errors: [
          { field: 'name', message: 'required' },
          { field: 'age', message: 'must be positive' },
        ],
        timestamp: new Date(),
        requestId: '123456',
      };
      const result = createErrorResponse(message, details);

      expect(result.structuredContent).toEqual({
        error: message,
        details,
      });
      expect(result.isError).toBe(true);
    });

    it('should handle empty error message', () => {
      const result = createErrorResponse('');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '',
          },
        ],
        structuredContent: {
          error: '',
        },
        isError: true,
      });
    });

    it('should handle error details with circular references', () => {
      const message = 'Circular error';
      const details: Record<string, unknown> = { type: 'error' };
      details.self = details;

      const result = createErrorResponse(message, details);

      expect(result.structuredContent).toEqual({
        error: message,
        details,
      });
    });
  });

  describe('type safety', () => {
    it('should maintain proper types for content array', () => {
      const result = createStructuredResponse({ test: true });

      // Check that content is an array
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);

      // Check that content item has correct type
      expect(result.content[0]?.type).toBe('text');
      expect(typeof result.content[0]?.text).toBe('string');
    });

    it('should cast structuredContent to Record<string, unknown>', () => {
      const data = { num: 123, str: 'test', bool: true };
      const result = createStructuredResponse(data);

      expect(result.structuredContent).toBe(data);
      expect(typeof result.structuredContent).toBe('object');
    });
  });
});
