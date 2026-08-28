import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./Modal";
import { useState } from "react";

/**
 * # Modal Component
 *
 * Dialog component with focus trap and keyboard support for user interactions.
 *
 * ## Features
 * - Built on Radix Dialog (focus management, backdrop, ESC key)
 * - 3 size variants: sm, md, lg
 * - Focus trap prevents focus from leaving modal
 * - ESC key to dismiss
 * - Backdrop click to dismiss
 * - Light/dark theme support
 * - WCAG 2.2 AA compliant
 *
 * ## Accessibility
 * - Focus trap prevents focus escape
 * - aria-modal attribute
 * - aria-labelledby for title
 * - aria-describedby for description
 * - ESC key support
 * - Semantic button elements
 */
const meta = {
  title: "Components/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Modal size",
    },
    isOpen: {
      control: "boolean",
      description: "Whether the modal is open",
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default modal in open state.
 */
export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
        >
          Open Modal
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Modal Title"
          size="md"
        >
          <p className="text-neutral-700 mb-4">
            This is the modal content. Click the button below or press ESC to
            close.
          </p>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
          >
            Close
          </button>
        </Modal>
      </>
    );
  },
};

/**
 * All size variants.
 */
export const Sizes: Story = {
  render: () => {
    const [openSize, setOpenSize] = useState<"sm" | "md" | "lg" | null>(null);

    return (
      <>
        <div className="flex gap-4">
          <button
            onClick={() => setOpenSize("sm")}
            className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
          >
            Small Modal
          </button>
          <button
            onClick={() => setOpenSize("md")}
            className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
          >
            Medium Modal
          </button>
          <button
            onClick={() => setOpenSize("lg")}
            className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
          >
            Large Modal
          </button>
        </div>

        {openSize && (
          <Modal
            isOpen={true}
            onClose={() => setOpenSize(null)}
            title={`${openSize.toUpperCase()} Modal`}
            size={openSize}
          >
            <p className="text-neutral-700 mb-4">
              This is a {openSize} modal showing different size options.
            </p>
            <button
              onClick={() => setOpenSize(null)}
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
            >
              Close
            </button>
          </Modal>
        )}
      </>
    );
  },
};

/**
 * Modal with form content and actions.
 */
export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
        >
          Open Form Modal
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Create New Employee"
          size="md"
        >
          <form className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-neutral-300 rounded hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-neutral-300 rounded hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </form>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
            >
              Create
            </button>
          </div>
        </Modal>
      </>
    );
  },
};

/**
 * Confirmation modal for destructive actions.
 */
export const Confirmation: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-danger-600 text-white rounded hover:bg-danger-700"
        >
          Delete Item
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Delete Item?"
          size="sm"
        >
          <p className="text-neutral-700 mb-6">
            Are you sure you want to delete this item? This action cannot be
            undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-danger-600 text-white rounded hover:bg-danger-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      </>
    );
  },
};

/**
 * Success message modal.
 */
export const Success: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-success-600 text-white rounded hover:bg-success-700"
        >
          Show Success
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Success!"
          size="sm"
        >
          <p className="text-neutral-700 mb-6">
            Your changes have been saved successfully.
          </p>
          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2 bg-success-600 text-white rounded hover:bg-success-700"
          >
            Close
          </button>
        </Modal>
      </>
    );
  },
};

/**
 * Modal with long content demonstrating scrolling.
 */
export const LongContent: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
        >
          Open Long Content Modal
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Privacy Policy"
          size="lg"
        >
          <div className="max-h-96 overflow-y-auto mb-6">
            <p className="text-neutral-700 mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
            <p className="text-neutral-700 mb-4">
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident, sunt in culpa qui officia deserunt mollit
              anim id est laborum.
            </p>
            <p className="text-neutral-700 mb-4">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem
              accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
              quae ab illo inventore veritatis et quasi architecto beatae vitae
              dicta sunt explicabo.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Decline
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
            >
              Accept
            </button>
          </div>
        </Modal>
      </>
    );
  },
};

/**
 * Accessibility demonstration with focus management.
 */
export const Accessibility: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
        >
          Open Accessible Modal
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Keyboard Navigation Test"
          size="md"
          aria-describedby="modal-description"
        >
          <div id="modal-description" className="text-neutral-700 mb-6">
            Press Tab to navigate between buttons. Press ESC to close.
          </div>
          <div className="flex flex-col gap-4">
            <button className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500">
              Button 1
            </button>
            <button className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500">
              Button 2
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700"
            >
              Close Modal
            </button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "aria-valid-attr-value",
            enabled: true,
          },
        ],
      },
    },
  },
};
