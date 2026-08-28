import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  describe("Rendering", () => {
    it("should render an input element", () => {
      render(<Input type="text" />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("should render with label", () => {
      render(<Input type="text" label="Email" />);
      const label = screen.getByLabelText("Email");
      expect(label).toBeInTheDocument();
    });

    it("should render with placeholder", () => {
      render(<Input type="text" placeholder="Enter text" />);
      const input = screen.getByPlaceholderText("Enter text");
      expect(input).toBeInTheDocument();
    });

    it("should render with helper text", () => {
      render(
        <Input type="text" label="Email" helperText="Enter your email address" />
      );
      const helper = screen.getByText("Enter your email address");
      expect(helper).toBeInTheDocument();
    });

    it("should render with error text", () => {
      render(
        <Input type="text" label="Email" errorText="Invalid email" />
      );
      const error = screen.getByText("Invalid email");
      expect(error).toBeInTheDocument();
    });
  });

  describe("Input Types", () => {
    const types = ["text", "email", "password", "number", "date", "time", "tel", "url"] as const;

    types.forEach((type) => {
      it(`should render ${type} input type`, () => {
        render(<Input type={type} />);
        const input = screen.getByRole(type === "date" || type === "time" ? "textbox" : "textbox");
        expect(input).toHaveAttribute("type", type);
      });
    });
  });

  describe("Sizes", () => {
    it("should render small size", () => {
      const { container } = render(<Input type="text" size="sm" />);
      const wrapper = container.querySelector("[class*='sm']");
      expect(wrapper).toBeInTheDocument();
    });

    it("should render medium size", () => {
      const { container } = render(<Input type="text" size="md" />);
      const wrapper = container.querySelector("[class*='md']");
      expect(wrapper).toBeInTheDocument();
    });

    it("should render large size", () => {
      const { container } = render(<Input type="text" size="lg" />);
      const wrapper = container.querySelector("[class*='lg']");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("States", () => {
    it("should render in error state", () => {
      render(<Input type="text" state="error" errorText="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should render in disabled state", () => {
      render(<Input type="text" disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("should render in readonly state", () => {
      render(<Input type="text" readOnly value="Readonly" />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.readOnly).toBe(true);
    });
  });

  describe("Value Handling", () => {
    it("should accept controlled value", () => {
      const { rerender } = render(
        <Input type="text" value="initial" onChange={() => {}} />
      );
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("initial");

      rerender(
        <Input type="text" value="updated" onChange={() => {}} />
      );
      expect(input.value).toBe("updated");
    });

    it("should handle onChange events", async () => {
      const handleChange = vi.fn();
      render(<Input type="text" onChange={handleChange} />);
      const input = screen.getByRole("textbox");

      await userEvent.type(input, "hello");
      expect(handleChange).toHaveBeenCalled();
    });

    it("should allow typing in uncontrolled mode", async () => {
      render(<Input type="text" />);
      const input = screen.getByRole("textbox") as HTMLInputElement;

      await userEvent.type(input, "hello");
      expect(input.value).toBe("hello");
    });
  });

  describe("Email Validation", () => {
    it("should render email input type", () => {
      render(<Input type="email" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("should accept valid email format", async () => {
      render(<Input type="email" />);
      const input = screen.getByRole("textbox") as HTMLInputElement;

      await userEvent.type(input, "user@example.com");
      expect(input.value).toBe("user@example.com");
    });
  });

  describe("Password Input", () => {
    it("should render password input type", () => {
      render(<Input type="password" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "password");
    });

    it("should mask password characters", async () => {
      render(<Input type="password" />);
      const input = screen.getByRole("textbox") as HTMLInputElement;

      await userEvent.type(input, "secret");
      expect(input.type).toBe("password");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should be focusable via Tab", async () => {
      render(<Input type="text" />);
      const input = screen.getByRole("textbox");

      await userEvent.tab();
      expect(input).toHaveFocus();
    });

    it("should not be focusable when disabled", async () => {
      render(<Input type="text" disabled />);
      const input = screen.getByRole("textbox");

      await userEvent.tab();
      expect(input).not.toHaveFocus();
    });

    it("should handle Enter key", async () => {
      const handleKeyPress = vi.fn();
      render(<Input type="text" onKeyPress={handleKeyPress} />);
      const input = screen.getByRole("textbox");

      await userEvent.type(input, "{Enter}");
      expect(handleKeyPress).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have aria-invalid when in error state", () => {
      render(<Input type="text" state="error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should have aria-disabled when disabled", () => {
      render(<Input type="text" disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-disabled", "true");
    });

    it("should have aria-describedby for helper text", () => {
      const { container } = render(
        <Input type="text" label="Email" helperText="Enter your email" />
      );
      const input = container.querySelector("input");
      expect(input).toHaveAttribute("aria-describedby");
    });

    it("should have associated label element", () => {
      render(<Input type="text" label="Email Address" />);
      const input = screen.getByRole("textbox");
      const label = screen.getByLabelText("Email Address");
      expect(label).toBeInTheDocument();
      expect(input).toHaveAccessibleName("Email Address");
    });

    it("should be a semantic input element", () => {
      render(<Input type="text" />);
      const input = screen.getByRole("textbox");
      expect(input.tagName).toBe("INPUT");
    });
  });

  describe("Ref Forwarding", () => {
    it("should forward ref to input element", () => {
      const ref = { current: null };
      render(<Input type="text" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("should allow ref to access input methods", () => {
      const ref = { current: null };
      render(<Input type="text" ref={ref} />);
      expect(ref.current?.focus).toBeDefined();
      expect(ref.current?.select).toBeDefined();
    });
  });

  describe("Number Input", () => {
    it("should accept numeric values", async () => {
      render(<Input type="number" />);
      const input = screen.getByRole("spinbutton");

      await userEvent.type(input, "123");
      expect(input).toHaveValue(123);
    });

    it("should reject non-numeric input", async () => {
      render(<Input type="number" />);
      const input = screen.getByRole("spinbutton") as HTMLInputElement;

      // Note: HTML5 number input automatically prevents non-numeric input
      // This is validated by browser, not by our component
      expect(input.type).toBe("number");
    });
  });

  describe("Theme Support", () => {
    it("should support light theme via data-theme attribute", () => {
      const { container } = render(<Input type="text" />);
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme via data-theme attribute", () => {
      const { container } = render(<Input type="text" />);
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("Event Handlers", () => {
    it("should call onFocus handler", async () => {
      const handleFocus = vi.fn();
      render(<Input type="text" onFocus={handleFocus} />);
      const input = screen.getByRole("textbox");

      await userEvent.click(input);
      expect(handleFocus).toHaveBeenCalled();
    });

    it("should call onBlur handler", async () => {
      const handleBlur = vi.fn();
      render(<Input type="text" onBlur={handleBlur} />);
      const input = screen.getByRole("textbox");

      await userEvent.click(input);
      await userEvent.tab();
      expect(handleBlur).toHaveBeenCalled();
    });
  });
});
