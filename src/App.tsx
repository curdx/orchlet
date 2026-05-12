import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TerminalPage } from "./pages/terminal";
import { WorkspaceSelectionPage } from "./pages/workspace-selection";
import { notificationApi, terminalApi, windowContextApi } from "./shared/api";
import type { NotificationApi } from "./shared/api/notification-api";
import type { TerminalApi } from "./shared/api/terminal-api";
import type {
  AppLanguage,
  AppTheme,
  NotificationUnreadSummary,
  WindowContextSnapshot,
  WindowMode,
} from "./contracts/generated";
import "./app/styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
});
const NOTIFICATION_PREVIEW_TEXT = {
  "zh-CN": {
    fallbackWorkspace: "未选择工作区",
    title: "通知预览",
    openWorkspaceWindow: "打开工作区窗口",
    sectionEyebrow: "通知",
    unreadStatus: "未读状态",
    totalUnread: "总未读",
    totalUnreadLabel: "通知未读总数",
    trayStatus: "托盘状态",
    trayPrefix: "托盘",
    noUnread: "无未读",
    theme: "Theme",
    language: "Language",
    unreadConversations: "未读会话",
    unreadConversationList: "未读会话列表",
    openConversationPrefix: "打开会话",
    noPreview: "暂无预览",
    openTerminal: "打开终端",
    noUnreadConversations: "暂无未读会话",
    openAllUnread: "查看全部未读",
    ignoreAll: "忽略全部",
    dark: "深色",
    light: "浅色",
    english: "English",
    chinese: "中文",
    loadError: "无法加载未读状态。",
    actionError: "通知操作失败。",
  },
  "en-US": {
    fallbackWorkspace: "No workspace selected",
    title: "Notification preview",
    openWorkspaceWindow: "Open workspace window",
    sectionEyebrow: "Notifications",
    unreadStatus: "Unread status",
    totalUnread: "Total unread",
    totalUnreadLabel: "Notification unread total",
    trayStatus: "Tray status",
    trayPrefix: "Tray",
    noUnread: "No unread",
    theme: "Theme",
    language: "Language",
    unreadConversations: "Unread conversations",
    unreadConversationList: "Unread conversation list",
    openConversationPrefix: "Open conversation",
    noPreview: "No preview",
    openTerminal: "Open terminal",
    noUnreadConversations: "No unread conversations",
    openAllUnread: "View all unread",
    ignoreAll: "Ignore all",
    dark: "Dark",
    light: "Light",
    english: "English",
    chinese: "Chinese",
    loadError: "Unable to load unread status.",
    actionError: "Notification action failed.",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;

function App() {
  const [windowContext, setWindowContext] = useState<WindowContextSnapshot | null>(null);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    async function registerWindow() {
      const snapshot = await windowContextApi.registerCurrentWindow();

      if (!disposed) {
        setWindowContext(snapshot);
      }

      unsubscribe = await windowContextApi.subscribe((nextSnapshot) => {
        if (!disposed) {
          setWindowContext(nextSnapshot);
        }
      });

      if (disposed) {
        unsubscribe();
      }
    }

    void registerWindow();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!windowContext) {
      return;
    }

    document.documentElement.dataset.theme = windowContext.preferences.theme;
    document.documentElement.lang = windowContext.preferences.language;
  }, [windowContext]);

  async function handlePreferencesChange(update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) {
    const snapshot = await windowContextApi.updatePreferences(update);
    setWindowContext(snapshot);
  }

  async function handleOpenWindowMode(mode: WindowMode) {
    if (mode === "terminal") {
      await terminalApi.openTerminal();
      return;
    }

    await windowContextApi.openWindowMode(mode);
  }

  const mode = windowContext?.currentWindow.mode ?? "workspaceSelection";

  return (
    <QueryClientProvider client={queryClient}>
      {mode === "terminal" ? (
        <TerminalPage
          snapshot={windowContext}
          onPreferencesChange={handlePreferencesChange}
          onOpenWindowMode={handleOpenWindowMode}
        />
      ) : mode === "notificationPreview" ? (
        <NotificationPreviewPage
          snapshot={windowContext}
          onPreferencesChange={handlePreferencesChange}
          onOpenWindowMode={handleOpenWindowMode}
        />
      ) : (
        <WorkspaceSelectionPage
          windowContext={windowContext}
          onPreferencesChange={handlePreferencesChange}
          onOpenWindowMode={handleOpenWindowMode}
        />
      )}
    </QueryClientProvider>
  );
}

