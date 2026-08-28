import type { Meta, StoryObj } from "@storybook/react";
import { Sidebar } from "./Sidebar";
import { useState } from "react";

/**
 * # Sidebar Component
 *
 * Navigation sidebar with collapsible submenu, user profile section, and mobile drawer support.
 *
 * ## Features
 * - Collapsible submenu items
 * - User profile section with avatar
 * - Mobile drawer mode (slides in from left)
 * - Keyboard navigation
 * - Light/dark theme support
 * - Full accessibility support
 * - Responsive: fixed on desktop, drawer on mobile
 *
 * ## Accessibility
 * - Semantic nav element
 * - ARIA navigation landmark
 * - Keyboard navigation: Arrow keys, Enter
 * - aria-expanded for collapsed state
 * - Focus management in drawer
 */
const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Desktop sidebar with navigation items.
 */
export const Desktop: Story = {
  render: () => {
    const [activeItem, setActiveItem] = useState("dashboard");

    return (
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar isOpen={true} onClose={() => {}}>
          <Sidebar.Nav>
            <Sidebar.NavItem
              active={activeItem === "dashboard"}
              onClick={() => setActiveItem("dashboard")}
            >
              Dashboard
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "people"}
              onClick={() => setActiveItem("people")}
            >
              People
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "payroll"}
              onClick={() => setActiveItem("payroll")}
            >
              Payroll
            </Sidebar.NavItem>
            <Sidebar.Submenu label="Time" defaultOpen={false}>
              <Sidebar.NavItem
                active={activeItem === "timesheet"}
                onClick={() => setActiveItem("timesheet")}
              >
                Timesheets
              </Sidebar.NavItem>
              <Sidebar.NavItem
                active={activeItem === "attendance"}
                onClick={() => setActiveItem("attendance")}
              >
                Attendance
              </Sidebar.NavItem>
            </Sidebar.Submenu>
            <Sidebar.Divider />
            <Sidebar.NavItem
              active={activeItem === "settings"}
              onClick={() => setActiveItem("settings")}
            >
              Settings
            </Sidebar.NavItem>
          </Sidebar.Nav>
          <Sidebar.UserProfile
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </Sidebar>
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-neutral-900">
            {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
          </h1>
          <p className="text-neutral-600 mt-2">
            Content for {activeItem} page
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Mobile drawer sidebar that slides in from left.
 */
export const MobileDrawer: Story = {
  render: () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeItem, setActiveItem] = useState("dashboard");

    return (
      <div className="flex min-h-screen bg-neutral-50">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-4 bg-brand-600 text-white rounded-r"
        >
          ☰ Menu
        </button>

        <Sidebar isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Sidebar.Nav>
            <Sidebar.NavItem
              active={activeItem === "dashboard"}
              onClick={() => {
                setActiveItem("dashboard");
                setDrawerOpen(false);
              }}
            >
              Dashboard
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "people"}
              onClick={() => {
                setActiveItem("people");
                setDrawerOpen(false);
              }}
            >
              People
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "payroll"}
              onClick={() => {
                setActiveItem("payroll");
                setDrawerOpen(false);
              }}
            >
              Payroll
            </Sidebar.NavItem>
            <Sidebar.Divider />
            <Sidebar.NavItem
              active={activeItem === "settings"}
              onClick={() => {
                setActiveItem("settings");
                setDrawerOpen(false);
              }}
            >
              Settings
            </Sidebar.NavItem>
          </Sidebar.Nav>
          <Sidebar.UserProfile
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </Sidebar>

        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-neutral-900">
            {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
          </h1>
          <p className="text-neutral-600 mt-2">
            Tap the menu button to open navigation
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Sidebar with collapsible submenu.
 */
export const WithSubmenu: Story = {
  render: () => {
    const [activeItem, setActiveItem] = useState("dashboard");
    const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);

    return (
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar isOpen={true} onClose={() => {}}>
          <Sidebar.Nav>
            <Sidebar.NavItem
              active={activeItem === "dashboard"}
              onClick={() => setActiveItem("dashboard")}
            >
              Dashboard
            </Sidebar.NavItem>
            <Sidebar.Submenu
              label="HR"
              defaultOpen={expandedSubmenu === "hr"}
              onToggle={(open) => setExpandedSubmenu(open ? "hr" : null)}
            >
              <Sidebar.NavItem
                active={activeItem === "employees"}
                onClick={() => setActiveItem("employees")}
              >
                Employees
              </Sidebar.NavItem>
              <Sidebar.NavItem
                active={activeItem === "onboarding"}
                onClick={() => setActiveItem("onboarding")}
              >
                Onboarding
              </Sidebar.NavItem>
              <Sidebar.NavItem
                active={activeItem === "termination"}
                onClick={() => setActiveItem("termination")}
              >
                Termination
              </Sidebar.NavItem>
            </Sidebar.Submenu>
            <Sidebar.Submenu
              label="Payroll"
              defaultOpen={expandedSubmenu === "payroll"}
              onToggle={(open) => setExpandedSubmenu(open ? "payroll" : null)}
            >
              <Sidebar.NavItem
                active={activeItem === "payroll-runs"}
                onClick={() => setActiveItem("payroll-runs")}
              >
                Payroll Runs
              </Sidebar.NavItem>
              <Sidebar.NavItem
                active={activeItem === "tax"}
                onClick={() => setActiveItem("tax")}
              >
                Tax
              </Sidebar.NavItem>
            </Sidebar.Submenu>
            <Sidebar.Submenu
              label="Time"
              defaultOpen={expandedSubmenu === "time"}
              onToggle={(open) => setExpandedSubmenu(open ? "time" : null)}
            >
              <Sidebar.NavItem
                active={activeItem === "timesheets"}
                onClick={() => setActiveItem("timesheets")}
              >
                Timesheets
              </Sidebar.NavItem>
              <Sidebar.NavItem
                active={activeItem === "leave"}
                onClick={() => setActiveItem("leave")}
              >
                Leave
              </Sidebar.NavItem>
              <Sidebar.NavItem
                active={activeItem === "attendance"}
                onClick={() => setActiveItem("attendance")}
              >
                Attendance
              </Sidebar.NavItem>
            </Sidebar.Submenu>
            <Sidebar.Divider />
            <Sidebar.NavItem
              active={activeItem === "settings"}
              onClick={() => setActiveItem("settings")}
            >
              Settings
            </Sidebar.NavItem>
          </Sidebar.Nav>
          <Sidebar.UserProfile
            name="Jane Smith"
            email="jane@example.com"
            avatar="JS"
          />
        </Sidebar>
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-neutral-900">
            {activeItem.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </h1>
        </div>
      </div>
    );
  },
};

/**
 * Sidebar with multiple sections.
 */
export const MultipleSections: Story = {
  render: () => {
    const [activeItem, setActiveItem] = useState("dashboard");

    return (
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar isOpen={true} onClose={() => {}}>
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Main
            </h3>
          </div>
          <Sidebar.Nav>
            <Sidebar.NavItem
              active={activeItem === "dashboard"}
              onClick={() => setActiveItem("dashboard")}
            >
              Dashboard
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "reports"}
              onClick={() => setActiveItem("reports")}
            >
              Reports
            </Sidebar.NavItem>
          </Sidebar.Nav>

          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Administration
            </h3>
          </div>
          <Sidebar.Nav>
            <Sidebar.NavItem
              active={activeItem === "users"}
              onClick={() => setActiveItem("users")}
            >
              Users
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "roles"}
              onClick={() => setActiveItem("roles")}
            >
              Roles & Permissions
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "audit"}
              onClick={() => setActiveItem("audit")}
            >
              Audit Log
            </Sidebar.NavItem>
          </Sidebar.Nav>

          <Sidebar.UserProfile
            name="Admin User"
            email="admin@example.com"
            avatar="AU"
          />
        </Sidebar>
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-neutral-900">
            {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
          </h1>
        </div>
      </div>
    );
  },
};

