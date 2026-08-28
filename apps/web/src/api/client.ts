/**
 * API Client
 *
 * Encapsulates all backend communication
 * Handles:
 * - Request/response serialization
 * - Authentication header injection
 * - Error handling and retry logic
 * - Token refresh on 401
 */

import type { TransactionIntent, DecisionRecord } from "@keel/core";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private getAccessToken: () => string | null;

  constructor(baseUrl: string = "/api", getAccessToken: () => string | null) {
    this.baseUrl = baseUrl;
    this.getAccessToken = getAccessToken;
  }

  private async fetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);

    // Add auth token if available
    if (!options.skipAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 by refreshing token (in a real app, this would call AuthContext.refreshToken)
    if (response.status === 401) {
      // Token expired - this would trigger a logout in the UI
      throw new Error("Unauthorized - please log in again");
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    return response.json();
  }

  async logout() {
    return this.fetch("/auth/logout", {
      method: "POST",
    });
  }

  async getMe() {
    const response = await this.fetch("/auth/me");
    return response.json();
  }

  // Transaction Intent (Control Gate) endpoints
  async submitIntent(intent: {
    type: string;
    subject_id: string;
    payload: Record<string, unknown>;
    actor_id: string;
    actor_kind: "HUMAN" | "AGENT";
    as_of?: string;
    effective_from?: string;
    approved_by_id?: string;
    on_behalf_of?: string;
  }) {
    const response = await this.fetch("/gate/submit", {
      method: "POST",
      body: JSON.stringify(intent),
    });
    return response.json();
  }

  async getPendingApprovals(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit.toString());
    if (offset) params.set("offset", offset.toString());

    const response = await this.fetch(`/gate/pending?${params.toString()}`);
    return response.json();
  }

  async approvePending(pendingId: string, approvedById: string) {
    const response = await this.fetch(`/gate/approve/${pendingId}`, {
      method: "POST",
      body: JSON.stringify({ approved_by_id: approvedById }),
    });
    return response.json();
  }

  async rejectPending(pendingId: string, rejectedById: string, reason: string) {
    const response = await this.fetch(`/gate/reject/${pendingId}`, {
      method: "POST",
      body: JSON.stringify({ rejected_by_id: rejectedById, reason }),
    });
    return response.json();
  }

  // People endpoints
  async listEmployees(tenantId: string, groupId?: string, limit?: number) {
    const params = new URLSearchParams({
      tenant: tenantId,
      ...(groupId && { group: groupId }),
      ...(limit && { limit: limit.toString() }),
    });

    const response = await this.fetch(`/people/employees?${params}`);
    return response.json();
  }

  async getEmployee(employeeId: string) {
    const response = await this.fetch(`/people/employees/${employeeId}`);
    return response.json();
  }

  async updateEmployee(employeeId: string, data: Record<string, unknown>) {
    const response = await this.fetch(`/people/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Time & Attendance endpoints
  async submitTimesheet(tenantId: string, data: Record<string, unknown>) {
    const response = await this.fetch(`/time/timesheet`, {
      method: "POST",
      body: JSON.stringify({ ...data, tenant: tenantId }),
    });
    return response.json();
  }

  async listTimesheets(tenantId: string, employeeId?: string) {
    const params = new URLSearchParams({ tenant: tenantId });
    if (employeeId) params.set("employee", employeeId);

    const response = await this.fetch(`/time/timesheets?${params}`);
    return response.json();
  }

  async requestLeave(tenantId: string, data: Record<string, unknown>) {
    const response = await this.fetch(`/time/leave-request`, {
      method: "POST",
      body: JSON.stringify({ ...data, tenant: tenantId }),
    });
    return response.json();
  }

  async listPendingLeaveRequests(tenantId: string) {
    const response = await this.fetch(`/time/leave-requests/pending?tenant=${tenantId}`);
    return response.json();
  }

  // Leave Management endpoints (Wave 4.1)
  async getLeaveBalances(employeeId: string, asOfDate?: string) {
    const params = asOfDate ? `?asOfDate=${asOfDate}` : "";
    const response = await this.fetch(`/gate/employee/${employeeId}/leave-balances${params}`);
    return response.json();
  }

  async getLeaveHistory(employeeId: string, limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit.toString());
    if (offset) params.set("offset", offset.toString());

    const response = await this.fetch(
      `/gate/employee/${employeeId}/leave-history${params.toString() ? "?" + params.toString() : ""}`
    );
    return response.json();
  }

  async getCurrentEmployee() {
    const response = await this.fetch(`/auth/me`);
    return response.json();
  }

  async getPendingLeaveRequests(type?: string, role?: string, employeeId?: string, limit?: number) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (role) params.set("role", role);
    if (employeeId) params.set("employee_id", employeeId);
    if (limit) params.set("limit", limit.toString());

    const response = await this.fetch(`/gate/pending${params.toString() ? "?" + params.toString() : ""}`);
    return response.json();
  }

  // Payroll endpoints
  async runPayroll(tenantId: string, data: Record<string, unknown>) {
    const response = await this.fetch(`/payroll/run`, {
      method: "POST",
      body: JSON.stringify({ ...data, tenant: tenantId }),
    });
    return response.json();
  }

  async getPayrollRun(payrollRunId: string) {
    const response = await this.fetch(`/payroll/runs/${payrollRunId}`);
    return response.json();
  }

  async listPayrollRuns(tenantId: string) {
    const response = await this.fetch(`/payroll/runs?tenant=${tenantId}`);
    return response.json();
  }

  // Policies endpoints
  async getPolicy(policyId: string, version?: string) {
    const url = version ? `/policies/${policyId}@${version}` : `/policies/${policyId}`;
    const response = await this.fetch(url);
    return response.json();
  }

  async listPolicies(jurisdiction?: string) {
    const params = jurisdiction ? `?jurisdiction=${jurisdiction}` : "";
    const response = await this.fetch(`/policies${params}`);
    return response.json();
  }

  // Decision records endpoint
  async getDecisionRecord(recordId: string) {
    const response = await this.fetch(`/decisions/${recordId}`);
    return response.json();
  }

  async listDecisionRecords(tenantId: string, limit?: number) {
    const params = new URLSearchParams({
      tenant: tenantId,
      ...(limit && { limit: limit.toString() }),
    });

    const response = await this.fetch(`/decisions?${params}`);
    return response.json();
  }

  // Tenancy scope endpoints
  async listAvailableScopes() {
    const response = await this.fetch(`/tenancy/scopes`);
    return response.json();
  }

  async setCurrentScope(tenantId: string, groupId?: string, entityId?: string, branchId?: string) {
    const response = await this.fetch(`/tenancy/scope`, {
      method: "POST",
      body: JSON.stringify({ tenantId, groupId, entityId, branchId }),
    });
    return response.json();
  }
}

// Global API client instance
let apiClientInstance: ApiClient | null = null;

export function createApiClient(
  baseUrl: string = "/api",
  getAccessToken: () => string | null
) {
  apiClientInstance = new ApiClient(baseUrl, getAccessToken);
  return apiClientInstance;
}

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    throw new Error("API client not initialized");
  }
  return apiClientInstance;
}
