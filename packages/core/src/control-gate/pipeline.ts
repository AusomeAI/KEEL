/**
 * Control Gate Pipeline Implementation
 *
 * Wave 2 deliverable: Full 9-step gate pipeline
 *
 * The Control Gate is the single write path for the deterministic plane.
 * It enforces Laws 2, 7, 9, 10 with identical logic for humans and agents.
 *
 * 9-step contract:
 * 1. Authenticate actor (per-agent identity, short-lived token)
 * 2. Authorise against tenancy scope (tenant/group/entity/branch)
 * 3. Check autonomy ceiling for this intent type (Law 9)
 * 4. Check budget and rate limits (agents only)
 * 5. Validate against compiled policy (same for humans and agents)
 * 6. Simulate deterministically; attach projected effect
 * 7. Route for human approval if autonomy level requires it
 * 8. Execute as an ordinary ledger transaction
 * 9. Emit signed Decision Record (Law 7)
 *
 * Critical design principle:
 * If the Agent Plane did not exist, would this still be the correct API
 * for the manual UI? If no, you've built an AI safety wrapper instead of
 * a transaction boundary. Rewrite it.
 */

import { z } from "zod";
import {
  TransactionIntent,
  IntentRegistration,
  AutonomyLevel,
  TransactionIntentType,
  TransactionIntentTypeSchema,
} from "../types/transaction-intent";
import {
  DecisionRecord,
  DecisionCategory,
  RegulatoryEvidence,
} from "../types/decision-record";
import { Actor, ActorKind } from "../types/actor";
import { TenantContext } from "../types/tenant";

/**
 * Projection of an intent's effect (deterministic simulation)
 */
export interface Effect {
  type: string;
  changes: Record<string, unknown>;
  projectedState: Record<string, unknown>;
}

/**
 * Result of the policy validation step
 */
export interface PolicyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  applicableRules: string[];
}

/**
 * Approval requirement outcome from autonomy ceiling check
 */
export interface ApprovalRequirement {
  required: boolean;
  level: "IMMEDIATE_EXECUTION" | "MANAGER_APPROVAL" | "HR_APPROVAL" | "PAYROLL_SIGN_OFF";
  reason: string;
}

/**
 * Pending transaction waiting for approval
 */
export interface PendingTransaction {
  id: string;
  intent: TransactionIntent;
  createdAt: Date;
  expiresAt: Date;
  approval: ApprovalRequirement;
  simulation: {
    effect: Effect;
    risks: string[];
  };
}

/**
 * Result of executing through the control gate
 */
export interface ControlGateOutcome {
  success: boolean;
  transactionId?: string;
  pendingId?: string;
  decision?: DecisionRecord;
  errors: string[];
  warnings: string[];
}

/**
 * Intent Registration Map — compile-time registry of all supported intents
 * This enforces Law 2: Manual UI routes must exist before agent capabilities
 */
const IntentRegistrations = new Map<TransactionIntentType, IntentRegistration>();

/**
 * Register a transaction intent type
 * This is called at module initialization for every supported intent
 */
export function registerIntentType(registration: IntentRegistration): void {
  IntentRegistrations.set(registration.type, registration);
}

/**
 * Get registration for an intent type
 */
export function getIntentRegistration(
  type: TransactionIntentType
): IntentRegistration | undefined {
  return IntentRegistrations.get(type);
}

/**
 * Get all registered intent types
 */
export function getAllRegisteredIntents(): IntentRegistration[] {
  return Array.from(IntentRegistrations.values());
}

/**
 * Autonomy ceilings — compile-time constants per intent type (Law 9)
 * These cannot be escalated by any configuration or admin screen
 */
const AutonomyCeilings = new Map<TransactionIntentType, AutonomyLevel>([
  // Entitlements (sensitive)
  ["HIRE_EMPLOYEE", "L2"], // Assisted only (agent informs, human decides)
  ["TERMINATE_EMPLOYEE", "L2"],
  ["CHANGE_JOB", "L1"], // Supervised (agent proposes, human approves)
  ["CHANGE_PAY", "L1"],

  // Time and leave (medium sensitivity)
  ["SUBMIT_TIMESHEET", "L0"], // Can be autonomous if within policy
  ["REQUEST_LEAVE", "L3"], // Humans only (no agent involvement)
  ["APPROVE_LEAVE", "L1"],
  ["CANCEL_LEAVE", "L1"],

  // Payroll (high sensitivity)
  ["RUN_PAYROLL", "L2"],
  ["APPROVE_PAYROLL", "L2"],
  ["POST_PAYROLL_TO_GL", "L1"],

  // Approvals (delegated)
  ["APPROVE_TRANSACTION", "L1"],
  ["REJECT_TRANSACTION", "L1"],
  ["ESCALATE_TRANSACTION", "L1"],
]);

