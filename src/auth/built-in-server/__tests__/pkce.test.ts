import { describe, it, expect } from '@jest/globals';
import { createHash } from 'crypto';
import { PKCEValidator } from '../pkce.js';

describe('PKCEValidator', () => {
  describe('validateCodeChallenge', () => {
    it('should validate correct code challenge with S256 method', () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, codeChallenge, 'S256');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject incorrect code challenge', () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const incorrectChallenge = 'incorrect_challenge_value';

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, incorrectChallenge, 'S256');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code challenge does not match code verifier');
    });

    it('should reject unsupported code challenge method', () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const codeChallenge = codeVerifier; // plain method

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, codeChallenge, undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only S256 code challenge method is supported');
    });

    it('should reject code verifier that is too short', () => {
      const codeVerifier = 'tooShort';
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, codeChallenge, 'S256');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code verifier must be between 43 and 128 characters');
    });

    it('should reject code verifier that is too long', () => {
      const codeVerifier = 'a'.repeat(129);
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, codeChallenge, 'S256');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code verifier must be between 43 and 128 characters');
    });

    it('should reject code verifier with invalid characters', () => {
      const codeVerifier = 'contains spaces and invalid!@#$%^&*()+={}[]|\\:;"\'<>,.?/';
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, codeChallenge, 'S256');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Code verifier contains invalid characters');
    });

    it('should accept code verifier with all valid characters', () => {
      const codeVerifier = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const result = PKCEValidator.validateCodeChallenge(codeVerifier, codeChallenge, 'S256');

      expect(result.valid).toBe(true);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate correct code challenge', () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

      const generatedChallenge = PKCEValidator.generateCodeChallenge(codeVerifier);

      expect(generatedChallenge).toBe(expectedChallenge);
    });

    it('should generate URL-safe base64 without padding', () => {
      const codeVerifier = 'test-code-verifier-string';
      const challenge = PKCEValidator.generateCodeChallenge(codeVerifier);

      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });
  });

  describe('isValidCodeVerifier', () => {
    it('should accept valid code verifiers', () => {
      const validVerifiers = [
        'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        'a'.repeat(43),
        'a'.repeat(128),
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~',
      ];

      for (const verifier of validVerifiers) {
        expect(PKCEValidator.isValidCodeVerifier(verifier)).toBe(true);
      }
    });

    it('should reject invalid code verifiers', () => {
      const invalidVerifiers = [
        'tooShort',
        'a'.repeat(42),
        'a'.repeat(129),
        'contains spaces',
        'contains!invalid@characters#',
        'contains/slash',
        'contains+plus',
        'contains=equals',
      ];

      for (const verifier of invalidVerifiers) {
        expect(PKCEValidator.isValidCodeVerifier(verifier)).toBe(false);
      }
    });
  });

  describe('RFC 7636 Test Vectors', () => {
    it('should pass RFC 7636 Appendix B test vector', () => {
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      const generatedChallenge = PKCEValidator.generateCodeChallenge(codeVerifier);
      expect(generatedChallenge).toBe(expectedChallenge);

      const validationResult = PKCEValidator.validateCodeChallenge(
        codeVerifier,
        expectedChallenge,
        'S256'
      );
      expect(validationResult.valid).toBe(true);
    });
  });
});
