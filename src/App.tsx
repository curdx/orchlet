import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TerminalPage } from "./pages/terminal";
import { WorkspaceSelectionPage } from "./pages/workspace-selection";
import { terminalApi, windowContextApi } from "./shared/api";
import type {
  AppLanguage,
  AppTheme,
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
        <ModePlaceholder
          snapshot={windowContext}
          mode={mode}
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

function ModePlaceholder({
  snapshot,
  mode,
  onPreferencesChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot | null;
  mode: WindowMode;
  onPreferencesChange: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode: (mode: WindowMode) => Promise<void>;
}) {
  const workspace = snapshot?.activeWorkspace;

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-[#17211b]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-5">
        <header className="flex h-12 items-center justify-between border-b border-[#dbe4d7]">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-normal">orchlet</h1>
            <span className="text-xs font-medium text-[#637064]">
              {modeLabel(mode)}
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
          <div className="w-full rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-6">
            <p className="text-sm font-semibold text-[#263229]">{modeLabel(mode)}</p>
            <p className="mt-3 text-sm text-[#61705f]">
              {workspace
                ? `${workspace.metadata.name} · ${workspace.rootPath}`
                : "未选择工作区"}
            </p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
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
          </div>
        </section>
      </div>
    </main>
  );
}

function modeLabel(mode: WindowMode) {
  switch (mode) {
    case "terminal":
      return "终端窗口";
    case "notificationPreview":
      return "通知预览";
    case "main":
      return "主窗口";
    case "workspaceSelection":
    default:
      return "工作区窗口";
  }
}

export default App;