/**
 * Get the compile-time autonomy ceiling for an intent type (Law 9)
 */
export function getAutonomyCeiling(type: TransactionIntentType): AutonomyLevel {
  return AutonomyCeilings.get(type) || "L3"; // Default to manual-only if not found
}

/**
 * Budget and rate limits for agent actions
 * (Populated at tenant configuration time)
 */
interface AgentBudget {
  monthlyTransactionLimit: number;
  monthlyMonetaryLimit: bigint; // In minor units
  rateLimit: {
    perSecond: number;
    perMinute: number;
    perHour: number;
  };
}

const AgentBudgets = new Map<string, AgentBudget>();

/**
 * Set budget for an agent
 */
export function setAgentBudget(agentId: string, budget: AgentBudget): void {
  AgentBudgets.set(agentId, budget);
}

/**
 * Get budget for an agent
 */
export function getAgentBudget(agentId: string): AgentBudget | undefined {
  return AgentBudgets.get(agentId);
}

/**
 * Control Gate Pipeline Implementation
 */
export class ControlGatePipeline {
  private pendingTransactions = new Map<string, PendingTransaction>();
  private transactionCounter = 0;

  /**
   * Step 1: Authenticate actor
   * Verify per-agent identity and token validity
   */
  private async authenticateActor(actor: Actor): Promise<{ valid: boolean; error?: string }> {
    // TODO: In Wave 2+, validate against OAuth 2.1 + PKCE provider
    // For now, accept all authenticated actors (tokens from API layer)

    if (!actor.id) {
      return { valid: false, error: "Actor must have an ID" };
    }

    if (actor.kind === "AGENT" && !actor.agentToken) {
      return { valid: false, error: "Agent must provide short-lived token" };
    }

    // Token validation would happen here in production
    // This is where agent token expiration is checked

    return { valid: true };
  }

  /**
   * Step 2: Authorise against tenancy scope
   * Check that actor has permission in this tenant/group/entity/branch
   */
  private async authoriseTenancy(
    actor: Actor,
    tenancy: TenantContext
  ): Promise<{ authorized: boolean; error?: string }> {
    // TODO: In Wave 2+, check RLS row-level security rules
    // Verify actor has necessary role in this tenancy scope

    if (!tenancy.tenantId) {
      return { authorized: false, error: "Tenancy context must include tenantId" };
    }

    // For now, verify basic tenancy structure
    if (tenancy.groupId && tenancy.groupId !== "") {
      // Valid group reference
    }

    if (tenancy.entityId && tenancy.entityId !== "") {
      // Valid entity reference
    }

    if (tenancy.branchId && tenancy.branchId !== "") {
      // Valid branch reference
    }

    // TODO: Call RBAC engine to verify actor's role in this scope
    // rbac.canActInScope(actor, tenancy)

    return { authorized: true };
  }

  /**
   * Step 3: Check autonomy ceiling for intent type
   * Ensures agent cannot exceed compile-time autonomy ceiling (Law 9)
   */
  private checkAutonomyCeiling(
    actor: Actor,
    intentType: TransactionIntentType
  ): { allowed: boolean; error?: string } {
    const ceiling = getAutonomyCeiling(intentType);

    // Humans can always act (up to their role limits, checked in step 2)
    if (actor.kind === "HUMAN") {
      return { allowed: true };
    }

    // Agent ceiling check
    const agentLevels: Record<string, number> = {
      L0: 0, // Autonomous
      L1: 1, // Supervised
      L2: 2, // Assisted
      L3: 3, // Manual only
    };

    const agentLevel = agentLevels[ceiling] || 3;

    if (agentLevel >= 2) {
      // L2 (Assisted) or L3 (Manual) — agent cannot act autonomously
      return {
        allowed: false,
        error: `Intent ${intentType} has autonomy ceiling ${ceiling} — agent cannot act`,
      };
    }

    return { allowed: true };
  }

  /**
   * Step 4: Check budget and rate limits (agents only)
   * Verify agent hasn't exceeded transaction or monetary limits
   */
  private async checkAgentBudget(
    actor: Actor,
    _intentType: TransactionIntentType
  ): Promise<{ withinBudget: boolean; error?: string }> {
    if (actor.kind === "HUMAN") {
      return { withinBudget: true };
    }

    const budget = getAgentBudget(actor.id);
    if (!budget) {
      return { withinBudget: false, error: `No budget configured for agent ${actor.id}` };
    }

    // TODO: Track and check against:
    // - Monthly transaction count
    // - Monthly monetary limit
    // - Per-second, per-minute, per-hour rate limits

    return { withinBudget: true };
  }

