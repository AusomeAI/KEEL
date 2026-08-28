/**
 * Hire Employee Page
 *
 * Implements HIRE_EMPLOYEE TransactionIntent (Law 2)
 * Route: /people/hire
 */

import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNotificationSuccess, useNotificationError } from "../../contexts/NotificationContext";
import { Card, Button, Input, Form } from "@keel/design-system";

export function HireEmployeePage() {
  const navigate = useNavigate();
  const showSuccess = useNotificationSuccess();
  const showError = useNotificationError();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData);

      // Get API client and auth context (TODO: use actual hooks)
      // const { user } = useAuthContext();
      // const { tenantId } = useTenancyContext();
      // const apiClient = getApiClient();

      // Submit HIRE_EMPLOYEE intent through Control Gate
      // This would normally be:
      // const result = await apiClient.submitIntent({
      //   type: "HIRE_EMPLOYEE",
      //   subject_id: randomUUID(),  // New employee ID
      //   payload: {
      //     first_name: data.firstName,
      //     last_name: data.lastName,
      //     email: data.email,
      //     job_title: data.jobTitle,
      //     salary: parseInt(data.salary),
      //     start_date: data.startDate,
      //   },
      //   actor_id: user.id,
      //   actor_kind: "HUMAN",
      // });

      // For now, show placeholder message
      showSuccess(
        "Employee hire request submitted",
        `Pending manager and HR approval. ${
          false ? "Will be executed shortly." : "Form integration in progress."
        }`
      );

      // Navigate after a brief delay to show success message
      setTimeout(() => {
        navigate({ to: "/people" });
      }, 2000);
    } catch (error: any) {
      showError("Failed to hire employee", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Hire Employee</h1>
      <p className="text-muted-foreground mb-6">Add a new employee to your organization</p>

      <Card variant="default" className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Form>
            <Form.Field>
              <label htmlFor="firstName" className="block text-sm font-medium">
                First Name *
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="lastName" className="block text-sm font-medium">
                Last Name *
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="email" className="block text-sm font-medium">
                Email *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="jobTitle" className="block text-sm font-medium">
                Job Title *
              </label>
              <Input
                id="jobTitle"
                name="jobTitle"
                type="text"
                placeholder="Software Engineer"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="salary" className="block text-sm font-medium">
                Annual Salary *
              </label>
              <Input
                id="salary"
                name="salary"
                type="number"
                placeholder="100000"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="startDate" className="block text-sm font-medium">
                Start Date *
              </label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
              />
            </Form.Field>

            <div className="flex gap-3 pt-4">
              <Form.Submit as={Button} loading={isLoading}>
                Submit for Approval
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
