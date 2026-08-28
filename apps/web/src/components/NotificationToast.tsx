/**
 * Notification Toast Component
 *
 * Displays a single toast notification
 */

import React from "react";
import { Card, Button } from "@keel/design-system";
import type { Notification } from "../contexts/NotificationContext";
import { useNotification } from "../contexts/NotificationContext";

interface NotificationToastProps {
  notification: Notification;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  const { removeNotification } = useNotification();

  const bgColor = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  }[notification.type];

  const titleColor = {
    success: "text-green-900",
    error: "text-red-900",
    warning: "text-yellow-900",
    info: "text-blue-900",
  }[notification.type];

  const icon = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  }[notification.type];

  return (
    <Card variant="default" className={`${bgColor} p-4 max-w-md`}>
      <div className="flex items-start gap-3">
        <div className={`text-xl font-bold ${titleColor}`}>{icon}</div>
        <div className="flex-1">
          <h3 className={`font-semibold ${titleColor}`}>{notification.title}</h3>
          {notification.message && (
            <p className={`text-sm mt-1 ${titleColor} opacity-75`}>{notification.message}</p>
          )}
        </div>
        <button
          onClick={() => removeNotification(notification.id)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>

      {notification.action && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <button
            onClick={notification.action.onClick}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            {notification.action.label}
          </button>
        </div>
      )}
    </Card>
  );
}
