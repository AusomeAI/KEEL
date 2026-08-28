/**
 * Authentication & Authorization Middleware
 *
 * Validates:
 * - OAuth 2.1 + PKCE token signature (Law 10)
 * - Token claims (tenant_id, actor_id, actor_kind)
 * - Tenant scope (Law 5)
 * - Actor identity and budgets
 *
 * Integrates with:
 * - OAuth provider JWKS endpoint
 * - PostgreSQL RLS context
 * - Agent budget enforcement
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { validateToken, validateTokenQuick } from './token-validator.js';
import type { JWTClaims } from './oauth.js';

export interface AuthenticatedRequest extends FastifyRequest {
  tenant_id: string;
  actor_id: string;
  actor_kind: 'HUMAN' | 'AGENT';
  claims: JWTClaims;
}

/**
 * Extract and validate authentication from request headers
 *
 * Implements OAuth 2.1 token validation with JWKS
 * Falls back to quick validation (dev mode) if JWKS unavailable
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // Attempt full token validation (with JWKS)
    let result;

    const jwksUrl = process.env.OAUTH_JWKS_URL;
    const issuer = process.env.OAUTH_ISSUER || 'https://auth.example.com';
    const clientId = process.env.OAUTH_CLIENT_ID || 'keel';

    if (jwksUrl) {
      // Production: Verify signature against JWKS
      result = await validateToken(token, {
        jwksUrl,
        issuer,
        clientId,
      });
    } else {
      // Development: Quick validation (skip signature)
      console.warn('OAUTH_JWKS_URL not set, using quick validation (DEV ONLY)');
      result = validateTokenQuick(token);
    }

    if (!result.valid || !result.claims) {
      reply.status(401).send({
        error: 'INVALID_TOKEN',
        message: result.error || 'Token validation failed',
      });
      return;
    }

    const claims = result.claims;

    // Validate required KEEL claims
    if (!claims.tenant_id || !claims.actor_id || !claims.actor_kind) {
      reply.status(401).send({
        error: 'INVALID_TOKEN',
        message: 'Missing required KEEL claims in token',
      });
      return;
    }

    // Attach to request
    (request as AuthenticatedRequest).tenant_id = claims.tenant_id;
    (request as AuthenticatedRequest).actor_id = claims.actor_id;
    (request as AuthenticatedRequest).actor_kind = claims.actor_kind;
    (request as AuthenticatedRequest).claims = claims;

    // Log authentication (for audit trail)
    console.log(
      `[AUTH] ${claims.actor_kind} ${claims.actor_id} @ tenant ${claims.tenant_id}`
    );
  } catch (error) {
    console.error('Authentication error:', error);
    reply.status(401).send({
      error: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
}

/**
 * Ensure request has tenant scope
 */
export function requireTenant(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const authReq = request as AuthenticatedRequest;

  if (!authReq.tenant_id) {
    reply.status(403).send({
      error: 'FORBIDDEN',
      message: 'No tenant scope in request',
    });
    return false;
  }

  return true;
}

/**
 * Ensure request has valid actor identity
 */
export function requireActor(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const authReq = request as AuthenticatedRequest;

  if (!authReq.actor_id || !authReq.actor_kind) {
    reply.status(403).send({
      error: 'FORBIDDEN',
      message: 'No actor identity in request',
    });
    return false;
  }

  return true;
}

/**
 * Verify agent has budget remaining (Law 9)
 */
export function requireAgentBudget(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const authReq = request as AuthenticatedRequest;

  if (authReq.actor_kind !== 'AGENT') {
    // Humans don't have budget constraints
    return true;
  }

  const claims = authReq.claims;
  if (!claims.agent_budget) {
    reply.status(403).send({
      error: 'FORBIDDEN',
      message: 'Agent budget not configured',
    });
    return false;
  }

  const { monthly_usd, used_usd } = claims.agent_budget;
  if (used_usd >= monthly_usd) {
    reply.status(429).send({
      error: 'BUDGET_EXCEEDED',
      message: 'Agent budget exhausted for this month',
      budget: {
        monthly_limit: monthly_usd,
        used: used_usd,
        remaining: 0,
      },
    });
    return false;
  }

  return true;
}

/**
 * Verify agent autonomy level (Law 9)
 */
export function requireAutonomy(
  request: FastifyRequest,
  reply: FastifyReply,
  minimumLevel: 'L0' | 'L1' | 'L2' | 'L3'
): boolean {
  const authReq = request as AuthenticatedRequest;

  if (authReq.actor_kind !== 'AGENT') {
    // Humans bypass autonomy ceilings (Law 2: manual UI)
    return true;
  }

  const claims = authReq.claims;
  const agentLevel = claims.agent_autonomy_level || 'L3';
  const levels = { L0: 0, L1: 1, L2: 2, L3: 3 };

  if (levels[agentLevel] < levels[minimumLevel]) {
    reply.status(403).send({
      error: 'AUTONOMY_CEILING_EXCEEDED',
      message: `Agent autonomy level ${agentLevel} cannot execute L${levels[minimumLevel]} operations`,
      agent_level: agentLevel,
      required_level: minimumLevel,
    });
    return false;
  }

  return true;
}
