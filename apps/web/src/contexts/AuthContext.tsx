/**
 * Authentication Context
 *
 * Manages:
 * - Current user identity
 * - Access tokens (short-lived)
 * - Refresh tokens (for token rotation)
 * - OAuth 2.1 + PKCE flow (Law 10)
 *
 * Implements per-user, traceable identity (not shared service accounts)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface User {
  id: string; // UUID
  email: string;
  name: string;
  avatar?: string;
  roles: string[]; // e.g., ["HR_ADMIN", "PAYROLL_ADMIN"]
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize auth from stored token
  useEffect(() => {
    async function initializeAuth() {
      try {
        // Check if we have a valid token in sessionStorage
        const storedToken = sessionStorage.getItem("keel-access-token");
        if (storedToken) {
          // Verify token is still valid by calling /api/auth/me
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setAccessToken(storedToken);
          } else {
            // Token invalid, clear it
            sessionStorage.removeItem("keel-access-token");
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement OAuth 2.1 + PKCE in Wave 2+
      // For now, simple username/password for development

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const { user: userData, accessToken: token } = await response.json();
      setUser(userData);
      setAccessToken(token);
      sessionStorage.setItem("keel-access-token", token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Invalidate token on server
      if (accessToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } finally {
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem("keel-access-token");
    }
  }, [accessToken]);

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const { accessToken: newToken } = await response.json();
      setAccessToken(newToken);
      sessionStorage.setItem("keel-access-token", newToken);
    } catch (error) {
      // Refresh failed, log out
      await logout();
    }
  }, [accessToken, logout]);

  const getAccessToken = useCallback(() => accessToken, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    throw new Error("Not authenticated"); // Will be caught by error boundary
  }

  return { isAuthenticated };
}
