import { createLogger } from '../utils/logger.js';
import { JWK, JWKSResponse, OIDCDiscoveryDocument, CachedJWKS } from './external-idp-types.js';

const logger = createLogger('JWKSClient');

/**
 * Client for fetching and caching JWKS (JSON Web Key Set) from IdPs
 */
export class JWKSClient {
  private readonly cache = new Map<string, CachedJWKS>();
  private readonly discoveryCache = new Map<string, OIDCDiscoveryDocument>();
  private readonly cacheTTL: number;
  private readonly discoveryTTL: number;

  constructor(options: { cacheTTL?: number; discoveryTTL?: number } = {}) {
    this.cacheTTL = options.cacheTTL ?? 3600000; // 1 hour default
    this.discoveryTTL = options.discoveryTTL ?? 86400000; // 24 hours default
  }

  /**
   * Get a public key from JWKS endpoint
   * @param issuer The IdP issuer URL
   * @param kid The key ID (optional)
   * @param jwksUri Override JWKS URI (optional)
   * @returns The public key in PEM format
   */
  async getKey(issuer: string, kid?: string, jwksUri?: string): Promise<string> {
    const effectiveUri = jwksUri ?? (await this.getJwksUri(issuer));
    const jwks = await this.fetchJWKS(effectiveUri);

    // Find the key
    let key: JWK | undefined;
    if (kid) {
      key = jwks.keys.keys.find((k) => k.kid === kid);
      if (!key) {
        throw new Error(`Key with kid '${kid}' not found in JWKS`);
      }
    } else if (jwks.keys.keys.length === 1) {
      key = jwks.keys.keys[0];
    } else {
      // Try to find a signing key
      key = jwks.keys.keys.find((k) => k.use === 'sig') ?? jwks.keys.keys[0];
    }

    if (!key) {
      throw new Error('No suitable key found in JWKS');
    }

    return this.jwkToPem(key);
  }

  /**
   * Get JWKS URI via OIDC discovery
   */
  private async getJwksUri(issuer: string): Promise<string> {
    // Check discovery cache
    const cached = this.discoveryCache.get(issuer);
    if (cached) {
      return cached.jwks_uri;
    }

    // Fetch discovery document
    const discoveryUrl = new URL('/.well-known/openid-configuration', issuer).toString();

    logger.debug('Fetching OIDC discovery document', { issuer, discoveryUrl });

    const response = await fetch(discoveryUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch discovery document: ${response.status} ${response.statusText}`
      );
    }

    const discovery = (await response.json()) as OIDCDiscoveryDocument;

    if (!discovery.jwks_uri) {
      throw new Error('Discovery document missing jwks_uri');
    }

    // Cache the discovery document
    this.discoveryCache.set(issuer, discovery);

    // Set up cache expiry
    setTimeout(() => {
      this.discoveryCache.delete(issuer);
    }, this.discoveryTTL);

    return discovery.jwks_uri;
  }

  /**
   * Fetch JWKS from endpoint with caching
   */
  private async fetchJWKS(uri: string): Promise<CachedJWKS> {
    // Check cache
    const cached = this.cache.get(uri);
    if (cached && cached.expiresAt > new Date()) {
      logger.debug('Using cached JWKS', { uri });
      return cached;
    }

    logger.debug('Fetching JWKS', { uri });

    const response = await fetch(uri, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
    }

    const keys = (await response.json()) as JWKSResponse;

    if (!keys.keys || !Array.isArray(keys.keys)) {
      throw new Error('Invalid JWKS response: missing keys array');
    }

    const now = new Date();
    const newCached: CachedJWKS = {
      keys,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + this.cacheTTL),
    };

    // Cache the result
    this.cache.set(uri, newCached);

    // Set up cache expiry
    setTimeout(() => {
      this.cache.delete(uri);
    }, this.cacheTTL);

    return newCached;
  }

  /**
   * Convert JWK to PEM format
   */
  private jwkToPem(jwk: JWK): string {
    if (jwk.kty !== 'RSA') {
      throw new Error(`Unsupported key type: ${jwk.kty}`);
    }

    if (!jwk.n || !jwk.e) {
      throw new Error('Invalid RSA key: missing n or e');
    }

    // Convert base64url to base64
    const n = this.base64urlToBase64(jwk.n);
    const e = this.base64urlToBase64(jwk.e);

    // Create RSA public key in PEM format
    const keyData = Buffer.concat([
      this.encodeLength(Buffer.from([0x02])), // INTEGER tag
      this.encodeInteger(Buffer.from(n, 'base64')),
      this.encodeLength(Buffer.from([0x02])), // INTEGER tag
      this.encodeInteger(Buffer.from(e, 'base64')),
    ]);

    const rsaPublicKey = Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE tag
      this.encodeLength(keyData),
      keyData,
    ]);

    // Wrap in SubjectPublicKeyInfo
    const algorithmIdentifier = Buffer.from([
      0x30,
      0x0d, // SEQUENCE of length 13
      0x06,
      0x09, // OBJECT IDENTIFIER of length 9
      0x2a,
      0x86,
      0x48,
      0x86,
      0xf7,
      0x0d,
      0x01,
      0x01,
      0x01, // rsaEncryption OID
      0x05,
      0x00, // NULL
    ]);

    const bitString = Buffer.concat([
      Buffer.from([0x03]), // BIT STRING tag
      this.encodeLength(Buffer.concat([Buffer.from([0x00]), rsaPublicKey])),
      Buffer.from([0x00]), // no unused bits
      rsaPublicKey,
    ]);

    const publicKeyInfo = Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE tag
      this.encodeLength(Buffer.concat([algorithmIdentifier, bitString])),
      algorithmIdentifier,
      bitString,
    ]);

    // Convert to PEM format
    const base64 = publicKeyInfo.toString('base64');
    const lines = [];
    lines.push('-----BEGIN PUBLIC KEY-----');
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.slice(i, i + 64));
    }
    lines.push('-----END PUBLIC KEY-----');

    return lines.join('\\n');
  }

  /**
   * Convert base64url to base64
   */
  private base64urlToBase64(str: string): string {
    return str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  }

  /**
   * Encode ASN.1 length
   */
  private encodeLength(data: Buffer): Buffer {
    const len = data.length;
    if (len < 128) {
      return Buffer.from([len]);
    }

    const bytes = [];
    let temp = len;
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }

    return Buffer.concat([Buffer.from([0x80 | bytes.length]), Buffer.from(bytes)]);
  }

  /**
   * Encode ASN.1 integer
   */
  private encodeInteger(data: Buffer): Buffer {
    // Add leading zero if high bit is set (to indicate positive number)
    if (data[0] & 0x80) {
      data = Buffer.concat([Buffer.from([0x00]), data]);
    }

    return Buffer.concat([
      Buffer.from([0x02]), // INTEGER tag
      this.encodeLength(data),
      data,
    ]);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.discoveryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { jwks: number; discovery: number } {
    return {
      jwks: this.cache.size,
      discovery: this.discoveryCache.size,
    };
  }
}
