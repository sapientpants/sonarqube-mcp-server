import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JWKSClient } from '../jwks-client.js';
import { ExternalIdPError } from '../external-idp-types.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('JWKSClient', () => {
  let client: JWKSClient;
  const mockIssuer = 'https://example.com';
  const mockJwksUri = 'https://example.com/.well-known/jwks.json';

  beforeEach(() => {
    client = new JWKSClient({
      cacheTtl: 1000, // 1 second for testing
      requestTimeout: 100,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.clearCache();
  });

  describe('getKey', () => {
    const mockJwksResponse = {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: 'test-key-1',
          alg: 'RS256',
          n: 'xjlY5H0tusu6Eu8AE7zAm-6aBdbCu67yJlz8kbh49Qs3N0oVW_zzMwGZioiIjCS8mwRrLRD2Gp9xT8iU3i-xUBLnZOnoS2c1sMIDYBMRf-BeH3XmUicQkNjm6p6H_Xb43SD2UlHE6b9eGKqvB8HpLvYQMF6FTPcxYwfMW4zlxhFjlxO64s84skEk0kYvzPOxvMhGR4BWW0xvE6GjZQSPt3iw7s_P0vYu8xGqV4VZyCBXu7DxBLBMPtJHzoaR5Tq3rGIcSBp0WGbqZXWvfCKHQTXhQ7dPJ9JJLV7Yw8q0Z5kJFAMMZfAOPfMplriFV1f4qLXEk7A9i0bTm8X1xQ',
          e: 'AQAB',
        },
        {
          kty: 'RSA',
          use: 'sig',
          kid: 'test-key-2',
          alg: 'RS256',
          n: 'z6hpBl0-x2OPOyBn_QiLZXvP-I0FP02NnbXNzrVvAK1xjerqR8hcY62_Vd0x61UHsb3UtlrG5pIuT7cP8IneColzMuGT2NLnxRdC_OFBPQroHP2-NjwF6F-5W7rXQe3XMrV97VclzaFdRYWSYIEQ5A9t0tgtcQPNw9l6nGKsrIiIxC3Fcvx98w9rIIRmQ7dZ_5VYc5bvqR9bCvGtkGvFwrN0WT3TgKPBKJHyPxhHT6m5c_0xMNde-L5aEP94ENJOPdAZ2G5x0fjXLrIKWAVn3zb8Y8lLpyFfeZdoMHgSf5VJKsPmrrZ_mjGzCWzLKMFGKDk_W58Vh4skHBCeAQ',
          e: 'AQAB',
        },
      ],
    };

    const mockDiscoveryResponse = {
      issuer: mockIssuer,
      jwks_uri: mockJwksUri,
      authorization_endpoint: 'https://example.com/authorize',
      token_endpoint: 'https://example.com/token',
    };

    it('should fetch and cache keys', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJwksResponse,
      });

      const key = await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);

      expect(key).toBeDefined();
      expect(key).toContain('BEGIN PUBLIC KEY');
      expect(global.fetch).toHaveBeenCalledWith(mockJwksUri, expect.any(Object));
    });

    it('should use cached keys on subsequent calls', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJwksResponse,
      });

      // First call - fetches from network
      await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch after cache expiry', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJwksResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJwksResponse,
        });

      // First call
      await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Second call - should refetch
      await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return first key when no kid specified', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJwksResponse,
      });

      const key = await client.getKey(mockIssuer, undefined, mockJwksUri);
      expect(key).toBeDefined();
    });

    it('should throw when key not found', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJwksResponse,
      });

      await expect(client.getKey(mockIssuer, 'non-existent-key', mockJwksUri)).rejects.toThrow(
        ExternalIdPError
      );
    });

    it('should use OIDC discovery when enabled', async () => {
      const clientWithDiscovery = new JWKSClient({ useDiscovery: true });

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDiscoveryResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJwksResponse,
        });

      await clientWithDiscovery.getKey(mockIssuer, 'test-key-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/.well-known/openid-configuration',
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(mockJwksUri, expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(client.getKey(mockIssuer, 'test-key-1', mockJwksUri)).rejects.toThrow(
        ExternalIdPError
      );
    });

    it('should handle invalid JWKS response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      await expect(client.getKey(mockIssuer, 'test-key-1', mockJwksUri)).rejects.toThrow(
        'Invalid JWKS response'
      );
    });

    it('should handle non-RSA keys', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          keys: [
            {
              kty: 'EC', // Not RSA
              kid: 'test-key-1',
            },
          ],
        }),
      });

      await expect(client.getKey(mockIssuer, 'test-key-1', mockJwksUri)).rejects.toThrow(
        'No valid keys found'
      );
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.getKey(mockIssuer, 'test-key-1', mockJwksUri)).rejects.toThrow(
        ExternalIdPError
      );
    });

    it('should handle timeout', async () => {
      const clientWithShortTimeout = new JWKSClient({ requestTimeout: 10 });

      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      await expect(
        clientWithShortTimeout.getKey(mockIssuer, 'test-key-1', mockJwksUri)
      ).rejects.toThrow();
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keys: [
              {
                kty: 'RSA',
                kid: 'test-key-1',
                n: 'xjlY5H0tusu6Eu8AE7zAm-6aBdbCu67yJlz8kbh49Qs3N0oVW_zzMwGZioiIjCS8mwRrLRD2Gp9xT8iU3i-xUBLnZOnoS2c1sMIDYBMRf-BeH3XmUicQkNjm6p6H_Xb43SD2UlHE6b9eGKqvB8HpLvYQMF6FTPcxYwfMW4zlxhFjlxO64s84skEk0kYvzPOxvMhGR4BWW0xvE6GjZQSPt3iw7s_P0vYu8xGqV4VZyCBXu7DxBLBMPtJHzoaR5Tq3rGIcSBp0WGbqZXWvfCKHQTXhQ7dPJ9JJLV7Yw8q0Z5kJFAMMZfAOPfMplriFV1f4qLXEk7A9i0bTm8X1xQ',
                e: 'AQAB',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keys: [
              {
                kty: 'RSA',
                kid: 'test-key-1',
                n: 'xjlY5H0tusu6Eu8AE7zAm-6aBdbCu67yJlz8kbh49Qs3N0oVW_zzMwGZioiIjCS8mwRrLRD2Gp9xT8iU3i-xUBLnZOnoS2c1sMIDYBMRf-BeH3XmUicQkNjm6p6H_Xb43SD2UlHE6b9eGKqvB8HpLvYQMF6FTPcxYwfMW4zlxhFjlxO64s84skEk0kYvzPOxvMhGR4BWW0xvE6GjZQSPt3iw7s_P0vYu8xGqV4VZyCBXu7DxBLBMPtJHzoaR5Tq3rGIcSBp0WGbqZXWvfCKHQTXhQ7dPJ9JJLV7Yw8q0Z5kJFAMMZfAOPfMplriFV1f4qLXEk7A9i0bTm8X1xQ',
                e: 'AQAB',
              },
            ],
          }),
        });

      // First call - populates cache
      await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      client.clearCache();

      // Next call should fetch again
      await client.getKey(mockIssuer, 'test-key-1', mockJwksUri);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should report cache statistics', () => {
      const stats = client.getCacheStats();
      expect(stats).toEqual({
        jwksEntries: 0,
        discoveryEntries: 0,
        totalKeys: 0,
      });
    });
  });
});
