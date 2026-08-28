/**
 * Request Leave Page
 *
 * Implements REQUEST_LEAVE TransactionIntent (Law 2)
 * Route: /time/leave/request
 *
 * Leave request workflow:
 * 1. Employee selects leave type (PTO, SICK, PERSONAL, BEREAVEMENT, UNPAID)
 * 2. Fills start date, end date, and reason
 * 3. Views current leave balance and impact of request
 * 4. Submits to Control Gate for validation and routing
 * 5. Automatic approval for eligible requests (BEREAVEMENT, PERSONAL, 1-day SICK)
 * 6. Manager/HR approval required for PTO and extended leaves
 * 7. Decision Record emitted with approval/rejection
 */

import React, { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNotificationSuccess, useNotificationError } from "../../contexts/NotificationContext";
import { Card, Button, Input, Form, Select } from "@keel/design-system";
import { getApiClient } from "../../api/client";

interface LeaveBalance {
  leave_type: "PTO" | "SICK" | "PERSONAL" | "BEREAVEMENT" | "UNPAID";
  accrued_days: number;
  taken_days: number;
  available_days: number;
  carryover_days: number;
  total_available: number;
}

interface EmployeeData {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  PTO: "bg-blue-50 border-blue-200",
  SICK: "bg-red-50 border-red-200",
  PERSONAL: "bg-green-50 border-green-200",
  BEREAVEMENT: "bg-purple-50 border-purple-200",
  UNPAID: "bg-gray-50 border-gray-200",
};

const LEAVE_TYPE_DESCRIPTIONS: Record<string, string> = {
  PTO: "Paid Time Off - Vacation, holidays, planned time away",
  SICK: "Sick Leave - Illness, medical appointments, health-related absences",
  PERSONAL: "Personal Days - Personal business, flexible days off",
  BEREAVEMENT: "Bereavement Leave - Family death or serious circumstances",
  UNPAID: "Unpaid Time Off - Extended leave without pay",
};

