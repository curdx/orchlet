import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  NotificationIgnoreAllRequest,
  NotificationIgnoreAllResult,
  NotificationNavigationAction,
  NotificationNavigationPendingResult,
  NotificationNavigationRequest,
  NotificationNavigationResult,
  NotificationPreferencesGetResult,
  NotificationPreferencesSnapshot,
  NotificationPreferencesUpdateRequest,
  NotificationPreferencesUpdateResult,
  NotificationUnreadSummary,
  NotificationUnreadSummaryResult,
  NotificationUnreadUpdateRequest,
  NotificationUnreadUpdateResult,
} from "../../contracts/generated/notification";
import { invokeCommand, isTauriRuntime } from "./client";

export const NOTIFICATION_UNREAD_CHANGED_EVENT = "notification-unread-changed";
export const NOTIFICATION_NAVIGATION_REQUESTED_EVENT = "notification-navigation-requested";
export const NOTIFICATION_PREFERENCES_CHANGED_EVENT = "notification-preferences-changed";

export type NotificationApi = {
  getNotificationPreferences: () => Promise<NotificationPreferencesGetResult>;
  updateNotificationPreferences: (
    request: NotificationPreferencesUpdateRequest,
  ) => Promise<NotificationPreferencesUpdateResult>;
  getUnreadSummary: () => Promise<NotificationUnreadSummaryResult>;
  updateUnreadSummary: (
    request: NotificationUnreadUpdateRequest,
  ) => Promise<NotificationUnreadUpdateResult>;
  ignoreAllUnread: (request: NotificationIgnoreAllRequest) => Promise<NotificationIgnoreAllResult>;
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
let browserUnreadSource: NotificationUnreadUpdateRequest = {
  workspaceId: null,
  workspaceName: null,
  conversations: [],
  sourceWindowLabel: null,
};
let browserNotificationPreferences = createDefaultNotificationPreferences();
let browserNavigationAction: NotificationNavigationAction | null = null;
const browserIgnoredConversations = new Map<string, number>();
const browserUnreadHandlers = new Set<(summary: NotificationUnreadSummary) => void>();
const browserNavigationHandlers = new Set<(action: NotificationNavigationAction) => void>();

export const notificationApi: NotificationApi = {
  async getNotificationPreferences() {
    if (!isTauriRuntime()) {
      return { preferences: browserNotificationPreferences };
    }

    return invokeCommand<NotificationPreferencesGetResult>("notification_preferences_get", {
      request: {},
    });
  },

  async updateNotificationPreferences(request) {
    if (!isTauriRuntime()) {
      browserNotificationPreferences = {
        ...browserNotificationPreferences,
        desktopNotificationsEnabled:
          request.desktopNotificationsEnabled ??
          browserNotificationPreferences.desktopNotificationsEnabled,
        soundEnabled: request.soundEnabled ?? browserNotificationPreferences.soundEnabled,
        mentionsOnly: request.mentionsOnly ?? browserNotificationPreferences.mentionsOnly,
        messagePreviewEnabled:
          request.messagePreviewEnabled ?? browserNotificationPreferences.messagePreviewEnabled,
        dndEnabled: request.dndEnabled ?? browserNotificationPreferences.dndEnabled,
        dndStartMinutes:
          request.dndStartMinutes ?? browserNotificationPreferences.dndStartMinutes,
        dndEndMinutes: request.dndEndMinutes ?? browserNotificationPreferences.dndEndMinutes,
        updatedAtMs: Date.now(),
      };
      browserUnreadSummary = buildBrowserUnreadSummary(browserUnreadSource);
      browserUnreadHandlers.forEach((handler) => handler(browserUnreadSummary));

      return { preferences: browserNotificationPreferences };
    }

    return invokeCommand<NotificationPreferencesUpdateResult>("notification_preferences_update", {
      request,
    });
  },

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
      browserUnreadSource = request;
      browserUnreadSummary = buildBrowserUnreadSummary(request);
      browserUnreadHandlers.forEach((handler) => handler(browserUnreadSummary));

      return { summary: browserUnreadSummary };
    }

    return invokeCommand<NotificationUnreadUpdateResult>("notification_unread_summary_update", {
      request,
    });
  },

  async ignoreAllUnread(request) {
    if (!isTauriRuntime()) {
      const workspaceId = request.workspaceId ?? browserUnreadSummary.workspaceId;
      const ignoresCurrentSummary = workspaceId === browserUnreadSummary.workspaceId;
      const ignoredCount = ignoresCurrentSummary ? browserUnreadSummary.conversations.length : 0;

      if (ignoresCurrentSummary) {
        browserUnreadSummary.conversations.forEach((conversation) => {
          browserIgnoredConversations.set(
            ignoredConversationKey(workspaceId, conversation.conversationId),
            conversation.updatedAtMs,
          );
        });
      }

      browserUnreadSource = { ...browserUnreadSource, sourceWindowLabel: request.sourceWindowLabel };
      browserUnreadSummary = buildBrowserUnreadSummary(browserUnreadSource);
      browserUnreadHandlers.forEach((handler) => handler(browserUnreadSummary));

      return {
        summary: browserUnreadSummary,
        ignoredCount,
      };
    }

    return invokeCommand<NotificationIgnoreAllResult>("notification_ignore_all_unread", {
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

function createDefaultNotificationPreferences(): NotificationPreferencesSnapshot {
  const timestamp = Date.now();

  return {
    schemaVersion: 1,
    desktopNotificationsEnabled: true,
    soundEnabled: true,
    mentionsOnly: false,
    messagePreviewEnabled: true,
    dndEnabled: false,
    dndStartMinutes: 22 * 60,
    dndEndMinutes: 8 * 60,
    permission: {
      state: "unavailable",
      message: "系统通知权限适配器当前不可用。",
      userAction: "当前版本仍会保存本地通知偏好；启用系统通知需要后续平台适配。",
    },
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
}

function buildBrowserUnreadSummary(request: NotificationUnreadUpdateRequest): NotificationUnreadSummary {
  const conversations = filterBrowserIgnoredConversations(
    request.workspaceId,
    request.conversations,
  )
    .filter((conversation) => {
      return (
        !browserNotificationPreferences.mentionsOnly ||
        (conversation.lastMessagePreview ?? "").includes("@")
      );
    })
    .map((conversation) => ({
      ...conversation,
      lastMessagePreview: browserNotificationPreferences.messagePreviewEnabled
        ? conversation.lastMessagePreview
        : null,
    }));
  const totalUnreadCount = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );
  const dndActive = isBrowserDndActive();

  return {
    schemaVersion: 1,
    workspaceId: request.workspaceId,
    workspaceName: request.workspaceName,
    totalUnreadCount,
    conversations,
    tray: {
      unreadCount: totalUnreadCount,
      badgeLabel: totalUnreadCount > 0 ? unreadBadgeLabel(totalUnreadCount) : null,
      hasUnread:
        totalUnreadCount > 0 &&
        browserNotificationPreferences.desktopNotificationsEnabled &&
        !dndActive,
    },
    updatedAtMs: Date.now(),
    sourceWindowLabel: request.sourceWindowLabel,
  };
}

function unreadBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function isBrowserDndActive() {
  if (!browserNotificationPreferences.dndEnabled) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = browserNotificationPreferences.dndStartMinutes;
  const end = browserNotificationPreferences.dndEndMinutes;

  if (start === end) {
    return false;
  }

  return start < end
    ? currentMinutes >= start && currentMinutes < end
    : currentMinutes >= start || currentMinutes < end;
}

function filterBrowserIgnoredConversations(
  workspaceId: string | null,
  conversations: NotificationUnreadSummary["conversations"],
) {
  return conversations.filter((conversation) => {
    const key = ignoredConversationKey(workspaceId, conversation.conversationId);
    const ignoredAtMs = browserIgnoredConversations.get(key);

    if (ignoredAtMs === undefined) {
      return true;
    }

    if (conversation.updatedAtMs <= ignoredAtMs) {
      return false;
    }

    browserIgnoredConversations.delete(key);
    return true;
  });
}

function ignoredConversationKey(workspaceId: string | null, conversationId: string) {
  return `${workspaceId ?? ""}:${conversationId}`;
}
