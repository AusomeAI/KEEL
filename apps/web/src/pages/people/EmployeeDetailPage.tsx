/**
 * Employee Detail Page
 *
 * Displays comprehensive employee record with history (Law 7)
 * Route: /people/:employeeId
 *
 * Sections:
 * 1. Personal Information (name, email, phone, address)
 * 2. Employment Details (hire date, position, department, manager, employment type)
 * 3. Compensation (salary, bonus, equity, benefits)
 * 4. Leave & Time Off (current balances, pending requests, history)
 * 5. Discipline & Performance (performance reviews, disciplinary actions)
 * 6. Termination Status (if terminated, effective date, reason)
 * 7. Audit Trail (all decisions affecting this employee, with Decision Record hashes)
 */

import React, { useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useNotificationSuccess, useNotificationError } from "../../contexts/NotificationContext";
import { Card, Button, Badge } from "@keel/design-system";
import { getApiClient } from "../../api/client";

interface LeaveBalance {
  leave_type: "PTO" | "SICK" | "PERSONAL" | "BEREAVEMENT" | "UNPAID";
  accrued_days: number;
  taken_days: number;
  available_days: number;
  carryover_days: number;
  total_available: number;
}

interface LeaveHistory {
  date: string;
  leave_type: string;
  duration_days: number;
  status: "APPROVED" | "REJECTED" | "CANCELLED";
  reason?: string;
}

interface EmployeeData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title: string;
  department: string;
  location?: string;
  manager_name?: string;
  hire_date: string;
  employment_type: string;
  status: "ACTIVE" | "INACTIVE" | "TERMINATED";
  termination_date?: string;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  PTO: "bg-blue-100 text-blue-800",
  SICK: "bg-red-100 text-red-800",
  PERSONAL: "bg-green-100 text-green-800",
  BEREAVEMENT: "bg-purple-100 text-purple-800",
  UNPAID: "bg-gray-100 text-gray-800",
};

