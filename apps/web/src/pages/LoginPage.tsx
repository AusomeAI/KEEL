/**
 * Login Page
 *
 * Simple authentication UI
 * In production, this would use OAuth 2.1 + PKCE (Law 10)
 */

import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import { useNotificationError } from "../contexts/NotificationContext";
import { Card, Button, Input, Form } from "@keel/design-system";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const showError = useNotificationError();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      navigate({ to: "/" });
    } catch (error: any) {
      showError("Login failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-2">KEEL</h1>
        <p className="text-muted-foreground mb-6">HR Operating System</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Form>
            <Form.Field>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </Form.Field>

            <Form.Field>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Form.Field>

            <Form.Submit as={Button} loading={isLoading} fullWidth>
              Sign in
            </Form.Submit>
          </Form>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Demo credentials: user@example.com / password
        </p>
      </Card>
    </div>
  );
}
