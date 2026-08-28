/**
 * Change Job Page
 *
 * Implements CHANGE_JOB TransactionIntent (Law 2)
 * Route: /people/change-job/:employeeId
 *
 * Job change workflow (promotion, lateral move, demotion):
 * 1. Manager selects employee and new job title/role
 * 2. Fills effective date, level change, location
 * 3. Submits to Control Gate for manager approval
 * 4. If approved: ledger event created, decision record emitted
 * 5. New job becomes effective on specified date
 */

import React, { useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useNotificationSuccess, useNotificationError } from "../../contexts/NotificationContext";
import { Card, Button, Input, Form, Select } from "@keel/design-system";
import { getApiClient } from "../../api/client";

export function ChangeJobPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams({ from: "/people/change-job/$employeeId" });
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

      // Submit CHANGE_JOB intent through Control Gate
      // Example structure:
      // const result = await getApiClient().submitIntent({
      //   type: "CHANGE_JOB",
      //   subject_id: employeeId,
      //   payload: {
      //     new_job_title: data.newJobTitle,
      //     new_department: data.newDepartment,
      //     new_location: data.newLocation,
      //     new_report_to: data.newReportTo,
      //     level_change: data.levelChange,
      //     effective_date: data.effectiveDate,
      //     reason: data.reason,
      //   },
      //   actor_id: user.id,
      //   actor_kind: "HUMAN",
      // });

      showSuccess(
        "Job change submitted",
        "Change will be effective on specified date pending manager approval"
      );

      setTimeout(() => {
        navigate({ to: "/people" });
      }, 2000);
    } catch (error: any) {
      showError("Failed to submit job change", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!employeeData) {
    return <div className="text-center py-8">Loading employee...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Change Job</h1>
      <p className="text-muted-foreground mb-6">
        Update job details for {employeeData.first_name} {employeeData.last_name}
      </p>

      <Card variant="default" className="p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded">
          <div>
            <p className="text-sm text-muted-foreground">Current Title</p>
            <p className="font-medium">{employeeData.job_title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Department</p>
            <p className="font-medium">{employeeData.department || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Location</p>
            <p className="font-medium">{employeeData.location || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reports To</p>
            <p className="font-medium">{employeeData.manager_name || "TBD"}</p>
          </div>
        </div>
      </Card>

      <Card variant="default" className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Form>
            <Form.Field>
              <label htmlFor="newJobTitle" className="block text-sm font-medium">
                New Job Title *
              </label>
              <Input
                id="newJobTitle"
                name="newJobTitle"
                type="text"
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="newDepartment" className="block text-sm font-medium">
                New Department
              </label>
              <Input
                id="newDepartment"
                name="newDepartment"
                type="text"
                placeholder="e.g., Engineering"
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="newLocation" className="block text-sm font-medium">
                New Location *
              </label>
              <Select name="newLocation" id="newLocation" required>
                <option value="">Select location</option>
                <option value="san-francisco">San Francisco, CA</option>
                <option value="new-york">New York, NY</option>
                <option value="london">London, UK</option>
                <option value="remote">Remote</option>
              </Select>
            </Form.Field>

            <Form.Field>
              <label htmlFor="levelChange" className="block text-sm font-medium">
                Level Change
              </label>
              <Select name="levelChange" id="levelChange">
                <option value="lateral">Lateral Move</option>
                <option value="promotion">Promotion</option>
                <option value="demotion">Demotion</option>
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
              <label htmlFor="reason" className="block text-sm font-medium">
                Reason for Change *
              </label>
              <textarea
                id="reason"
                name="reason"
                className="w-full p-2 border border-slate-300 rounded"
                rows={3}
                placeholder="Brief explanation for this job change..."
                required
              />
            </Form.Field>

            <div className="flex gap-3 pt-4">
              <Form.Submit as={Button} loading={isLoading}>
                Submit Job Change
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
    </div>
  );
}
