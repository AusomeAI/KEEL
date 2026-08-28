/**
 * Notification Context
 *
 * Manages toast notifications and messages
 * Used to communicate success/error/warning to users
 */

import React, { createContext, useContext, useState, useCallback } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // Auto-dismiss after ms (0 = manual)
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">): string => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration ?? 5000, // Default 5 seconds
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-dismiss if duration is set
      if (newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

// Convenience hooks for specific notification types
export function useNotificationSuccess() {
  const { addNotification } = useNotification();
  return useCallback(
    (title: string, message?: string) => {
      return addNotification({
        type: "success",
        title,
        message,
        duration: 5000,
      });
    },
    [addNotification]
  );
}

export function useNotificationError() {
  const { addNotification } = useNotification();
  return useCallback(
    (title: string, message?: string) => {
      return addNotification({
        type: "error",
        title,
        message,
        duration: 8000, // Longer for errors
      });
    },
    [addNotification]
  );
}

export function useNotificationWarning() {
  const { addNotification } = useNotification();
  return useCallback(
    (title: string, message?: string) => {
      return addNotification({
        type: "warning",
        title,
        message,
        duration: 6000,
      });
    },
    [addNotification]
  );
}
