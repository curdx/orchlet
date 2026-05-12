import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TerminalPage } from "./pages/terminal";
import { WorkspaceSelectionPage } from "./pages/workspace-selection";
import { notificationApi, terminalApi, windowContextApi } from "./shared/api";
import type { NotificationApi } from "./shared/api/notification-api";
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
  onPreferencesChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot | null;
  api?: Pick<NotificationApi, "getUnreadSummary" | "subscribeUnreadSummary">;
  onPreferencesChange: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode: (mode: WindowMode) => Promise<void>;
}) {
  const [summary, setSummary] = useState<NotificationUnreadSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workspace = snapshot?.activeWorkspace;
  const workspaceLabel =
    summary?.workspaceName ?? workspace?.metadata.name ?? "未选择工作区";
  const conversations = summary?.conversations ?? [];
  const totalUnreadCount = summary?.totalUnreadCount ?? 0;

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
          setErrorMessage(error instanceof Error ? error.message : "无法加载未读状态。");
        }
      }
    }

    void loadUnreadSummary();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [api]);

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-[#17211b]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-5">
        <header className="flex h-12 items-center justify-between border-b border-[#dbe4d7]">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-normal">orchlet</h1>
            <span className="text-xs font-medium text-[#637064]">
              通知预览
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onOpenWindowMode("workspaceSelection")}
            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
          >
            打开工作区窗口
          </button>
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <section
            aria-labelledby="notification-preview-title"
            className="w-full rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#6a786c]">通知</p>
                <h2 id="notification-preview-title" className="mt-1 text-sm font-semibold text-[#263229]">
                  未读状态
                </h2>
                <p className="mt-2 text-sm text-[#61705f]">
                  {workspace ? `${workspaceLabel} · ${workspace.rootPath}` : workspaceLabel}
                </p>
              </div>
              <div className="grid min-w-28 gap-1 rounded-md border border-[#cfe0c9] bg-white px-3 py-2 text-right">
                <span className="text-xs font-medium text-[#6a786c]">总未读</span>
                <span aria-label="通知未读总数" className="text-2xl font-semibold text-[#2f5038]">
                  {unreadBadgeLabel(totalUnreadCount)}
                </span>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-[#6a786c]">托盘状态</dt>
                <dd className="mt-1 text-[#253129]">
                  {summary?.tray.hasUnread
                    ? `托盘 ${summary.tray.badgeLabel ?? summary.tray.unreadCount}`
                    : "无未读"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6a786c]">Theme</dt>
                <dd className="mt-1 text-[#253129]">
                  {snapshot?.preferences.theme ?? "system"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#6a786c]">Language</dt>
                <dd className="mt-1 text-[#253129]">
                  {snapshot?.preferences.language ?? "zh-CN"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-2">
              <p className="text-xs font-semibold text-[#263229]">未读会话</p>
              {errorMessage ? (
                <p className="rounded-md border border-[#e2b8a7] bg-[#fff7f3] p-3 text-sm text-[#8b3e25]">
                  {errorMessage}
                </p>
              ) : conversations.length > 0 ? (
                <ul className="grid gap-2" aria-label="未读会话列表">
                  {conversations.map((conversation) => (
                    <li
                      key={conversation.conversationId}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border border-[#e3eadf] bg-white p-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#263229]">
                          {conversation.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#6a786c]">
                          {conversation.lastMessagePreview ?? "暂无预览"}
                        </span>
                      </span>
                      <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-full bg-[#2f6f55] px-2 text-xs font-semibold text-white">
                        {unreadBadgeLabel(conversation.unreadCount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
                  暂无未读会话
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onPreferencesChange({ theme: "dark" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                深色
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ theme: "light" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                浅色
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ language: "en-US" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange({ language: "zh-CN" })}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                中文
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
