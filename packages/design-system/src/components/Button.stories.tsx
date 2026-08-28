import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

/**
 * # Button Component
 *
 * Primary interactive component with support for multiple variants, sizes, and states.
 *
 * ## Features
 * - 4 variants: primary, secondary, danger, ghost
 * - 3 sizes: sm, md, lg
 * - Full keyboard accessibility (Tab, Enter, Space)
 * - Icon support with optional icon slot
 * - Loading state with spinner
 * - Disabled and readonly states
 * - Light/dark theme support
 * - WCAG 2.2 AA contrast compliant
 *
 * ## Accessibility
 * - Semantic `<button>` element
 * - Focus indicators: 3px outline with 2px offset
 * - Screen reader support via aria-busy, aria-disabled
 * - Keyboard navigation: Tab to focus, Enter/Space to activate
 * - Reduced motion support
 */
const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A versatile button component supporting multiple variants, sizes, and states with full accessibility.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "ghost"],
      description: "Visual style of the button",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the button",
    },
    state: {
      control: "select",
      options: ["default", "hover", "active", "focus", "disabled", "readonly", "loading", "no-permission"],
      description: "Visual state of the button",
    },
    children: {
      control: "text",
      description: "Button label text",
    },
    icon: {
      control: "boolean",
      description: "Show icon slot",
    },
    fullWidth: {
      control: "boolean",
      description: "Expand button to full container width",
    },
    onClick: {
      action: "clicked",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default button in primary variant and medium size.
 */
export const Default: Story = {
  args: {
    variant: "primary",
    size: "md",
    state: "default",
    children: "Button",
  },
};

/**
 * All variant combinations with medium size.
 */
export const Variants: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="primary" size="md">
        Primary
      </Button>
      <Button variant="secondary" size="md">
        Secondary
      </Button>
      <Button variant="danger" size="md">
        Danger
      </Button>
      <Button variant="ghost" size="md">
        Ghost
      </Button>
    </div>
  ),
};

/**
 * All size variants with primary variant.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap items-center">
      <Button variant="primary" size="sm">
        Small
      </Button>
      <Button variant="primary" size="md">
        Medium
      </Button>
      <Button variant="primary" size="lg">
        Large
      </Button>
    </div>
  ),
};

/**
 * Interactive states for primary button.
 */
export const States: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="primary" size="md" state="default">
        Default
      </Button>
      <Button variant="primary" size="md" state="hover">
        Hover
      </Button>
      <Button variant="primary" size="md" state="active">
        Active
      </Button>
      <Button variant="primary" size="md" state="focus">
        Focus
      </Button>
      <Button variant="primary" size="md" state="disabled" disabled>
        Disabled
      </Button>
      <Button variant="primary" size="md" state="readonly">
        Readonly
      </Button>
      <Button variant="primary" size="md" state="loading" loading>
        Loading
      </Button>
      <Button variant="primary" size="md" state="no-permission">
        No Permission
      </Button>
    </div>
  ),
};

/**
 * Button with loading spinner state.
 */
export const Loading: Story = {
  args: {
    variant: "primary",
    size: "md",
    loading: true,
    children: "Saving...",
    disabled: true,
  },
};

/**
 * Button in disabled state.
 */
export const Disabled: Story = {
  args: {
    variant: "primary",
    size: "md",
    disabled: true,
    children: "Disabled Button",
  },
};

/**
 * Button in readonly state (visually similar to disabled but semantically different).
 */
export const Readonly: Story = {
  args: {
    variant: "primary",
    size: "md",
    readOnly: true,
    children: "Readonly Button",
  },
};

/**
 * Full-width button spanning container width.
 */
export const FullWidth: Story = {
  args: {
    variant: "primary",
    size: "md",
    fullWidth: true,
    children: "Full Width Button",
  },
};

/**
 * Button with icon slot (demonstrates icon support).
 */
export const WithIcon: Story = {
  args: {
    variant: "primary",
    size: "md",
    icon: true,
    children: "Button with Icon",
  },
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
};

/**
 * Danger variant in all states for destructive actions.
 */
export const DangerVariant: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="danger" size="md" state="default">
        Delete
      </Button>
      <Button variant="danger" size="md" state="hover">
        Delete (Hover)
      </Button>
      <Button variant="danger" size="md" state="disabled" disabled>
        Delete (Disabled)
      </Button>
    </div>
  ),
};

/**
 * Ghost variant for secondary actions.
 */
export const GhostVariant: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="ghost" size="md">
        Cancel
      </Button>
      <Button variant="ghost" size="md" state="disabled" disabled>
        Cancel (Disabled)
      </Button>
    </div>
  ),
};

/**
 * Responsive layout with buttons of different sizes.
 */
export const ResponsiveLayout: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Button variant="primary" size="lg" fullWidth>
        Primary Action (Large)
      </Button>
      <Button variant="secondary" size="md" fullWidth>
        Secondary Action (Medium)
      </Button>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" fullWidth>
          Cancel (Small)
        </Button>
        <Button variant="primary" size="sm" fullWidth>
          Confirm (Small)
        </Button>
      </div>
    </div>
  ),
};

/**
 * Accessibility demonstration with focus states.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="primary" size="md" state="focus">
        Focused Button
      </Button>
      <Button variant="secondary" size="md" state="focus">
        Focused Secondary
      </Button>
      <Button variant="danger" size="md" state="focus">
        Focused Danger
      </Button>
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
            id: "button-name",
            enabled: true,
          },
        ],
      },
    },
  },
};
