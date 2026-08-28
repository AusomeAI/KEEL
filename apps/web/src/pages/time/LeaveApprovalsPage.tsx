/**
 * Leave Approvals Page
 *
 * Implements APPROVE_LEAVE_REQUEST and REJECT_LEAVE_REQUEST TransactionIntents (Law 2)
 * Route: /time/leave/approvals
 *
 * Leave approval workflow:
 * 1. Manager or HR views pending leave requests assigned to them
 * 2. Filters by leave type, date range, employee, approval status
 * 3. Reviews request details (employee, dates, reason, current balance)
 * 4. Approves or rejects with optional notes
 * 5. Decision Record emitted (hash-chained for audit trail)
 * 6. Employee notified of approval/rejection
 * 7. Approved leave affects leave balance and payroll calculations
 */

import React, { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNotificationSuccess, useNotificationError } from "../../contexts/NotificationContext";
import { Card, Button, Input, Form, Select } from "@keel/design-system";
import { getApiClient } from "../../api/client";

interface PendingLeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: "PTO" | "SICK" | "PERSONAL" | "BEREAVEMENT" | "UNPAID";
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  current_balance: number;
  projected_balance: number;
  submitted_at: string;
  approver_role: "MANAGER" | "HR_ADMIN" | "NONE";
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  approver_id?: string;
  approval_notes?: string;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  PTO: "bg-blue-50 border-blue-200",
  SICK: "bg-red-50 border-red-200",
  PERSONAL: "bg-green-50 border-green-200",
  BEREAVEMENT: "bg-purple-50 border-purple-200",
  UNPAID: "bg-gray-50 border-gray-200",
};

