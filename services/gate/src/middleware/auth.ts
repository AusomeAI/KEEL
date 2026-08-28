/**
 * Authentication & Authorization Middleware
 *
 * Validates:
 * - Actor identity (per-agent tokens, Law 10)
 * - Tenant scope (Law 5)
 * - Request authorization
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  tenant_id: string;
  actor_id: string;
  actor_kind: 'HUMAN' | 'AGENT';
  agent_token?: string;
}

/**
 * Extract and validate authentication from request headers
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

  // TODO: Validate token against IAM system
  // For now, parse basic JWT structure: header.payload.signature
  // This is a placeholder until OAuth 2.1 + PKCE is implemented

  try {
    // In production: verify JWT signature, check expiration, validate scopes
    const payload = parseJWTPayload(token);

    if (!payload.tenant_id || !payload.actor_id || !payload.actor_kind) {
      reply.status(401).send({
        error: 'INVALID_TOKEN',
        message: 'Token missing required claims',
      });
      return;
    }

    // Attach to request
    (request as AuthenticatedRequest).tenant_id = payload.tenant_id;
    (request as AuthenticatedRequest).actor_id = payload.actor_id;
    (request as AuthenticatedRequest).actor_kind = payload.actor_kind;
    (request as AuthenticatedRequest).agent_token = token;
  } catch (error) {
    reply.status(401).send({
      error: 'INVALID_TOKEN',
      message: 'Failed to parse authentication token',
    });
  }
}

/**
 * Parse JWT payload (insecure, for development only)
 * In production: verify signature properly
 */
function parseJWTPayload(token: string): Record<string, any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    return payload;
  } catch (error) {
    throw new Error('Failed to parse JWT payload');
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
