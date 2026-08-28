/**
 * 404 Not Found Page
 */

import React from "react";
import { Link } from "@tanstack/react-router";
import { Button, Card } from "@keel/design-system";

export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card variant="default" className="text-center p-8 max-w-md">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-xl font-semibold mb-4">Page not found</p>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link to="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
