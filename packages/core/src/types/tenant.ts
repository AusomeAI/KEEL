/**
 * Tenant hierarchy types
 *
 * Enforces Law 5: Tenant isolation is enforced by PostgreSQL RLS in the kernel.
 *
 * The hierarchy is:
 * Tenant (top-level customer)
 *   └─ Group (business unit or subsidiary)
 *       └─ Legal Entity (company registered with tax authority)
 *           └─ Branch (physical location or cost center)
 *
 * Every event in the ledger carries tenant context at all levels.
 */

import { z } from "zod";

export const TenantIdSchema = z.string().uuid().describe("Top-level customer tenant ID");
export type TenantId = z.infer<typeof TenantIdSchema>;

export const GroupIdSchema = z.string().uuid().describe("Business unit or subsidiary within a tenant");
export type GroupId = z.infer<typeof GroupIdSchema>;

export const LegalEntityIdSchema = z
  .string()
  .uuid()
  .describe("Company registered with tax authority");
export type LegalEntityId = z.infer<typeof LegalEntityIdSchema>;

export const BranchIdSchema = z
  .string()
  .uuid()
  .describe("Physical location or cost center within a legal entity");
export type BranchId = z.infer<typeof BranchIdSchema>;

/**
 * Tenancy scope — specifies which tenant context an action is scoped to
 */
export const TenancyScopeSchema = z.object({
  tenant: TenantIdSchema,
  group: GroupIdSchema,
  legalEntity: LegalEntityIdSchema,
  branch: BranchIdSchema,
});

export type TenancyScope = z.infer<typeof TenancyScopeSchema>;

/**
 * Tenant context carrying all four levels
 * Used in every ledger event to enforce RLS
 */
export const TenantContextSchema = z.object({
  tenantId: TenantIdSchema,
  groupId: GroupIdSchema,
  legalEntityId: LegalEntityIdSchema,
  branchId: BranchIdSchema,
});

export type TenantContext = z.infer<typeof TenantContextSchema>;
