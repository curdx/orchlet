import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, Loader2, Power, SquareTerminal } from "lucide-react";

import type { TerminalSessionProfile } from "../../contracts/generated/terminal";
import type {
  AppLanguage,
  AppTheme,
  WindowContextSnapshot,
  WindowMode,
} from "../../contracts/generated";
import { normalizeAppError, terminalApi } from "../../shared/api";
import type { TerminalApi } from "../../shared/api/terminal-api";
import {
  measureTerminalSize,
  XtermRendererAdapter,
} from "./terminal-renderer";

type RendererAdapter = Pick<XtermRendererAdapter, "mount" | "write" | "resize" | "dispose">;
type RendererAdapterOptions = {
  onInput: (input: string) => void;
};
type TerminalPageApi = Pick<
  TerminalApi,
  | "attachTerminal"
  | "sendInput"
  | "resizeTerminal"
  | "closeTerminal"
  | "subscribeOutput"
  | "subscribeStatus"
>;

export function TerminalPage({
  snapshot,
  api = terminalApi,
  createRendererAdapter = (options) => new XtermRendererAdapter(options),
  onPreferencesChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot | null;
  api?: TerminalPageApi;
  createRendererAdapter?: (options: RendererAdapterOptions) => RendererAdapter;
  onPreferencesChange?: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode?: (mode: WindowMode) => Promise<void>;
}) {
  const terminalElementRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAdapter | null>(null);
  const sessionRef = useRef<TerminalSessionProfile | null>(null);
  const [session, setSession] = useState<TerminalSessionProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workspace = snapshot?.activeWorkspace ?? null;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const handleTerminalInput = useCallback(
    (input: string) => {
      const currentSession = sessionRef.current;

      if (!currentSession || currentSession.status === "exited") {
        return;
      }

      void api
        .sendInput({
          terminalSessionId: currentSession.terminalSessionId,
          input,
        })
        .then((result) => {
          setSession((latestSession) => {
            if (
              latestSession?.terminalSessionId !== result.session.terminalSessionId ||
              latestSession.status === "exited"
            ) {
              return latestSession;
            }

            sessionRef.current = result.session;
            return result.session;
          });
          setErrorMessage(null);
        })
        .catch((error) => {
          const appError = normalizeAppError(error);
          setErrorMessage(appError.message);
        });
    },
    [api],
  );

  useEffect(() => {
    const element = terminalElementRef.current;

    if (!element) {
      return;
    }

    const renderer = createRendererAdapter({ onInput: handleTerminalInput });
    renderer.mount(element);
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [createRendererAdapter, handleTerminalInput]);

  useEffect(() => {
    let disposed = false;
    let unsubscribeOutput: (() => void) | null = null;
    let unsubscribeStatus: (() => void) | null = null;

    async function attachAndSubscribe() {
      try {
        const result = await api.attachTerminal();

        if (disposed) {
          return;
        }

        sessionRef.current = result.session;
        setSession(result.session);
        setErrorMessage(null);
        unsubscribeOutput = await api.subscribeOutput((event) => {
          if (event.terminalSessionId === result.session.terminalSessionId) {
            rendererRef.current?.write(event.chunk);
          }
        });
        unsubscribeStatus = await api.subscribeStatus((event) => {
          if (event.terminalSessionId !== result.session.terminalSessionId) {
            return;
          }

          setSession((currentSession) => {
            if (!currentSession) {
              return currentSession;
            }

            const nextSession = {
              ...currentSession,
              title: event.title,
              status: event.status,
              cols: event.cols,
              rows: event.rows,
              updatedAtMs: event.emittedAtMs,
            };
            sessionRef.current = nextSession;

            return nextSession;
          });
        });
      } catch (error) {
        if (!disposed) {
          const appError = normalizeAppError(error);
          setErrorMessage(appError.message);
        }
      }
    }

    void attachAndSubscribe();

    return () => {
      disposed = true;
      unsubscribeOutput?.();
      unsubscribeStatus?.();
    };
  }, [api]);

  useEffect(() => {
    const element = terminalElementRef.current;

    if (!element || !session || session.status === "exited") {
      return;
    }

    let disposed = false;
    let lastSize = `${session.cols}x${session.rows}`;

    function syncTerminalSize() {
      if (disposed || !terminalElementRef.current) {
        return;
      }

      const size = measureTerminalSize(terminalElementRef.current);
      const sizeKey = `${size.cols}x${size.rows}`;
      const currentSession = sessionRef.current;

      if (
        !currentSession ||
        currentSession.status === "exited" ||
        sizeKey === lastSize
      ) {
        return;
      }

      lastSize = sizeKey;
      rendererRef.current?.resize(size.cols, size.rows);
      void api
        .resizeTerminal({
          terminalSessionId: currentSession.terminalSessionId,
          cols: size.cols,
          rows: size.rows,
        })
        .then((result) => {
          setSession((latestSession) => {
            if (
              latestSession?.terminalSessionId !== result.session.terminalSessionId ||
              latestSession.status === "exited"
            ) {
              return latestSession;
            }

            sessionRef.current = result.session;
            return result.session;
          });
          setErrorMessage(null);
        })
        .catch((error) => {
          const appError = normalizeAppError(error);
          setErrorMessage(appError.message);
        });
    }

    syncTerminalSize();

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(syncTerminalSize);
      resizeObserver.observe(element);

      return () => {
        disposed = true;
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", syncTerminalSize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", syncTerminalSize);
    };
  }, [api, session?.cols, session?.rows, session?.status, session?.terminalSessionId]);

  async function handleCloseTerminal() {
    const currentSession = sessionRef.current;

    if (!currentSession || currentSession.status === "exited") {
      return;
    }

    try {
      const result = await api.closeTerminal({
        terminalSessionId: currentSession.terminalSessionId,
      });
      sessionRef.current = result.session;
      setSession(result.session);
      setErrorMessage(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorMessage(appError.message);
    }
  }

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
              onClick={() => void handleCloseTerminal()}
              disabled={!session || session.status === "exited"}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#4d3a36] bg-[#211b19] px-2.5 py-1.5 font-medium text-[#f0d6cf] transition hover:border-[#8a5a51] hover:bg-[#2b211e] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d89183]"
            >
              <Power aria-hidden="true" size={14} strokeWidth={2} />
              关闭终端
            </button>
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
          <div className="relative h-[calc(100vh-5.25rem)] min-h-[420px] w-full overflow-hidden rounded-md border border-[#2a372d] bg-[#111712] p-2">
            <div
              ref={terminalElementRef}
              aria-label="终端输出"
              className="h-full w-full overflow-hidden"
            />
            {session?.status === "exited" ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <span className="rounded-md border border-[#334436] bg-[#1a231c] px-3 py-2 text-xs font-medium text-[#b8cbb3] shadow-lg">
                  终端会话已关闭
                </span>
              </div>
            ) : null}
          </div>
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
