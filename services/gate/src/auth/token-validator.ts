/**
 * JWT Token Validator
 *
 * Validates JWT signatures against JWKS endpoint
 * Implements RFC 7517 (JWKS) + RFC 7518 (JWA)
 *
 * Flow:
 * 1. Receive JWT from request Authorization header
 * 2. Extract kid (key ID) from JWT header
 * 3. Fetch public key from JWKS endpoint (cached)
 * 4. Verify signature using RS256 algorithm
 * 5. Validate claims (expiration, audience, issuer)
 * 6. Return validated claims
 */

import crypto from 'crypto';
import { JWTClaims, parseJWT } from './oauth.js';

/**
 * JWKS (JSON Web Key Set) from OAuth provider
 * https://tools.ietf.org/html/rfc7517
 */
export interface JWK {
  kty: 'RSA'; // Key type
  kid: string; // Key ID
  use: 'sig'; // Use (signature)
  alg: 'RS256'; // Algorithm
  n: string; // Modulus (base64url)
  e: string; // Exponent (base64url)
}

export interface JWKS {
  keys: JWK[];
}

/**
 * JWT Header
 */
export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  claims?: JWTClaims;
  error?: string;
}

/**
 * JWKS Key Cache (in production: Redis)
 */
class JWKSCache {
  private cache: Map<string, JWK> = new Map();
  private lastFetch = 0;
  private cacheTTL = 3600000; // 1 hour

  async getKey(kid: string, jwksUrl: string): Promise<JWK | null> {
    // Return cached key if recent
    if (this.cache.has(kid) && Date.now() - this.lastFetch < this.cacheTTL) {
      return this.cache.get(kid) || null;
    }

    // Fetch fresh JWKS
    try {
      const response = await fetch(jwksUrl);
      const jwks = (await response.json()) as JWKS;

      // Clear old cache
      this.cache.clear();

      // Store all keys
      for (const key of jwks.keys) {
        this.cache.set(key.kid, key);
      }

      this.lastFetch = Date.now();

      return this.cache.get(kid) || null;
    } catch (error) {
      console.error('Failed to fetch JWKS:', error);
      return null;
    }
  }
}

const jwksCache = new JWKSCache();

/**
 * Decode JWT header (unsigned)
 */
export function decodeJWTHeader(token: string): JWTHeader | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf-8')
    );

    return header;
  } catch (error) {
    return null;
  }
}

/**
 * Convert JWKS RSA public key to OpenSSL format
 *
 * Converts base64url-encoded modulus (n) and exponent (e)
 * to PEM-formatted public key for verification
 */
export function jwkToPEM(jwk: JWK): string {
  // Decode base64url n and e
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');

  // Create public key object
  const keyObject = crypto.createPublicKey({
    key: {
      kty: 'RSA',
      n,
      e,
    },
    format: 'jwk',
  });

  // Export as PEM
  return keyObject.export({ format: 'pem', type: 'spki' }).toString();
}

/**
 * Verify JWT signature
 *
 * RS256: RSASSA-PKCS1-v1_5 using SHA-256
 */
export function verifyJWTSignature(token: string, publicKeyPEM: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [header, payload, signature] = parts;
    const message = `${header}.${payload}`;

    // Decode signature from base64url
    const signatureBuffer = Buffer.from(signature, 'base64url');

    // Verify signature
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(message);

    return verifier.verify(publicKeyPEM, signatureBuffer);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Validate token issuer
 */
export function validateIssuer(claims: JWTClaims, expectedIssuer: string): boolean {
  return claims.iss === expectedIssuer;
}

/**
 * Validate token audience
 */
export function validateAudience(
  claims: JWTClaims,
  expectedClientId: string
): boolean {
  return claims.aud && claims.aud.includes(expectedClientId);
}

/**
 * Full token validation flow
 *
 * 1. Decode and parse JWT
 * 2. Fetch public key from JWKS
 * 3. Verify signature
 * 4. Validate all claims
 */
export async function validateToken(
  token: string,
  options: {
    jwksUrl: string;
    issuer: string;
    clientId: string;
  }
): Promise<TokenValidationResult> {
  // Step 1: Decode header to get kid
  const header = decodeJWTHeader(token);
  if (!header) {
    return { valid: false, error: 'Invalid JWT format' };
  }

  if (!header.kid) {
    return { valid: false, error: 'Missing key ID in JWT header' };
  }

  if (header.alg !== 'RS256') {
    return { valid: false, error: 'Unsupported algorithm (expected RS256)' };
  }

  // Step 2: Fetch public key from JWKS
  const jwk = await jwksCache.getKey(header.kid, options.jwksUrl);
  if (!jwk) {
    return { valid: false, error: 'Public key not found' };
  }

  // Step 3: Verify signature
  const publicKeyPEM = jwkToPEM(jwk);
  if (!verifyJWTSignature(token, publicKeyPEM)) {
    return { valid: false, error: 'Invalid signature' };
  }

  // Step 4: Parse and validate claims
  const claims = parseJWT(token);
  if (!claims) {
    return { valid: false, error: 'Invalid claims' };
  }

  // Validate issuer
  if (!validateIssuer(claims, options.issuer)) {
    return { valid: false, error: 'Invalid issuer' };
  }

  // Validate audience
  if (!validateAudience(claims, options.clientId)) {
    return { valid: false, error: 'Invalid audience' };
  }

  return { valid: true, claims };
}

/**
 * Quick validation (skip signature verification)
 * Use for development/testing only
 */
export function validateTokenQuick(token: string): TokenValidationResult {
  const claims = parseJWT(token);
  if (!claims) {
    return { valid: false, error: 'Invalid token' };
  }

  return { valid: true, claims };
}
