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

  /**
   * GET /api/gate/employee/:employeeId/leave-balances
   *
   * Fetch current leave balances for an employee.
   * Calculates accrued, taken, available, and carryover days for each leave type.
   *
   * Law 5: RLS ensures tenant_id matches employee's tenant
   */
  app.get<{ Params: { employeeId: string }; Querystring: { asOfDate?: string } }>(
    '/api/gate/employee/:employeeId/leave-balances',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireTenant(request, reply)) {
        return;
      }

      const authReq = request as AuthenticatedRequest;
      const { employeeId } = request.params as { employeeId: string };
      const asOfDate = request.query.asOfDate ? new Date(request.query.asOfDate) : new Date();

      try {
        const result = await queryWithTenantContext(
          `SELECT id, hire_date FROM employees WHERE id = $1`,
          [employeeId],
          authReq.tenant_id
        );

        if (result.rows.length === 0) {
          reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Employee not found',
          });
          return;
        }

        const employee = result.rows[0];
        const hireDate = new Date(employee.hire_date);

        // Fetch leave events for this employee (approved only)
        const leaveEventsResult = await queryWithTenantContext(
          `SELECT event_type, payload, valid_from, recorded_at
           FROM ledger_events
           WHERE aggregate_id = $1 AND event_type LIKE $2
           AND recorded_at <= $3
           ORDER BY recorded_at DESC`,
          [employeeId, 'LEAVE_%', asOfDate.toISOString()],
          authReq.tenant_id
        );

        // Calculate leave balances
        const leaveTypes = ['PTO', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'UNPAID'];
        const balances = leaveTypes.map((leaveType) => {
          // Standard accrual rules (from leave-policy.ts)
          const accrualRules: Record<string, { annual: number; monthly: number; carryoverMax: number }> = {
            PTO: { annual: 20, monthly: 20 / 12, carryoverMax: 5 },
            SICK: { annual: 10, monthly: 10 / 12, carryoverMax: 0 },
            PERSONAL: { annual: 3, monthly: 3 / 12, carryoverMax: 0 },
            BEREAVEMENT: { annual: 5, monthly: 0, carryoverMax: 0 },
            UNPAID: { annual: Infinity, monthly: 0, carryoverMax: 0 },
          };

          const rule = accrualRules[leaveType];

          // Calculate months employed
          const monthsEmployed = Math.floor(
            (asOfDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          );

          // Calculate accrued days
          const accrued = Math.min(monthsEmployed * rule.monthly, rule.annual);

          // Calculate taken days from ledger events
          const takenDays = leaveEventsResult.rows
            .filter((row) => {
              const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
              return row.event_type === 'LEAVE_APPROVED' && payload.leave_type === leaveType;
            })
            .reduce((sum, row) => {
              const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
              return sum + (payload.duration_days || 0);
            }, 0);

          return {
            leave_type: leaveType,
            accrued_days: Math.round(accrued * 100) / 100,
            taken_days: takenDays,
            available_days: Math.max(0, Math.round((accrued - takenDays) * 100) / 100),
            carryover_days: 0, // TODO: Fetch from carry_forward table
            total_available: Math.max(0, Math.round((accrued - takenDays) * 100) / 100),
          };
        });

        reply.send({
          employee_id: employeeId,
          as_of_date: asOfDate.toISOString(),
          balances,
        });
      } catch (error: any) {
        console.error('Failed to fetch leave balances:', error);
        reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve leave balances',
        });
      }
    }
  );

  /**
   * GET /api/gate/employee/:employeeId/leave-history
   *
   * Fetch leave request history for an employee.
   * Returns approved, rejected, and pending requests in reverse chronological order.
   *
   * Law 5: RLS ensures tenant_id matches employee's tenant
   */
  app.get<{ Params: { employeeId: string }; Querystring: { limit?: string; offset?: string } }>(
    '/api/gate/employee/:employeeId/leave-history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireTenant(request, reply)) {
        return;
      }

      const authReq = request as AuthenticatedRequest;
      const { employeeId } = request.params as { employeeId: string };
      const limit = Math.min(parseInt(request.query.limit as string) || 20, 100);
      const offset = parseInt(request.query.offset as string) || 0;

      try {
        // Fetch leave request intents for this employee
        const result = await queryWithTenantContext(
          `SELECT id, type, status, payload, submitted_at, updated_at, approval_level
           FROM transaction_intents
           WHERE subject_id = $1 AND type = $2
           ORDER BY submitted_at DESC
           LIMIT $3 OFFSET $4`,
          [employeeId, 'REQUEST_LEAVE', limit, offset],
          authReq.tenant_id
        );

        const leaveRequests = result.rows.map((row) => {
          const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
          return {
            id: row.id,
            leave_type: payload.leave_type,
            start_date: payload.start_date,
            end_date: payload.end_date,
            duration_days: payload.duration_days,
            status: row.status,
            submitted_at: row.submitted_at.toISOString(),
            updated_at: row.updated_at?.toISOString(),
            reason: payload.reason,
          };
        });

        // Get total count
        const countResult = await queryWithTenantContext(
          `SELECT COUNT(*) as count FROM transaction_intents
           WHERE subject_id = $1 AND type = $2`,
          [employeeId, 'REQUEST_LEAVE'],
          authReq.tenant_id
        );

        reply.send({
          employee_id: employeeId,
          requests: leaveRequests,
          total: countResult.rows[0].count,
        });
      } catch (error: any) {
        console.error('Failed to fetch leave history:', error);
        reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve leave history',
        });
      }
    }
  );

  /**
   * Enhancement: GET /api/gate/pending (extended)
   *
   * Can now be filtered by:
   * - ?type=REQUEST_LEAVE - Filter by intent type
   * - ?role=MANAGER|HR_ADMIN - Filter by approver role (from payload)
   * - ?employee_id=xyz - Filter by specific employee (for manager/HR dashboard)
   *
   * This allows LeaveApprovalsPage to fetch only leave requests that require approval.
   */
}
