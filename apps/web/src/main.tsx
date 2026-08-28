/**
 * KEEL Web App Entry Point
 *
 * React 19 + Vite + TanStack Router
 *
 * Initializes:
 * - Theme context (light/dark mode)
 * - Authentication context (current user, tokens)
 * - Tenancy context (tenant/group/entity/branch scope)
 * - Notification system (toast messages)
 * - Router configuration
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { RootApp } from "./RootApp";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TenancyProvider } from "./contexts/TenancyContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import "@keel/design-system/styles.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TenancyProvider>
          <NotificationProvider>
            <RootApp />
          </NotificationProvider>
        </TenancyProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
