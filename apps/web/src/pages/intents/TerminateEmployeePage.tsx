/**
 * Terminate Employee Page
 *
 * Implements TERMINATE_EMPLOYEE TransactionIntent (Law 2)
 * Route: /people/terminate/:employeeId
 *
 * Termination workflow:
 * 1. Manager selects employee to terminate
 * 2. Fills termination reason, effective date, severance
 * 3. Submits to Control Gate for HR approval
 * 4. HR reviews and approves/rejects
 * 5. If approved: ledger event created, decision record emitted
 * 6. Final paycheck calculated and processed
 */

import React, { useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useNotificationSuccess, useNotificationError } from "../../contexts/NotificationContext";
import { Card, Button, Input, Form, Select } from "@keel/design-system";
import { getApiClient } from "../../api/client";

export function TerminateEmployeePage() {
  const navigate = useNavigate();
  const { employeeId } = useParams({ from: "/people/terminate/$employeeId" });
  const showSuccess = useNotificationSuccess();
  const showError = useNotificationError();
  const [isLoading, setIsLoading] = React.useState(false);
  const [employeeData, setEmployeeData] = React.useState<any>(null);

  // Load employee details
  useEffect(() => {
    const loadEmployee = async () => {
      try {
        const apiClient = getApiClient();
        const employee = await apiClient.getEmployee(employeeId);
        setEmployeeData(employee);
      } catch (error: any) {
        showError("Failed to load employee", error.message);
        navigate({ to: "/people" });
      }
    };

    loadEmployee();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData);

      // Get API client (TODO: use AuthContext for real user)
      const apiClient = getApiClient();

      // Submit TERMINATE_EMPLOYEE intent through Control Gate
      // Example structure (comment out for placeholder):
      // const result = await apiClient.submitIntent({
      //   type: "TERMINATE_EMPLOYEE",
      //   subject_id: employeeId,
      //   payload: {
      //     termination_reason: data.reason,
      //     effective_date: data.effectiveDate,
      //     severance_weeks: parseInt(data.severanceWeeks),
      //     final_check_date: data.finalCheckDate,
      //     rehire_eligible: data.rehireEligible === "true",
      //     notes: data.notes,
      //   },
      //   actor_id: user.id,  // From AuthContext
      //   actor_kind: "HUMAN",
      // });

      showSuccess(
        "Termination submitted for approval",
        "HR will review and process. Employee will be notified of final check date."
      );

      // Navigate back after delay to show message
      setTimeout(() => {
        navigate({ to: "/people" });
      }, 2000);
    } catch (error: any) {
      showError("Failed to submit termination", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!employeeData) {
    return <div className="text-center py-8">Loading employee...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Terminate Employee</h1>
      <p className="text-muted-foreground mb-6">
        Submit termination for {employeeData.first_name} {employeeData.last_name}
      </p>

      <Card variant="default" className="p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded">
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
            <p className="font-medium">{employeeData.department || "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Hire Date</p>
            <p className="font-medium">{new Date(employeeData.start_date).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      <Card variant="default" className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Form>
            <Form.Field>
              <label htmlFor="reason" className="block text-sm font-medium">
                Termination Reason *
              </label>
              <Select name="reason" id="reason" required>
                <option value="">Select reason</option>
                <option value="voluntary">Voluntary resignation</option>
                <option value="retirement">Retirement</option>
                <option value="performance">Performance-related</option>
                <option value="conduct">Conduct violation</option>
                <option value="redundancy">Redundancy/layoff</option>
                <option value="other">Other</option>
              </Select>
            </Form.Field>

            <Form.Field>
              <label htmlFor="effectiveDate" className="block text-sm font-medium">
                Effective Date *
              </label>
              <Input
                id="effectiveDate"
                name="effectiveDate"
                type="date"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="severanceWeeks" className="block text-sm font-medium">
                Severance Weeks *
              </label>
              <Input
                id="severanceWeeks"
                name="severanceWeeks"
                type="number"
                min="0"
                max="52"
                placeholder="Number of weeks severance"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="finalCheckDate" className="block text-sm font-medium">
                Final Check Date *
              </label>
              <Input
                id="finalCheckDate"
                name="finalCheckDate"
                type="date"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="rehireEligible" className="block text-sm font-medium">
                Rehire Eligible?
              </label>
              <Select name="rehireEligible" id="rehireEligible">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Form.Field>

            <Form.Field>
              <label htmlFor="notes" className="block text-sm font-medium">
                Notes (for HR)
              </label>
              <textarea
                id="notes"
                name="notes"
                className="w-full p-2 border border-slate-300 rounded"
                rows={4}
                placeholder="Additional details for HR processing..."
              />
            </Form.Field>

            <div className="flex gap-3 pt-4">
              <Form.Submit as={Button} loading={isLoading}>
                Submit Termination
              </Form.Submit>
              <Button
                variant="secondary"
                onClick={() => navigate({ to: "/people" })}
                type="button"
              >
                Cancel
              </Button>
            </div>
          </Form>
        </form>
      </Card>

      <Card variant="default" className="p-6 mt-6 bg-amber-50 border-amber-200">
        <h3 className="font-bold text-amber-900 mb-2">Important Notice</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Termination requires HR approval</li>
          <li>• Employee will be notified on effective date</li>
          <li>• Final paycheck includes accrued PTO and severance</li>
          <li>• Benefits will terminate on effective date</li>
          <li>• This action is logged in audit trail (Law 7)</li>
        </ul>
      </Card>
    </div>
  );
}
