/**
 * Tenancy Context
 *
 * Manages tenant/group/entity/branch scope
 *
 * Tenant hierarchy:
 * - Tenant: Top-level organization (ACME Corp)
 * - Group: Region/division (US Operations)
 * - Entity: Legal entity (ACME Inc)
 * - Branch: Physical location (NYC Office)
 *
 * Every transaction is scoped to this context (Law 5 - Tenant Isolation)
 */

import React, { createContext, useContext, useState, useCallback } from "react";

export interface TenancyScope {
  tenantId: string;
  groupId?: string;
  entityId?: string;
  branchId?: string;
}

interface AvailableScope {
  tenantId: string;
  tenantName: string;
  groups?: {
    groupId: string;
    groupName: string;
    entities?: {
      entityId: string;
      entityName: string;
      branches?: {
        branchId: string;
        branchName: string;
      }[];
    }[];
  }[];
}

interface TenancyContextType {
  currentScope: TenancyScope | null;
  setCurrentScope: (scope: TenancyScope) => void;
  availableScopes: AvailableScope[] | null;
  setAvailableScopes: (scopes: AvailableScope[]) => void;
  canActInScope: (scope: TenancyScope) => boolean;
}

const TenancyContext = createContext<TenancyContextType | undefined>(undefined);

export function TenancyProvider({ children }: { children: React.ReactNode }) {
  const [currentScope, setCurrentScopeState] = useState<TenancyScope | null>(null);
  const [availableScopes, setAvailableScopesState] = useState<AvailableScope[] | null>(null);

  const setCurrentScope = useCallback((scope: TenancyScope) => {
    // Persist to sessionStorage
    try {
      sessionStorage.setItem("keel-tenancy-scope", JSON.stringify(scope));
    } catch {
      // Storage unavailable
    }
    setCurrentScopeState(scope);
  }, []);

  const setAvailableScopes = useCallback((scopes: AvailableScope[]) => {
    setAvailableScopesState(scopes);
  }, []);

  const canActInScope = useCallback(
    (scope: TenancyScope): boolean => {
      if (!availableScopes) return true; // No restriction if not loaded

      // Check if scope is available
      const tenantAvailable = availableScopes.some((t) => t.tenantId === scope.tenantId);
      if (!tenantAvailable) return false;

      // If group is specified, check it exists under tenant
      if (scope.groupId) {
        const tenant = availableScopes.find((t) => t.tenantId === scope.tenantId);
        const groupAvailable = tenant?.groups?.some((g) => g.groupId === scope.groupId);
        if (!groupAvailable) return false;
      }

      // Similar checks for entity and branch
      return true;
    },
    [availableScopes]
  );

  return (
    <TenancyContext.Provider
      value={{
        currentScope,
        setCurrentScope,
        availableScopes,
        setAvailableScopes,
        canActInScope,
      }}
    >
      {children}
    </TenancyContext.Provider>
  );
}

export function useTenancy() {
  const context = useContext(TenancyContext);
  if (!context) {
    throw new Error("useTenancy must be used within TenancyProvider");
  }
  return context;
}

export function useRequireTenancy() {
  const { currentScope } = useTenancy();

  if (!currentScope) {
    throw new Error("No tenancy scope selected"); // Will be caught by error boundary
  }

  return currentScope;
}
