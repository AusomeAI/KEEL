import type { Meta, StoryObj } from "@storybook/react";
import { TopNav } from "./TopNav";
import { useState } from "react";

/**
 * # TopNav Component
 *
 * Header navigation with breadcrumbs, context switchers, user menu, and theme toggle.
 *
 * ## Features
 * - Breadcrumb navigation
 * - Context switchers (Tenant, Group, Entity, Branch)
 * - User profile menu
 * - Theme toggle (light/dark)
 * - Responsive layout (inline on desktop, stacked on mobile)
 * - Popover menus with keyboard support
 * - Light/dark theme support
 * - Full accessibility support
 *
 * ## Accessibility
 * - Semantic nav element
 * - ARIA navigation landmark
 * - aria-current for active breadcrumb
 * - aria-haspopup for menu buttons
 * - Keyboard navigation: Tab, Arrow keys, Enter, ESC
 * - Focus management in popovers
 */
const meta = {
  title: "Components/TopNav",
  component: TopNav,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TopNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default top navigation with breadcrumbs and user menu.
 */
export const Default: Story = {
  render: () => (
    <div className="min-h-screen bg-neutral-50">
      <TopNav>
        <TopNav.Breadcrumbs>
          <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#">People</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#" current>
            Employees
          </TopNav.Breadcrumb>
        </TopNav.Breadcrumbs>
        <TopNav.UserMenu
          name="John Doe"
          email="john@example.com"
          avatar="JD"
        />
      </TopNav>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          Employees
        </h1>
      </div>
    </div>
  ),
};

/**
 * TopNav with context switchers for tenancy navigation.
 */
export const WithContextSwitchers: Story = {
  render: () => {
    const [tenant, setTenant] = useState("ACME Corp");
    const [group, setGroup] = useState("North America");
    const [entity, setEntity] = useState("ACME Inc.");
    const [branch, setBranch] = useState("San Francisco");

    return (
      <div className="min-h-screen bg-neutral-50">
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#">Dashboard</TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>

          <div className="flex gap-4 items-center">
            <TopNav.ContextSwitcher
              label="Tenant"
              value={tenant}
              onChange={setTenant}
              options={["ACME Corp", "TechStart Inc", "GlobalBiz LLC"]}
            />
            <TopNav.ContextSwitcher
              label="Group"
              value={group}
              onChange={setGroup}
              options={["North America", "Europe", "Asia Pacific"]}
            />
            <TopNav.ContextSwitcher
              label="Entity"
              value={entity}
              onChange={setEntity}
              options={["ACME Inc.", "ACME Labs", "ACME Ventures"]}
            />
            <TopNav.ContextSwitcher
              label="Branch"
              value={branch}
              onChange={setBranch}
              options={["San Francisco", "New York", "London", "Tokyo"]}
            />
          </div>

          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
        <div className="p-8">
          <h1 className="text-2xl font-bold text-neutral-900">
            Dashboard — {tenant} / {group} / {entity} / {branch}
          </h1>
          <p className="text-neutral-600 mt-2">
            Current context selected
          </p>
        </div>
      </div>
    );
  },
};

/**
 * TopNav with breadcrumb navigation.
 */
export const WithBreadcrumbs: Story = {
  render: () => (
    <div className="min-h-screen bg-neutral-50">
      <TopNav>
        <TopNav.Breadcrumbs>
          <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#">People Management</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#">Employees</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#">John Doe</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#" current>
            Edit Profile
          </TopNav.Breadcrumb>
        </TopNav.Breadcrumbs>
        <TopNav.UserMenu
          name="Jane Smith"
          email="jane@example.com"
          avatar="JS"
        />
      </TopNav>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          Edit Employee Profile
        </h1>
        <p className="text-neutral-600 mt-2">
          Edit details for John Doe
        </p>
      </div>
    </div>
  ),
};

/**
 * TopNav with theme toggle.
 */
export const WithThemeToggle: Story = {
  render: () => {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const handleThemeToggle = () => {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
      <div
        className="min-h-screen bg-neutral-50 dark:bg-neutral-950"
        data-theme={theme}
      >
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#" current>
              Settings
            </TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>

          <div className="flex gap-4 items-center">
            <button
              onClick={handleThemeToggle}
              className="px-3 py-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>

          <TopNav.UserMenu
            name="John Doe"
            email="john@example.com"
            avatar="JD"
          />
        </TopNav>
        <div className="p-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Theme: {theme.toUpperCase()}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Click the theme toggle to switch between light and dark modes
          </p>
        </div>
      </div>
    );
  },
};

/**
 * TopNav with user menu options.
 */
export const WithUserMenuOptions: Story = {
  render: () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <div className="min-h-screen bg-neutral-50">
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#" current>
              My Profile
            </TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative"
            >
              <div className="px-4 py-2 rounded hover:bg-neutral-200 text-neutral-700">
                JD
              </div>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg z-50 border border-neutral-200">
                  <div className="p-4 border-b border-neutral-200">
                    <p className="font-semibold text-neutral-900">John Doe</p>
                    <p className="text-sm text-neutral-500">
                      john@example.com
                    </p>
                  </div>
                  <button className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-neutral-700">
                    My Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-neutral-700">
                    Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-neutral-700">
                    Help & Support
                  </button>
                  <div className="border-t border-neutral-200">
                    <button className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-danger-600">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </button>
          </div>
        </TopNav>
        <div className="p-8">
          <h1 className="text-2xl font-bold text-neutral-900">
            My Profile
          </h1>
          <p className="text-neutral-600 mt-2">
            Click on your avatar to see menu options
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Full-featured TopNav with all components.
 */
export const FullFeatured: Story = {
  render: () => {
    const [tenant, setTenant] = useState("ACME Corp");
    const [group, setGroup] = useState("North America");
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const handleThemeToggle = () => {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
      <div
        className="min-h-screen bg-neutral-50 dark:bg-neutral-950"
        data-theme={theme}
      >
        <TopNav>
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#">Payroll</TopNav.Breadcrumb>
            <TopNav.Breadcrumb href="#" current>
              Run Payroll
            </TopNav.Breadcrumb>
          </TopNav.Breadcrumbs>

          <div className="flex gap-4 items-center">
            <TopNav.ContextSwitcher
              label="Tenant"
              value={tenant}
              onChange={setTenant}
              options={["ACME Corp", "TechStart Inc"]}
            />
            <TopNav.ContextSwitcher
              label="Group"
              value={group}
              onChange={setGroup}
              options={["North America", "Europe"]}
            />
            <button
              onClick={handleThemeToggle}
              className="px-3 py-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>

          <TopNav.UserMenu
            name="Jane Administrator"
            email="jane.admin@example.com"
            avatar="JA"
          />
        </TopNav>
        <div className="p-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Run Payroll
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            {tenant} / {group}
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Responsive TopNav for mobile.
 */
export const Mobile: Story = {
  render: () => (
    <div className="min-h-screen bg-neutral-50 w-96">
      <TopNav className="flex-col gap-2 p-2">
        <TopNav.Breadcrumbs>
          <TopNav.Breadcrumb href="#">Home</TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#" current>
            Details
          </TopNav.Breadcrumb>
        </TopNav.Breadcrumbs>
        <TopNav.UserMenu
          name="John Doe"
          email="john@example.com"
          avatar="JD"
        />
      </TopNav>
      <div className="p-4">
        <h1 className="text-xl font-bold text-neutral-900">
          Details
        </h1>
        <p className="text-neutral-600 mt-2 text-sm">
          Mobile responsive layout
        </p>
      </div>
    </div>
  ),
};

/**
 * Accessibility demonstration with proper semantics.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="min-h-screen bg-neutral-50">
      <TopNav role="banner" aria-label="Site header">
        <TopNav.Breadcrumbs role="navigation" aria-label="Breadcrumbs">
          <TopNav.Breadcrumb href="#" role="listitem">
            Home
          </TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#" role="listitem">
            People
          </TopNav.Breadcrumb>
          <TopNav.Breadcrumb href="#" current role="listitem">
            Employees
          </TopNav.Breadcrumb>
        </TopNav.Breadcrumbs>
        <TopNav.UserMenu
          name="John Doe"
          email="john@example.com"
          avatar="JD"
          aria-label="User menu"
        />
      </TopNav>
      <main className="p-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          Employees
        </h1>
        <p className="text-neutral-600 mt-2">
          Accessible navigation with semantic landmarks
        </p>
      </main>
    </div>
  ),
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: "landmark-one",
            enabled: true,
          },
          {
            id: "region",
            enabled: true,
          },
        ],
      },
    },
  },
};