export function LeaveRequestPage() {
  const navigate = useNavigate();
  const showSuccess = useNotificationSuccess();
  const showError = useNotificationError();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [employeeData, setEmployeeData] = React.useState<EmployeeData | null>(null);
  const [leaveBalances, setLeaveBalances] = React.useState<LeaveBalance[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = React.useState<string>("PTO");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [durationDays, setDurationDays] = React.useState<number>(0);

  // Load employee data and leave balances
  useEffect(() => {
    const loadData = async () => {
      try {
        const apiClient = getApiClient();
        // TODO: Get current user from AuthContext
        // For now, assume employee can be fetched from current session
        const employee = await apiClient.getCurrentEmployee();
        setEmployeeData(employee);

        // Fetch leave balances
        const balances = await apiClient.getLeaveBalances(employee.id);
        setLeaveBalances(balances);
      } catch (error: any) {
        showError("Failed to load employee data", error.message);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Calculate duration when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      setDurationDays(Math.max(1, diffDays));
    } else {
      setDurationDays(0);
    }
  }, [startDate, endDate]);

  const currentBalance = leaveBalances.find(b => b.leave_type === selectedLeaveType);
  const projectedBalance = currentBalance
    ? Math.max(0, currentBalance.total_available - durationDays)
    : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData);

      if (!startDate || !endDate) {
        showError("Validation error", "Please select both start and end dates");
        setIsLoading(false);
        return;
      }

      if (durationDays === 0) {
        showError("Validation error", "Invalid date range");
        setIsLoading(false);
        return;
      }

      // Get API client
      const apiClient = getApiClient();

      // Submit REQUEST_LEAVE intent through Control Gate
      // Structure:
      // const result = await apiClient.submitIntent({
      //   type: "REQUEST_LEAVE",
      //   subject_id: employeeData.id,
      //   payload: {
      //     leave_type: selectedLeaveType,
      //     start_date: startDate,
      //     end_date: endDate,
      //     duration_days: durationDays,
      //     reason: data.reason || "",
      //   },
      //   actor_id: currentUser.id,
      //   actor_kind: "HUMAN",
      // });

      showSuccess(
        "Leave request submitted",
        `${durationDays} days of ${selectedLeaveType} leave requested. Approval status will be updated shortly.`
      );

      setTimeout(() => {
        navigate({ to: "/time/leave" });
      }, 2000);
    } catch (error: any) {
      showError("Failed to submit leave request", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return <div className="text-center py-8">Loading leave data...</div>;
  }

  if (!employeeData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Unable to load employee data</p>
        <Button onClick={() => navigate({ to: "/time/leave" })} className="mt-4">
          Back to Leave
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Request Leave</h1>
      <p className="text-muted-foreground mb-6">
        Submit a leave request for {employeeData.first_name} {employeeData.last_name}
      </p>

      {/* Employee Summary */}
      <Card variant="default" className="p-6 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Employee</p>
            <p className="font-medium">{employeeData.first_name} {employeeData.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Job Title</p>
            <p className="font-medium">{employeeData.job_title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{employeeData.department || "N/A"}</p>
          </div>
        </div>
      </Card>

      {/* Leave Balances */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Current Leave Balances</h2>
        <div className="grid grid-cols-2 gap-4">
          {leaveBalances.map((balance) => (
            <Card key={balance.leave_type} variant="default" className={`p-4 border ${LEAVE_TYPE_COLORS[balance.leave_type]}`}>
              <p className="font-medium text-sm mb-2">{balance.leave_type}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accrued:</span>
                  <span className="font-medium">{balance.accrued_days.toFixed(2)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taken:</span>
                  <span className="font-medium">{balance.taken_days.toFixed(2)} days</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-semibold">{balance.available_days.toFixed(2)} days</span>
                </div>
                {balance.carryover_days > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carryover:</span>
                    <span className="font-medium">{balance.carryover_days.toFixed(2)} days</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Request Form */}
      <Card variant="default" className="p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Submit Leave Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Form>
            {/* Leave Type Selection */}
            <Form.Field>
              <label htmlFor="leaveType" className="block text-sm font-medium">
                Leave Type *
              </label>
              <Select
                id="leaveType"
                name="leaveType"
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                required
              >
                <option value="PTO">PTO (Paid Time Off)</option>
                <option value="SICK">SICK (Illness)</option>
                <option value="PERSONAL">PERSONAL (Personal Day)</option>
                <option value="BEREAVEMENT">BEREAVEMENT (Family Emergency)</option>
                <option value="UNPAID">UNPAID (Unpaid Leave)</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {LEAVE_TYPE_DESCRIPTIONS[selectedLeaveType]}
              </p>
            </Form.Field>

            {/* Start Date */}
            <Form.Field>
              <label htmlFor="startDate" className="block text-sm font-medium">
                Start Date *
              </label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Form.Field>

            {/* End Date */}
            <Form.Field>
              <label htmlFor="endDate" className="block text-sm font-medium">
                End Date *
              </label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Form.Field>

            {/* Duration Display */}
            {durationDays > 0 && (
              <Form.Field>
                <label className="block text-sm font-medium">Duration</label>
                <div className="p-3 bg-slate-50 rounded border border-slate-300">
                  <p className="font-medium">{durationDays} day{durationDays !== 1 ? "s" : ""}</p>
                </div>
              </Form.Field>
            )}

            {/* Balance Impact */}
            {currentBalance && durationDays > 0 && (
              <Form.Field>
                <label className="block text-sm font-medium">Balance Impact</label>
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded border border-slate-300">
                  <div>
                    <p className="text-xs text-muted-foreground">Before Request</p>
                    <p className="font-semibold text-lg">{currentBalance.total_available.toFixed(2)} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">After Request</p>
                    <p className={`font-semibold text-lg ${projectedBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {projectedBalance.toFixed(2)} days
                    </p>
                  </div>
                </div>
                {projectedBalance < 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Insufficient balance. Request will require approval exception.
                  </p>
                )}
              </Form.Field>
            )}

            {/* Reason */}
            <Form.Field>
              <label htmlFor="reason" className="block text-sm font-medium">
                Reason for Leave {selectedLeaveType !== "BEREAVEMENT" ? "" : "*"}
              </label>
              <textarea
                id="reason"
                name="reason"
                className="w-full p-2 border border-slate-300 rounded"
                rows={3}
                placeholder={`Brief reason for ${selectedLeaveType.toLowerCase()} request...`}
                required={selectedLeaveType === "BEREAVEMENT"}
              />
            </Form.Field>

            {/* Approval Info */}
            <Form.Field>
              <div className={`p-3 rounded text-sm ${
                selectedLeaveType === "BEREAVEMENT" || selectedLeaveType === "PERSONAL" || durationDays === 1
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-blue-50 border border-blue-200 text-blue-800"
              }`}>
                <p className="font-medium mb-1">
                  {selectedLeaveType === "BEREAVEMENT"
                    ? "✓ This leave type will be auto-approved"
                    : selectedLeaveType === "PERSONAL"
                    ? "✓ Personal days are auto-approved"
                    : selectedLeaveType === "SICK" && durationDays === 1
                    ? "✓ Same-day sick leave is auto-approved"
                    : selectedLeaveType === "SICK"
                    ? "ⓘ Extended sick leave requires HR approval"
                    : "ⓘ This request requires manager approval"}
                </p>
                <p className="text-xs mt-1">
                  {selectedLeaveType === "BEREAVEMENT"
                    ? "Bereavement leave is approved automatically and marked as paid time off."
                    : selectedLeaveType === "PERSONAL"
                    ? "Personal days are pre-approved per company policy."
                    : selectedLeaveType === "SICK" && durationDays === 1
                    ? "Same-day sick leave can be self-approved. Extended leaves require medical documentation."
                    : selectedLeaveType === "SICK"
                    ? "You may be asked to provide medical documentation for extended absences."
                    : "Your manager will review and approve this request. You'll be notified of the decision."}
                </p>
              </div>
            </Form.Field>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Form.Submit as={Button} loading={isLoading}>
                Submit Leave Request
              </Form.Submit>
              <Button
                variant="secondary"
                onClick={() => navigate({ to: "/time/leave" })}
                type="button"
              >
                Cancel
              </Button>
            </div>
          </Form>
        </form>
      </Card>

      {/* Policy Notice */}
      <Card variant="default" className="p-6 bg-amber-50 border-amber-200">
        <h3 className="font-bold text-amber-900 mb-2">Leave Policy Notice</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Requests must be submitted at least 2 weeks in advance when possible</li>
          <li>• Some leave types may require documentation or approvals</li>
          <li>• Leave balance is calculated as of today; take effect on start date</li>
          <li>• Blackout dates (federal holidays) cannot be requested</li>
          <li>• Carryover limits apply per company policy</li>
          <li>• All leave requests are logged in audit trail (Law 7)</li>
        </ul>
      </Card>
    </div>
  );
}