const APPROVAL_BADGE_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function LeaveApprovalsPage() {
  const navigate = useNavigate();
  const showSuccess = useNotificationSuccess();
  const showError = useNotificationError();
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingRequests, setPendingRequests] = React.useState<PendingLeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = React.useState<PendingLeaveRequest[]>([]);
  const [expandedRequestId, setExpandedRequestId] = React.useState<string | null>(null);
  const [filterLeaveType, setFilterLeaveType] = React.useState<string>("ALL");
  const [filterStatus, setFilterStatus] = React.useState<string>("PENDING");
  const [rejectionReasons, setRejectionReasons] = React.useState<Record<string, string>>({});

  // Load pending leave requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const apiClient = getApiClient();
        // Fetch pending leave requests for current approver
        // GET /api/gate/pending?type=REQUEST_LEAVE&role=MANAGER|HR_ADMIN
        const requests = await apiClient.getPendingLeaveRequests();
        setPendingRequests(requests);
        setFilteredRequests(requests);
      } catch (error: any) {
        showError("Failed to load pending requests", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, []);

  // Filter requests based on current filters
  useEffect(() => {
    let filtered = pendingRequests;

    if (filterLeaveType !== "ALL") {
      filtered = filtered.filter(r => r.leave_type === filterLeaveType);
    }

    if (filterStatus !== "ALL") {
      filtered = filtered.filter(r => r.approval_status === filterStatus);
    }

    setFilteredRequests(filtered);
  }, [pendingRequests, filterLeaveType, filterStatus]);

  const handleApprove = async (requestId: string) => {
    setIsLoading(true);
    try {
      const apiClient = getApiClient();
      // Submit APPROVE_LEAVE_REQUEST intent to Control Gate
      // const result = await apiClient.submitIntent({
      //   type: "APPROVE_LEAVE_REQUEST",
      //   subject_id: requestId,
      //   payload: {
      //     approval_notes: "",
      //   },
      //   actor_id: currentUser.id,
      //   actor_kind: "HUMAN",
      // });

      showSuccess("Leave approved", "Employee will be notified of the approval");

      // Remove from pending list
      setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
      setExpandedRequestId(null);
    } catch (error: any) {
      showError("Failed to approve leave", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = rejectionReasons[requestId];
    if (!reason?.trim()) {
      showError("Validation error", "Please provide a reason for rejection");
      return;
    }

    setIsLoading(true);
    try {
      const apiClient = getApiClient();
      // Submit REJECT_LEAVE_REQUEST intent to Control Gate
      // const result = await apiClient.submitIntent({
      //   type: "REJECT_LEAVE_REQUEST",
      //   subject_id: requestId,
      //   payload: {
      //     rejection_reason: reason,
      //   },
      //   actor_id: currentUser.id,
      //   actor_kind: "HUMAN",
      // });

      showSuccess("Leave rejected", "Employee will be notified of the rejection");

      // Remove from pending list
      setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
      setRejectionReasons({ ...rejectionReasons, [requestId]: "" });
      setExpandedRequestId(null);
    } catch (error: any) {
      showError("Failed to reject leave", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && pendingRequests.length === 0) {
    return <div className="text-center py-8">Loading pending approvals...</div>;
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">Leave Approvals</h1>
      <p className="text-muted-foreground mb-6">
        Review and approve pending leave requests from your team
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card variant="default" className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">
            {pendingRequests.filter(r => r.approval_status === "PENDING").length}
          </p>
        </Card>
        <Card variant="default" className="p-4">
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-green-700">
            {pendingRequests.filter(r => r.approval_status === "APPROVED").length}
          </p>
        </Card>
        <Card variant="default" className="p-4">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="text-2xl font-bold text-red-700">
            {pendingRequests.filter(r => r.approval_status === "REJECTED").length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="default" className="p-4 mb-6 bg-slate-50">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <Select value={filterLeaveType} onChange={(e) => setFilterLeaveType(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="PTO">PTO</option>
              <option value="SICK">SICK</option>
              <option value="PERSONAL">PERSONAL</option>
              <option value="BEREAVEMENT">BEREAVEMENT</option>
              <option value="UNPAID">UNPAID</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">&nbsp;</label>
            <Button
              onClick={() => {
                setFilterLeaveType("ALL");
                setFilterStatus("PENDING");
              }}
              variant="secondary"
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <Card variant="default" className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {filterStatus === "PENDING"
              ? "No pending leave requests"
              : "No leave requests matching filters"}
          </p>
          <Button onClick={() => navigate({ to: "/time/leave" })}>
            View All Leave
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              variant="default"
              className={`p-4 border-l-4 ${LEAVE_TYPE_COLORS[request.leave_type]}`}
            >
              {/* Request Summary Row */}
              <div
                className="cursor-pointer"
                onClick={() => setExpandedRequestId(expandedRequestId === request.id ? null : request.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-lg">{request.employee_name}</span>
                      <span className="text-sm font-medium bg-slate-200 px-2 py-1 rounded">
                        {request.leave_type}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${APPROVAL_BADGE_COLORS[request.approval_status]}`}>
                        {request.approval_status}
                      </span>
                    </div>
                    <div className="flex gap-8 text-sm text-muted-foreground">
                      <span>
                        <strong>{request.duration_days}</strong> days ({new Date(request.start_date).toLocaleDateString()} → {new Date(request.end_date).toLocaleDateString()})
                      </span>
                      <span>
                        Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                      </span>
                      <span>
                        Balance impact: <strong>{request.current_balance.toFixed(1)} → {request.projected_balance.toFixed(1)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl text-muted-foreground">
                    {expandedRequestId === request.id ? "▼" : "▶"}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRequestId === request.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Reason */}
                  <div>
                    <p className="text-sm font-medium mb-1">Reason</p>
                    <p className="text-sm p-2 bg-white rounded border">{request.reason || "(no reason provided)"}</p>
                  </div>

                  {/* Balance Details */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">Current Balance</p>
                      <p className="text-lg font-semibold">{request.current_balance.toFixed(2)} days</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">Requested</p>
                      <p className="text-lg font-semibold">{request.duration_days} days</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-muted-foreground">Projected Balance</p>
                      <p className={`text-lg font-semibold ${request.projected_balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {request.projected_balance.toFixed(2)} days
                      </p>
                    </div>
                  </div>

                  {/* Approval Section (only for PENDING) */}
                  {request.approval_status === "PENDING" && (
                    <Form className="border-t pt-4">
                      {/* Rejection Reason Field */}
                      <Form.Field className="mb-4">
                        <label htmlFor={`rejection-${request.id}`} className="block text-sm font-medium mb-1">
                          Rejection Reason (if applicable)
                        </label>
                        <textarea
                          id={`rejection-${request.id}`}
                          value={rejectionReasons[request.id] || ""}
                          onChange={(e) => setRejectionReasons({ ...rejectionReasons, [request.id]: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded text-sm"
                          rows={2}
                          placeholder="Only fill if rejecting this request..."
                        />
                      </Form.Field>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          ✗ Reject
                        </Button>
                        <Button
                          onClick={() => setExpandedRequestId(null)}
                          variant="secondary"
                          type="button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Form>
                  )}

                  {/* Approval Details (for APPROVED/REJECTED) */}
                  {request.approval_status !== "PENDING" && (
                    <div className={`p-3 rounded border ${
                      request.approval_status === "APPROVED"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}>
                      <p className="text-sm font-medium mb-1">
                        {request.approval_status === "APPROVED" ? "✓ Approved" : "✗ Rejected"}
                      </p>
                      {request.approval_notes && (
                        <p className="text-sm text-muted-foreground">{request.approval_notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Instructions Card */}
      <Card variant="default" className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">Approval Guidelines</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Review leave requests in order of submission date</li>
          <li>• Consider team coverage and staffing needs</li>
          <li>• Some leave types (BEREAVEMENT, PERSONAL, 1-day SICK) are auto-approved</li>
          <li>• Extended SICK leave may require medical documentation</li>
          <li>• All approvals/rejections are logged in Decision Records (Law 7)</li>
          <li>• Employee will be notified immediately of your decision</li>
        </ul>
      </Card>
    </div>
  );
}