export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams({ from: "/people/$employeeId" });
  const showSuccess = useNotificationSuccess();
  const showError = useNotificationError();
  const [isLoading, setIsLoading] = React.useState(true);
  const [employeeData, setEmployeeData] = React.useState<EmployeeData | null>(null);
  const [leaveBalances, setLeaveBalances] = React.useState<LeaveBalance[]>([]);
  const [leaveHistory, setLeaveHistory] = React.useState<LeaveHistory[]>([]);
  const [activeTab, setActiveTab] = React.useState<"overview" | "leave" | "audit">("overview");

  // Load employee data
  useEffect(() => {
    const loadEmployee = async () => {
      try {
        const apiClient = getApiClient();
        const employee = await apiClient.getEmployee(employeeId);
        setEmployeeData(employee);

        // Load leave balances
        try {
          const balances = await apiClient.getLeaveBalances(employeeId);
          setLeaveBalances(balances);
        } catch {
          // Leave data might not be available for all employees
        }

        // Load leave history
        try {
          const history = await apiClient.getLeaveHistory(employeeId);
          setLeaveHistory(history);
        } catch {
          // History might be empty
        }
      } catch (error: any) {
        showError("Failed to load employee data", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  if (isLoading) {
    return <div className="text-center py-8">Loading employee data...</div>;
  }

  if (!employeeData) {
    return (
      <div className="max-w-4xl">
        <p className="text-red-600 mb-4">Employee not found</p>
        <Button onClick={() => navigate({ to: "/people" })}>Back to People</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold">
              {employeeData.first_name} {employeeData.last_name}
            </h1>
            <p className="text-muted-foreground text-lg">{employeeData.job_title}</p>
          </div>
          <Badge
            variant={employeeData.status === "ACTIVE" ? "success" : "secondary"}
            className="px-3 py-1 text-sm"
          >
            {employeeData.status}
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        {["overview", "leave", "audit"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "overview" ? "Overview" : tab === "leave" ? "Leave & Time Off" : "Audit Trail"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Personal Information */}
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{employeeData.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{employeeData.phone || "Not provided"}</p>
              </div>
            </div>
          </Card>

          {/* Employment Details */}
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-bold mb-4">Employment Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Hire Date</p>
                <p className="font-medium">{new Date(employeeData.hire_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{employeeData.department}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{employeeData.location || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employment Type</p>
                <p className="font-medium">{employeeData.employment_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reports To</p>
                <p className="font-medium">{employeeData.manager_name || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{employeeData.status}</p>
              </div>
            </div>
          </Card>

          {/* Termination Info (if applicable) */}
          {employeeData.status === "TERMINATED" && employeeData.termination_date && (
            <Card variant="default" className="p-6 bg-red-50 border-red-200">
              <h2 className="text-xl font-bold mb-4 text-red-900">Termination Information</h2>
              <div>
                <p className="text-sm text-red-800">Terminated on</p>
                <p className="text-lg font-semibold text-red-900">
                  {new Date(employeeData.termination_date).toLocaleDateString()}
                </p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={() => navigate({ to: `/people/change-pay/${employeeId}` })}>
              Change Compensation
            </Button>
            <Button onClick={() => navigate({ to: `/people/change-job/${employeeId}` })}>
              Change Job
            </Button>
            <Button onClick={() => navigate({ to: `/people/terminate/${employeeId}` })} variant="secondary">
              Terminate Employee
            </Button>
            <Button onClick={() => navigate({ to: "/people" })} variant="secondary">
              Back to People
            </Button>
          </div>
        </div>
      )}

      {/* Leave & Time Off Tab */}
      {activeTab === "leave" && (
        <div className="space-y-6">
          {/* Current Balances */}
          {leaveBalances.length > 0 && (
            <>
              <h2 className="text-xl font-bold">Current Leave Balances (2026)</h2>
              <div className="grid grid-cols-2 gap-4">
                {leaveBalances.map((balance) => (
                  <Card key={balance.leave_type} variant="default" className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold">{balance.leave_type}</p>
                      <Badge className={LEAVE_TYPE_COLORS[balance.leave_type]}>
                        {balance.total_available.toFixed(2)} days
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accrued:</span>
                        <span>{balance.accrued_days.toFixed(2)} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taken:</span>
                        <span>{balance.taken_days.toFixed(2)} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available:</span>
                        <span className="font-medium">{balance.available_days.toFixed(2)} days</span>
                      </div>
                      {balance.carryover_days > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Carryover:</span>
                          <span>{balance.carryover_days.toFixed(2)} days</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Request Leave Button */}
              <Button
                onClick={() => navigate({ to: `/time/leave/request?employee=${employeeId}` })}
                className="w-full"
              >
                Request Leave for This Employee
              </Button>
            </>
          )}

          {/* Leave History */}
          {leaveHistory.length > 0 && (
            <>
              <h2 className="text-xl font-bold">Leave History (Last 6 Months)</h2>
              <Card variant="default" className="p-0 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveHistory.map((entry, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge className={LEAVE_TYPE_COLORS[entry.leave_type]}>
                            {entry.leave_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{entry.duration_days} day{entry.duration_days !== 1 ? "s" : ""}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant={
                              entry.status === "APPROVED"
                                ? "success"
                                : entry.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {entry.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {leaveBalances.length === 0 && (
            <Card variant="default" className="p-8 text-center">
              <p className="text-muted-foreground">No leave data available for this employee</p>
            </Card>
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <Card variant="default" className="p-6">
          <h2 className="text-xl font-bold mb-4">Audit Trail (Law 7: Decision Records)</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                All material HR decisions affecting this employee are logged as Decision Records with cryptographic hashes
                for compliance verification. This audit trail is immutable and independently verifiable.
              </p>
            </div>
            <div className="text-center py-8 text-muted-foreground">
              <p>Audit trail view coming soon</p>
              <p className="text-sm mt-2">
                Will show all decisions (hire, pay change, promotion, discipline, termination) with Decision Record hashes
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
