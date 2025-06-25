import { createHash } from 'crypto';
import type { PKCEValidationResult } from './types.js';

export class PKCEValidator {
  static validateCodeChallenge(
    codeVerifier: string,
    codeChallenge: string,
    codeChallengeMethod?: 'S256'
  ): PKCEValidationResult {
    if (!codeChallengeMethod || codeChallengeMethod !== 'S256') {
      return {
        valid: false,
        error: 'Only S256 code challenge method is supported',
      };
    }

    if (codeVerifier.length < 43 || codeVerifier.length > 128) {
      return {
        valid: false,
        error: 'Code verifier must be between 43 and 128 characters',
      };
    }

    if (!/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) {
      return {
        valid: false,
        error: 'Code verifier contains invalid characters',
      };
    }

    const computedChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    if (computedChallenge !== codeChallenge) {
      return {
        valid: false,
        error: 'Code challenge does not match code verifier',
      };
    }

    return { valid: true };
  }

  static generateCodeChallenge(codeVerifier: string): string {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  static isValidCodeVerifier(codeVerifier: string): boolean {
    return (
      codeVerifier.length >= 43 &&
      codeVerifier.length <= 128 &&
      /^[A-Za-z0-9\-._~]+$/.test(codeVerifier)
    );
  }
}
