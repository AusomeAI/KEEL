/**
 * Main Layout Component
 *
 * Provides:
 * - Top navigation (TopNav from design system)
 * - Sidebar navigation
 * - Main content area
 * - Notification toast container
 */

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTenancy } from "../contexts/TenancyContext";
import { useNotification } from "../contexts/NotificationContext";
import { TopNav, Sidebar, Card, Button } from "@keel/design-system";
import { NotificationToast } from "./NotificationToast";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { currentScope } = useTenancy();
  const { notifications } = useNotification();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // If not authenticated, just render children (login page)
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        className="w-64 bg-card border-r border-border"
      >
        <nav className="p-4 space-y-2">
          <a href="/" className="block px-4 py-2 rounded hover:bg-accent">
            Dashboard
          </a>
          <a href="/people" className="block px-4 py-2 rounded hover:bg-accent">
            People
          </a>
          <a href="/time" className="block px-4 py-2 rounded hover:bg-accent">
            Time & Attendance
          </a>
          <a href="/payroll/runs" className="block px-4 py-2 rounded hover:bg-accent">
            Payroll
          </a>
          <a href="/approvals" className="block px-4 py-2 rounded hover:bg-accent">
            Approvals
          </a>
        </nav>
      </Sidebar>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top navigation */}
        <TopNav className="bg-card border-b border-border">
          <TopNav.Breadcrumbs>
            <TopNav.Breadcrumb href="/">Home</TopNav.Breadcrumb>
            {currentScope && (
              <>
                <TopNav.Breadcrumb href="/people">{currentScope.tenantId}</TopNav.Breadcrumb>
              </>
            )}
          </TopNav.Breadcrumbs>

          <div className="ml-auto flex items-center gap-4">
            {currentScope && (
              <TopNav.ContextSwitcher
                label="Scope"
                value={currentScope.tenantId}
                options={["Tenant 1", "Tenant 2"]}
                onChange={(value) => {
                  // TODO: Update tenancy scope
                }}
              />
            )}

            {user && (
              <TopNav.UserMenu
                name={user.name}
                email={user.email}
                avatar={user.avatar ? user.avatar.charAt(0).toUpperCase() : user.name.charAt(0)}
              />
            )}
          </div>
        </TopNav>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notif) => (
          <NotificationToast key={notif.id} notification={notif} />
        ))}
      </div>
    </div>
  );
}
