import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { JWKSClient } from '../jwks-client.js';
import { OIDCDiscoveryDocument, JWKSResponse } from '../external-idp-types.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('JWKSClient', () => {
  let client: JWKSClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    client = new JWKSClient({ cacheTTL: 100, discoveryTTL: 100 }); // Short TTL for testing
  });

  afterEach(() => {
    client.clearCache();
    jest.clearAllMocks();
  });

  describe('getKey', () => {
    const mockJWKS: JWKSResponse = {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: 'test-key-id',
          n: 'xjlCRBq...', // Truncated for brevity
          e: 'AQAB',
          alg: 'RS256',
        },
      ],
    };

    const mockDiscovery: OIDCDiscoveryDocument = {
      issuer: 'https://example.com',
      jwks_uri: 'https://example.com/.well-known/jwks.json',
    };

    it('should fetch key from JWKS endpoint', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDiscovery,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJWKS,
        } as Response);

      const key = await client.getKey('https://example.com');

      expect(key).toContain('BEGIN PUBLIC KEY');
      expect(key).toContain('END PUBLIC KEY');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use provided JWKS URI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      await client.getKey('https://example.com', undefined, 'https://custom.jwks.uri');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.jwks.uri',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });

    it('should find key by kid', async () => {
      const multiKeyJWKS: JWKSResponse = {
        keys: [
          { ...mockJWKS.keys[0], kid: 'key1' },
          { ...mockJWKS.keys[0], kid: 'key2' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => multiKeyJWKS,
      } as Response);

      await client.getKey('https://example.com', 'key2', 'https://jwks.uri');

      // Verify it processes without error
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error if key not found by kid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      await expect(
        client.getKey('https://example.com', 'non-existent', 'https://jwks.uri')
      ).rejects.toThrow("Key with kid 'non-existent' not found in JWKS");
    });

    it('should cache JWKS responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      // First call
      await client.getKey('https://example.com', undefined, 'https://jwks.uri');
      // Second call (should use cache)
      await client.getKey('https://example.com', undefined, 'https://jwks.uri');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should cache discovery documents', async () => {
      // Use client with very short JWKS cache but long discovery cache
      const testClient = new JWKSClient({ cacheTTL: 1, discoveryTTL: 60000 });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDiscovery,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJWKS,
        } as Response);

      // First call - should fetch both discovery and JWKS
      await testClient.getKey('https://example.com');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Wait for JWKS cache to expire but not discovery
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Reset mock for second call
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      // Second call - should only fetch JWKS since discovery is still cached
      await testClient.getKey('https://example.com');

      // Should only fetch JWKS, not discovery
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/jwks.json',
        expect.any(Object)
      );
    });

    it('should handle discovery fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}), // Add json method even for error responses
      } as Response);

      await expect(client.getKey('https://example.com')).rejects.toThrow(
        'Failed to fetch discovery document: 404 Not Found'
      );
    });

    it('should handle JWKS fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}), // Add json method even for error responses
      } as Response);

      await expect(
        client.getKey('https://example.com', undefined, 'https://jwks.uri')
      ).rejects.toThrow('Failed to fetch JWKS: 500 Internal Server Error');
    });

    it('should handle invalid JWKS response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      } as Response);

      await expect(
        client.getKey('https://example.com', undefined, 'https://jwks.uri')
      ).rejects.toThrow('Invalid JWKS response: missing keys array');
    });

    it('should handle unsupported key types', async () => {
      const ecKeyJWKS: JWKSResponse = {
        keys: [
          {
            kty: 'EC',
            use: 'sig',
            kid: 'test-key-id',
            crv: 'P-256',
            x: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4',
            y: '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ecKeyJWKS,
      } as Response);

      await expect(
        client.getKey('https://example.com', undefined, 'https://jwks.uri')
      ).rejects.toThrow('Unsupported key type: EC');
    });

    it('should prefer signing keys when multiple keys exist', async () => {
      const multiKeyJWKS: JWKSResponse = {
        keys: [
          { ...mockJWKS.keys[0], use: 'enc', kid: 'enc-key' },
          { ...mockJWKS.keys[0], use: 'sig', kid: 'sig-key' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => multiKeyJWKS,
      } as Response);

      const key = await client.getKey('https://example.com', undefined, 'https://jwks.uri');

      // Should succeed and select the signing key
      expect(key).toContain('BEGIN PUBLIC KEY');
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      const mockJWKS: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            n: 'xjlCRBq...',
            e: 'AQAB',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      // Populate cache
      await client.getKey('https://example.com', undefined, 'https://jwks.uri');

      // Clear cache
      client.clearCache();

      // Should fetch again
      await client.getKey('https://example.com', undefined, 'https://jwks.uri');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = client.getCacheStats();
      expect(stats).toEqual({ jwks: 0, discovery: 0 });
    });
  });

  describe('cache expiry', () => {
    it('should refetch after cache expires', async () => {
      const mockJWKS: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            n: 'xjlCRBq...',
            e: 'AQAB',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      // First call
      await client.getKey('https://example.com', undefined, 'https://jwks.uri');

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second call (should refetch)
      await client.getKey('https://example.com', undefined, 'https://jwks.uri');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
