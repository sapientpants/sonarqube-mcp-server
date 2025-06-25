import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param bytes Number of random bytes (default 32)
 * @returns Base64url encoded token
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Generate a secure random identifier
 * @param bytes Number of random bytes (default 16)
 * @returns Hex encoded identifier
 */
export function generateSecureId(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}
