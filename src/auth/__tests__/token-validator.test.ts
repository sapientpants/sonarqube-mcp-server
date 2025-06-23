import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
  TokenValidator,
  TokenValidationError,
  TokenValidationErrorCode,
  TokenValidationOptions,
} from '../token-validator.js';
import {
  TEST_RSA_PRIVATE_KEY,
  TEST_RSA_PUBLIC_KEY,
  TEST_ISSUER,
  TEST_AUDIENCE,
  createTestToken,
} from './fixtures/test-keys.js';

describe('TokenValidator', () => {
  let validator: TokenValidator;
  let validationOptions: TokenValidationOptions;

  beforeEach(() => {
    validationOptions = {
      audience: TEST_AUDIENCE,
      issuers: [TEST_ISSUER],
      jwksEndpoints: new Map([[TEST_ISSUER, 'https://auth.example.com/.well-known/jwks.json']]),
      clockTolerance: 5,
      staticPublicKeys: new Map([[TEST_ISSUER, TEST_RSA_PUBLIC_KEY]]),
    };
    validator = new TokenValidator(validationOptions);
  });

  describe('validateToken', () => {
    it('should reject invalid token format', async () => {
      await expect(validator.validateToken('invalid-token')).rejects.toThrow(
        new TokenValidationError(TokenValidationErrorCode.INVALID_TOKEN, 'Invalid token format')
      );
    });

    it('should reject token with invalid issuer', async () => {
      const token = createTestToken({
        iss: 'https://invalid-issuer.com',
      });

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(
          TokenValidationErrorCode.INVALID_ISSUER,
          'Invalid issuer: https://invalid-issuer.com'
        )
      );
    });

    it('should reject expired token', async () => {
      const token = createTestToken({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(TokenValidationErrorCode.EXPIRED_TOKEN, 'Token has expired')
      );
    });

    it('should reject token with invalid audience', async () => {
      const token = createTestToken({
        aud: 'https://wrong-audience.com',
      });

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(
          TokenValidationErrorCode.INVALID_AUDIENCE,
          'Token audience does not include this server'
        )
      );
    });

    it('should reject token not yet active (nbf claim)', async () => {
      const token = createTestToken({
        nbf: Math.floor(Date.now() / 1000) + 3600, // Active in 1 hour
      });

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(TokenValidationErrorCode.TOKEN_NOT_ACTIVE, 'Token not yet active')
      );
    });

    it('should handle multiple audiences', async () => {
      const validatorWithMultipleAudiences = new TokenValidator({
        ...validationOptions,
        audience: [TEST_AUDIENCE, 'https://alt.example.com'],
      });

      const token = createTestToken({
        aud: ['https://other.example.com', TEST_AUDIENCE],
      });

      const result = await validatorWithMultipleAudiences.validateToken(token);
      expect(result.sub).toBe('test-user-123');
    });

    describe('resource indicator validation', () => {
      it('should validate exact resource match', async () => {
        const validatorWithResource = new TokenValidator({
          ...validationOptions,
          validateResource: true,
          expectedResources: ['https://api.example.com/resource1'],
        });

        const token = createTestToken({
          resource: 'https://api.example.com/resource1',
        });

        const result = await validatorWithResource.validateToken(token);
        expect(result.resource).toBe('https://api.example.com/resource1');
      });

      it('should validate hierarchical resource match', async () => {
        const validatorWithResource = new TokenValidator({
          ...validationOptions,
          validateResource: true,
          expectedResources: ['https://api.example.com'],
        });

        const token = createTestToken({
          resource: 'https://api.example.com/users/123',
        });

        const result = await validatorWithResource.validateToken(token);
        expect(result.resource).toBe('https://api.example.com/users/123');
      });

      it('should reject invalid resource', async () => {
        const validatorWithResource = new TokenValidator({
          ...validationOptions,
          validateResource: true,
          expectedResources: ['https://api.example.com'],
        });

        const token = createTestToken({
          resource: 'https://wrong-api.example.com',
        });

        await expect(validatorWithResource.validateToken(token)).rejects.toThrow(
          TokenValidationError
        );
      });
    });
  });

  describe('clearCache', () => {
    it('should clear the JWKS cache', () => {
      validator.clearCache();
      // Cache clearing doesn't throw, just verifying it can be called
      expect(true).toBe(true);
    });
  });

  describe('with static public keys', () => {
    it('should use static public key when configured', async () => {
      // Already configured in beforeEach with staticPublicKeys
      const token = createTestToken();
      const result = await validator.validateToken(token);

      expect(result.sub).toBe('test-user-123');
      expect(result.iss).toBe(TEST_ISSUER);
    });

    it('should reject token signed with wrong key', async () => {
      // Different private key for testing wrong signature
      const wrongPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCUH86pTitu+PU5
a64gxsLkuPQ4HSTvRJvLVlwQJtnG9SQ5SifJwGH/HT1YPnM2t3vlTAjHGIoVwPjJ
MyvPMP1XM272uzggkQdYveopVbVufhFrX4mhcmunXoHE8IS47z0i9FjYG8LRvgdm
nisgwxc/AZGo/KyGD8QN764sYSCx5bmVnL/tSCaYjFTAw/kvxELKXIuOStk1zhPe
Aeinn75g1q+sRzUeW8KBERQdpmhz+/c16AK6m0553+mnVKTySUSg4nkvGvqwfuNY
xiFgn6l6AX4MdqpNOM9fjz8cnCMWttyXbOckkP4ttaSVopoz3OQYm6zvwF+BXiXH
LKa+SYarAgMBAAECggEARA1m957r0oS7uWFQ80sOEGIvBbbSGMF3KFDpZBxNUpye
w1lf9U+XVkt7OxcZ/MoIuHyZzcrm6f6p7lo9pue1hQIi2WWDcGbhLrK2Kb5waC6w
VxniFBQLBK6lRTNRbtuvRWdoiAUdGRrKsKk7XEZ1YCOa5b4Mj10f8F0tMsN+72vO
GxXhSKg8C9H2GYWc5RyQ7WqHC+kMsveM6mgptpK1FID+qo3DhvIgkQXrSHPri0Wb
3WW3eVvs9gMGFxrx9Ur6afnTEIUNdMdAxRczhNM8YjrKk/j3EaZWiEp5SvA3y5/V
6OqNnNewC7ZOMWyMoHzSpIhlLXzY6+1zH+0NzMgDEQKBgQDMBDPwiBeK0MSBZ005
UMweNzA9FOlzNkaLItBFxVymxt0twdWwnWZt414U//es5/SJm6YqKGtl9E3/SvH7
aCDwU5giIzak52EJ/X3i4BJ8SYivPjM5h78IuUO932eXs9LkHtEbyOs1Qud0rndJ
DMlVKRQ3D0ZXkespA+xu+N4e8QKBgQC53c+q9m0O4lIH+X8hFII1Buk4Ln/4xfIL
HUaX6fLmxV2Quwsv/kxENaTYmxo9bkUI3gUUxVvtHRBoVp7bpnQnwj3jWB9gEhGd
I+62yLIQ9Bh4S/yQoxSWq4YX7irzr3LHeGEbZBrWQhdfGOoCqdES0Ol7T5JftN17
gwTKAxr3WwKBgFEpeuA9w9/dnc89IWOj2RBMNEyYfSbweK/xcZnQIkPW6TbC3hgd
BhrBUTRZgFaxEH+OBFTRL6inwD/HuOyjSDdTijpKd/qycdBfoC0Zp0D6n/3XaNmC
P2VhDqoCrluTllpaSCYdkDToINwybBILnCzc4sXktb8wtbTjcrPTHcqBAoGAdVmo
nkaMQNN/+2z5aUdrllNQuJoTTlycH4xSX+Pj6vQ9yP1vaNPkD0TXWbND8/lFOP4E
s0KQcbrh+x6FmiUUPW4UaQ/gb2W5HT/snhdE5hNXx8wiIKf2fdK6DS3gjI7/pxVI
KmUf1JtR6kbuqNPTH1AruiFZR3gIRs1IHsurIPUCgYBpWREsIkQQSPp5Y5srRNkE
3vD39/MoxIeCXb0XigjJ3hzI17cwcXXZH3yxBp7CbY0VQFnYQVEku8GUN75BQMsM
PfI40GseY/sEA1IbAuPlinYCkpEAOBv0bZI9GZxYAhIh3H+Df/Xd8dPsmGybadvC
yEUWIrmPjLYYePOErrhUrA==
-----END PRIVATE KEY-----`;

      const token = jwt.sign(
        {
          sub: 'user123',
          aud: TEST_AUDIENCE,
          iss: TEST_ISSUER,
        },
        wrongPrivateKey,
        { algorithm: 'RS256' }
      );

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(
          TokenValidationErrorCode.INVALID_SIGNATURE,
          'Invalid token signature'
        )
      );
    });
  });

  describe('with environment variable public key', () => {
    const envKey = 'JWT_PUBLIC_KEY_https___auth_example_com';
    const originalEnv = process.env[envKey];

    beforeEach(() => {
      process.env[envKey] = TEST_RSA_PUBLIC_KEY;
      // Create validator without staticPublicKeys to test env var fallback
      validationOptions.staticPublicKeys = undefined;
      validator = new TokenValidator(validationOptions);
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env[envKey] = originalEnv;
      } else {
        delete process.env[envKey];
      }
    });

    it('should use public key from environment variable', async () => {
      const token = createTestToken();
      const result = await validator.validateToken(token);

      expect(result.sub).toBe('test-user-123');
      expect(result.iss).toBe(TEST_ISSUER);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Create a token that will cause an unexpected error
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.broken.signature';

      await expect(validator.validateToken(malformedToken)).rejects.toThrow(
        new TokenValidationError(TokenValidationErrorCode.INVALID_TOKEN, 'Token validation failed')
      );
    });

    it('should handle missing issuer in token', async () => {
      const token = jwt.sign(
        {
          sub: 'user123',
          aud: TEST_AUDIENCE,
          // Missing iss claim
        },
        TEST_RSA_PRIVATE_KEY,
        { algorithm: 'RS256' }
      );

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(
          TokenValidationErrorCode.INVALID_ISSUER,
          'Invalid issuer: undefined'
        )
      );
    });
  });

  describe('validateToken with successful validation', () => {
    it('should successfully validate a properly signed token', async () => {
      const token = createTestToken();
      const result = await validator.validateToken(token);

      expect(result.sub).toBe('test-user-123');
      expect(result.iss).toBe(TEST_ISSUER);
      expect(result.aud).toBe(TEST_AUDIENCE);
      expect(result.scope).toBe('sonarqube:read');
    });

    it('should validate token with multiple scopes', async () => {
      const token = createTestToken({
        scope: 'sonarqube:read sonarqube:write',
      });

      const result = await validator.validateToken(token);
      expect(result.scope).toBe('sonarqube:read sonarqube:write');
    });

    it('should validate token with custom claims', async () => {
      const token = createTestToken({
        custom_claim: 'custom_value',
        roles: ['admin', 'developer'],
      });

      const result = await validator.validateToken(token);
      expect(result.custom_claim).toBe('custom_value');
      expect(result.roles).toEqual(['admin', 'developer']);
    });
  });

  describe('audience validation edge cases', () => {
    it('should handle empty audience arrays', async () => {
      validationOptions.audience = [];
      validator = new TokenValidator(validationOptions);

      const token = createTestToken({
        aud: 'some-audience',
      });

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(
          TokenValidationErrorCode.INVALID_AUDIENCE,
          'Token audience does not include this server'
        )
      );
    });

    it('should validate when token has multiple audiences including expected', async () => {
      const token = createTestToken({
        aud: ['other-audience', TEST_AUDIENCE],
      });

      const result = await validator.validateToken(token);
      expect(result.sub).toBe('test-user-123');
    });
  });

  describe('resource validation edge cases', () => {
    it('should pass when resource validation disabled', async () => {
      validationOptions.validateResource = false;
      validationOptions.expectedResources = ['https://api.example.com'];
      validator = new TokenValidator(validationOptions);

      const token = createTestToken({
        resource: 'https://wrong-api.com',
      });

      // With validation disabled, should succeed
      const result = await validator.validateToken(token);
      expect(result.resource).toBe('https://wrong-api.com');
    });

    it('should handle missing resource when validation enabled', async () => {
      validationOptions.validateResource = true;
      validationOptions.expectedResources = ['https://api.example.com'];
      validator = new TokenValidator(validationOptions);

      const token = createTestToken();
      // Remove resource claim if it exists
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      delete decoded.resource;
      const tokenWithoutResource = jwt.sign(decoded as jwt.JwtPayload, TEST_RSA_PRIVATE_KEY, {
        algorithm: 'RS256',
      });

      // With no resource claim, validation should pass (resource is optional)
      const result = await validator.validateToken(tokenWithoutResource);
      expect(result.resource).toBeUndefined();
    });

    it('should validate array of resources with hierarchical match', async () => {
      validationOptions.validateResource = true;
      validationOptions.expectedResources = ['https://api.example.com'];
      validator = new TokenValidator(validationOptions);

      const token = createTestToken({
        resource: ['https://api.example.com/users', 'https://api.example.com/posts'],
      });

      const result = await validator.validateToken(token);
      expect(result.resource).toEqual([
        'https://api.example.com/users',
        'https://api.example.com/posts',
      ]);
    });

    it('should reject invalid resource when validation enabled', async () => {
      validationOptions.validateResource = true;
      validationOptions.expectedResources = ['https://api.example.com'];
      validator = new TokenValidator(validationOptions);

      const token = createTestToken({
        resource: 'https://wrong-api.com',
      });

      await expect(validator.validateToken(token)).rejects.toThrow(
        new TokenValidationError(
          TokenValidationErrorCode.INVALID_RESOURCE,
          'Token resource indicator does not match'
        )
      );
    });
  });
});
