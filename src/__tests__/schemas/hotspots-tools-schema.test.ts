import { z } from 'zod';
import {
  hotspotsToolSchema,
  hotspotToolSchema,
  updateHotspotStatusToolSchema,
} from '../../schemas/hotspots-tools.js';

describe('hotspotsToolSchema', () => {
  it('should validate minimal hotspots search parameters', () => {
    const input = {};
    const result = z.object(hotspotsToolSchema).parse(input);
    expect(result).toEqual({});
  });

  it('should validate hotspots search with all parameters', () => {
    const input = {
      project_key: 'my-project',
      branch: 'main',
      pull_request: 'PR-123',
      status: 'TO_REVIEW',
      resolution: 'FIXED',
      files: ['file1.java', 'file2.java'],
      assigned_to_me: true,
      since_leak_period: false,
      in_new_code_period: true,
      page: '2',
      page_size: '50',
    };
    const result = z.object(hotspotsToolSchema).parse(input);
    expect(result.project_key).toBe('my-project');
    expect(result.status).toBe('TO_REVIEW');
    expect(result.resolution).toBe('FIXED');
    expect(result.files).toEqual(['file1.java', 'file2.java']);
    expect(result.assigned_to_me).toBe(true);
    expect(result.page).toBe(2);
  });

  it('should handle boolean string conversions', () => {
    const input = {
      assigned_to_me: 'true',
      since_leak_period: 'false',
      in_new_code_period: 'true',
    };
    const result = z.object(hotspotsToolSchema).parse(input);
    expect(result.assigned_to_me).toBe(true);
    expect(result.since_leak_period).toBe(false);
    expect(result.in_new_code_period).toBe(true);
  });

  it('should handle page number string conversions', () => {
    const input = {
      page: '3',
      page_size: '25',
    };
    const result = z.object(hotspotsToolSchema).parse(input);
    expect(result.page).toBe(3);
    expect(result.page_size).toBe(25);
  });

  it('should handle null values', () => {
    const input = {
      branch: null,
      pull_request: null,
      status: null,
      resolution: null,
      files: null,
      assigned_to_me: null,
      since_leak_period: null,
      in_new_code_period: null,
    };
    const result = z.object(hotspotsToolSchema).parse(input);
    expect(result.branch).toBeNull();
    expect(result.pull_request).toBeNull();
    expect(result.status).toBeNull();
    expect(result.resolution).toBeNull();
    expect(result.files).toBeNull();
    expect(result.assigned_to_me).toBeNull();
  });

  it('should reject invalid status values', () => {
    const input = {
      status: 'INVALID_STATUS',
    };
    expect(() => z.object(hotspotsToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid resolution values', () => {
    const input = {
      resolution: 'INVALID_RESOLUTION',
    };
    expect(() => z.object(hotspotsToolSchema).parse(input)).toThrow();
  });
});

describe('hotspotToolSchema', () => {
  it('should validate hotspot key parameter', () => {
    const input = {
      hotspot_key: 'AYg1234567890',
    };
    const result = z.object(hotspotToolSchema).parse(input);
    expect(result.hotspot_key).toBe('AYg1234567890');
  });

  it('should require hotspot_key', () => {
    const input = {};
    expect(() => z.object(hotspotToolSchema).parse(input)).toThrow();
  });
});

describe('updateHotspotStatusToolSchema', () => {
  it('should validate minimal update parameters', () => {
    const input = {
      hotspot_key: 'AYg1234567890',
      status: 'REVIEWED',
    };
    const result = z.object(updateHotspotStatusToolSchema).parse(input);
    expect(result.hotspot_key).toBe('AYg1234567890');
    expect(result.status).toBe('REVIEWED');
    expect(result.resolution).toBeUndefined();
    expect(result.comment).toBeUndefined();
  });

  it('should validate update with all parameters', () => {
    const input = {
      hotspot_key: 'AYg1234567890',
      status: 'REVIEWED',
      resolution: 'SAFE',
      comment: 'This is safe after review',
    };
    const result = z.object(updateHotspotStatusToolSchema).parse(input);
    expect(result.hotspot_key).toBe('AYg1234567890');
    expect(result.status).toBe('REVIEWED');
    expect(result.resolution).toBe('SAFE');
    expect(result.comment).toBe('This is safe after review');
  });

  it('should handle null values for optional parameters', () => {
    const input = {
      hotspot_key: 'AYg1234567890',
      status: 'TO_REVIEW',
      resolution: null,
      comment: null,
    };
    const result = z.object(updateHotspotStatusToolSchema).parse(input);
    expect(result.hotspot_key).toBe('AYg1234567890');
    expect(result.status).toBe('TO_REVIEW');
    expect(result.resolution).toBeNull();
    expect(result.comment).toBeNull();
  });

  it('should require hotspot_key and status', () => {
    const input1 = { status: 'REVIEWED' };
    expect(() => z.object(updateHotspotStatusToolSchema).parse(input1)).toThrow();

    const input2 = { hotspot_key: 'AYg1234567890' };
    expect(() => z.object(updateHotspotStatusToolSchema).parse(input2)).toThrow();
  });

  it('should reject invalid status values', () => {
    const input = {
      hotspot_key: 'AYg1234567890',
      status: 'INVALID_STATUS',
    };
    expect(() => z.object(updateHotspotStatusToolSchema).parse(input)).toThrow();
  });

  it('should reject invalid resolution values', () => {
    const input = {
      hotspot_key: 'AYg1234567890',
      status: 'REVIEWED',
      resolution: 'INVALID_RESOLUTION',
    };
    expect(() => z.object(updateHotspotStatusToolSchema).parse(input)).toThrow();
  });
});
