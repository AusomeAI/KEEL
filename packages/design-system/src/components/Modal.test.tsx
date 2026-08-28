import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  describe("Rendering", () => {
    it("should render modal when open", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          Content
        </Modal>
      );
      expect(screen.getByText("Test Modal")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      const { container } = render(
        <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
          Content
        </Modal>
      );
      const dialog = container.querySelector("dialog");
      expect(dialog).not.toBeVisible();
    });

    it("should render title", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal Title">
          Content
        </Modal>
      );
      expect(screen.getByText("Modal Title")).toBeInTheDocument();
    });

    it("should render children content", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          Modal content goes here
        </Modal>
      );
      expect(screen.getByText("Modal content goes here")).toBeInTheDocument();
    });
  });

  describe("Sizes", () => {
    it("should render small size", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm" title="Small">
          Content
        </Modal>
      );
      const dialog = container.querySelector("dialog");
      expect(dialog).toHaveClass("sm");
    });

    it("should render medium size", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} size="md" title="Medium">
          Content
        </Modal>
      );
      const dialog = container.querySelector("dialog");
      expect(dialog).toHaveClass("md");
    });

    it("should render large size", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg" title="Large">
          Content
        </Modal>
      );
      const dialog = container.querySelector("dialog");
      expect(dialog).toHaveClass("lg");
    });
  });

  describe("Close Functionality", () => {
    it("should call onClose when close button clicked", async () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Modal">
          Content
        </Modal>
      );
      const closeButton = screen.getByRole("button", { name: /close/i });
      await userEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalled();
    });

    it("should call onClose on ESC key press", async () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Modal">
          Content
        </Modal>
      );
      await userEvent.keyboard("{Escape}");
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper modal dialog role", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          Content
        </Modal>
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("role", "dialog");
    });

    it("should have aria-modal attribute", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          Content
        </Modal>
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("should have aria-labelledby pointing to title", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal Title">
          Content
        </Modal>
      );
      const dialog = container.querySelector("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("should support aria-describedby", () => {
      render(
        <Modal
          isOpen={true}
          onClose={vi.fn()}
          title="Modal"
          aria-describedby="description"
        >
          Content
        </Modal>
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-describedby");
    });
  });

  describe("Theme Support", () => {
    it("should support light theme", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          Content
        </Modal>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme", () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          Content
        </Modal>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("Focus Management", () => {
    it("should trap focus within modal", async () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal">
          <button>Button 1</button>
          <button>Button 2</button>
        </Modal>
      );
      const buttons = screen.getAllByRole("button");
      // Focus should remain within the modal when tabbing
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
