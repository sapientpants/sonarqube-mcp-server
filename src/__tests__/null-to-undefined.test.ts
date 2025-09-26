import { describe, it, expect } from 'vitest';
import { nullToUndefined } from '../index.js';
describe('nullToUndefined', () => {
  it('should convert null to undefined', () => {
    expect(nullToUndefined(null)).toBeUndefined();
  });
  it('should pass through non-null values', () => {
    expect(nullToUndefined('value')).toBe('value');
    expect(nullToUndefined(123)).toBe(123);
    expect(nullToUndefined(0)).toBe(0);
    expect(nullToUndefined(false)).toBe(false);
    expect(nullToUndefined(undefined)).toBeUndefined();
  });
});
