/**
 * OAuth 2.1 + PKCE Implementation
 *
 * Implements RFC 6749 (OAuth 2.0) + RFC 7636 (PKCE) + RFC 9101 (OAuth 2.0 Security)
 *
 * Flow:
 * 1. User initiates login (web app calls /auth/authorize)
 * 2. Web app generates code_challenge + code_verifier (PKCE)
 * 3. User redirects to OAuth provider with code_challenge
 * 4. OAuth provider redirects back with authorization_code
 * 5. Web app exchanges code + code_verifier for access_token + refresh_token
 * 6. Web app includes access_token in Authorization header (Bearer <token>)
 * 7. Control Gate validates token signature and claims
 * 8. Request proceeds with tenant_id, actor_id from token claims
 *
 * Law 10: Per-agent identity with short-lived scoped tokens
 */

import crypto from 'crypto';

/**
 * OAuth 2.1 Authorization Request
 */
export interface AuthorizationRequest {
  client_id: string;           // KEEL application ID
  redirect_uri: string;         // Web app callback URL
  scope: string;                // openid profile email tenant_id
  state: string;                // CSRF protection
  code_challenge: string;       // PKCE S256 challenge
  code_challenge_method: 'S256'; // PKCE challenge type
}

/**
 * OAuth 2.1 Token Request (Authorization Code Flow)
 */
export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  client_id: string;
  client_secret: string;        // For backend use only
  code?: string;                // Authorization code
  code_verifier?: string;       // PKCE verifier (S256 challenge)
  redirect_uri?: string;
  refresh_token?: string;       // For refresh flow
}

/**
 * OAuth 2.1 Token Response
 */
export interface TokenResponse {
  access_token: string;         // JWT
  refresh_token: string;        // For token renewal
  token_type: 'Bearer';
  expires_in: number;           // Seconds (900 = 15 minutes)
  scope: string;
}

/**
 * JWT Claims (decoded token)
 */
export interface JWTClaims {
  // Standard OAuth claims
  iss: string;                  // Issuer (e.g., https://auth.example.com)
  sub: string;                  // Subject (actor ID)
  aud: string[];                // Audience (client IDs that can use this token)
  exp: number;                  // Expiration time (Unix timestamp)
  iat: number;                  // Issued at
  nbf?: number;                 // Not before

  // KEEL-specific claims
  tenant_id: string;            // Tenant UUID (Law 5: tenant isolation)
  actor_id: string;             // Actor UUID (Law 10: per-agent identity)
  actor_kind: 'HUMAN' | 'AGENT'; // Identity type
  actor_name: string;           // Display name
  actor_email: string;          // Contact email

  // Scope and authorization
  scope: string[];              // Granted scopes
  roles: string[];              // RBAC roles at tenant scope
  permissions: string[];        // Evaluated permissions

  // Agent-specific claims (Law 10)
  agent_name?: string;          // If actor_kind === 'AGENT'
  agent_budget?: {              // Spending limit for autonomy
    monthly_usd: number;
    used_usd: number;
  };
  agent_scopes?: {              // Where agent can act
    tenants: string[];
    groups: string[];
    entities: string[];
    branches: string[];
  };
  agent_autonomy_level?: 'L0' | 'L1' | 'L2' | 'L3'; // Autonomy ceiling

  // For delegation (temporary elevation)
  delegated_by?: string;        // Who delegated this authority
  delegation_reason?: string;   // Why
  delegation_until?: number;    // Unix timestamp

  // Client metadata
  client_id: string;
}

/**
 * Generate PKCE code challenge (S256)
 * https://tools.ietf.org/html/rfc7636#section-4.1
 */
export function generatePKCEChallenge(): {
  code_verifier: string;
  code_challenge: string;
} {
  // Generate 32 random bytes (256 bits) for code_verifier
  const code_verifier = Buffer.from(
    crypto.randomBytes(32)
  ).toString('base64url');

  // Create S256 challenge: BASE64URL(SHA256(code_verifier))
  const hash = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');

  return {
    code_verifier,
    code_challenge: hash,
  };
}

/**
 * Verify PKCE code_challenge matches code_verifier
 */
export function verifyPKCEChallenge(
  code_verifier: string,
  code_challenge: string
): boolean {
  const hash = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');

  return hash === code_challenge;
}