/**
 * Compact sidebar for limited space.
 */
export const Compact: Story = {
  render: () => {
    const [activeItem, setActiveItem] = useState("dashboard");

    return (
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar isOpen={true} onClose={() => {}} className="w-48">
          <Sidebar.Nav>
            <Sidebar.NavItem
              active={activeItem === "dashboard"}
              onClick={() => setActiveItem("dashboard")}
            >
              Dashboard
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "people"}
              onClick={() => setActiveItem("people")}
            >
              People
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "payroll"}
              onClick={() => setActiveItem("payroll")}
            >
              Payroll
            </Sidebar.NavItem>
          </Sidebar.Nav>
          <Sidebar.UserProfile
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </Sidebar>
        <div className="flex-1 p-8">
          <p className="text-neutral-600">
            Compact sidebar for smaller screens
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Accessibility demonstration with proper navigation semantics.
 */
export const Accessibility: Story = {
  render: () => {
    const [activeItem, setActiveItem] = useState("dashboard");

    return (
      <div className="flex min-h-screen bg-neutral-50">
        <Sidebar isOpen={true} onClose={() => {}} aria-label="Main navigation">
          <Sidebar.Nav role="navigation">
            <Sidebar.NavItem
              active={activeItem === "dashboard"}
              onClick={() => setActiveItem("dashboard")}
              role="menuitem"
              aria-current={activeItem === "dashboard" ? "page" : undefined}
            >
              Dashboard
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "people"}
              onClick={() => setActiveItem("people")}
              role="menuitem"
              aria-current={activeItem === "people" ? "page" : undefined}
            >
              People
            </Sidebar.NavItem>
            <Sidebar.NavItem
              active={activeItem === "payroll"}
              onClick={() => setActiveItem("payroll")}
              role="menuitem"
              aria-current={activeItem === "payroll" ? "page" : undefined}
            >
              Payroll
            </Sidebar.NavItem>
          </Sidebar.Nav>
          <Sidebar.UserProfile
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </Sidebar>
        <div className="flex-1 p-8">
          <main>
            <h1 className="text-2xl font-bold text-neutral-900">
              {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)}
            </h1>
          </main>
        </div>
      </div>
    );
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "nav-label",
            enabled: true,
          },
        ],
      },
    },
  },
};
