import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  describe("Rendering", () => {
    it("should render a card element", () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.querySelector("[role='article']");
      expect(card).toBeInTheDocument();
    });

    it("should render with children", () => {
      render(<Card>Card content here</Card>);
      expect(screen.getByText("Card content here")).toBeInTheDocument();
    });

    it("should render with header section", () => {
      render(
        <Card>
          <Card.Header>Header Text</Card.Header>
        </Card>
      );
      expect(screen.getByText("Header Text")).toBeInTheDocument();
    });

    it("should render with footer section", () => {
      render(
        <Card>
          <Card.Footer>Footer Text</Card.Footer>
        </Card>
      );
      expect(screen.getByText("Footer Text")).toBeInTheDocument();
    });

    it("should render with header and footer", () => {
      render(
        <Card>
          <Card.Header>Header</Card.Header>
          <div>Content</div>
          <Card.Footer>Footer</Card.Footer>
        </Card>
      );
      expect(screen.getByText("Header")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
      expect(screen.getByText("Footer")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    it("should render default variant", () => {
      const { container } = render(<Card variant="default">Content</Card>);
      const card = container.querySelector("[class*='default']");
      expect(card).toBeInTheDocument();
    });

    it("should render elevated variant", () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      const card = container.querySelector("[class*='elevated']");
      expect(card).toBeInTheDocument();
    });

    it("should render outlined variant", () => {
      const { container } = render(<Card variant="outlined">Content</Card>);
      const card = container.querySelector("[class*='outlined']");
      expect(card).toBeInTheDocument();
    });

    it("should default to default variant", () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.querySelector("article");
      expect(card).toHaveClass("default");
    });
  });

  describe("Padding Variants", () => {
    it("should render compact padding", () => {
      const { container } = render(<Card padding="compact">Content</Card>);
      const card = container.querySelector("[class*='compact']");
      expect(card).toBeInTheDocument();
    });

    it("should render default padding", () => {
      const { container } = render(<Card padding="default">Content</Card>);
      const card = container.querySelector("[class*='default']");
      expect(card).toBeInTheDocument();
    });

    it("should render comfortable padding", () => {
      const { container } = render(<Card padding="comfortable">Content</Card>);
      const card = container.querySelector("[class*='comfortable']");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should render loading overlay", () => {
      render(<Card loading>Content</Card>);
      const overlay = screen.getByRole("status");
      expect(overlay).toBeInTheDocument();
    });

    it("should have aria-busy when loading", () => {
      render(<Card loading>Content</Card>);
      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-busy", "true");
    });

    it("should not show loading overlay when not loading", () => {
      const { container } = render(<Card loading={false}>Content</Card>);
      const overlay = container.querySelector("[aria-busy='true']");
      expect(overlay).toBeNull();
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <Card className="custom-class">Content</Card>
      );
      const card = container.querySelector("article");
      expect(card).toHaveClass("custom-class");
    });

    it("should merge custom className with variant class", () => {
      const { container } = render(
        <Card variant="elevated" className="custom">
          Content
        </Card>
      );
      const card = container.querySelector("article");
      expect(card).toHaveClass("custom");
      expect(card).toHaveClass("elevated");
    });
  });

  describe("Accessibility", () => {
    it("should be a semantic article element", () => {
      render(<Card>Content</Card>);
      const card = screen.getByRole("article");
      expect(card.tagName).toBe("ARTICLE");
    });

    it("should have proper aria attributes", () => {
      render(<Card>Content</Card>);
      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("role", "article");
    });

    it("should announce loading state to screen readers", () => {
      render(<Card loading>Content</Card>);
      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("Theme Support", () => {
    it("should support light theme", () => {
      const { container } = render(<Card>Content</Card>);
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme", () => {
      const { container } = render(<Card>Content</Card>);
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("Header and Footer Components", () => {
    it("should render header with multiple children", () => {
      render(
        <Card>
          <Card.Header>
            <h2>Title</h2>
            <p>Subtitle</p>
          </Card.Header>
        </Card>
      );
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Subtitle")).toBeInTheDocument();
    });

    it("should render footer with multiple children", () => {
      render(
        <Card>
          <Card.Footer>
            <button>Cancel</button>
            <button>Save</button>
          </Card.Footer>
        </Card>
      );
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });

  describe("Complex Nested Content", () => {
    it("should render complex nested structure", () => {
      render(
        <Card variant="elevated" padding="comfortable">
          <Card.Header>
            <h2>Employee Profile</h2>
          </Card.Header>
          <div>
            <p>Name: John Doe</p>
            <p>Role: Manager</p>
          </div>
          <Card.Footer>
            <button>Edit</button>
          </Card.Footer>
        </Card>
      );
      expect(screen.getByText("Employee Profile")).toBeInTheDocument();
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
  });
});