export function NotificationPreviewPage({
  snapshot,
  api = notificationApi,
  terminalApi: terminalsApi = terminalApi,
  onPreferencesChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot | null;
  api?: Pick<
    NotificationApi,
    "getUnreadSummary" | "subscribeUnreadSummary" | "dispatchNavigation" | "ignoreAllUnread"
  >;
  terminalApi?: Pick<TerminalApi, "openTerminal">;
  onPreferencesChange: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode: (mode: WindowMode) => Promise<void>;
}) {
  const [summary, setSummary] = useState<NotificationUnreadSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const workspace = snapshot?.activeWorkspace;
  const language = snapshot?.preferences.language ?? "zh-CN";
  const text = NOTIFICATION_PREVIEW_TEXT[language];
  const workspaceLabel =
    summary?.workspaceName ?? workspace?.metadata.name ?? text.fallbackWorkspace;
  const conversations = summary?.conversations ?? [];
  const totalUnreadCount = summary?.totalUnreadCount ?? 0;
  const navigationWorkspaceId = summary?.workspaceId ?? workspace?.metadata.projectId ?? null;
  const sourceWindowLabel = snapshot?.currentWindow.label ?? "notification-preview";

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    async function loadUnreadSummary() {
      try {
        const result = await api.getUnreadSummary();
        if (!disposed) {
          setSummary(result.summary);
          setErrorMessage(null);
        }

        unsubscribe = await api.subscribeUnreadSummary((nextSummary) => {
          if (!disposed) {
            setSummary(nextSummary);
            setErrorMessage(null);
          }
        });

        if (disposed) {
          unsubscribe();
        }
      } catch (error) {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : text.loadError);
        }
      }
    }

    void loadUnreadSummary();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [api, text.loadError]);

  async function runPreviewAction(action: () => Promise<void>) {
    setIsActionPending(true);

    try {
      await action();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.actionError);
    } finally {
      setIsActionPending(false);
    }
  }

  async function handleOpenAllUnread() {
    await runPreviewAction(async () => {
      await onOpenWindowMode("main");
      await api.dispatchNavigation({
        kind: "allUnread",
        workspaceId: navigationWorkspaceId,
        conversationId: null,
        memberId: null,
        sourceWindowLabel,
      });
    });
  }

  async function handleOpenConversation(conversationId: string) {
    await runPreviewAction(async () => {
      await onOpenWindowMode("main");
      await api.dispatchNavigation({
        kind: "conversation",
        workspaceId: navigationWorkspaceId,
        conversationId,
        memberId: null,
        sourceWindowLabel,
      });
    });
  }

  async function handleOpenMemberTerminal(memberId: string) {
    await runPreviewAction(async () => {
      await terminalsApi.openTerminal({ memberId });
    });
  }

  async function handleIgnoreAllUnread() {
    await runPreviewAction(async () => {
      const result = await api.ignoreAllUnread({
        workspaceId: navigationWorkspaceId,
        sourceWindowLabel,
      });
      setSummary(result.summary);
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-[#17211b]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-5">
        <header className="flex h-12 items-center justify-between border-b border-[#dbe4d7]">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-normal">orchlet</h1>
            <span className="text-xs font-medium text-[#637064]">
              {text.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onOpenWindowMode("workspaceSelection")}
            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
          >
            {text.openWorkspaceWindow}
          </button>
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <section
            aria-labelledby="notification-preview-title"
            className="w-full rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#6a786c]">
                  {text.sectionEyebrow}
                </p>
                <h2 id="notification-preview-title" className="mt-1 text-sm font-semibold text-[#263229]">
                  {text.unreadStatus}
                </h2>
                <p className="mt-2 text-sm text-[#61705f]">
                  {workspace ? `${workspaceLabel} · ${workspace.rootPath}` : workspaceLabel}
                </p>
              </div>
              <div className="grid min-w-28 gap-1 rounded-md border border-[#cfe0c9] bg-white px-3 py-2 text-right">
                <span className="text-xs font-medium text-[#6a786c]">{text.totalUnread}</span>
                <span aria-label={text.totalUnreadLabel} className="text-2xl font-semibold text-[#2f5038]">
                  {unreadBadgeLabel(totalUnreadCount)}
                </span>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-[#6a786c]">{text.trayStatus}</dt>
                <dd className="mt-1 text-[#253129]">
                  {summary?.tray.hasUnread
                    ? `${text.trayPrefix} ${summary.tray.badgeLabel ?? summary.tray.unreadCount}`
                    : text.noUnread}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6a786c]">{text.theme}</dt>
                <dd className="mt-1 text-[#253129]">
                  {snapshot?.preferences.theme ?? "system"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6a786c]">{text.language}</dt>
                <dd className="mt-1 text-[#253129]">
                  {snapshot?.preferences.language ?? "zh-CN"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-2">
              <p className="text-xs font-semibold text-[#263229]">
                {text.unreadConversations}
              </p>
              {errorMessage ? (
                <p className="rounded-md border border-[#e2b8a7] bg-[#fff7f3] p-3 text-sm text-[#8b3e25]">
                  {errorMessage}
                </p>
              ) : null}
              {conversations.length > 0 ? (
                <ul className="grid gap-2" aria-label={text.unreadConversationList}>
                  {conversations.map((conversation) => (
                    <li
                      key={conversation.conversationId}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-[#e3eadf] bg-white p-2"
                    >
                      <button
                        type="button"
                        onClick={() => void handleOpenConversation(conversation.conversationId)}
                        disabled={isActionPending}
                        aria-label={`${text.openConversationPrefix} ${conversation.title}`}
                        className="min-w-0 rounded-sm p-1 text-left hover:bg-[#f5faf2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:text-[#8c9789]"
                      >
                        <span className="block truncate text-sm font-semibold text-[#263229]">
                          {conversation.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#6a786c]">
                          {conversation.lastMessagePreview ?? text.noPreview}
                        </span>
                      </button>
                      <span className="grid justify-items-end gap-1">
                        <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-full bg-[#2f6f55] px-2 text-xs font-semibold text-white">
                          {unreadBadgeLabel(conversation.unreadCount)}
                        </span>
                        {conversation.terminalMemberId ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleOpenMemberTerminal(conversation.terminalMemberId!)
                            }
                            disabled={isActionPending}
                            className="rounded border border-[#cfe0c9] px-2 py-0.5 text-[11px] font-semibold text-[#37533e] hover:bg-[#eef6ea] disabled:text-[#a4aea1]"
                          >
                            {text.openTerminal}
                          </button>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
                  {text.noUnreadConversations}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleOpenAllUnread()}
                disabled={isActionPending || totalUnreadCount === 0}
                className="rounded-md border border-[#b9d0b2] bg-[#eef6ea] px-3 py-1.5 text-xs font-semibold text-[#2f5038] transition hover:bg-[#e4f0df] disabled:border-[#d8e2d4] disabled:bg-white disabled:text-[#a4aea1]"
              >
                {text.openAllUnread}
              </button>
              <button
                type="button"
                onClick={() => void handleIgnoreAllUnread()}
                disabled={isActionPending || totalUnreadCount === 0}
                className="rounded-md border border-[#d8c7b8] bg-white px-3 py-1.5 text-xs font-semibold text-[#7a4f33] transition hover:bg-[#fbf4ee] disabled:border-[#d8e2d4] disabled:text-[#a4aea1]"
              >
                {text.ignoreAll}
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ theme: "dark" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                {text.dark}
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ theme: "light" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                {text.light}
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ language: "en-US" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                {text.english}
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ language: "zh-CN" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                {text.chinese}
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function unreadBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

export default App;
