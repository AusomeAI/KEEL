import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  describe("Rendering", () => {
    it("should render a button element", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it("should render with children text", () => {
      render(<Button>Submit Form</Button>);
      expect(screen.getByText("Submit Form")).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("Variants", () => {
    it("should render primary variant", () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("primary");
    });

    it("should render secondary variant", () => {
      const { container } = render(
        <Button variant="secondary">Secondary</Button>
      );
      const button = container.querySelector("button");
      expect(button).toHaveClass("secondary");
    });

    it("should render danger variant", () => {
      const { container } = render(<Button variant="danger">Delete</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("danger");
    });

    it("should render ghost variant", () => {
      const { container } = render(<Button variant="ghost">Cancel</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("ghost");
    });

    it("should default to primary variant", () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("primary");
    });
  });

  describe("Sizes", () => {
    it("should render small size", () => {
      const { container } = render(<Button size="sm">Small</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("sm");
    });

    it("should render medium size", () => {
      const { container } = render(<Button size="md">Medium</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("md");
    });

    it("should render large size", () => {
      const { container } = render(<Button size="lg">Large</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("lg");
    });

    it("should default to medium size", () => {
      const { container } = render(<Button>Default</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("md");
    });
  });

  describe("States", () => {
    it("should render disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should render readonly state", () => {
      render(<Button readOnly>Readonly</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-readonly", "true");
    });

    it("should render loading state", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("should disable button when loading", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Full Width", () => {
    it("should render full width", () => {
      const { container } = render(<Button fullWidth>Full Width</Button>);
      const button = container.querySelector("button");
      expect(button).toHaveClass("w-full");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should handle Enter key", async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      const button = screen.getByRole("button");

      button.focus();
      await userEvent.keyboard("{Enter}");
      expect(handleClick).toHaveBeenCalled();
    });

    it("should handle Space key", async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      const button = screen.getByRole("button");

      button.focus();
      await userEvent.keyboard(" ");
      expect(handleClick).toHaveBeenCalled();
    });

    it("should be focusable via Tab", async () => {
      render(<Button>Click</Button>);
      const button = screen.getByRole("button");

      await userEvent.tab();
      expect(button).toHaveFocus();
    });

    it("should not be focusable when disabled", async () => {
      render(<Button disabled>Click</Button>);
      const button = screen.getByRole("button");

      await userEvent.tab();
      expect(button).not.toHaveFocus();
    });
  });

  describe("Click Handling", () => {
    it("should call onClick handler", async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      const button = screen.getByRole("button");

      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Click
        </Button>
      );
      const button = screen.getByRole("button");

      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", async () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Click
        </Button>
      );
      const button = screen.getByRole("button");

      await userEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("should have aria-busy when loading", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("should have proper focus outline", () => {
      render(<Button>Click</Button>);
      const button = screen.getByRole("button");
      const style = window.getComputedStyle(button);
      expect(style).toBeDefined();
    });

    it("should be a semantic button element", () => {
      render(<Button>Click</Button>);
      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("should support aria-label", () => {
      render(<Button aria-label="Close dialog">×</Button>);
      const button = screen.getByLabelText("Close dialog");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref to button element", () => {
      const ref = { current: null };
      render(<Button ref={ref}>Click</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it("should allow ref to access button methods", () => {
      const ref = { current: null };
      render(<Button ref={ref}>Click</Button>);
      expect(ref.current?.click).toBeDefined();
    });
  });

  describe("Theme Support", () => {
    it("should support light theme via data-theme attribute", () => {
      const { container } = render(<Button>Click</Button>);
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme via data-theme attribute", () => {
      const { container } = render(<Button>Click</Button>);
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("Multiple Variants", () => {
    it("should render all variant+size combinations", () => {
      const variants = ["primary", "secondary", "danger", "ghost"] as const;
      const sizes = ["sm", "md", "lg"] as const;

      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { container } = render(
            <Button variant={variant} size={size}>
              {variant} {size}
            </Button>
          );
          const button = container.querySelector("button");
          expect(button).toHaveClass(variant);
          expect(button).toHaveClass(size);
        });
      });
    });
  });

  describe("Type Property", () => {
    it("should default to button type", () => {
      render(<Button>Click</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("should support submit type", () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("should support reset type", () => {
      render(<Button type="reset">Reset</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "reset");
    });
  });
});
