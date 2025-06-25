import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

export interface JWK {
  kid: string;
  kty: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

export interface KeyPair {
  kid: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
}

export class KeyManager {
  private currentKeyPair: KeyPair;
  private readonly keyPairs: Map<string, KeyPair> = new Map();

  constructor() {
    this.currentKeyPair = this.generateKeyPair();
    this.keyPairs.set(this.currentKeyPair.kid, this.currentKeyPair);
  }

  private generateKeyPair(): KeyPair {
    const kid = randomUUID();
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const keyPair: KeyPair = {
      kid,
      publicKey,
      privateKey,
      createdAt: new Date(),
    };

    return keyPair;
  }

  getCurrentKeyPair(): KeyPair {
    return this.currentKeyPair;
  }

  getKeyPairByKid(kid: string): KeyPair | undefined {
    return this.keyPairs.get(kid);
  }

  rotateKeys(): void {
    const newKeyPair = this.generateKeyPair();
    this.keyPairs.set(newKeyPair.kid, newKeyPair);
    this.currentKeyPair = newKeyPair;

    const maxAge = 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - maxAge);
    for (const [kid, keyPair] of this.keyPairs.entries()) {
      if (keyPair.createdAt < cutoffDate && kid !== this.currentKeyPair.kid) {
        this.keyPairs.delete(kid);
      }
    }
  }

  getJWKS(): { keys: JWK[] } {
    const keys: JWK[] = [];

    for (const keyPair of this.keyPairs.values()) {
      const publicKeyPem = keyPair.publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\n/g, '');

      const publicKeyBuffer = Buffer.from(publicKeyPem, 'base64');

      const modulus = publicKeyBuffer.subarray(publicKeyBuffer.length - 256);
      const exponent = publicKeyBuffer.subarray(
        publicKeyBuffer.length - 256 - 3,
        publicKeyBuffer.length - 256
      );

      keys.push({
        kid: keyPair.kid,
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        n: modulus.toString('base64url'),
        e: exponent.toString('base64url'),
      });
    }

    return { keys };
  }

  signToken(payload: Record<string, unknown>, options?: jwt.SignOptions): string {
    const keyPair = this.getCurrentKeyPair();
    return jwt.sign(payload, keyPair.privateKey, {
      algorithm: 'RS256',
      keyid: keyPair.kid,
      ...options,
    });
  }

  verifyToken(token: string): Record<string, unknown> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    const kid = decoded.header.kid;
    if (!kid) {
      throw new Error('Token missing kid header');
    }

    const keyPair = this.getKeyPairByKid(kid);
    if (!keyPair) {
      throw new Error('Unknown signing key');
    }

    const verified = jwt.verify(token, keyPair.publicKey, { algorithms: ['RS256'] });
    if (typeof verified === 'string') {
      throw new Error('Invalid token payload');
    }
    return verified as Record<string, unknown>;
  }
}
