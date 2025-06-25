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

  describe('edge cases', () => {
    it('should throw error when no keys are found in JWKS', async () => {
      const emptyJWKS: JWKSResponse = {
        keys: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyJWKS,
      } as Response);

      await expect(
        client.getKey('https://example.com', undefined, 'https://jwks.uri')
      ).rejects.toThrow('No suitable key found in JWKS');
    });

    it('should handle RSA keys without use property', async () => {
      const mockJWKS: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key1',
            n: 'xjlCRBq...',
            e: 'AQAB',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      const key = await client.getKey('https://example.com', undefined, 'https://jwks.uri');
      expect(key).toContain('BEGIN PUBLIC KEY');
    });

    it('should throw error for RSA keys missing n or e', async () => {
      const invalidJWKS: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key1',
            n: 'xjlCRBq...',
            // Missing e
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidJWKS,
      } as Response);

      await expect(
        client.getKey('https://example.com', undefined, 'https://jwks.uri')
      ).rejects.toThrow('Invalid RSA key: missing n or e');
    });

    it('should handle discovery document without jwks_uri', async () => {
      const invalidDiscovery = {
        issuer: 'https://example.com',
        // Missing jwks_uri
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidDiscovery,
      } as Response);

      await expect(client.getKey('https://example.com')).rejects.toThrow(
        'Discovery document missing jwks_uri'
      );
    });

    it('should handle large RSA modulus values', async () => {
      // Test with a key that has high bit set (needs leading zero in ASN.1)
      const mockJWKS: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key1',
            n: 'xjlCRBqFPutijR3p_k5qRrROi1Gldqw8lYl9lz1AbxOiwuQfrA0Lx0r3qn_YOeDNH5TZ9O3PAqn5GU2xBvjH9hcR4qSe7EH7TFgYBN1TBuFBod3Oet7WKJqBKS0fPVKHpNY7LA9pcM1huNhPXDPj7rKZL0VRpuLFWZWZBpZTLrAZQVGqLcG3s5xLWhWB8JqKLNpHgbLCXzXbFEnGBBQcnKlEsHe7raCO7wLj1BkQxBpoyvLUxvH_0vH2a5e4bvhLKpPrOUnmA4iZBeNqYMPQp3zSNm5N4BQCvj4FmF0isxV5bCnQAjY4P1cnFG_43kTGJ-S4ymHHtLZiLYLF4Q',
            e: 'AQAB',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKS,
      } as Response);

      const key = await client.getKey('https://example.com', undefined, 'https://jwks.uri');
      expect(key).toContain('BEGIN PUBLIC KEY');
      expect(key).toContain('END PUBLIC KEY');
    });

    it('should handle ASN.1 length encoding for large values', async () => {
      // Create a client to test private methods
      const testClient = new JWKSClient();

      // Test encodeLength method via reflection
      const encodeLength = (
        testClient as unknown as { encodeLength: (data: Buffer) => Buffer }
      ).encodeLength.bind(testClient);

      // Test short form (< 128)
      const shortData = Buffer.alloc(50);
      const shortEncoded = encodeLength(shortData);
      expect(shortEncoded).toEqual(Buffer.from([50]));

      // Test long form (>= 128)
      const longData = Buffer.alloc(300);
      const longEncoded = encodeLength(longData);
      expect(longEncoded[0]).toBe(0x82); // Long form with 2 bytes
      expect(longEncoded[1]).toBe(1); // First byte of length
      expect(longEncoded[2]).toBe(44); // Second byte: 300 = 256 + 44
    });
  });
});
