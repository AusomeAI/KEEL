/**
 * Type Definitions for Control Gate API
 */

import { z } from 'zod';

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const SubmitIntentRequestSchema = z.object({
  type: z.string(),
  subject_id: z.string().uuid(),
  payload: z.record(z.unknown()),
  actor_id: z.string().uuid(),
  actor_kind: z.enum(['HUMAN', 'AGENT']),
  as_of: z.string().datetime().optional(),
  effective_from: z.string().datetime().optional(),
  approved_by_id: z.string().uuid().optional(),
  on_behalf_of: z.string().uuid().optional(),
});

export type SubmitIntentRequest = z.infer<typeof SubmitIntentRequestSchema>;

export const SubmitIntentResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED']),
  approval_level: z.string().optional(),
  requires_approval: z.boolean(),
  simulation_result: z.record(z.unknown()).optional(),
  message: z.string(),
});

export type SubmitIntentResponse = z.infer<typeof SubmitIntentResponseSchema>;

export const ApproveIntentRequestSchema = z.object({
  approved_by_id: z.string().uuid(),
});

export type ApproveIntentRequest = z.infer<typeof ApproveIntentRequestSchema>;

export const ApproveIntentResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['EXECUTED']),
  executed_at: z.string().datetime(),
  ledger_event_id: z.string().uuid(),
  decision_record_id: z.string().uuid(),
  message: z.string(),
});

export type ApproveIntentResponse = z.infer<typeof ApproveIntentResponseSchema>;

export const RejectIntentRequestSchema = z.object({
  rejected_by_id: z.string().uuid(),
  reason: z.string(),
});

export type RejectIntentRequest = z.infer<typeof RejectIntentRequestSchema>;

export const RejectIntentResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['REJECTED']),
  rejected_at: z.string().datetime(),
  reason: z.string(),
  message: z.string(),
});

export type RejectIntentResponse = z.infer<typeof RejectIntentResponseSchema>;

export const PendingIntentSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  subject_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  actor_kind: z.enum(['HUMAN', 'AGENT']),
  approval_level: z.string().optional(),
  submitted_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  simulation_result: z.record(z.unknown()).optional(),
});

export type PendingIntent = z.infer<typeof PendingIntentSchema>;

export const ListPendingIntentsResponseSchema = z.object({
  intents: z.array(PendingIntentSchema),
  total: z.number(),
  message: z.string(),
});

export type ListPendingIntentsResponse = z.infer<typeof ListPendingIntentsResponseSchema>;

// ============================================================================
// Database Models
// ============================================================================

export interface LedgerEvent {
  id: string;
  tenant_id: string;
  group_id?: string;
  entity_id?: string;
  branch_id?: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  actor_id: string;
  actor_kind: 'HUMAN' | 'AGENT';
  approved_by_id?: string;
  payload: Record<string, unknown>;
  transaction_id: string;
  decision_record_id?: string;
  kms_key_id?: string;
  valid_from: Date;
  valid_until?: Date;
  recorded_at: Date;
  created_at: Date;
}

export interface TransactionIntent {
  id: string;
  tenant_id: string;
  type: string;
  subject_id: string;
  actor_id: string;
  actor_kind: 'HUMAN' | 'AGENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  payload: Record<string, unknown>;
  simulation_result?: Record<string, unknown>;
  approval_level?: string;
  approved_at?: Date;
  approved_by_id?: string;
  rejection_reason?: string;
  rejected_at?: Date;
  rejected_by_id?: string;
  execution_transaction_id?: string;
  decision_record_id?: string;
  submitted_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DecisionRecord {
  id: string;
  tenant_id: string;
  category: string;
  subject_id: string;
  transaction_intent_type?: string;
  transaction_intent_id?: string;
  actor_id: string;
  decisions: Array<Record<string, unknown>>;
  regulatory_evidence: Array<Record<string, unknown>>;
  previous_record_id?: string;
  record_hash: string;
  ledger_event_ids: string[];
  created_at: Date;
  expires_at?: Date;
  archived_at?: Date;
}
