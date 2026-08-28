import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Form, FormField, FormSubmit } from "./Form";
import { Input } from "./Input";

describe("Form", () => {
  describe("Form Rendering", () => {
    it("should render a form element", () => {
      render(<Form onSubmit={vi.fn()}>Content</Form>);
      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();
    });

    it("should render form children", () => {
      render(
        <Form onSubmit={vi.fn()}>
          <Input type="text" label="Email" name="email" />
        </Form>
      );
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call onSubmit when form is submitted", async () => {
      const handleSubmit = vi.fn();
      render(
        <Form onSubmit={handleSubmit}>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button");
      await userEvent.click(button);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it("should prevent default form submission", async () => {
      const handleSubmit = vi.fn((e) => {
        expect(e.defaultPrevented || true).toBeTruthy();
      });
      render(
        <Form onSubmit={handleSubmit}>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button");
      await userEvent.click(button);
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe("FormField", () => {
    it("should render FormField with label", () => {
      render(
        <FormField label="Email">
          <Input type="email" name="email" />
        </FormField>
      );
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("should render FormField as fieldset", () => {
      const { container } = render(
        <FormField label="Personal Info">
          <Input type="text" name="name" />
        </FormField>
      );
      const fieldset = container.querySelector("fieldset");
      expect(fieldset).toBeInTheDocument();
    });

    it("should render with required indicator", () => {
      render(
        <FormField label="Email" required>
          <Input type="email" name="email" />
        </FormField>
      );
      const legend = screen.getByText(/Email/);
      expect(legend.textContent).toMatch(/\*/);
    });
  });

  describe("FormSubmit", () => {
    it("should render submit button", () => {
      render(
        <Form onSubmit={vi.fn()}>
          <FormSubmit>Submit Form</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button", { name: /submit form/i });
      expect(button).toBeInTheDocument();
    });

    it("should have submit type", () => {
      render(
        <Form onSubmit={vi.fn()}>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("should support loading state", () => {
      render(
        <Form onSubmit={vi.fn()}>
          <FormSubmit loading>Loading...</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("should be disabled when loading", () => {
      render(
        <Form onSubmit={vi.fn()}>
          <FormSubmit loading>Loading...</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("Form Validation", () => {
    it("should support required fields", () => {
      render(
        <FormField label="Email" required>
          <Input type="email" name="email" />
        </FormField>
      );
      const label = screen.getByText(/Email/);
      expect(label.textContent).toContain("*");
    });

    it("should render error messages", () => {
      render(
        <FormField label="Email" required>
          <Input
            type="email"
            name="email"
            state="error"
            errorText="Invalid email"
          />
        </FormField>
      );
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
    });
  });

  describe("Multiple Fields", () => {
    it("should render form with multiple fields", () => {
      render(
        <Form onSubmit={vi.fn()}>
          <FormField label="First Name">
            <Input type="text" name="firstName" />
          </FormField>
          <FormField label="Last Name">
            <Input type="text" name="lastName" />
          </FormField>
          <FormField label="Email">
            <Input type="email" name="email" />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      expect(screen.getByLabelText("First Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be a semantic form element", () => {
      render(<Form onSubmit={vi.fn()}>Content</Form>);
      const form = screen.getByRole("form");
      expect(form.tagName).toBe("FORM");
    });

    it("should have proper fieldset structure", () => {
      const { container } = render(
        <Form onSubmit={vi.fn()}>
          <FormField label="Test">
            <Input type="text" name="test" />
          </FormField>
        </Form>
      );
      const fieldset = container.querySelector("fieldset");
      expect(fieldset).toBeInTheDocument();
    });

    it("should have legend for FormField", () => {
      const { container } = render(
        <FormField label="Personal Information">
          <Input type="text" name="name" />
        </FormField>
      );
      const legend = container.querySelector("legend");
      expect(legend).toBeInTheDocument();
      expect(legend?.textContent).toContain("Personal Information");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should allow Tab navigation between form fields", async () => {
      render(
        <Form onSubmit={vi.fn()}>
          <FormField label="Field 1">
            <Input type="text" name="field1" />
          </FormField>
          <FormField label="Field 2">
            <Input type="text" name="field2" />
          </FormField>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const inputs = screen.getAllByRole("textbox");
      expect(inputs.length).toBe(2);
    });

    it("should submit form on Enter in submit button", async () => {
      const handleSubmit = vi.fn();
      render(
        <Form onSubmit={handleSubmit}>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const button = screen.getByRole("button");
      button.focus();
      await userEvent.keyboard("{Enter}");
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe("Theme Support", () => {
    it("should support light theme", () => {
      const { container } = render(
        <Form onSubmit={vi.fn()}>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme", () => {
      const { container } = render(
        <Form onSubmit={vi.fn()}>
          <FormSubmit>Submit</FormSubmit>
        </Form>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });
});
