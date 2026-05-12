import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  NotificationUnreadSummary,
  NotificationUnreadSummaryResult,
  NotificationUnreadUpdateRequest,
  NotificationUnreadUpdateResult,
} from "../../contracts/generated/notification";
import { invokeCommand, isTauriRuntime } from "./client";

export const NOTIFICATION_UNREAD_CHANGED_EVENT = "notification-unread-changed";

export type NotificationApi = {
  getUnreadSummary: () => Promise<NotificationUnreadSummaryResult>;
  updateUnreadSummary: (
    request: NotificationUnreadUpdateRequest,
  ) => Promise<NotificationUnreadUpdateResult>;
  subscribeUnreadSummary: (
    handler: (summary: NotificationUnreadSummary) => void,
  ) => Promise<UnlistenFn>;
};

let browserUnreadSummary = createEmptyUnreadSummary();
const browserUnreadHandlers = new Set<(summary: NotificationUnreadSummary) => void>();

export const notificationApi: NotificationApi = {
  async getUnreadSummary() {
    if (!isTauriRuntime()) {
      return { summary: browserUnreadSummary };
    }

    return invokeCommand<NotificationUnreadSummaryResult>("notification_unread_summary_get", {
      request: {},
    });
  },

  async updateUnreadSummary(request) {
    if (!isTauriRuntime()) {
      const totalUnreadCount = request.conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      );
      browserUnreadSummary = {
        schemaVersion: 1,
        workspaceId: request.workspaceId,
        workspaceName: request.workspaceName,
        totalUnreadCount,
        conversations: request.conversations,
        tray: {
          unreadCount: totalUnreadCount,
          badgeLabel: totalUnreadCount > 0 ? unreadBadgeLabel(totalUnreadCount) : null,
          hasUnread: totalUnreadCount > 0,
        },
        updatedAtMs: Date.now(),
        sourceWindowLabel: request.sourceWindowLabel,
      };
      browserUnreadHandlers.forEach((handler) => handler(browserUnreadSummary));

      return { summary: browserUnreadSummary };
    }

    return invokeCommand<NotificationUnreadUpdateResult>("notification_unread_summary_update", {
      request,
    });
  },

  async subscribeUnreadSummary(handler) {
    if (!isTauriRuntime()) {
      browserUnreadHandlers.add(handler);
      return () => {
        browserUnreadHandlers.delete(handler);
      };
    }

    return listen<NotificationUnreadSummary>(NOTIFICATION_UNREAD_CHANGED_EVENT, (event) => {
      handler(event.payload);
    });
  },
};

function createEmptyUnreadSummary(): NotificationUnreadSummary {
  return {
    schemaVersion: 1,
    workspaceId: null,
    workspaceName: null,
    totalUnreadCount: 0,
    conversations: [],
    tray: {
      unreadCount: 0,
      badgeLabel: null,
      hasUnread: false,
    },
    updatedAtMs: Date.now(),
    sourceWindowLabel: null,
  };
}

function unreadBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}