  /**
   * Step 5: Validate against compiled policy
   * Run same validation for humans and agents
   */
  private async validatePolicy(
    _intent: TransactionIntent
  ): Promise<PolicyValidationResult> {
    // TODO: In Wave 2+, integrate with policy compiler
    // Load compiled policy for intent type
    // Apply policy rules to intent payload
    // Return validation result

    return {
      valid: true,
      errors: [],
      warnings: [],
      applicableRules: [],
    };
  }

  /**
   * Step 6: Simulate deterministically and project effect
   */
  private async simulateEffect(_intent: TransactionIntent): Promise<Effect> {
    // TODO: In Wave 2+, call deterministic simulation engine
    // Use Rust/WASM calculation kernel for payroll, entitlements, etc.
    // Produce projected state changes

    return {
      type: "SIMULATION",
      changes: {},
      projectedState: {},
    };
  }

  /**
   * Step 7: Route for human approval if needed
   */
  private determineApprovalRequirement(
    actor: Actor,
    intentType: TransactionIntentType
  ): ApprovalRequirement {
    const ceiling = getAutonomyCeiling(intentType);

    // Humans always require appropriate approval based on their role
    if (actor.kind === "HUMAN") {
      const approvalLevels: Record<string, "MANAGER_APPROVAL" | "HR_APPROVAL" | "PAYROLL_SIGN_OFF"> = {
        HIRE_EMPLOYEE: "HR_APPROVAL",
        TERMINATE_EMPLOYEE: "HR_APPROVAL",
        CHANGE_PAY: "HR_APPROVAL",
        RUN_PAYROLL: "PAYROLL_SIGN_OFF",
        APPROVE_PAYROLL: "PAYROLL_SIGN_OFF",
      };

      const level = approvalLevels[intentType as keyof typeof approvalLevels];

      return {
        required: level !== undefined,
        level: level || "MANAGER_APPROVAL",
        reason: `${actor.kind} action on ${intentType} requires approval`,
      };
    }

    // Agents follow autonomy ceiling
    if (ceiling === "L0") {
      return {
        required: false,
        level: "IMMEDIATE_EXECUTION",
        reason: `Agent has L0 autonomy for ${intentType}`,
      };
    }

    if (ceiling === "L1") {
      return {
        required: true,
        level: "MANAGER_APPROVAL",
        reason: `Agent has L1 autonomy; ${intentType} requires supervisor approval`,
      };
    }

    // L2 (Assisted) and L3 (Manual) require escalation
    return {
      required: true,
      level: "HR_APPROVAL",
      reason: `Intent ${intentType} requires ${ceiling} — human judgment required`,
    };
  }

  /**
   * Step 8: Execute as ledger transaction
   */
  private async executeLedgerTransaction(_intent: TransactionIntent): Promise<string> {
    // TODO: In Wave 2+, append event to bitemporal ledger
    // Create immutable record in event store
    // Return transaction ID

    const txnId = `txn-${++this.transactionCounter}`;
    return txnId;
  }

  /**
   * Step 9: Emit signed Decision Record
   */
  private async emitDecisionRecord(
    intent: TransactionIntent,
    transactionId: string,
    approval: ApprovalRequirement
  ): Promise<DecisionRecord> {
    // TODO: In Wave 2+, create and sign decision record
    // Include regulatory evidence and decision flow

    const record: DecisionRecord = {
      id: `dr-${this.transactionCounter}`,
      category: "OTHER" as DecisionCategory,
      subject: intent.subject,
      transactionIntentType: intent.type,
      ledgerEventIds: [transactionId],
      tenancy: intent.tenancy,
      actor: intent.actor,
      decisions: [
        {
          deciderId: intent.actor.id,
          role: intent.actor.kind,
          decision: "APPROVED",
          timestamp: new Date(),
        },
      ],
      regulatoryEvidence: [],
      recordHash: "sha256-placeholder", // Will be computed in Wave 2+
      createdAt: new Date(),
    };

    return record;
  }

  /**
   * Main gate execution
   * Processes intent through all 9 steps
   */
  async execute(intent: TransactionIntent): Promise<ControlGateOutcome> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Authenticate
      const auth = await this.authenticateActor(intent.actor);
      if (!auth.valid) {
        return {
          success: false,
          errors: [auth.error || "Authentication failed"],
          warnings,
        };
      }

