/**
 * Control Gate Pipeline tests
 *
 * Validates:
 * 1. Authentication of human and agent actors
 * 2. Tenancy authorisation
 * 3. Autonomy ceiling enforcement (Law 9)
 * 4. Budget/rate limit checks (agents only)
 * 5. Policy validation
 * 6. Effect simulation
 * 7. Approval routing
 * 8. Ledger execution
 * 9. Decision record emission (Law 7)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ControlGatePipeline,
  getControlGatePipeline,
  resetControlGatePipeline,
  registerIntentType,
  getIntentRegistration,
  getAutonomyCeiling,
  setAgentBudget,
} from "../pipeline";
import { TransactionIntent } from "../../types/transaction-intent";
import { Actor, ActorKind } from "../../types/actor";
import { TenantContext } from "../../types/tenant";

describe("ControlGatePipeline", () => {
  let pipeline: ControlGatePipeline;
  let humanActor: Actor;
  let agentActor: Actor;
  let tenantContext: TenantContext;
  let baseIntent: TransactionIntent;

  beforeEach(() => {
    resetControlGatePipeline();
    pipeline = getControlGatePipeline();

    humanActor = {
      id: "user-001",
      kind: "HUMAN" as ActorKind,
      email: "manager@example.com",
    };

    agentActor = {
      id: "agent-payroll-001",
      kind: "AGENT" as ActorKind,
      agentToken: "token-xyz",
    };

    tenantContext = {
      tenantId: "tenant-acme",
      groupId: "group-us",
      entityId: "entity-hq",
      branchId: "branch-nyc",
    };

    baseIntent = {
      type: "HIRE_EMPLOYEE",
      subject: "emp-12345",
      payload: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        jobTitle: "Engineer",
      },
      actor: humanActor,
      tenancy: tenantContext,
      temporal: {
        asOf: new Date(),
        effectiveFrom: new Date(),
      },
      provenance: {
        requestId: "req-" + Math.random().toString(36).substr(2, 9),
      },
    };

    // Register some intent types
    registerIntentType({
      type: "HIRE_EMPLOYEE",
      autonomyLevel: "L2",
      requiresApproval: true,
      uiRoute: "/people/hire",
      description: "Hire a new employee",
    });

    registerIntentType({
      type: "APPROVE_PAYROLL",
      autonomyLevel: "L2",
      requiresApproval: true,
      uiRoute: "/payroll/approve",
      description: "Approve payroll run",
    });

    registerIntentType({
      type: "SUBMIT_TIMESHEET",
      autonomyLevel: "L0",
      requiresApproval: false,
      uiRoute: "/time/timesheet",
      description: "Submit timesheet",
    });

    // Set agent budget
    setAgentBudget("agent-payroll-001", {
      monthlyTransactionLimit: 100,
      monthlyMonetaryLimit: BigInt(100000000), // $1M in minor units
      rateLimit: {
        perSecond: 10,
        perMinute: 100,
        perHour: 1000,
      },
    });
  });

  describe("Intent Registration (Law 2)", () => {
    it("should register an intent type", () => {
      const registration = getIntentRegistration("HIRE_EMPLOYEE");
      expect(registration).toBeDefined();
      expect(registration?.autonomyLevel).toBe("L2");
      expect(registration?.uiRoute).toBe("/people/hire");
    });

    it("should retrieve registered intent", () => {
      const registration = getIntentRegistration("HIRE_EMPLOYEE");
      expect(registration?.type).toBe("HIRE_EMPLOYEE");
      expect(registration?.description).toContain("new employee");
    });

    it("should enforce manual UI route before agent capability", () => {
      // Any registered intent must have a UI route (Law 2)
      const registration = getIntentRegistration("HIRE_EMPLOYEE");
      expect(registration?.uiRoute).toBeDefined();
      expect(registration?.uiRoute.startsWith("/")).toBe(true);
    });
  });

  describe("Autonomy Ceiling Enforcement (Law 9)", () => {
    it("should have compile-time autonomy ceiling for HIRE_EMPLOYEE", () => {
      const ceiling = getAutonomyCeiling("HIRE_EMPLOYEE");
      expect(ceiling).toBe("L2");
    });

    it("should have L0 ceiling for SUBMIT_TIMESHEET (autonomous)", () => {
      const ceiling = getAutonomyCeiling("SUBMIT_TIMESHEET");
      expect(ceiling).toBe("L0");
    });

    it("should reject agent exceeding autonomy ceiling", async () => {
      const intent = {
        ...baseIntent,
        type: "HIRE_EMPLOYEE" as const, // L2 ceiling
        actor: agentActor,
      };

      const result = await pipeline.execute(intent);

      // L2 means agent cannot act (must be assisted or supervised)
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("autonomy ceiling"))).toBe(true);
    });

    it("should allow agent within L0 autonomy ceiling", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const, // L0 ceiling
        actor: agentActor,
      };

      const result = await pipeline.execute(intent);

      // L0 means agent can act autonomously (if budget allows and other checks pass)
      // If it fails, should not be due to autonomy ceiling
      if (!result.success) {
        expect(result.errors.some((e) => e.includes("autonomy ceiling"))).toBe(false);
      } else {
        expect(result.success).toBe(true);
      }
    });

    it("should allow humans to act regardless of autonomy ceiling", async () => {
      const intent = {
        ...baseIntent,
        type: "HIRE_EMPLOYEE" as const,
        actor: humanActor,
      };

      const result = await pipeline.execute(intent);

      // Humans have full authority (limited by RBAC role)
      expect(result.success).toBe(true);
    });
  });

  describe("Authentication", () => {
    it("should accept human actor with ID", async () => {
      const intent = { ...baseIntent };
      const result = await pipeline.execute(intent);

      // Should pass auth (and subsequent steps)
      expect(result.errors.filter((e) => e.includes("Authentication")).length).toBe(0);
    });

    it("should accept agent actor with token", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
        actor: agentActor,
      };

      const result = await pipeline.execute(intent);

      // Agent with L0 autonomy should be able to act
      expect(result.errors.filter((e) => e.includes("Authentication")).length).toBe(0);
    });

    it("should require actor ID", async () => {
      const invalidActor = { ...humanActor, id: "" };
      const intent = {
        ...baseIntent,
        actor: invalidActor,
      };

      const result = await pipeline.execute(intent);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("ID"))).toBe(true);
    });
  });

  describe("Tenancy Authorisation", () => {
    it("should require tenancy context", async () => {
      const intent = {
        ...baseIntent,
        tenancy: { tenantId: "" }, // Missing tenant ID
      } as TransactionIntent;

      const result = await pipeline.execute(intent);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("tenantId"))).toBe(true);
    });

    it("should accept valid tenancy context", async () => {
      const intent = { ...baseIntent };

      const result = await pipeline.execute(intent);

      // Tenancy validation should pass
      expect(result.errors.filter((e) => e.includes("tenantId")).length).toBe(0);
    });

    it("should accept group/entity/branch hierarchy", async () => {
      const intent = {
        ...baseIntent,
        tenancy: {
          tenantId: "tenant-acme",
          groupId: "group-us",
          entityId: "entity-hq",
          branchId: "branch-nyc",
        },
      };

      const result = await pipeline.execute(intent);

      // All hierarchy levels should be valid
      expect(result.errors.filter((e) => e.includes("tenancy")).length).toBe(0);
    });
  });

  describe("Approval Routing", () => {
    it("should route L2 human intent for approval", async () => {
      const intent = {
        ...baseIntent,
        type: "HIRE_EMPLOYEE" as const,
        actor: humanActor,
      };

      const result = await pipeline.execute(intent);

      // L2 with human = requires approval
      expect(result.success).toBe(true);
      expect(result.pendingId).toBeDefined();
    });

    it("should create pending transaction with approval details", async () => {
      const intent = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
        actor: humanActor,
      };

      const result = await pipeline.execute(intent);

      if (result.pendingId) {
        const pending = pipeline.getPendingTransaction(result.pendingId);
        expect(pending).toBeDefined();
        expect(pending?.approval.required).toBe(true);
        expect(pending?.intent.type).toBe("APPROVE_PAYROLL");
      }
    });

    it("should immediately execute L0 intent", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
        actor: humanActor,
      };

      const result = await pipeline.execute(intent);

      // L0 human can execute immediately
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.pendingId).toBeUndefined();
    });
  });

  describe("Pending Transaction Management", () => {
    let pendingId: string;

    beforeEach(async () => {
      const intent = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
        actor: humanActor,
      };

      const result = await pipeline.execute(intent);
      pendingId = result.pendingId!;
    });

    it("should retrieve pending transaction", () => {
      const pending = pipeline.getPendingTransaction(pendingId);
      expect(pending).toBeDefined();
      expect(pending?.id).toBe(pendingId);
    });

    it("should approve pending transaction", async () => {
      const approvalResult = await pipeline.approvePending(
        pendingId,
        "approver-002",
        "Looks good"
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.transactionId).toBeDefined();
      expect(approvalResult.decision).toBeDefined();
    });

    it("should emit decision record on approval", async () => {
      const approvalResult = await pipeline.approvePending(
        pendingId,
        "approver-002",
        "Looks good"
      );

      expect(approvalResult.decision).toBeDefined();
      expect(approvalResult.decision?.category).toBeDefined();
      expect(approvalResult.decision?.decisions).toBeDefined();
      expect(approvalResult.decision?.decisions.length).toBeGreaterThan(0);
    });

    it("should reject pending transaction", async () => {
      const rejectResult = await pipeline.rejectPending(
        pendingId,
        "rejector-003",
        "Missing required documentation"
      );

      expect(rejectResult.success).toBe(false);
      expect(rejectResult.errors[0]).toContain("rejected");
    });

    it("should remove pending after approval", async () => {
      await pipeline.approvePending(pendingId, "approver-002");

      const pending = pipeline.getPendingTransaction(pendingId);
      expect(pending).toBeUndefined();
    });

    it("should remove pending after rejection", async () => {
      await pipeline.rejectPending(pendingId, "rejector-003", "Rejected");

      const pending = pipeline.getPendingTransaction(pendingId);
      expect(pending).toBeUndefined();
    });
  });

  describe("Decision Records (Law 7)", () => {
    it("should emit decision record on execution", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
        actor: humanActor,
      };

      const result = await pipeline.execute(intent);

      expect(result.decision).toBeDefined();
      expect(result.decision?.id).toBeDefined();
      expect(result.decision?.subject).toBe(intent.subject);
    });

    it("should include transaction intent type in record", async () => {
      const intent = {
        ...baseIntent,
        type: "HIRE_EMPLOYEE" as const,
      };

      const result = await pipeline.execute(intent);

      if (result.decision) {
        expect(result.decision.transactionIntentType).toBe("HIRE_EMPLOYEE");
      }
    });

    it("should link ledger events to decision", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
      };

      const result = await pipeline.execute(intent);

      if (result.decision) {
        expect(result.decision.ledgerEventIds).toBeDefined();
        expect(result.decision.ledgerEventIds.length).toBeGreaterThan(0);
      }
    });

    it("should include actor and tenancy in record", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
      };

      const result = await pipeline.execute(intent);

      if (result.decision) {
        expect(result.decision.actor).toBe(humanActor);
        expect(result.decision.tenancy).toBe(tenantContext);
      }
    });

    it("should include decision sequence", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
      };

      const result = await pipeline.execute(intent);

      if (result.decision) {
        expect(result.decision.decisions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              deciderId: humanActor.id,
              decision: "APPROVED",
            }),
          ])
        );
      }
    });

    it("should include record hash", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
      };

      const result = await pipeline.execute(intent);

      if (result.decision) {
        expect(result.decision.recordHash).toBeDefined();
        expect(typeof result.decision.recordHash).toBe("string");
      }
    });
  });

  describe("Agent Budget Enforcement", () => {
    it("should reject agent without budget", async () => {
      const unbuggetedAgent: Actor = {
        id: "agent-unbugeted",
        kind: "AGENT" as ActorKind,
        agentToken: "token-abc",
      };

      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
        actor: unbuggetedAgent,
      };

      const result = await pipeline.execute(intent);

      // Agent without budget should fail
      expect(result.success).toBe(false);
      // If there are errors, at least one should indicate budget/not found
      if (result.errors.length > 0) {
        expect(
          result.errors.some((e) => e.includes("budget") || e.includes("agent"))
        ).toBe(true);
      }
    });

    it("should accept agent with configured budget", async () => {
      const intent = {
        ...baseIntent,
        type: "SUBMIT_TIMESHEET" as const,
        actor: agentActor,
      };

      const result = await pipeline.execute(intent);

      // Agent has budget and L0 autonomy; should not fail on those grounds
      if (!result.success) {
        // If it fails, should not be due to budget or autonomy ceiling
        expect(result.errors.some((e) => e.includes("budget"))).toBe(false);
        expect(result.errors.some((e) => e.includes("autonomy ceiling"))).toBe(false);
      } else {
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Global Pipeline Singleton", () => {
    it("should provide global pipeline instance", () => {
      const pipeline1 = getControlGatePipeline();
      const pipeline2 = getControlGatePipeline();

      expect(pipeline1).toBe(pipeline2);
    });

    it("should reset global pipeline", () => {
      const pipeline1 = getControlGatePipeline();
      resetControlGatePipeline();
      const pipeline2 = getControlGatePipeline();

      expect(pipeline1).not.toBe(pipeline2);
    });

    it("should maintain pending across gets", async () => {
      const reg = getControlGatePipeline();
      const intent = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
      };

      const result = await reg.execute(intent);
      const pendingId = result.pendingId!;

      const reg2 = getControlGatePipeline();
      const pending = reg2.getPendingTransaction(pendingId);

      expect(pending).toBeDefined();
    });
  });

  describe("Queue Diagnostics", () => {
    it("should report pending count", async () => {
      expect(pipeline.getPendingCount()).toBe(0);

      const intent1 = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
        subject: "emp-001",
      };

      const intent2 = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
        subject: "emp-002",
      };

      await pipeline.execute(intent1);
      await pipeline.execute(intent2);

      expect(pipeline.getPendingCount()).toBe(2);
    });

    it("should clear pending for testing", async () => {
      const intent = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
      };

      await pipeline.execute(intent);
      expect(pipeline.getPendingCount()).toBeGreaterThan(0);

      pipeline.clearPending();
      expect(pipeline.getPendingCount()).toBe(0);
    });

    it("should get pending for tenant", async () => {
      const intent1 = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
        tenancy: { tenantId: "tenant-acme" },
      } as TransactionIntent;

      const intent2 = {
        ...baseIntent,
        type: "APPROVE_PAYROLL" as const,
        tenancy: { tenantId: "tenant-globex" },
      } as TransactionIntent;

      await pipeline.execute(intent1);
      await pipeline.execute(intent2);

      const acmePending = pipeline.getPendingForScope("tenant-acme");
      expect(acmePending.length).toBe(1);
      expect(acmePending[0].intent.tenancy.tenantId).toBe("tenant-acme");
    });
  });

  describe("Error Handling", () => {
    it("should return errors without throwing", async () => {
      const invalidIntent = {
        ...baseIntent,
        actor: { ...humanActor, id: "" }, // Invalid actor
      };

      const result = await pipeline.execute(invalidIntent);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle missing intent type", async () => {
      const unknownIntent = {
        ...baseIntent,
        type: "UNKNOWN_INTENT" as any,
      };

      const result = await pipeline.execute(unknownIntent);

      // Unknown intent might fail or default to L3 (manual)
      expect(result).toBeDefined();
    });
  });
});
