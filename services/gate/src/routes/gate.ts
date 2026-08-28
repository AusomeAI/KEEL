/**
 * Control Gate API Routes
 *
 * Transaction Intent submission, approval, rejection, and status.
 * Implements the 9-step Control Gate pipeline.
 *
 * Laws Enforced:
 * - Law 2: Manual UI required before agent capability
 * - Law 5: Tenant isolation via RLS
 * - Law 7: Decision Records on all material decisions
 * - Law 9: Autonomy ceilings (compile-time)
 * - Law 10: Per-agent identity with scoped tokens
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getControlGatePipeline } from '@keel/core';
import { randomUUID } from 'crypto';
import {
  SubmitIntentRequestSchema,
  SubmitIntentResponse,
  ApproveIntentRequestSchema,
  ApproveIntentResponse,
  RejectIntentRequestSchema,
  RejectIntentResponse,
  ListPendingIntentsResponse,
  TransactionIntent,
} from '../types/index.js';
import { getPool, transactionWithTenantContext, queryWithTenantContext } from '../db/client.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireActor } from '../middleware/auth.js';

export async function registerGateRoutes(app: FastifyInstance): Promise<void> {
  // Apply authentication to all routes
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/gate/submit
   *
   * Submit a TransactionIntent through the Control Gate pipeline.
   * Executes steps 1-7 of the 9-step pipeline.
   */
  app.post<{ Body: unknown }>('/api/gate/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireTenant(request, reply) || !requireActor(request, reply)) {
      return;
    }

    const authReq = request as AuthenticatedRequest;

    try {
      // Validate request body
      const body = SubmitIntentRequestSchema.parse(request.body);

      // Get Control Gate pipeline
      const pipeline = getControlGatePipeline();

      // Step 1-7: Execute through pipeline
      const result = await pipeline.execute({
        type: body.type,
        subject_id: body.subject_id,
        payload: body.payload,
        actor: {
          kind: body.actor_kind,
          id: body.actor_id,
          email: '', // TODO: Extract from token
          agentToken: authReq.agent_token,
          approvedByActorId: body.approved_by_id,
        },
        asOf: body.as_of ? new Date(body.as_of) : undefined,
        effectiveFrom: body.effective_from ? new Date(body.effective_from) : undefined,
      });

      // Persist TransactionIntent to database
      const intentId = randomUUID();
      const transactionId = randomUUID();

      await transactionWithTenantContext(authReq.tenant_id, async (client) => {
        // Store the transaction intent
        await client.query(
          `INSERT INTO transaction_intents (
            id, tenant_id, type, subject_id, actor_id, actor_kind, status,
            payload, simulation_result, approval_level, submitted_at, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW() + INTERVAL '7 days')`,
          [
            intentId,
            authReq.tenant_id,
            body.type,
            body.subject_id,
            body.actor_id,
            body.actor_kind,
            result.requires_approval ? 'PENDING' : 'APPROVED',
            JSON.stringify(body.payload),
            JSON.stringify(result.simulation_result || {}),
            result.approval_level,
          ]
        );

        // Step 8: If no approval required, execute immediately
        if (!result.requires_approval) {
          // Create ledger event
          await client.query(
            `INSERT INTO ledger_events (
              id, tenant_id, event_type, aggregate_id, aggregate_type,
              actor_id, actor_kind, payload, transaction_id, valid_from, recorded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              randomUUID(),
              authReq.tenant_id,
              body.type,
              body.subject_id,
              'TransactionIntent',
              body.actor_id,
              body.actor_kind,
              JSON.stringify(body.payload),
              transactionId,
            ]
          );

          // Step 9: Create signed Decision Record
          await client.query(
            `INSERT INTO decision_records (
              id, tenant_id, category, subject_id, actor_id, decisions,
              regulatory_evidence, record_hash, ledger_event_ids
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              randomUUID(),
              authReq.tenant_id,
              body.type,
              body.subject_id,
              body.actor_id,
              JSON.stringify([{
                decision: 'APPROVED',
                actor_id: body.actor_id,
                timestamp: new Date().toISOString(),
              }]),
              JSON.stringify([]),
              '', // TODO: Compute SHA-256 hash of record
              '{}',
            ]
          );

          // Update intent status to EXECUTED
          await client.query(
            `UPDATE transaction_intents
             SET status = $1, execution_transaction_id = $2, updated_at = NOW()
             WHERE id = $3`,
            ['EXECUTED', transactionId, intentId]
          );
        }
      });

      const response: SubmitIntentResponse = {
        id: intentId,
        status: result.requires_approval ? 'PENDING' : 'EXECUTED',
        approval_level: result.approval_level,
        requires_approval: result.requires_approval,
        simulation_result: result.simulation_result,
        message: result.requires_approval
          ? 'Intent submitted for approval'
          : 'Intent executed automatically',
      };

      reply.status(201).send(response);
    } catch (error: any) {
      console.error('Control Gate error:', error);

      if (error.name === 'ZodError') {
        reply.status(400).send({
          error: 'INVALID_REQUEST',
          message: 'Request validation failed',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: error.message || 'Failed to process intent',
        });
      }
    }
  });

  /**
   * GET /api/gate/pending
   *
   * List pending transaction intents for a tenant.
   */
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/gate/pending',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireTenant(request, reply)) {
        return;
      }

      const authReq = request as AuthenticatedRequest;
      const limit = Math.min(parseInt(request.query.limit as string) || 50, 100);
      const offset = parseInt(request.query.offset as string) || 0;

      try {
        const result = await queryWithTenantContext(
          `SELECT id, type, subject_id, actor_id, actor_kind, approval_level,
                  submitted_at, expires_at, simulation_result
           FROM transaction_intents
           WHERE status = $1 AND expires_at > NOW()
           ORDER BY submitted_at DESC
           LIMIT $2 OFFSET $3`,
          ['PENDING', limit, offset],
          authReq.tenant_id
        );

        const totalResult = await queryWithTenantContext(
          `SELECT COUNT(*) as count
           FROM transaction_intents
           WHERE status = $1 AND expires_at > NOW()`,
          ['PENDING'],
          authReq.tenant_id
        );

        const response: ListPendingIntentsResponse = {
          intents: result.rows.map((row) => ({
            id: row.id,
            type: row.type,
            subject_id: row.subject_id,
            actor_id: row.actor_id,
            actor_kind: row.actor_kind,
            approval_level: row.approval_level,
            submitted_at: row.submitted_at.toISOString(),
            expires_at: row.expires_at.toISOString(),
            simulation_result: row.simulation_result,
          })),
          total: totalResult.rows[0].count,
          message: 'Pending intents retrieved',
        };

        reply.send(response);
      } catch (error: any) {
        console.error('Failed to list pending intents:', error);
        reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve pending intents',
        });
      }
    }
  );

  /**
   * POST /api/gate/approve/:intentId
   *
   * Approve a pending transaction intent.
   * Executes step 8-9 of the pipeline.
   */
  app.post<{ Params: { intentId: string }; Body: unknown }>(
    '/api/gate/approve/:intentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireTenant(request, reply) || !requireActor(request, reply)) {
        return;
      }

      const authReq = request as AuthenticatedRequest;
      const { intentId } = request.params as { intentId: string };

      try {
        const body = ApproveIntentRequestSchema.parse(request.body);

        await transactionWithTenantContext(authReq.tenant_id, async (client) => {
          // Fetch the intent
          const intentResult = await client.query(
            `SELECT * FROM transaction_intents WHERE id = $1 AND status = $2`,
            [intentId, 'PENDING']
          );

          if (intentResult.rows.length === 0) {
            throw new Error('Intent not found or not pending');
          }

          const intent = intentResult.rows[0];

          // Step 8: Execute as ledger transaction
          const ledgerEventId = randomUUID();
          const transactionId = randomUUID();

          await client.query(
            `INSERT INTO ledger_events (
              id, tenant_id, event_type, aggregate_id, aggregate_type,
              actor_id, actor_kind, approved_by_id, payload, transaction_id,
              valid_from, recorded_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              ledgerEventId,
              authReq.tenant_id,
              intent.type,
              intent.subject_id,
              'TransactionIntent',
              intent.actor_id,
              intent.actor_kind,
              body.approved_by_id,
              JSON.stringify(intent.payload),
              transactionId,
            ]
          );

          // Step 9: Create signed Decision Record
          const decisionRecordId = randomUUID();
          await client.query(
            `INSERT INTO decision_records (
              id, tenant_id, category, subject_id, transaction_intent_id,
              actor_id, decisions, regulatory_evidence, record_hash,
              ledger_event_ids
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              decisionRecordId,
              authReq.tenant_id,
              intent.type,
              intent.subject_id,
              intentId,
              body.approved_by_id,
              JSON.stringify([{
                decision: 'APPROVED',
                approved_by_id: body.approved_by_id,
                timestamp: new Date().toISOString(),
              }]),
              JSON.stringify([]),
              '', // TODO: Compute SHA-256 hash
              JSON.stringify([ledgerEventId]),
            ]
          );

          // Update intent status
          await client.query(
            `UPDATE transaction_intents
             SET status = $1, approved_at = NOW(), approved_by_id = $2,
                 execution_transaction_id = $3, decision_record_id = $4,
                 updated_at = NOW()
             WHERE id = $5`,
            ['EXECUTED', body.approved_by_id, transactionId, decisionRecordId, intentId]
          );
        });

        const response: ApproveIntentResponse = {
          id: intentId,
          status: 'EXECUTED',
          executed_at: new Date().toISOString(),
          ledger_event_id: randomUUID(), // TODO: Return actual ledger event ID
          decision_record_id: randomUUID(), // TODO: Return actual decision record ID
          message: 'Intent approved and executed',
        };

        reply.send(response);
      } catch (error: any) {
        console.error('Failed to approve intent:', error);

        if (error.name === 'ZodError') {
          reply.status(400).send({
            error: 'INVALID_REQUEST',
            message: 'Request validation failed',
          });
        } else if (error.message.includes('not found')) {
          reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Intent not found',
          });
        } else {
          reply.status(500).send({
            error: 'INTERNAL_ERROR',
            message: error.message || 'Failed to approve intent',
          });
        }
      }
    }
  );

  /**
   * POST /api/gate/reject/:intentId
   *
   * Reject a pending transaction intent.
   */
  app.post<{ Params: { intentId: string }; Body: unknown }>(
    '/api/gate/reject/:intentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireTenant(request, reply) || !requireActor(request, reply)) {
        return;
      }

      const authReq = request as AuthenticatedRequest;
      const { intentId } = request.params as { intentId: string };

      try {
        const body = RejectIntentRequestSchema.parse(request.body);

        const pool = getPool();
        await pool.query(
          `UPDATE transaction_intents
           SET status = $1, rejected_at = NOW(), rejected_by_id = $2,
               rejection_reason = $3, updated_at = NOW()
           WHERE id = $4 AND tenant_id = $5`,
          ['REJECTED', body.rejected_by_id, body.reason, intentId, authReq.tenant_id]
        );

        const response: RejectIntentResponse = {
          id: intentId,
          status: 'REJECTED',
          rejected_at: new Date().toISOString(),
          reason: body.reason,
          message: 'Intent rejected',
        };

        reply.send(response);
      } catch (error: any) {
        console.error('Failed to reject intent:', error);

        if (error.name === 'ZodError') {
          reply.status(400).send({
            error: 'INVALID_REQUEST',
            message: 'Request validation failed',
          });
        } else {
          reply.status(500).send({
            error: 'INTERNAL_ERROR',
            message: error.message || 'Failed to reject intent',
          });
        }
      }
    }
  );
}
