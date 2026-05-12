import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  NotificationNavigationAction,
  NotificationNavigationPendingResult,
  NotificationNavigationRequest,
  NotificationNavigationResult,
  NotificationUnreadSummary,
  NotificationUnreadSummaryResult,
  NotificationUnreadUpdateRequest,
  NotificationUnreadUpdateResult,
} from "../../contracts/generated/notification";
import { invokeCommand, isTauriRuntime } from "./client";

export const NOTIFICATION_UNREAD_CHANGED_EVENT = "notification-unread-changed";
export const NOTIFICATION_NAVIGATION_REQUESTED_EVENT = "notification-navigation-requested";

export type NotificationApi = {
  getUnreadSummary: () => Promise<NotificationUnreadSummaryResult>;
  updateUnreadSummary: (
    request: NotificationUnreadUpdateRequest,
  ) => Promise<NotificationUnreadUpdateResult>;
  getPendingNavigation: () => Promise<NotificationNavigationPendingResult>;
  dispatchNavigation: (
    request: NotificationNavigationRequest,
  ) => Promise<NotificationNavigationResult>;
  subscribeUnreadSummary: (
    handler: (summary: NotificationUnreadSummary) => void,
  ) => Promise<UnlistenFn>;
  subscribeNavigation: (
    handler: (action: NotificationNavigationAction) => void,
  ) => Promise<UnlistenFn>;
};

let browserUnreadSummary = createEmptyUnreadSummary();
let browserNavigationAction: NotificationNavigationAction | null = null;
const browserUnreadHandlers = new Set<(summary: NotificationUnreadSummary) => void>();
const browserNavigationHandlers = new Set<(action: NotificationNavigationAction) => void>();

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

  async getPendingNavigation() {
    if (!isTauriRuntime()) {
      return { action: browserNavigationAction };
    }

    return invokeCommand<NotificationNavigationPendingResult>(
      "notification_navigation_pending_get",
      {
        request: {},
      },
    );
  },

  async dispatchNavigation(request) {
    if (!isTauriRuntime()) {
      browserNavigationAction = {
        schemaVersion: 1,
        kind: request.kind,
        workspaceId: request.workspaceId,
        conversationId: request.conversationId,
        memberId: request.memberId,
        updatedAtMs: Date.now(),
        sourceWindowLabel: request.sourceWindowLabel,
      };
      browserNavigationHandlers.forEach((handler) => handler(browserNavigationAction!));

      return { action: browserNavigationAction };
    }

    return invokeCommand<NotificationNavigationResult>("notification_navigation_dispatch", {
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

  async subscribeNavigation(handler) {
    if (!isTauriRuntime()) {
      browserNavigationHandlers.add(handler);
      return () => {
        browserNavigationHandlers.delete(handler);
      };
    }

    return listen<NotificationNavigationAction>(NOTIFICATION_NAVIGATION_REQUESTED_EVENT, (event) => {
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