/**
 * Generate authorization state (CSRF protection)
 */
export function generateState(): string {
  return Buffer.from(crypto.randomBytes(32)).toString('base64url');
}

/**
 * Generate access token (JWT)
 *
 * In production: Sign with private key from OAuth provider
 * For now: Mock signing (unsigned JWT for development)
 */
export function generateAccessToken(claims: JWTClaims, expiresIn: number = 900): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    ...claims,
    iat: now,
    exp: now + expiresIn,
    nbf: now,
  };

  const header = JSON.stringify({
    alg: 'RS256', // RSA Signature with SHA-256
    typ: 'JWT',
    kid: 'keel-key-1', // Key ID for JWKS rotation
  });

  const body = JSON.stringify(payload);

  // Base64URL encode header and payload
  const encodedHeader = Buffer.from(header).toString('base64url');
  const encodedBody = Buffer.from(body).toString('base64url');

  // In production: Sign with private key
  // For development: Use mock signature
  const signature = 'mock-signature'; // TODO: Real RSA signing

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

/**
 * Generate refresh token (opaque, stored on server)
 * Must be non-guessable and tied to a user session
 */
export function generateRefreshToken(): string {
  return Buffer.from(crypto.randomBytes(32)).toString('base64url');
}

/**
 * Validate token expiration
 */
export function isTokenExpired(claims: JWTClaims): boolean {
  const now = Math.floor(Date.now() / 1000);
  return claims.exp <= now;
}

/**
 * Validate token "not before" time
 */
export function isTokenNotYetValid(claims: JWTClaims): boolean {
  if (!claims.nbf) return false;
  const now = Math.floor(Date.now() / 1000);
  return now < claims.nbf;
}

/**
 * Parse and validate JWT (without signature verification for now)
 * In production: Verify signature against JWKS endpoint
 */
export function parseJWT(token: string): JWTClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    ) as JWTClaims;

    // Validate required claims
    if (!payload.iss || !payload.sub || !payload.aud || !payload.exp) {
      throw new Error('Missing required JWT claims');
    }

    // Validate KEEL-specific claims
    if (!payload.tenant_id || !payload.actor_id || !payload.actor_kind) {
      throw new Error('Missing KEEL-specific claims');
    }

    // Check expiration
    if (isTokenExpired(payload)) {
      throw new Error('Token expired');
    }

    // Check "not before"
    if (isTokenNotYetValid(payload)) {
      throw new Error('Token not yet valid');
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Validate token scopes
 */
export function hasScope(claims: JWTClaims, requiredScope: string): boolean {
  return claims.scope && claims.scope.includes(requiredScope);
}

/**
 * Check if token grants permission
 * (simplified; real implementation uses RBAC engine)
 */
export function hasPermission(
  claims: JWTClaims,
  requiredPermission: string
): boolean {
  return claims.permissions && claims.permissions.includes(requiredPermission);
}

/**
 * Validate agent autonomy level
 * (Law 9: Hard autonomy ceilings)
 */
export function validateAutonomyCeiling(
  claims: JWTClaims,
  requiredLevel: 'L0' | 'L1' | 'L2' | 'L3'
): boolean {
  if (claims.actor_kind !== 'AGENT') {
    // Humans bypass autonomy ceiling (Law 2: manual UI)
    return true;
  }

  const agentLevel = claims.agent_autonomy_level || 'L3';
  const levels = { L0: 0, L1: 1, L2: 2, L3: 3 };

  // Can only execute at or below their ceiling
  return levels[agentLevel] >= levels[requiredLevel];
}

/**
 * Check if agent has budget remaining
 * (Law 9: Budget enforcement)
 */
export function hasAgentBudget(claims: JWTClaims): boolean {
  if (claims.actor_kind !== 'AGENT' || !claims.agent_budget) {
    return true;
  }

  const { monthly_usd, used_usd } = claims.agent_budget;
  return used_usd < monthly_usd;
}

/**
 * Extract tenant context from token
 * Used to set PostgreSQL session variable for RLS
 */
export function extractTenantContext(claims: JWTClaims): {
  tenant_id: string;
  actor_id: string;
  actor_kind: 'HUMAN' | 'AGENT';
} {
  return {
    tenant_id: claims.tenant_id,
    actor_id: claims.actor_id,
    actor_kind: claims.actor_kind,
  };
}
