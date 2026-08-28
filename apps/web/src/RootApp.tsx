/**
 * Root Application Component
 *
 * Sets up the router and main layout
 */

import React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Layout } from "./components/Layout";

export function RootApp() {
  return (
    <Layout>
      <RouterProvider router={router} />
    </Layout>
  );
}
