import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";

/**
 * # Card Component
 *
 * Container component for grouping related content with optional header and footer.
 *
 * ## Features
 * - 3 visual variants: default, elevated, outlined
 * - Header and footer sections
 * - Loading overlay state
 * - Padding variants for content density
 * - Light/dark theme support
 * - WCAG 2.2 AA contrast compliant
 *
 * ## Accessibility
 * - Semantic article/section element
 * - ARIA live region for loading state
 * - Sufficient color contrast
 * - Semantic heading hierarchy in headers
 */
const meta = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "elevated", "outlined"],
      description: "Visual style of the card",
    },
    padding: {
      control: "select",
      options: ["compact", "default", "comfortable"],
      description: "Internal padding density",
    },
    loading: {
      control: "boolean",
      description: "Show loading overlay",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default card with basic content.
 */
export const Default: Story = {
  args: {
    variant: "default",
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Card Title</h3>
        <p className="text-sm text-neutral-600">
          This is a default card with standard styling.
        </p>
      </div>
    ),
  },
};

/**
 * All variant combinations.
 */
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-6 w-full max-w-2xl">
      <Card variant="default">
        <h3 className="text-lg font-semibold mb-2">Default Card</h3>
        <p className="text-sm text-neutral-600">
          The default card variant with subtle styling.
        </p>
      </Card>
      <Card variant="elevated">
        <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
        <p className="text-sm text-neutral-600">
          The elevated card variant with shadow for prominence.
        </p>
      </Card>
      <Card variant="outlined">
        <h3 className="text-lg font-semibold mb-2">Outlined Card</h3>
        <p className="text-sm text-neutral-600">
          The outlined card variant with border emphasis.
        </p>
      </Card>
    </div>
  ),
};

/**
 * Card with header and footer sections.
 */
export const WithHeaderFooter: Story = {
  render: () => (
    <Card variant="elevated" className="w-full max-w-md">
      <Card.Header>
        <h2 className="text-lg font-bold">Card Title</h2>
        <p className="text-sm text-neutral-500">Subtitle or description</p>
      </Card.Header>
      <div className="mb-4">
        <p className="text-sm text-neutral-700">
          Main content area with information or form fields.
        </p>
      </div>
      <Card.Footer className="flex gap-2">
        <button className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Cancel
        </button>
        <button className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Save
        </button>
      </Card.Footer>
    </Card>
  ),
};

/**
 * Card in loading state with overlay.
 */
export const Loading: Story = {
  args: {
    variant: "elevated",
    loading: true,
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Loading Card</h3>
        <p className="text-sm text-neutral-600">
          This card is displaying loading state.
        </p>
      </div>
    ),
  },
};

/**
 * All padding variants.
 */
export const PaddingVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <Card variant="default" padding="compact">
        <h3 className="text-lg font-semibold mb-2">Compact Padding</h3>
        <p className="text-sm text-neutral-600">Minimal internal spacing.</p>
      </Card>
      <Card variant="default" padding="default">
        <h3 className="text-lg font-semibold mb-2">Default Padding</h3>
        <p className="text-sm text-neutral-600">Standard internal spacing.</p>
      </Card>
      <Card variant="default" padding="comfortable">
        <h3 className="text-lg font-semibold mb-2">Comfortable Padding</h3>
        <p className="text-sm text-neutral-600">
          Generous internal spacing for better readability.
        </p>
      </Card>
    </div>
  ),
};

/**
 * Card displaying a summary or statistic.
 */
export const SummaryCard: Story = {
  render: () => (
    <Card variant="elevated" className="w-full max-w-xs">
      <Card.Header>
        <h3 className="text-sm font-medium text-neutral-500">Total Payroll</h3>
      </Card.Header>
      <div className="text-3xl font-bold text-brand-600 mb-2">$1,234,567</div>
      <p className="text-xs text-neutral-500">For current pay period</p>
    </Card>
  ),
};

/**
 * Interactive card with hover state.
 */
export const InteractiveCard: Story = {
  render: () => (
    <Card
      variant="outlined"
      className="w-full max-w-xs cursor-pointer hover:shadow-md transition-shadow"
    >
      <h3 className="text-lg font-semibold mb-2">Clickable Card</h3>
      <p className="text-sm text-neutral-600 mb-4">
        This card can be clicked to navigate or perform an action.
      </p>
      <div className="text-xs text-brand-600 font-medium">Read more →</div>
    </Card>
  ),
};

/**
 * Card with complex nested content.
 */
export const ComplexContent: Story = {
  render: () => (
    <Card variant="elevated" className="w-full max-w-md">
      <Card.Header>
        <h2 className="text-lg font-bold">Employee Summary</h2>
      </Card.Header>
      <div className="space-y-4 mb-4">
        <div>
          <label className="text-xs font-medium text-neutral-500">Name</label>
          <p className="text-sm font-medium">John Doe</p>
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">
            Department
          </label>
          <p className="text-sm font-medium">Human Resources</p>
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Status</label>
          <p className="text-sm font-medium text-success-600">Active</p>
        </div>
      </div>
      <Card.Footer className="flex gap-2">
        <button className="text-sm font-medium text-brand-600">Edit</button>
        <button className="text-sm font-medium text-danger-600">Remove</button>
      </Card.Footer>
    </Card>
  ),
};

/**
 * Accessibility demonstration with semantic headings.
 */
export const Accessibility: Story = {
  render: () => (
    <Card variant="default" className="w-full max-w-md">
      <Card.Header>
        <h2 className="text-lg font-bold">Semantic Card</h2>
        <p className="text-sm text-neutral-500">
          With proper heading hierarchy
        </p>
      </Card.Header>
      <div className="mb-4">
        <h3 className="text-base font-semibold mb-2">Subsection</h3>
        <p className="text-sm text-neutral-700">
          Content organized with semantic HTML.
        </p>
      </div>
    </Card>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "heading-order",
            enabled: true,
          },
        ],
      },
    },
  },
};
