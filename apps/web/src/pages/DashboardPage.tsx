/**
 * Dashboard Page
 *
 * Home screen showing:
 * - Key metrics and KPIs
 * - Recent approvals
 * - Quick actions
 * - Active payroll runs
 */

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTenancy } from "../contexts/TenancyContext";
import { Card, Button } from "@keel/design-system";

export function DashboardPage() {
  const { user } = useAuth();
  const { currentScope } = useTenancy();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}!</p>
      </div>

      {/* Quick Actions */}
      <Card variant="default" className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <a href="/people/hire">
            <Button variant="secondary" fullWidth>
              Hire Employee
            </Button>
          </a>
          <a href="/time/request-leave">
            <Button variant="secondary" fullWidth>
              Request Leave
            </Button>
          </a>
          <a href="/compensation/change-pay/new">
            <Button variant="secondary" fullWidth>
              Change Pay
            </Button>
          </a>
          <a href="/payroll/run">
            <Button variant="secondary" fullWidth>
              Run Payroll
            </Button>
          </a>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="default" className="p-6">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-3xl font-bold">245</p>
        </Card>
        <Card variant="default" className="p-6">
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
          <p className="text-3xl font-bold">12</p>
          <a href="/approvals" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </a>
        </Card>
        <Card variant="default" className="p-6">
          <p className="text-sm text-muted-foreground">Active Payroll Run</p>
          <p className="text-3xl font-bold">Q3 2026</p>
          <a href="/payroll/runs" className="text-sm text-blue-600 hover:text-blue-700">
            View status →
          </a>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card variant="default" className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">No recent activity</p>
        </div>
      </Card>

      {currentScope && (
        <Card variant="outlined" className="p-4">
          <p className="text-xs text-muted-foreground">
            Current scope: {currentScope.tenantId}
            {currentScope.groupId && ` > ${currentScope.groupId}`}
            {currentScope.entityId && ` > ${currentScope.entityId}`}
            {currentScope.branchId && ` > ${currentScope.branchId}`}
          </p>
        </Card>
      )}
    </div>
  );
}
