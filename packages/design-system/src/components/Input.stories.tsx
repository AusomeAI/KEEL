import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

/**
 * # Input Component
 *
 * Versatile text input component supporting all HTML5 input types with labels, helpers, and error messages.
 *
 * ## Features
 * - All HTML5 input types (text, email, password, number, date, etc.)
 * - Label and helper text support
 * - Error message display with aria-invalid
 * - Icon slots (start/end)
 * - 3 sizes: sm, md, lg
 * - Full keyboard accessibility
 * - Light/dark theme support
 * - WCAG 2.2 AA contrast compliant
 *
 * ## Accessibility
 * - Semantic `<input>` element with proper type attributes
 * - Associated `<label>` element
 * - aria-invalid on error state
 * - aria-describedby for helper/error text
 * - Focus indicators: 3px outline with 2px offset
 * - Screen reader announcements for error state
 */
const meta = {
  title: "Components/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A flexible input component supporting all HTML5 input types with built-in labels, helpers, and error states.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "date", "time", "tel", "url"],
      description: "HTML input type",
    },
    label: {
      control: "text",
      description: "Associated label text",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    helperText: {
      control: "text",
      description: "Helper text below input",
    },
    errorText: {
      control: "text",
      description: "Error message text",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Input size",
    },
    state: {
      control: "select",
      options: ["default", "focus", "hover", "error", "disabled", "readonly"],
      description: "Visual state of the input",
    },
    disabled: {
      control: "boolean",
      description: "Disable the input",
    },
    readOnly: {
      control: "boolean",
      description: "Make the input readonly",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default text input with medium size.
 */
export const Default: Story = {
  args: {
    type: "text",
    label: "Full Name",
    placeholder: "Enter your full name",
    size: "md",
  },
};

/**
 * All size variants.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <Input
        type="text"
        label="Small Input"
        placeholder="Small size"
        size="sm"
      />
      <Input
        type="text"
        label="Medium Input"
        placeholder="Medium size"
        size="md"
      />
      <Input
        type="text"
        label="Large Input"
        placeholder="Large size"
        size="lg"
      />
    </div>
  ),
};

/**
 * All input types supported.
 */
export const InputTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <Input type="text" label="Text" placeholder="Text input" size="md" />
      <Input type="email" label="Email" placeholder="user@example.com" size="md" />
      <Input type="password" label="Password" placeholder="••••••••" size="md" />
      <Input type="number" label="Number" placeholder="123" size="md" />
      <Input type="date" label="Date" size="md" />
      <Input type="time" label="Time" size="md" />
      <Input type="tel" label="Phone" placeholder="+1 (555) 000-0000" size="md" />
      <Input type="url" label="Website" placeholder="https://example.com" size="md" />
    </div>
  ),
};

/**
 * Input with helper text for guidance.
 */
export const WithHelperText: Story = {
  args: {
    type: "email",
    label: "Email Address",
    placeholder: "you@example.com",
    helperText: "We'll never share your email with anyone else.",
    size: "md",
  },
};

/**
 * Input in error state with error message.
 */
export const WithError: Story = {
  args: {
    type: "email",
    label: "Email Address",
    placeholder: "you@example.com",
    errorText: "Please enter a valid email address",
    state: "error",
    size: "md",
  },
};

/**
 * Disabled input state.
 */
export const Disabled: Story = {
  args: {
    type: "text",
    label: "Disabled Input",
    placeholder: "Cannot edit",
    disabled: true,
    size: "md",
  },
};

/**
 * Readonly input state.
 */
export const Readonly: Story = {
  args: {
    type: "text",
    label: "Readonly Input",
    value: "This value cannot be changed",
    readOnly: true,
    size: "md",
  },
};

/**
 * Interactive states for text input.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <Input
        type="text"
        label="Default State"
        placeholder="Default"
        state="default"
        size="md"
      />
      <Input
        type="text"
        label="Focus State"
        placeholder="Focused"
        state="focus"
        size="md"
      />
      <Input
        type="text"
        label="Hover State"
        placeholder="Hover"
        state="hover"
        size="md"
      />
      <Input
        type="text"
        label="Error State"
        placeholder="Error"
        errorText="This field is required"
        state="error"
        size="md"
      />
      <Input
        type="text"
        label="Disabled State"
        placeholder="Disabled"
        disabled
        state="disabled"
        size="md"
      />
      <Input
        type="text"
        label="Readonly State"
        value="Readonly"
        readOnly
        state="readonly"
        size="md"
      />
    </div>
  ),
};

/**
 * Password input with security best practices.
 */
export const Password: Story = {
  args: {
    type: "password",
    label: "Password",
    placeholder: "Enter your password",
    helperText: "Minimum 12 characters with uppercase, lowercase, number, and symbol",
    size: "md",
  },
};

/**
 * Email validation flow.
 */
export const EmailValidation: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <Input
        type="email"
        label="Valid Email"
        value="user@example.com"
        helperText="Email format is correct"
        size="md"
      />
      <Input
        type="email"
        label="Invalid Email"
        value="not-an-email"
        errorText="Invalid email format"
        state="error"
        size="md"
      />
    </div>
  ),
};

/**
 * Number input with constraints.
 */
export const NumberInput: Story = {
  args: {
    type: "number",
    label: "Age",
    placeholder: "Enter your age",
    helperText: "Must be between 18 and 100",
    size: "md",
  },
};

/**
 * Form-like layout with multiple inputs.
 */
export const FormLayout: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <Input
        type="text"
        label="First Name"
        placeholder="John"
        size="md"
      />
      <Input
        type="text"
        label="Last Name"
        placeholder="Doe"
        size="md"
      />
      <Input
        type="email"
        label="Email"
        placeholder="john@example.com"
        size="md"
      />
      <Input
        type="tel"
        label="Phone"
        placeholder="+1 (555) 000-0000"
        size="md"
      />
      <Input
        type="date"
        label="Date of Birth"
        size="md"
      />
    </div>
  ),
};

/**
 * Accessibility demonstration with focus states.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <Input
        type="email"
        label="Email with Helper Text"
        placeholder="you@example.com"
        helperText="Helper text for guidance"
        state="focus"
        size="md"
      />
      <Input
        type="email"
        label="Email with Error"
        placeholder="you@example.com"
        errorText="Error message for validation"
        state="error"
        size="md"
      />
    </div>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
          {
            id: "label-title-only",
            enabled: false,
          },
        ],
      },
    },
  },
};
