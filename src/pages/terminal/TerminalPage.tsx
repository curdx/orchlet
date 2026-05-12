import { useEffect, useRef, useState } from "react";
import { FolderOpen, Loader2, SquareTerminal } from "lucide-react";

import type { TerminalSessionProfile } from "../../contracts/generated/terminal";
import type {
  AppLanguage,
  AppTheme,
  WindowContextSnapshot,
  WindowMode,
} from "../../contracts/generated";
import { normalizeAppError, terminalApi } from "../../shared/api";
import type { TerminalApi } from "../../shared/api/terminal-api";
import { XtermRendererAdapter } from "./terminal-renderer";

type RendererAdapter = Pick<XtermRendererAdapter, "mount" | "write" | "dispose">;

export function TerminalPage({
  snapshot,
  api = terminalApi,
  createRendererAdapter = () => new XtermRendererAdapter(),
  onPreferencesChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot | null;
  api?: Pick<TerminalApi, "openTerminal" | "subscribeOutput">;
  createRendererAdapter?: () => RendererAdapter;
  onPreferencesChange?: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode?: (mode: WindowMode) => Promise<void>;
}) {
  const terminalElementRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAdapter | null>(null);
  const [session, setSession] = useState<TerminalSessionProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workspace = snapshot?.activeWorkspace ?? null;

  useEffect(() => {
    const element = terminalElementRef.current;

    if (!element) {
      return;
    }

    const renderer = createRendererAdapter();
    renderer.mount(element);
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [createRendererAdapter]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    async function openAndSubscribe() {
      try {
        const result = await api.openTerminal({ attachCurrent: true });

        if (disposed) {
          return;
        }

        setSession(result.session);
        setErrorMessage(null);
        unsubscribe = await api.subscribeOutput((event) => {
          if (event.terminalSessionId === result.session.terminalSessionId) {
            rendererRef.current?.write(event.chunk);
          }
        });
      } catch (error) {
        if (!disposed) {
          const appError = normalizeAppError(error);
          setErrorMessage(appError.message);
        }
      }
    }

    void openAndSubscribe();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [api]);

  return (
    <main className="min-h-screen bg-[#101511] text-[#dbe8d8]">
      <div className="flex min-h-screen flex-col">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-[#263428] bg-[#151c17] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#203125] text-[#9fd08e]">
              <SquareTerminal aria-hidden="true" size={19} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-normal text-[#f1f7ef]">
                {session?.title ?? workspace?.metadata.name ?? "终端"}
              </h1>
              <p className="mt-1 truncate text-xs text-[#9bad98]" title={workspace?.rootPath}>
                {workspace ? `${workspace.metadata.name} · ${workspace.rootPath}` : "未选择工作区"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-[#334436] bg-[#1a231c] px-2.5 py-1 font-medium text-[#b8cbb3]">
              {sessionStatusLabel(session)}
            </span>
            <button
              type="button"
              onClick={() => void onOpenWindowMode?.("workspaceSelection")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 py-1.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
            >
              <FolderOpen aria-hidden="true" size={14} strokeWidth={2} />
              工作区
            </button>
            <button
              type="button"
              onClick={() => void onPreferencesChange?.({ theme: "dark" })}
              className="rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 py-1.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
            >
              深色
            </button>
          </div>
        </header>

        {errorMessage ? (
          <section
            role="alert"
            className="border-b border-[#5a332f] bg-[#2a1715] px-4 py-3 text-sm text-[#ffd7d3]"
          >
            {errorMessage}
          </section>
        ) : null}

        <section className="min-h-0 flex-1 bg-[#111712] p-3">
          <div
            ref={terminalElementRef}
            aria-label="终端输出"
            className="h-[calc(100vh-5.25rem)] min-h-[420px] w-full overflow-hidden rounded-md border border-[#2a372d] bg-[#111712] p-2"
          />
          {!session && !errorMessage ? (
            <div className="pointer-events-none fixed inset-x-0 top-16 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-md border border-[#334436] bg-[#1a231c] px-3 py-2 text-xs text-[#b8cbb3] shadow-lg">
                <Loader2 aria-hidden="true" size={14} className="animate-spin" />
                正在连接终端
              </span>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function sessionStatusLabel(session: TerminalSessionProfile | null) {
  if (!session) {
    return "连接中";
  }

  switch (session.status) {
    case "running":
      return "运行中";
    case "starting":
      return "启动中";
    case "exited":
      return "已退出";
    default:
      return session.status;
  }
}
