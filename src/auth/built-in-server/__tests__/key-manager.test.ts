import { describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { KeyManager } from '../key-manager.js';

describe('KeyManager', () => {
  let keyManager: KeyManager;

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  describe('Key Generation', () => {
    it('should initialize with a current key pair', () => {
      const currentKeyPair = keyManager.getCurrentKeyPair();

      expect(currentKeyPair).toBeDefined();
      expect(currentKeyPair.kid).toBeDefined();
      expect(currentKeyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(currentKeyPair.privateKey).toContain('BEGIN PRIVATE KEY');
      expect(currentKeyPair.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique key IDs', () => {
      const keyManager1 = new KeyManager();
      const keyManager2 = new KeyManager();

      const kid1 = keyManager1.getCurrentKeyPair().kid;
      const kid2 = keyManager2.getCurrentKeyPair().kid;

      expect(kid1).not.toBe(kid2);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate keys and keep the new key as current', () => {
      const originalKeyPair = keyManager.getCurrentKeyPair();

      keyManager.rotateKeys();

      const newKeyPair = keyManager.getCurrentKeyPair();

      expect(newKeyPair.kid).not.toBe(originalKeyPair.kid);
      expect(newKeyPair.createdAt.getTime()).toBeGreaterThan(originalKeyPair.createdAt.getTime());
    });

    it('should retain old keys for validation', () => {
      const originalKeyPair = keyManager.getCurrentKeyPair();

      keyManager.rotateKeys();

      const retrievedKeyPair = keyManager.getKeyPairByKid(originalKeyPair.kid);

      expect(retrievedKeyPair).toEqual(originalKeyPair);
    });

    it('should clean up keys older than 24 hours', () => {
      const originalKeyPair = keyManager.getCurrentKeyPair();

      // Manually set created date to more than 24 hours ago
      originalKeyPair.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

      keyManager.rotateKeys();

      const retrievedKeyPair = keyManager.getKeyPairByKid(originalKeyPair.kid);

      expect(retrievedKeyPair).toBeUndefined();
    });
  });

  describe('JWKS Generation', () => {
    it('should generate valid JWKS format', () => {
      const jwks = keyManager.getJWKS();

      expect(jwks).toBeDefined();
      expect(jwks.keys).toBeInstanceOf(Array);
      expect(jwks.keys.length).toBeGreaterThan(0);

      const jwk = jwks.keys[0];
      expect(jwk.kid).toBeDefined();
      expect(jwk.kty).toBe('RSA');
      expect(jwk.use).toBe('sig');
      expect(jwk.alg).toBe('RS256');
      expect(jwk.n).toBeDefined();
      expect(jwk.e).toBeDefined();
    });

    it('should include all active keys in JWKS', () => {
      keyManager.rotateKeys();
      keyManager.rotateKeys();

      const jwks = keyManager.getJWKS();

      expect(jwks.keys.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Token Signing and Verification', () => {
    it('should sign tokens with current key', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        groups: ['users'],
      };

      const token = keyManager.signToken(payload, {
        expiresIn: '1h',
        issuer: 'test-issuer',
        audience: 'test-audience',
      });

      expect(token).toBeDefined();

      const decoded = jwt.decode(token, { complete: true }) as jwt.Jwt;
      expect(decoded.header.alg).toBe('RS256');
      expect(decoded.header.kid).toBe(keyManager.getCurrentKeyPair().kid);
      expect(decoded.payload).toMatchObject(payload);
    });

    it('should verify tokens signed with current key', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        groups: ['users'],
      };

      const token = keyManager.signToken(payload);
      const verified = keyManager.verifyToken(token);

      expect(verified).toMatchObject(payload);
    });

    it('should verify tokens signed with rotated keys', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        groups: ['users'],
      };

      const token = keyManager.signToken(payload);
      keyManager.rotateKeys();

      const verified = keyManager.verifyToken(token);

      expect(verified).toMatchObject(payload);
    });

    it('should throw error for invalid token format', () => {
      expect(() => keyManager.verifyToken('invalid-token')).toThrow('Invalid token format');
    });

    it('should throw error for token without kid', () => {
      const tokenWithoutKid = jwt.sign({ sub: 'user123' }, 'secret');

      expect(() => keyManager.verifyToken(tokenWithoutKid)).toThrow('Token missing kid header');
    });

    it('should throw error for token with unknown kid', () => {
      const keyPair = keyManager.getCurrentKeyPair();
      const token = jwt.sign({ sub: 'user123' }, keyPair.privateKey, {
        algorithm: 'RS256',
        keyid: 'unknown-kid',
      });

      expect(() => keyManager.verifyToken(token)).toThrow('Unknown signing key');
    });

    it('should throw error for tampered token', () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
      };

      const token = keyManager.signToken(payload);
      const tamperedToken = token.slice(0, -10) + 'tampered123';

      expect(() => keyManager.verifyToken(tamperedToken)).toThrow();
    });
  });
});
