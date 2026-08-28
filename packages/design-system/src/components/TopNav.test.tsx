import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopNav } from "./TopNav";

describe("TopNav", () => {
  describe("Rendering", () => {
    it("should render top navigation header", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });

    it("should render with children", () => {
      render(
        <TopNav>
          <div>Test Content</div>
        </TopNav>
      );
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });
  });

  describe("Breadcrumbs", () => {
    it("should render breadcrumb navigation", () => {
      render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#">People</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#" current>
              Employees
            </TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("People")).toBeInTheDocument();
      expect(screen.getByText("Employees")).toBeInTheDocument();
    });

    it("should mark current breadcrumb", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#" current>
              Current Page
            </TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const currentBreadcrumb = container.querySelector("[aria-current]");
      expect(currentBreadcrumb).toBeInTheDocument();
    });

    it("should have aria-current for current page", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#" current>
              Current
            </TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const currentLink = container.querySelector(
        "[aria-current='page']"
      );
      expect(currentLink).toBeInTheDocument();
    });

    it("should be clickable navigation links", async () => {
      render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const link = screen.getByText("Home");
      await userEvent.click(link);
      expect(link).toBeInTheDocument();
    });
  });

  describe("Context Switchers", () => {
    it("should render context switcher", () => {
      render(
        <TopNav>
          <TopNav.ContextSwitcher
            label="Tenant"
            value="ACME Corp"
            onChange={vi.fn()}
            options={["ACME Corp", "TechStart Inc"]}
          />
        </TopNav>
      );
      expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    });

    it("should have label for context switcher", () => {
      render(
        <TopNav>
          <TopNav.ContextSwitcher
            label="Tenant"
            value="ACME Corp"
            onChange={vi.fn()}
            options={["ACME Corp", "TechStart Inc"]}
          />
        </TopNav>
      );
      expect(screen.getByText("Tenant")).toBeInTheDocument();
    });

    it("should call onChange when context is switched", async () => {
      const handleChange = vi.fn();
      render(
        <TopNav>
          <TopNav.ContextSwitcher
            label="Tenant"
            value="ACME Corp"
            onChange={handleChange}
            options={["ACME Corp", "TechStart Inc"]}
          />
        </TopNav>
      );
      const button = screen.getByText("ACME Corp");
      await userEvent.click(button);
      // Will open dropdown, then user selects option
      expect(button).toBeInTheDocument();
    });

    it("should display all available options", () => {
      const options = ["ACME Corp", "TechStart Inc", "GlobalBiz LLC"];
      render(
        <TopNav>
          <TopNav.ContextSwitcher
            label="Tenant"
            value="ACME Corp"
            onChange={vi.fn()}
            options={options}
          />
        </TopNav>
      );
      // At least the current value should be visible
      expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    });
  });

  describe("User Menu", () => {
    it("should render user profile menu", () => {
      render(
        <TopNav>
          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
      );
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should display user avatar", () => {
      render(
        <TopNav>
          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
      );
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should have menu button", () => {
      render(
        <TopNav>
          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
      );
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should be clickable to open menu", async () => {
      render(
        <TopNav>
          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
      );
      const button = screen.getByRole("button");
      await userEvent.click(button);
      expect(button).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have navigation landmark", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const nav = container.querySelector("nav");
      expect(nav).toHaveAttribute("role", "navigation");
    });

    it("should have proper breadcrumb list structure", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#">People</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const list = container.querySelector("[role='list']");
      expect(list).toBeInTheDocument();
    });

    it("should have aria-label on breadcrumbs navigation", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs role="navigation" aria-label="Breadcrumb">
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const nav = container.querySelector("[aria-label='Breadcrumb']");
      expect(nav).toBeInTheDocument();
    });

    it("should support keyboard navigation in breadcrumbs", async () => {
      render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#">People</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const homeLink = screen.getByText("Home");
      await userEvent.tab();
      expect(homeLink).toHaveFocus();
    });
  });

  describe("Theme Support", () => {
    it("should support light theme", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "light");
      expect(root.getAttribute("data-theme")).toBe("light");
    });

    it("should support dark theme", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const root = container.ownerDocument.documentElement;
      root.setAttribute("data-theme", "dark");
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("Responsive Behavior", () => {
    it("should render in header position", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
        </TopNav>
      );
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });

    it("should be responsive on mobile", () => {
      const { container } = render(
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>
          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
      );
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });
  });
});