      // Step 2: Authorise tenancy
      const authz = await this.authoriseTenancy(intent.actor, intent.tenancy);
      if (!authz.authorized) {
        return {
          success: false,
          errors: [authz.error || "Authorisation failed"],
          warnings,
        };
      }

      // Step 3: Check autonomy ceiling
      const autonomy = this.checkAutonomyCeiling(intent.actor, intent.type);
      if (!autonomy.allowed) {
        return {
          success: false,
          errors: [autonomy.error || "Autonomy ceiling exceeded"],
          warnings,
        };
      }

      // Step 4: Check budget (agents only)
      const budget = await this.checkAgentBudget(intent.actor, intent.type);
      if (!budget.withinBudget) {
        return {
          success: false,
          errors: [budget.error || "Budget exceeded"],
          warnings,
        };
      }

      // Step 5: Validate policy
      const policy = await this.validatePolicy(intent);
      if (!policy.valid) {
        return {
          success: false,
          errors: [...policy.errors],
          warnings: [...policy.warnings],
        };
      }

      warnings.push(...policy.warnings);

      // Step 6: Simulate effect
      const effect = await this.simulateEffect(intent);

      // Step 7: Determine approval requirement
      const approval = this.determineApprovalRequirement(intent.actor, intent.type);

      // If approval is required, put in pending queue and return pending ID
      if (approval.required) {
        const pendingId = `pend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const pending: PendingTransaction = {
          id: pendingId,
          intent,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          approval,
          simulation: {
            effect,
            risks: [], // TODO: Calculate risk factors
          },
        };

        this.pendingTransactions.set(pendingId, pending);

        return {
          success: true,
          pendingId,
          errors: [],
          warnings,
        };
      }

      // Step 8: Execute
      const transactionId = await this.executeLedgerTransaction(intent);

      // Step 9: Emit decision record
      const decision = await this.emitDecisionRecord(intent, transactionId, approval);

      return {
        success: true,
        transactionId,
        decision,
        errors: [],
        warnings,
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [err.message || "Gate execution failed"],
        warnings,
      };
    }
  }

  /**
   * Get a pending transaction (for approval)
   */
  getPendingTransaction(pendingId: string): PendingTransaction | undefined {
    return this.pendingTransactions.get(pendingId);
  }

  /**
   * Get all pending transactions for a scope (e.g., for a manager to review)
   */
  getPendingForScope(tenantId: string, _groupId?: string): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values()).filter(
      (p) => p.intent.tenancy.tenantId === tenantId
    );
  }

  /**
   * Approve a pending transaction
   */
  async approvePending(
    pendingId: string,
    approverId: string,
    reasoning?: string
  ): Promise<ControlGateOutcome> {
    const pending = this.pendingTransactions.get(pendingId);
    if (!pending) {
      return {
        success: false,
        errors: [`Pending transaction ${pendingId} not found`],
        warnings: [],
      };
    }

    // Record approval decision
    pending.intent.actor.approvedByActorId = approverId;

    // Execute
    const transactionId = await this.executeLedgerTransaction(pending.intent);

    // Emit decision record with approval chain
    const decision = await this.emitDecisionRecord(pending.intent, transactionId, pending.approval);

    // Remove from pending queue
    this.pendingTransactions.delete(pendingId);

    return {
      success: true,
      transactionId,
      decision,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Reject a pending transaction
   */
  async rejectPending(
    pendingId: string,
    rejectorId: string,
    reasoning: string
  ): Promise<ControlGateOutcome> {
    const pending = this.pendingTransactions.get(pendingId);
    if (!pending) {
      return {
        success: false,
        errors: [`Pending transaction ${pendingId} not found`],
        warnings: [],
      };
    }

    // Remove from pending queue
    this.pendingTransactions.delete(pendingId);

    return {
      success: false,
      errors: [`Transaction rejected by ${rejectorId}: ${reasoning}`],
      warnings: [],
    };
  }

  /**
   * Diagnostics: Get queue size
   */
  getPendingCount(): number {
    return this.pendingTransactions.size;
  }

  /**
   * Diagnostics: Clear all pending (for testing)
   */
  clearPending(): void {
    this.pendingTransactions.clear();
  }
}

/**
 * Global control gate pipeline instance
 */
let globalPipeline: ControlGatePipeline | null = null;

/**
 * Get the global pipeline
 */
export function getControlGatePipeline(): ControlGatePipeline {
  if (!globalPipeline) {
    globalPipeline = new ControlGatePipeline();
  }
  return globalPipeline;
}

/**
 * Reset for testing
 */
export function resetControlGatePipeline(): void {
  globalPipeline = null;
}
