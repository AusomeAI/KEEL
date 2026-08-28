import type { Meta, StoryObj } from "@storybook/react";
import { Form, FormField, FormSubmit } from "./Form";
import { Input } from "./Input";
import { Button } from "./Button";

/**
 * # Form Component
 *
 * Complete form handling with field management, validation context, and submission.
 *
 * ## Features
 * - Form wrapper with automatic submission handling
 * - FormField for field management and grouping
 * - FormSubmit button with loading state
 * - Validation context support
 * - Full keyboard accessibility
 * - Light/dark theme support
 *
 * ## Accessibility
 * - Semantic `<form>` element
 * - Field grouping with fieldset/legend
 * - aria-invalid for error states
 * - aria-describedby for error messages
 * - Keyboard accessible (Tab, Enter to submit)
 */
const meta = {
  title: "Components/Form",
  component: Form,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic form with single field.
 */
export const Default: Story = {
  render: () => (
    <Form onSubmit={(data) => console.log(data)}>
      <FormField label="Email">
        <Input
          type="email"
          name="email"
          placeholder="you@example.com"
          size="md"
        />
      </FormField>
      <FormSubmit size="md">Submit</FormSubmit>
    </Form>
  ),
};

/**
 * Complete employee form with multiple fields.
 */
export const EmployeeForm: Story = {
  render: () => (
    <Form
      onSubmit={(data) => {
        console.log("Form submitted:", data);
      }}
      className="w-full max-w-md"
    >
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-lg font-bold mb-6 block">
          Employee Information
        </legend>

        <FormField label="First Name" required>
          <Input
            type="text"
            name="firstName"
            placeholder="John"
            size="md"
          />
        </FormField>

        <FormField label="Last Name" required>
          <Input
            type="text"
            name="lastName"
            placeholder="Doe"
            size="md"
          />
        </FormField>

        <FormField label="Email Address" required>
          <Input
            type="email"
            name="email"
            placeholder="john@example.com"
            helperText="We'll use this for login"
            size="md"
          />
        </FormField>

        <FormField label="Phone Number">
          <Input
            type="tel"
            name="phone"
            placeholder="+1 (555) 000-0000"
            size="md"
          />
        </FormField>

        <FormField label="Date of Birth" required>
          <Input type="date" name="dob" size="md" />
        </FormField>

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" size="md" fullWidth>
            Cancel
          </Button>
          <FormSubmit size="md" fullWidth>
            Create Employee
          </FormSubmit>
        </div>
      </fieldset>
    </Form>
  ),
};

/**
 * Form with validation error states.
 */
export const WithValidation: Story = {
  render: () => (
    <Form onSubmit={(data) => console.log(data)} className="w-full max-w-md">
      <FormField label="Email Address" required>
        <Input
          type="email"
          name="email"
          placeholder="you@example.com"
          state="error"
          errorText="Please enter a valid email address"
          size="md"
        />
      </FormField>

      <FormField label="Password" required>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          helperText="Minimum 12 characters"
          size="md"
        />
      </FormField>

      <FormField label="Confirm Password" required>
        <Input
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          state="error"
          errorText="Passwords do not match"
          size="md"
        />
      </FormField>

      <div className="flex gap-2 mt-6">
        <Button variant="secondary" size="md" fullWidth>
          Cancel
        </Button>
        <FormSubmit size="md" fullWidth>
          Sign Up
        </FormSubmit>
      </div>
    </Form>
  ),
};

/**
 * Form in loading state.
 */
export const Loading: Story = {
  render: () => (
    <Form
      onSubmit={(data) => console.log(data)}
      className="w-full max-w-md"
    >
      <FormField label="Email">
        <Input
          type="email"
          name="email"
          placeholder="you@example.com"
          disabled
          size="md"
        />
      </FormField>

      <FormField label="Password">
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          disabled
          size="md"
        />
      </FormField>

      <FormSubmit size="md" fullWidth loading>
        Signing in...
      </FormSubmit>
    </Form>
  ),
};

/**
 * Multi-section form with fieldsets.
 */
export const MultiSection: Story = {
  render: () => (
    <Form onSubmit={(data) => console.log(data)} className="w-full max-w-md">
      <fieldset className="border-0 p-0 m-0 mb-8">
        <legend className="text-base font-bold mb-4 block">
          Personal Information
        </legend>

        <FormField label="Full Name" required>
          <Input type="text" name="name" placeholder="John Doe" size="md" />
        </FormField>

        <FormField label="Email" required>
          <Input
            type="email"
            name="email"
            placeholder="john@example.com"
            size="md"
          />
        </FormField>
      </fieldset>

      <fieldset className="border-0 p-0 m-0 mb-8">
        <legend className="text-base font-bold mb-4 block">
          Employment Details
        </legend>

        <FormField label="Employee ID">
          <Input type="text" name="employeeId" placeholder="EMP-001" size="md" />
        </FormField>

        <FormField label="Department">
          <Input
            type="text"
            name="department"
            placeholder="Human Resources"
            size="md"
          />
        </FormField>
      </fieldset>

      <div className="flex gap-2">
        <Button variant="secondary" size="md" fullWidth>
          Cancel
        </Button>
        <FormSubmit size="md" fullWidth>
          Save
        </FormSubmit>
      </div>
    </Form>
  ),
};

/**
 * Form with helper text guidance.
 */
export const WithGuidance: Story = {
  render: () => (
    <Form onSubmit={(data) => console.log(data)} className="w-full max-w-md">
      <FormField label="Create Password" required>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          helperText="Use at least 12 characters with uppercase, lowercase, number, and symbol"
          size="md"
        />
      </FormField>

      <FormField label="Confirm Password" required>
        <Input
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          helperText="Must match the password above"
          size="md"
        />
      </FormField>

      <FormField label="Recovery Email">
        <Input
          type="email"
          name="recoveryEmail"
          placeholder="recovery@example.com"
          helperText="Used to recover your account if needed"
          size="md"
        />
      </FormField>

      <FormSubmit size="md" fullWidth>
        Create Account
      </FormSubmit>
    </Form>
  ),
};

/**
 * Compact form for inline use.
 */
export const Compact: Story = {
  render: () => (
    <Form onSubmit={(data) => console.log(data)} className="w-full max-w-sm">
      <FormField label="Search">
        <Input
          type="text"
          name="search"
          placeholder="Enter search term..."
          size="sm"
        />
      </FormField>

      <div className="flex gap-2 mt-4">
        <FormSubmit size="sm" fullWidth>
          Search
        </FormSubmit>
      </div>
    </Form>
  ),
};

/**
 * Accessibility demonstration with proper form semantics.
 */
export const Accessibility: Story = {
  render: () => (
    <Form onSubmit={(data) => console.log(data)} className="w-full max-w-md">
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-lg font-bold mb-6 block">
          Contact Information
        </legend>

        <FormField label="Name" required>
          <Input
            type="text"
            name="name"
            placeholder="Full name"
            size="md"
          />
        </FormField>

        <FormField label="Email" required>
          <Input
            type="email"
            name="email"
            placeholder="you@example.com"
            helperText="We'll respond to this email"
            size="md"
          />
        </FormField>

        <FormField label="Message" required>
          <textarea
            name="message"
            placeholder="Your message here..."
            className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={4}
          />
        </FormField>

        <FormSubmit size="md" fullWidth>
          Send Message
        </FormSubmit>
      </fieldset>
    </Form>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "label-title-only",
            enabled: false,
          },
        ],
      },
    },
  },
};
