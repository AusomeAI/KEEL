/**
 * Tenancy Kernel Tests
 *
 * Verifies Law 5: Tenant isolation enforced by PostgreSQL RLS in the kernel.
 * Tests that:
 * 1. Tenancy contexts are validated correctly
 * 2. RLS context settings are generated properly
 * 3. Scope helpers work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TenancyKernel,
  ValidatedTenancyContext,
  TenancyContextManager,
  TenancyAwareSQLBuilder,
} from "./tenancy-kernel";
import { TenantContext } from "../types/tenant";

describe("TenancyKernel", () => {
  const validTenantId = "550e8400-e29b-41d4-a716-446655440001";
  const validGroupId = "550e8400-e29b-41d4-a716-446655440002";
  const validEntityId = "550e8400-e29b-41d4-a716-446655440003";
  const validBranchId = "550e8400-e29b-41d4-a716-446655440004";

  describe("createContext", () => {
    it("creates a valid context with correct UUIDs", () => {
      const result = TenancyKernel.createContext(
        validTenantId,
        validGroupId,
        validEntityId,
        validBranchId,
      );

      expect(result.isOk()).toBe(true);
      const context = result.unwrap();
      expect(context.getTenantId()).toBe(validTenantId);
      expect(context.getGroupId()).toBe(validGroupId);
      expect(context.getLegalEntityId()).toBe(validEntityId);
      expect(context.getBranchId()).toBe(validBranchId);
    });

    it("rejects invalid tenant ID", () => {
      const result = TenancyKernel.createContext(
        "not-a-uuid",
        validGroupId,
        validEntityId,
        validBranchId,
      );

      expect(result.isOk()).toBe(false);
      expect(result.unwrapErr().message).toContain("Invalid");
    });

    it("rejects invalid group ID", () => {
      const result = TenancyKernel.createContext(
        validTenantId,
        "invalid",
        validEntityId,
        validBranchId,
      );

      expect(result.isOk()).toBe(false);
    });

    it("rejects null or undefined values", () => {
      const result1 = TenancyKernel.createContext(
        null as any,
        validGroupId,
        validEntityId,
        validBranchId,
      );

      expect(result1.isOk()).toBe(false);
    });
  });

  describe("fromJSON", () => {
    it("creates context from valid JSON object", () => {
      const json = {
        tenantId: validTenantId,
        groupId: validGroupId,
        legalEntityId: validEntityId,
        branchId: validBranchId,
      };

      const result = TenancyKernel.fromJSON(json);
      expect(result.isOk()).toBe(true);
      const context = result.unwrap();
      expect(context.getTenantId()).toBe(validTenantId);
    });

    it("rejects JSON with missing fields", () => {
      const json = {
        tenantId: validTenantId,
        groupId: validGroupId,
        // Missing legalEntityId and branchId
      };

      const result = TenancyKernel.fromJSON(json);
      expect(result.isOk()).toBe(false);
    });

    it("rejects JSON with invalid UUIDs", () => {
      const json = {
        tenantId: "invalid",
        groupId: validGroupId,
        legalEntityId: validEntityId,
        branchId: validBranchId,
      };

      const result = TenancyKernel.fromJSON(json);
      expect(result.isOk()).toBe(false);
    });
  });

  describe("validateHierarchy", () => {
    it("validates correct hierarchy", () => {
      const context: TenantContext = {
        tenantId: validTenantId,
        groupId: validGroupId,
        legalEntityId: validEntityId,
        branchId: validBranchId,
      };

      const result = TenancyKernel.validateHierarchy(context);
      expect(result.isOk()).toBe(true);
    });

    it("rejects incomplete hierarchy", () => {
      const context = {
        tenantId: validTenantId,
        // Missing other levels
      };

      const result = TenancyKernel.validateHierarchy(context as any);
      expect(result.isOk()).toBe(false);
    });
  });
});

describe("ValidatedTenancyContext", () => {
  let context: ValidatedTenancyContext;

  beforeEach(() => {
    const validTenantId = "550e8400-e29b-41d4-a716-446655440001";
    const validGroupId = "550e8400-e29b-41d4-a716-446655440002";
    const validEntityId = "550e8400-e29b-41d4-a716-446655440003";
    const validBranchId = "550e8400-e29b-41d4-a716-446655440004";

    const result = TenancyKernel.createContext(
      validTenantId,
      validGroupId,
      validEntityId,
      validBranchId,
    );
    context = result.unwrap();
  });

  describe("getters", () => {
    it("returns correct tenant ID", () => {
      expect(context.getTenantId()).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    it("returns correct group ID", () => {
      expect(context.getGroupId()).toBe("550e8400-e29b-41d4-a716-446655440002");
    });

    it("returns correct entity ID", () => {
      expect(context.getLegalEntityId()).toBe("550e8400-e29b-41d4-a716-446655440003");
    });

    it("returns correct branch ID", () => {
      expect(context.getBranchId()).toBe("550e8400-e29b-41d4-a716-446655440004");
    });
  });

  describe("scope checks", () => {
    it("reports full context as scoped to all levels", () => {
      expect(context.isGroupScoped()).toBe(true);
      expect(context.isEntityScoped()).toBe(true);
      expect(context.isBranchScoped()).toBe(true);
    });
  });

  describe("toPgSettings", () => {
    it("generates correct PostgreSQL settings", () => {
      const settings = context.toPgSettings();

      expect(settings["keel.tenant_id"]).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(settings["keel.group_id"]).toBe("550e8400-e29b-41d4-a716-446655440002");
      expect(settings["keel.legal_entity_id"]).toBe("550e8400-e29b-41d4-a716-446655440003");
      expect(settings["keel.branch_id"]).toBe("550e8400-e29b-41d4-a716-446655440004");
    });
  });

  describe("toJSON", () => {
    it("serializes to JSON", () => {
      const json = context.toJSON();

      expect(json.tenantId).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(json.groupId).toBe("550e8400-e29b-41d4-a716-446655440002");
    });
  });
});

describe("TenancyContextManager", () => {
  beforeEach(() => {
    TenancyContextManager.clearContext();
  });

  afterEach(() => {
    TenancyContextManager.clearContext();
  });

  it("stores and retrieves context", () => {
    const result = TenancyKernel.createContext(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
      "550e8400-e29b-41d4-a716-446655440004",
    );

    const context = result.unwrap();
    TenancyContextManager.setContext(context);

    expect(TenancyContextManager.getContext()).toBe(context);
  });

  it("returns null when no context is set", () => {
    expect(TenancyContextManager.getContext()).toBe(null);
  });

  it("gets current tenant ID", () => {
    const result = TenancyKernel.createContext(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
      "550e8400-e29b-41d4-a716-446655440004",
    );

    TenancyContextManager.setContext(result.unwrap());
    expect(TenancyContextManager.getCurrentTenantId()).toBe(
      "550e8400-e29b-41d4-a716-446655440001",
    );
  });

  it("throws when getting tenant ID without context", () => {
    expect(() => TenancyContextManager.getCurrentTenantId()).toThrow(
      "No tenancy context set",
    );
  });

  it("runs function with scoped context", async () => {
    const result = TenancyKernel.createContext(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
      "550e8400-e29b-41d4-a716-446655440004",
    );

    const context = result.unwrap();

    let contextInside: ValidatedTenancyContext | null = null;

    await TenancyContextManager.withContext(context, async () => {
      contextInside = TenancyContextManager.getContext();
    });

    expect(contextInside).toBe(context);
    expect(TenancyContextManager.getContext()).toBe(null); // Cleared after
  });

  it("restores previous context after withContext", async () => {
    const result1 = TenancyKernel.createContext(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
      "550e8400-e29b-41d4-a716-446655440004",
    );
    const context1 = result1.unwrap();

    const result2 = TenancyKernel.createContext(
      "550e8400-e29b-41d4-a716-446655440005",
      "550e8400-e29b-41d4-a716-446655440006",
      "550e8400-e29b-41d4-a716-446655440007",
      "550e8400-e29b-41d4-a716-446655440008",
    );
    const context2 = result2.unwrap();

    TenancyContextManager.setContext(context1);

    await TenancyContextManager.withContext(context2, async () => {
      expect(TenancyContextManager.getContext()).toBe(context2);
    });

    expect(TenancyContextManager.getContext()).toBe(context1); // Restored
  });
});

describe("TenancyAwareSQLBuilder", () => {
  let context: ValidatedTenancyContext;

  beforeEach(() => {
    const result = TenancyKernel.createContext(
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
      "550e8400-e29b-41d4-a716-446655440004",
    );
    context = result.unwrap();
  });

  it("generates tenant isolation clause", () => {
    const clause = TenancyAwareSQLBuilder.getTenantIsolationClause(context);
    expect(clause).toContain("550e8400-e29b-41d4-a716-446655440001");
    expect(clause).toContain("tenant_id");
  });

  it("generates full hierarchy clause", () => {
    const clause = TenancyAwareSQLBuilder.getFullHierarchyClause(context);
    expect(clause).toContain("tenant_id");
    expect(clause).toContain("group_id");
    expect(clause).toContain("legal_entity_id");
    expect(clause).toContain("branch_id");
  });

  it("generates entity isolation clause", () => {
    const clause = TenancyAwareSQLBuilder.getEntityIsolationClause(context);
    expect(clause).toContain("legal_entity_id");
    expect(clause).toContain("550e8400-e29b-41d4-a716-446655440003");
  });

  it("generates group isolation clause", () => {
    const clause = TenancyAwareSQLBuilder.getGroupIsolationClause(context);
    expect(clause).toContain("group_id");
    expect(clause).toContain("550e8400-e29b-41d4-a716-446655440002");
  });
});
