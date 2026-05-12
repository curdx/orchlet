import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Loader2,
  Pin,
  Plus,
  RotateCcw,
  Search,
  SquareTerminal,
  X,
} from "lucide-react";

import type {
  TerminalSessionProfile,
  TerminalTabProfile,
  TerminalTabUpdateRequest,
} from "../../contracts/generated/terminal";
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
  | "listTabs"
  | "createTab"
  | "closeTab"
  | "restoreTab"
  | "updateTab"
  | "attachTerminal"
  | "sendInput"
  | "resizeTerminal"
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
  const attachRequestIdRef = useRef(0);
  const [tabs, setTabs] = useState<TerminalTabProfile[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [session, setSession] = useState<TerminalSessionProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workspace = snapshot?.activeWorkspace ?? null;

  const orderedTabs = useMemo(() => orderTabs(tabs), [tabs]);
  const openTabs = useMemo(
    () => orderedTabs.filter((tab) => tab.status === "open"),
    [orderedTabs],
  );
  const closedTabs = useMemo(
    () =>
      orderedTabs
        .filter((tab) => tab.status === "closed")
        .sort(
          (left, right) =>
            (right.closedAtMs ?? right.updatedAtMs) - (left.closedAtMs ?? left.updatedAtMs),
        ),
    [orderedTabs],
  );
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.tabId === activeTabId) ?? null,
    [activeTabId, tabs],
  );
  const activeOpenTabIndex = openTabs.findIndex((tab) => tab.tabId === activeTabId);
  const recentClosedTab = closedTabs[0] ?? null;
  const searchResults = useMemo(
    () => searchTerminalTabs(orderedTabs, searchQuery),
    [orderedTabs, searchQuery],
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const attachTab = useCallback(
    async (tab: TerminalTabProfile) => {
      if (tab.status !== "open") {
        return;
      }

      const requestId = attachRequestIdRef.current + 1;
      attachRequestIdRef.current = requestId;
      setActiveTabId(tab.tabId);
      setIsLoading(true);

      try {
        const result = await api.attachTerminal({
          terminalSessionId: tab.terminalSessionId,
        });

        if (attachRequestIdRef.current !== requestId) {
          return;
        }

        sessionRef.current = result.session;
        setSession(result.session);
        setErrorMessage(null);
      } catch (error) {
        if (attachRequestIdRef.current === requestId) {
          const appError = normalizeAppError(error);
          setErrorMessage(appError.message);
        }
      } finally {
        if (attachRequestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [api],
  );

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

    async function loadTabs() {
      setIsLoading(true);

      try {
        const result = await api.listTabs();

        if (disposed) {
          return;
        }

        setTabs(result.tabs);
        const nextTab =
          result.tabs.find(
            (tab) => tab.tabId === result.activeTabId && tab.status === "open",
          ) ??
          orderTabs(result.tabs).find((tab) => tab.status === "open") ??
          null;

        if (nextTab) {
          await attachTab(nextTab);
        } else {
          sessionRef.current = null;
          setSession(null);
          setActiveTabId(null);
          setIsLoading(false);
        }

        if (!disposed) {
          setErrorMessage(null);
        }
      } catch (error) {
        if (!disposed) {
          const appError = normalizeAppError(error);
          setErrorMessage(appError.message);
          setIsLoading(false);
        }
      }
    }

    void loadTabs();

    return () => {
      disposed = true;
      attachRequestIdRef.current += 1;
    };
  }, [api, attachTab]);

  useEffect(() => {
    let unsubscribeOutput: (() => void) | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let disposed = false;

    async function subscribe() {
      try {
        unsubscribeOutput = await api.subscribeOutput((event) => {
          const currentSession = sessionRef.current;

          if (event.terminalSessionId === currentSession?.terminalSessionId) {
            rendererRef.current?.write(event.chunk);
          }
        });
        unsubscribeStatus = await api.subscribeStatus((event) => {
          const currentSession = sessionRef.current;

          if (event.terminalSessionId !== currentSession?.terminalSessionId) {
            return;
          }

          setSession((latestSession) => {
            if (!latestSession || latestSession.terminalSessionId !== event.terminalSessionId) {
              return latestSession;
            }

            const nextSession = {
              ...latestSession,
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

    void subscribe();

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

  async function handleCreateTab() {
    try {
      setIsLoading(true);
      const result = await api.createTab();
      attachRequestIdRef.current += 1;
      sessionRef.current = result.session;
      setTabs(result.tabs);
      setActiveTabId(result.tab.tabId);
      setSession(result.session);
      setErrorMessage(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorMessage(appError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCloseActiveTab() {
    if (!activeTab || activeTab.status === "closed") {
      return;
    }

    try {
      const result = await api.closeTab({ tabId: activeTab.tabId });
      const nextOpenTab = orderTabs(result.tabs).find(
        (tab) => tab.status === "open" && tab.tabId !== activeTab.tabId,
      );

      setTabs(result.tabs);
      sessionRef.current = result.session;
      setSession(result.session);
      setErrorMessage(null);

      if (nextOpenTab) {
        await attachTab(nextOpenTab);
      } else {
        setActiveTabId(result.tab.tabId);
      }
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorMessage(appError.message);
    }
  }

  async function handleRestoreTab(tab: TerminalTabProfile | null) {
    if (!tab) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await api.restoreTab({ tabId: tab.tabId });
      attachRequestIdRef.current += 1;
      sessionRef.current = result.session;
      setTabs(result.tabs);
      setActiveTabId(result.tab.tabId);
      setSession(result.session);
      setSearchQuery("");
      setErrorMessage(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorMessage(appError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePinActiveTab() {
    if (!activeTab) {
      return;
    }

    try {
      const result = await api.updateTab(tabUpdate(activeTab.tabId, {
        isPinned: !activeTab.isPinned,
      }));
      setTabs(result.tabs);
      setErrorMessage(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorMessage(appError.message);
    }
  }

  async function handleMoveActiveTab(direction: -1 | 1) {
    const currentTab = activeTab;

    if (!currentTab || activeOpenTabIndex < 0) {
      return;
    }

    const sibling = openTabs[activeOpenTabIndex + direction];

    if (!sibling) {
      return;
    }

    try {
      const first = await api.updateTab(tabUpdate(currentTab.tabId, {
        sortIndex: sibling.sortIndex,
      }));
      const second = await api.updateTab(tabUpdate(sibling.tabId, {
        sortIndex: currentTab.sortIndex,
      }));
      setTabs(second.tabs.length ? second.tabs : first.tabs);
      setErrorMessage(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorMessage(appError.message);
    }
  }

  async function handleSearchResultSelect(tab: TerminalTabProfile) {
    if (tab.status === "closed") {
      await handleRestoreTab(tab);
      return;
    }

    setSearchQuery("");
    await attachTab(tab);
  }

  const title = activeTab?.label ?? session?.title ?? workspace?.metadata.name ?? "终端";
  const terminalClosed = session?.status === "exited" || activeTab?.status === "closed";

  return (
    <main className="min-h-screen bg-[#101511] text-[#dbe8d8]">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-[#263428] bg-[#151c17]">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#203125] text-[#9fd08e]">
                <SquareTerminal aria-hidden="true" size={19} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold tracking-normal text-[#f1f7ef]">
                  {title}
                </h1>
                <p className="mt-1 truncate text-xs text-[#9bad98]" title={workspace?.rootPath}>
                  {workspace ? `${workspace.metadata.name} · ${workspace.rootPath}` : "未选择工作区"}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs">
              <span className="rounded-md border border-[#334436] bg-[#1a231c] px-2.5 py-1 font-medium text-[#b8cbb3]">
                {sessionStatusLabel(session)}
              </span>
              <div className="relative min-w-[12rem]">
                <Search
                  aria-hidden="true"
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#82927f]"
                />
                <input
                  aria-label="搜索终端标签"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-8 w-full rounded-md border border-[#3d503f] bg-[#101511] pl-8 pr-2 text-xs text-[#e5eee2] outline-none transition placeholder:text-[#82927f] focus:border-[#7daa75] focus:ring-2 focus:ring-[#7daa75]/25"
                  placeholder="搜索标签、shell、会话"
                />
                {searchQuery.trim() ? (
                  <div className="absolute right-0 top-9 z-20 max-h-64 w-[20rem] max-w-[calc(100vw-2rem)] overflow-auto rounded-md border border-[#334436] bg-[#151c17] p-1 shadow-xl">
                    {searchResults.length ? (
                      searchResults.map((tab) => (
                        <button
                          key={tab.tabId}
                          type="button"
                          onClick={() => void handleSearchResultSelect(tab)}
                          className="flex w-full min-w-0 items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-xs text-[#dbe8d8] transition hover:bg-[#213024] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#9fd08e]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{tab.label}</span>
                            <span className="block truncate text-[#8fa08b]">
                              {tab.shell} · {tab.memberId ?? tab.terminalSessionId}
                            </span>
                          </span>
                          <span className="shrink-0 text-[#9bad98]">
                            {tab.status === "closed" ? "已关闭" : "打开"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-xs text-[#9bad98]">没有匹配的标签</div>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleCreateTab()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                <Plus aria-hidden="true" size={14} strokeWidth={2} />
                新标签
              </button>
              <button
                type="button"
                onClick={() => void onOpenWindowMode?.("workspaceSelection")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                <FolderOpen aria-hidden="true" size={14} strokeWidth={2} />
                工作区
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange?.({ theme: "dark" })}
                className="h-8 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                深色
              </button>
            </div>
          </div>
          <div className="flex min-h-12 items-center gap-2 border-t border-[#223024] px-4 py-2">
            <button
              type="button"
              onClick={() => void handleRestoreTab(recentClosedTab)}
              disabled={!recentClosedTab}
              className="inline-flex h-8 max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 text-xs font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              title={recentClosedTab?.label ?? "没有最近关闭的标签"}
            >
              <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
              <span className="truncate">
                {recentClosedTab ? `恢复 ${recentClosedTab.label}` : "最近关闭"}
              </span>
            </button>
            <div
              aria-label="终端标签"
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            >
              {openTabs.length ? (
                openTabs.map((tab) => (
                  <button
                    key={tab.tabId}
                    type="button"
                    onClick={() => void attachTab(tab)}
                    className={`group flex h-8 min-w-[8rem] max-w-[13rem] items-center gap-1.5 rounded-md border px-2 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                      tab.tabId === activeTabId
                        ? "border-[#7daa75] bg-[#243527] text-[#f1f7ef]"
                        : "border-[#2d3b30] bg-[#151c17] text-[#b8cbb3] hover:border-[#4e674f] hover:bg-[#1b251d]"
                    }`}
                    title={`${tab.label} · ${tab.shell}`}
                  >
                    {tab.isPinned ? (
                      <Pin aria-hidden="true" size={12} className="shrink-0 text-[#b9da74]" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-left">{tab.label}</span>
                    {tab.tabId === activeTabId ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9fd08e]" />
                    ) : null}
                  </button>
                ))
              ) : (
                <span className="px-2 text-xs text-[#9bad98]">没有打开的终端标签</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="置顶当前终端标签"
                onClick={() => void handlePinActiveTab()}
                disabled={!activeTab}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                title={activeTab?.isPinned ? "取消置顶" : "置顶"}
              >
                <Pin aria-hidden="true" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="向左移动当前终端标签"
                onClick={() => void handleMoveActiveTab(-1)}
                disabled={activeOpenTabIndex <= 0}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                <ArrowLeft aria-hidden="true" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="向右移动当前终端标签"
                onClick={() => void handleMoveActiveTab(1)}
                disabled={activeOpenTabIndex < 0 || activeOpenTabIndex >= openTabs.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                <ArrowRight aria-hidden="true" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="关闭当前终端标签"
                onClick={() => void handleCloseActiveTab()}
                disabled={!activeTab || activeTab.status === "closed"}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#4d3a36] bg-[#211b19] text-[#f0d6cf] transition hover:border-[#8a5a51] hover:bg-[#2b211e] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d89183]"
                title="关闭标签"
              >
                <X aria-hidden="true" size={14} strokeWidth={2} />
              </button>
            </div>
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
          <div className="relative h-[calc(100vh-8.5rem)] min-h-[420px] w-full overflow-hidden rounded-md border border-[#2a372d] bg-[#111712] p-2">
            <div
              ref={terminalElementRef}
              aria-label="终端输出"
              className="h-full w-full overflow-hidden"
            />
            {terminalClosed ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <span className="rounded-md border border-[#334436] bg-[#1a231c] px-3 py-2 text-xs font-medium text-[#b8cbb3] shadow-lg">
                  终端会话已关闭
                </span>
              </div>
            ) : null}
          </div>
          {isLoading && !errorMessage ? (
            <div className="pointer-events-none fixed inset-x-0 top-28 flex justify-center">
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

function tabUpdate(
  tabId: string,
  update: Partial<Omit<TerminalTabUpdateRequest, "tabId">>,
): TerminalTabUpdateRequest {
  return {
    tabId,
    label: update.label ?? null,
    isPinned: update.isPinned ?? null,
    sortIndex: update.sortIndex ?? null,
  };
}

function orderTabs(tabs: TerminalTabProfile[]) {
  return [...tabs].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.createdAtMs - right.createdAtMs || left.tabId.localeCompare(right.tabId);
  });
}

function searchTerminalTabs(tabs: TerminalTabProfile[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return tabs.filter((tab) =>
    [
      tab.label,
      tab.shell,
      tab.memberId ?? "",
      tab.terminalSessionId,
      tab.status,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery),
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
