import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CircleSlash,
  Columns2,
  Copy,
  Eraser,
  FolderOpen,
  Grid2X2,
  Keyboard,
  Loader2,
  Pin,
  Plus,
  Regex,
  RefreshCw,
  RotateCcw,
  Rows2,
  Search,
  ScanText,
  Square,
  SquareArrowRight,
  SquareTerminal,
  TextSearch,
  WholeWord,
  X,
} from "lucide-react";

import type {
  TerminalEnvironmentProfile,
  TerminalSessionProfile,
  TerminalTabProfile,
  TerminalTabUpdateRequest,
} from "../../contracts/generated/terminal";
import type { AppError } from "../../contracts/generated/common";
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
  type TerminalFindDirection,
  type TerminalFindOptions,
  type TerminalFindResult,
  XtermRendererAdapter,
} from "./terminal-renderer";

type RendererAdapter = Pick<
  XtermRendererAdapter,
  | "mount"
  | "write"
  | "resize"
  | "dispose"
  | "focus"
  | "selectAll"
  | "copySelection"
  | "clear"
  | "clearSelection"
  | "find"
>;
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
  | "listEnvironments"
>;

type PaneLayout = "single" | "splitVertical" | "splitHorizontal" | "grid2x2";
type PaneId = "pane-1" | "pane-2" | "pane-3" | "pane-4";
type PaneAssignments = Record<PaneId, string | null>;

const PANE_IDS: PaneId[] = ["pane-1", "pane-2", "pane-3", "pane-4"];
const VISIBLE_PANES_BY_LAYOUT: Record<PaneLayout, PaneId[]> = {
  single: ["pane-1"],
  splitVertical: ["pane-1", "pane-2"],
  splitHorizontal: ["pane-1", "pane-2"],
  grid2x2: PANE_IDS,
};

const PANE_LAYOUTS: Array<{
  id: PaneLayout;
  label: string;
  title: string;
  icon: typeof Square;
}> = [
  { id: "single", label: "单窗格布局", title: "单窗格", icon: Square },
  { id: "splitVertical", label: "左右分屏布局", title: "左右分屏", icon: Columns2 },
  { id: "splitHorizontal", label: "上下分屏布局", title: "上下分屏", icon: Rows2 },
  { id: "grid2x2", label: "四宫格布局", title: "四宫格", icon: Grid2X2 },
];
const TERMINAL_TEXT = {
  "zh-CN": {
    closed: "已关闭",
    open: "打开",
    noMatchingTabs: "没有匹配的标签",
    newTab: "新标签",
    workspace: "工作区",
    dark: "深色",
    noRecentClosedTab: "没有最近关闭的标签",
    restorePrefix: "恢复",
    recentClosed: "最近关闭",
    terminalTabs: "终端标签",
    noWorkspace: "未选择工作区",
    searchTabs: "搜索终端标签",
    searchPlaceholder: "搜索标签、shell、会话",
  },
  "en-US": {
    closed: "Closed",
    open: "Open",
    noMatchingTabs: "No matching tabs",
    newTab: "New tab",
    workspace: "Workspace",
    dark: "Dark",
    noRecentClosedTab: "No recently closed tab",
    restorePrefix: "Restore",
    recentClosed: "Recent closed",
    terminalTabs: "Terminal tabs",
    noWorkspace: "No workspace selected",
    searchTabs: "Search terminal tabs",
    searchPlaceholder: "Search labels, shell, session",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;

function defaultCreateRendererAdapter(options: RendererAdapterOptions) {
  return new XtermRendererAdapter(options);
}

export function TerminalPage({
  snapshot,
  api = terminalApi,
  createRendererAdapter = defaultCreateRendererAdapter,
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
  const paneElementsRef = useRef<Record<PaneId, HTMLDivElement | null>>(
    createEmptyPaneElementMap(),
  );
  const rendererRefs = useRef<Map<PaneId, RendererAdapter>>(new Map());
  const attachRequestIdsRef = useRef<Map<PaneId, number>>(new Map());
  const lastResizeKeyByPaneRef = useRef<Map<PaneId, string>>(new Map());
  const tabsRef = useRef<TerminalTabProfile[]>([]);
  const paneAssignmentsRef = useRef<PaneAssignments>(createEmptyPaneAssignments());
  const sessionsRef = useRef<Map<string, TerminalSessionProfile>>(new Map());
  const visiblePaneIdsRef = useRef<PaneId[]>(VISIBLE_PANES_BY_LAYOUT.single);
  const focusedPaneIdRef = useRef<PaneId>("pane-1");
  const findInputRef = useRef<HTMLInputElement>(null);

  const [tabs, setTabs] = useState<TerminalTabProfile[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sessionsById, setSessionsById] = useState<Record<string, TerminalSessionProfile>>({});
  const [paneLayout, setPaneLayout] = useState<PaneLayout>("single");
  const [paneAssignments, setPaneAssignments] = useState<PaneAssignments>(
    createEmptyPaneAssignments,
  );
  const [focusedPaneId, setFocusedPaneId] = useState<PaneId>("pane-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findOptions, setFindOptions] = useState<TerminalFindOptions>(
    createDefaultFindOptions,
  );
  const [findResult, setFindResult] = useState<TerminalFindResult>(
    createEmptyFindResult,
  );
  const [environmentDiagnostics, setEnvironmentDiagnostics] = useState<
    TerminalEnvironmentProfile[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<AppError | null>(null);
  const workspace = snapshot?.activeWorkspace ?? null;
  const language = snapshot?.preferences.language ?? "zh-CN";
  const text = TERMINAL_TEXT[language];

  const visiblePaneIds = useMemo(
    () => VISIBLE_PANES_BY_LAYOUT[paneLayout],
    [paneLayout],
  );
  const visiblePaneKey = visiblePaneIds.join(",");
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
  const activeSession = activeTab
    ? sessionsById[activeTab.terminalSessionId] ?? null
    : null;
  const activeOpenTabIndex = openTabs.findIndex((tab) => tab.tabId === activeTabId);
  const recentClosedTab = closedTabs[0] ?? null;
  const searchResults = useMemo(
    () => searchTerminalTabs(orderedTabs, searchQuery),
    [orderedTabs, searchQuery],
  );

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    paneAssignmentsRef.current = paneAssignments;
  }, [paneAssignments]);

  useEffect(() => {
    visiblePaneIdsRef.current = visiblePaneIds;
  }, [visiblePaneIds]);

  useEffect(() => {
    if (!visiblePaneIds.includes(focusedPaneId)) {
      focusedPaneIdRef.current = visiblePaneIds[0];
      setFocusedPaneId(visiblePaneIds[0]);
    }
  }, [focusedPaneId, visiblePaneIds, visiblePaneKey]);

  useEffect(() => {
    return () => {
      rendererRefs.current.forEach((renderer) => renderer.dispose());
      rendererRefs.current.clear();
    };
  }, []);

  const storeTabs = useCallback((nextTabs: TerminalTabProfile[]) => {
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
  }, []);

  const storeSession = useCallback((nextSession: TerminalSessionProfile) => {
    sessionsRef.current.set(nextSession.terminalSessionId, nextSession);
    setSessionsById((currentSessions) => ({
      ...currentSessions,
      [nextSession.terminalSessionId]: nextSession,
    }));
  }, []);

  const storeSessionIfNotExited = useCallback((nextSession: TerminalSessionProfile) => {
    const sessionId = nextSession.terminalSessionId;

    setSessionsById((currentSessions) => {
      const latestSession = sessionsRef.current.get(sessionId) ?? currentSessions[sessionId];

      if (!latestSession || latestSession.status === "exited") {
        return currentSessions;
      }

      sessionsRef.current.set(sessionId, nextSession);

      return {
        ...currentSessions,
        [sessionId]: nextSession,
      };
    });
  }, []);

  const restoreRendererSnapshot = useCallback(
    (paneId: PaneId, session: TerminalSessionProfile) => {
      const snapshotText = session.snapshot.text;

      if (!snapshotText) {
        return;
      }

      const renderer = rendererRefs.current.get(paneId);
      renderer?.clear();
      renderer?.write(snapshotText);
    },
    [],
  );

  const loadEnvironmentDiagnostics = useCallback(async () => {
    try {
      const result = await api.listEnvironments();
      setEnvironmentDiagnostics(result.environments);
      setErrorNotice(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorNotice(appError);
    }
  }, [api]);

  useEffect(() => {
    void loadEnvironmentDiagnostics();
  }, [loadEnvironmentDiagnostics]);

  const updatePaneAssignments = useCallback(
    (updater: (currentAssignments: PaneAssignments) => PaneAssignments) => {
      setPaneAssignments((currentAssignments) => {
        const nextAssignments = updater(currentAssignments);
        paneAssignmentsRef.current = nextAssignments;
        return nextAssignments;
      });
    },
    [],
  );

  const assignTabToPane = useCallback(
    (paneId: PaneId, tabId: string | null) => {
      updatePaneAssignments((currentAssignments) => {
        const nextAssignments = { ...currentAssignments };

        if (tabId) {
          for (const candidatePaneId of PANE_IDS) {
            if (nextAssignments[candidatePaneId] === tabId) {
              nextAssignments[candidatePaneId] = null;
            }
          }
        }

        nextAssignments[paneId] = tabId;

        return nextAssignments;
      });
    },
    [updatePaneAssignments],
  );

  const resolveTargetPane = useCallback(
    (paneId?: PaneId) => {
      if (paneId && visiblePaneIdsRef.current.includes(paneId)) {
        return paneId;
      }

      if (visiblePaneIdsRef.current.includes(focusedPaneIdRef.current)) {
        return focusedPaneIdRef.current;
      }

      return visiblePaneIdsRef.current[0] ?? "pane-1";
    },
    [],
  );

  const bumpPaneAttachRequest = useCallback((paneId: PaneId) => {
    const nextRequestId = (attachRequestIdsRef.current.get(paneId) ?? 0) + 1;
    attachRequestIdsRef.current.set(paneId, nextRequestId);

    return nextRequestId;
  }, []);

  const focusPane = useCallback((paneId: PaneId) => {
    focusedPaneIdRef.current = paneId;
    setFocusedPaneId(paneId);

    const tab = getAssignedTab(
      paneId,
      paneAssignmentsRef.current,
      tabsRef.current,
    );

    if (tab) {
      setActiveTabId(tab.tabId);
    }
  }, []);

  const getFocusedTextRenderer = useCallback(() => {
    const targetPaneId = resolveTargetPane(focusedPaneIdRef.current);
    const tab = getAssignedTab(
      targetPaneId,
      paneAssignmentsRef.current,
      tabsRef.current,
    );

    if (!tab) {
      return null;
    }

    return rendererRefs.current.get(targetPaneId) ?? null;
  }, [resolveTargetPane]);

  const runFind = useCallback(
    (direction: TerminalFindDirection = "current") => {
      const renderer = getFocusedTextRenderer();

      if (!renderer) {
        setFindResult(createEmptyFindResult());
        return;
      }

      setFindResult(renderer.find(findQuery, findOptions, direction));
    },
    [findOptions, findQuery, getFocusedTextRenderer],
  );

  const closeFind = useCallback(() => {
    getFocusedTextRenderer()?.clearSelection();
    setIsFindOpen(false);
    setFindResult(createEmptyFindResult());
  }, [getFocusedTextRenderer]);

  const handleFocusTerminal = useCallback(() => {
    getFocusedTextRenderer()?.focus();
  }, [getFocusedTextRenderer]);

  const handleSelectAllTerminal = useCallback(() => {
    getFocusedTextRenderer()?.selectAll();
  }, [getFocusedTextRenderer]);

  const handleCopySelection = useCallback(() => {
    const selectedText = getFocusedTextRenderer()?.copySelection() ?? "";

    if (!selectedText || typeof navigator === "undefined") {
      return;
    }

    void navigator.clipboard?.writeText(selectedText).catch((error) => {
      const appError = normalizeAppError(error);
      setErrorNotice(appError);
    });
  }, [getFocusedTextRenderer]);

  const handleClearTerminal = useCallback(() => {
    getFocusedTextRenderer()?.clear();
    setFindResult(createEmptyFindResult());
  }, [getFocusedTextRenderer]);

  const handleOpenFind = useCallback(() => {
    setIsFindOpen(true);
    window.setTimeout(() => findInputRef.current?.focus(), 0);
  }, []);

  const handleFindKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFind();
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      runFind(event.shiftKey ? "previous" : "next");
    },
    [closeFind, runFind],
  );

  const handleTerminalInput = useCallback(
    (paneId: PaneId, input: string) => {
      const tab = getAssignedTab(
        paneId,
        paneAssignmentsRef.current,
        tabsRef.current,
      );

      if (!tab || tab.status !== "open") {
        return;
      }

      const currentSession = sessionsRef.current.get(tab.terminalSessionId);

      if (!currentSession || currentSession.status === "exited") {
        return;
      }

      void api
        .sendInput({
          terminalSessionId: currentSession.terminalSessionId,
          input,
        })
        .then((result) => {
          storeSessionIfNotExited(result.session);
          setErrorNotice(null);
        })
        .catch((error) => {
          const appError = normalizeAppError(error);
          setErrorNotice(appError);
        });
    },
    [api, storeSessionIfNotExited],
  );

  const paneRefCallbacks = useMemo(() => {
    const callbacks = {} as Record<PaneId, (element: HTMLDivElement | null) => void>;

    for (const paneId of PANE_IDS) {
      callbacks[paneId] = (element: HTMLDivElement | null) => {
        paneElementsRef.current[paneId] = element;

        if (!element) {
          const existingRenderer = rendererRefs.current.get(paneId);
          existingRenderer?.dispose();
          rendererRefs.current.delete(paneId);
          lastResizeKeyByPaneRef.current.delete(paneId);
          return;
        }

        if (rendererRefs.current.has(paneId)) {
          return;
        }

        const renderer = createRendererAdapter({
          onInput: (input) => handleTerminalInput(paneId, input),
        });
        renderer.mount(element);
        rendererRefs.current.set(paneId, renderer);
      };
    }

    return callbacks;
  }, [createRendererAdapter, handleTerminalInput]);

  const attachTab = useCallback(
    async (tab: TerminalTabProfile, paneId?: PaneId) => {
      if (tab.status !== "open") {
        return;
      }

      const targetPaneId = resolveTargetPane(paneId);
      const requestId = bumpPaneAttachRequest(targetPaneId);
      assignTabToPane(targetPaneId, tab.tabId);
      focusedPaneIdRef.current = targetPaneId;
      setFocusedPaneId(targetPaneId);
      setActiveTabId(tab.tabId);
      setIsLoading(true);

      try {
        const result = await api.attachTerminal({
          terminalSessionId: tab.terminalSessionId,
        });

        if (attachRequestIdsRef.current.get(targetPaneId) !== requestId) {
          return;
        }

        storeSession(result.session);
        restoreRendererSnapshot(targetPaneId, result.session);
        setErrorNotice(null);
      } catch (error) {
        if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
          const appError = normalizeAppError(error);
          setErrorNotice(appError);
        }
      } finally {
        if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
          setIsLoading(false);
        }
      }
    },
    [
      api,
      assignTabToPane,
      bumpPaneAttachRequest,
      resolveTargetPane,
      restoreRendererSnapshot,
      storeSession,
    ],
  );

  useEffect(() => {
    let disposed = false;

    async function loadTabs() {
      setIsLoading(true);

      try {
        const result = await api.listTabs();

        if (disposed) {
          return;
        }

        storeTabs(result.tabs);
        const nextTab =
          result.tabs.find(
            (tab) => tab.tabId === result.activeTabId && tab.status === "open",
          ) ??
          orderTabs(result.tabs).find((tab) => tab.status === "open") ??
          null;

        if (nextTab) {
          await attachTab(nextTab, "pane-1");
        } else {
          assignTabToPane("pane-1", null);
          setActiveTabId(null);
          setIsLoading(false);
        }

        if (!disposed) {
          setErrorNotice(null);
        }
      } catch (error) {
        if (!disposed) {
          const appError = normalizeAppError(error);
          setErrorNotice(appError);
          setIsLoading(false);
        }
      }
    }

    void loadTabs();

    return () => {
      disposed = true;
      for (const paneId of PANE_IDS) {
        bumpPaneAttachRequest(paneId);
      }
    };
  }, [api, assignTabToPane, attachTab, bumpPaneAttachRequest, storeTabs]);

  useEffect(() => {
    let unsubscribeOutput: (() => void) | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let disposed = false;

    async function subscribe() {
      try {
        unsubscribeOutput = await api.subscribeOutput((event) => {
          for (const paneId of visiblePaneIdsRef.current) {
            const tab = getAssignedTab(
              paneId,
              paneAssignmentsRef.current,
              tabsRef.current,
            );

            if (tab?.status !== "open" || tab.terminalSessionId !== event.terminalSessionId) {
              continue;
            }

            rendererRefs.current.get(paneId)?.write(event.chunk);
          }
        });
        unsubscribeStatus = await api.subscribeStatus((event) => {
          setSessionsById((currentSessions) => {
            const latestSession =
              sessionsRef.current.get(event.terminalSessionId) ??
              currentSessions[event.terminalSessionId];

            if (!latestSession) {
              return currentSessions;
            }

            const nextSession = {
              ...latestSession,
              title: event.title,
              status: event.status,
              cols: event.cols,
              rows: event.rows,
              snapshot: event.snapshot,
              exitReason: event.exitReason,
              updatedAtMs: event.emittedAtMs,
            };
            sessionsRef.current.set(nextSession.terminalSessionId, nextSession);

            return {
              ...currentSessions,
              [nextSession.terminalSessionId]: nextSession,
            };
          });
        });
      } catch (error) {
        if (!disposed) {
          const appError = normalizeAppError(error);
          setErrorNotice(appError);
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
    let disposed = false;

    function syncPaneSize(paneId: PaneId) {
      if (disposed) {
        return;
      }

      const element = paneElementsRef.current[paneId];
      const tab = getAssignedTab(
        paneId,
        paneAssignmentsRef.current,
        tabsRef.current,
      );

      if (!element || !tab || tab.status !== "open") {
        return;
      }

      const currentSession = sessionsRef.current.get(tab.terminalSessionId);

      if (!currentSession || currentSession.status === "exited") {
        return;
      }

      const size = measureTerminalSize(element);
      const resizeKey = `${currentSession.terminalSessionId}:${size.cols}x${size.rows}`;

      if (lastResizeKeyByPaneRef.current.get(paneId) === resizeKey) {
        return;
      }

      lastResizeKeyByPaneRef.current.set(paneId, resizeKey);
      rendererRefs.current.get(paneId)?.resize(size.cols, size.rows);

      void api
        .resizeTerminal({
          terminalSessionId: currentSession.terminalSessionId,
          cols: size.cols,
          rows: size.rows,
        })
        .then((result) => {
          storeSessionIfNotExited(result.session);
          setErrorNotice(null);
        })
        .catch((error) => {
          const appError = normalizeAppError(error);
          setErrorNotice(appError);
        });
    }

    for (const paneId of visiblePaneIds) {
      syncPaneSize(paneId);
    }

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver((entries) => {
        const changedElements = new Set(entries.map((entry) => entry.target));

        for (const paneId of visiblePaneIdsRef.current) {
          const element = paneElementsRef.current[paneId];

          if (element && changedElements.has(element)) {
            syncPaneSize(paneId);
          }
        }
      });

      for (const paneId of visiblePaneIds) {
        const element = paneElementsRef.current[paneId];

        if (element) {
          resizeObserver.observe(element);
        }
      }

      return () => {
        disposed = true;
        resizeObserver.disconnect();
      };
    }

    function syncAllPanes() {
      for (const paneId of visiblePaneIdsRef.current) {
        syncPaneSize(paneId);
      }
    }

    window.addEventListener("resize", syncAllPanes);

    return () => {
      disposed = true;
      window.removeEventListener("resize", syncAllPanes);
    };
  }, [
    api,
    paneAssignments,
    sessionsById,
    storeSessionIfNotExited,
    visiblePaneIds,
    visiblePaneKey,
  ]);

  useEffect(() => {
    if (!isFindOpen) {
      return;
    }

    runFind("current");
  }, [focusedPaneId, isFindOpen, paneAssignments, runFind, tabs]);

  async function handleCreateTab(paneId?: PaneId) {
    const targetPaneId = resolveTargetPane(paneId);
    const requestId = bumpPaneAttachRequest(targetPaneId);

    try {
      setIsLoading(true);
      const result = await api.createTab();

      if (attachRequestIdsRef.current.get(targetPaneId) !== requestId) {
        return;
      }

      storeTabs(result.tabs);
      storeSession(result.session);
      restoreRendererSnapshot(targetPaneId, result.session);
      assignTabToPane(targetPaneId, result.tab.tabId);
      focusedPaneIdRef.current = targetPaneId;
      setFocusedPaneId(targetPaneId);
      setActiveTabId(result.tab.tabId);
      setErrorNotice(null);
    } catch (error) {
      if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
        const appError = normalizeAppError(error);
        setErrorNotice(appError);
      }
    } finally {
      if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
        setIsLoading(false);
      }
    }
  }

  async function handleCloseActiveTab() {
    if (!activeTab || activeTab.status === "closed") {
      return;
    }

    const targetPaneId =
      findAssignedPaneForTab(activeTab.tabId, paneAssignmentsRef.current) ??
      resolveTargetPane();
    bumpPaneAttachRequest(targetPaneId);

    try {
      const result = await api.closeTab({ tabId: activeTab.tabId });
      const nextOpenTab = orderTabs(result.tabs).find(
        (tab) => tab.status === "open" && tab.tabId !== activeTab.tabId,
      );

      storeTabs(result.tabs);
      storeSession(result.session);
      setErrorNotice(null);

      if (nextOpenTab) {
        const assignedPaneId = findAssignedPaneForTab(
          nextOpenTab.tabId,
          paneAssignmentsRef.current,
        );
        const nextPaneId =
          assignedPaneId && visiblePaneIdsRef.current.includes(assignedPaneId)
            ? assignedPaneId
            : targetPaneId;

        await attachTab(nextOpenTab, nextPaneId);
      } else {
        assignTabToPane(targetPaneId, result.tab.tabId);
        setActiveTabId(result.tab.tabId);
      }
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorNotice(appError);
    }
  }

  async function handleRestoreTab(tab: TerminalTabProfile | null, paneId?: PaneId) {
    if (!tab) {
      return;
    }

    const targetPaneId = resolveTargetPane(paneId);
    const requestId = bumpPaneAttachRequest(targetPaneId);

    try {
      setIsLoading(true);
      const result = await api.restoreTab({ tabId: tab.tabId });

      if (attachRequestIdsRef.current.get(targetPaneId) !== requestId) {
        return;
      }

      storeTabs(result.tabs);
      storeSession(result.session);
      restoreRendererSnapshot(targetPaneId, result.session);
      assignTabToPane(targetPaneId, result.tab.tabId);
      focusedPaneIdRef.current = targetPaneId;
      setFocusedPaneId(targetPaneId);
      setActiveTabId(result.tab.tabId);
      setSearchQuery("");
      setErrorNotice(null);
    } catch (error) {
      if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
        const appError = normalizeAppError(error);
        setErrorNotice(appError);
      }
    } finally {
      if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
        setIsLoading(false);
      }
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
      storeTabs(result.tabs);
      setErrorNotice(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorNotice(appError);
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
      storeTabs(second.tabs.length ? second.tabs : first.tabs);
      setErrorNotice(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorNotice(appError);
    }
  }

  async function handleSearchResultSelect(tab: TerminalTabProfile) {
    const assignedPaneId = findAssignedPaneForTab(tab.tabId, paneAssignmentsRef.current);
    const targetPaneId =
      assignedPaneId && visiblePaneIdsRef.current.includes(assignedPaneId)
        ? assignedPaneId
        : resolveTargetPane();

    if (tab.status === "closed") {
      await handleRestoreTab(tab, targetPaneId);
      return;
    }

    setSearchQuery("");
    await attachTab(tab, targetPaneId);
  }

  function handlePaneKeyDown(event: React.KeyboardEvent<HTMLElement>, paneId: PaneId) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    focusPane(paneId);
  }

  function toggleFindOption(option: keyof TerminalFindOptions) {
    setFindOptions((currentOptions) => ({
      ...currentOptions,
      [option]: !currentOptions[option],
    }));
  }

  const title = activeTab?.label ?? activeSession?.title ?? workspace?.metadata.name ?? "终端";
  const canAssignActiveTab = activeTab?.status === "open";
  const visibleFocusedPaneId = visiblePaneIds.includes(focusedPaneId)
    ? focusedPaneId
    : visiblePaneIds[0];
  const focusedPaneTab = getAssignedTab(visibleFocusedPaneId, paneAssignments, tabs);
  const canUseTextControls = Boolean(focusedPaneTab);
  const findStatus = findStatusLabel(findResult, findQuery);

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
                  {workspace ? `${workspace.metadata.name} · ${workspace.rootPath}` : text.noWorkspace}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs">
              <span className="rounded-md border border-[#334436] bg-[#1a231c] px-2.5 py-1 font-medium text-[#b8cbb3]">
                {sessionStatusLabel(activeSession)}
              </span>
              <div className="relative min-w-[12rem]">
                <Search
                  aria-hidden="true"
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#82927f]"
                />
                <input
                  aria-label={text.searchTabs}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-8 w-full rounded-md border border-[#3d503f] bg-[#101511] pl-8 pr-2 text-xs text-[#e5eee2] outline-none transition placeholder:text-[#82927f] focus:border-[#7daa75] focus:ring-2 focus:ring-[#7daa75]/25"
                  placeholder={text.searchPlaceholder}
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
                            {tab.status === "closed" ? text.closed : text.open}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-xs text-[#9bad98]">
                        {text.noMatchingTabs}
                      </div>
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
                {text.newTab}
              </button>
              <button
                type="button"
                onClick={() => void onOpenWindowMode?.("workspaceSelection")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                <FolderOpen aria-hidden="true" size={14} strokeWidth={2} />
                {text.workspace}
              </button>
              <button
                type="button"
                onClick={() => void onPreferencesChange?.({ theme: "dark" })}
                className="h-8 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              >
                {text.dark}
              </button>
            </div>
          </div>
          <div className="flex min-h-12 items-center gap-2 border-t border-[#223024] px-4 py-2">
            <button
              type="button"
              onClick={() => void handleRestoreTab(recentClosedTab)}
              disabled={!recentClosedTab}
              className="inline-flex h-8 max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 text-xs font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
              title={recentClosedTab?.label ?? text.noRecentClosedTab}
            >
              <RotateCcw aria-hidden="true" size={14} strokeWidth={2} />
              <span className="truncate">
                {recentClosedTab
                  ? `${text.restorePrefix} ${recentClosedTab.label}`
                  : text.recentClosed}
              </span>
            </button>
            <div
              aria-label={text.terminalTabs}
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
              <div
                aria-label="终端文本操作"
                className="mr-1 flex items-center gap-1 rounded-md border border-[#2d3b30] bg-[#101511] p-0.5"
              >
                <button
                  type="button"
                  aria-label="聚焦终端"
                  onClick={handleFocusTerminal}
                  disabled={!canUseTextControls}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#b8cbb3] transition hover:bg-[#223024] hover:text-[#f1f7ef] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="聚焦终端"
                >
                  <Keyboard aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="全选终端文本"
                  onClick={handleSelectAllTerminal}
                  disabled={!canUseTextControls}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#b8cbb3] transition hover:bg-[#223024] hover:text-[#f1f7ef] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="全选"
                >
                  <ScanText aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="复制选中文本"
                  onClick={handleCopySelection}
                  disabled={!canUseTextControls}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#b8cbb3] transition hover:bg-[#223024] hover:text-[#f1f7ef] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="复制选中文本"
                >
                  <Copy aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="清空终端显示"
                  onClick={handleClearTerminal}
                  disabled={!canUseTextControls}
                  className="flex h-7 w-7 items-center justify-center rounded text-[#b8cbb3] transition hover:bg-[#223024] hover:text-[#f1f7ef] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="清空显示"
                >
                  <Eraser aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="打开终端查找"
                  onClick={handleOpenFind}
                  disabled={!canUseTextControls}
                  className={`flex h-7 w-7 items-center justify-center rounded text-[#b8cbb3] transition hover:bg-[#223024] hover:text-[#f1f7ef] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                    isFindOpen ? "bg-[#243527] text-[#f1f7ef]" : ""
                  }`}
                  title="查找"
                >
                  <TextSearch aria-hidden="true" size={14} strokeWidth={2} />
                </button>
              </div>
              <div
                aria-label="终端窗格布局"
                className="mr-1 flex items-center gap-1 rounded-md border border-[#2d3b30] bg-[#101511] p-0.5"
              >
                {PANE_LAYOUTS.map((layout) => {
                  const LayoutIcon = layout.icon;

                  return (
                    <button
                      key={layout.id}
                      type="button"
                      aria-label={layout.label}
                      onClick={() => setPaneLayout(layout.id)}
                      className={`flex h-7 w-7 items-center justify-center rounded text-[#b8cbb3] transition hover:bg-[#223024] hover:text-[#f1f7ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                        paneLayout === layout.id ? "bg-[#243527] text-[#f1f7ef]" : ""
                      }`}
                      title={layout.title}
                    >
                      <LayoutIcon aria-hidden="true" size={14} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                aria-label="将当前标签分配到聚焦窗格"
                onClick={() => {
                  if (activeTab) {
                    void attachTab(activeTab, focusedPaneId);
                  }
                }}
                disabled={!canAssignActiveTab}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                title="分配到聚焦窗格"
              >
                <SquareArrowRight aria-hidden="true" size={14} strokeWidth={2} />
              </button>
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

        {environmentDiagnostics.length ? (
          <section
            aria-label="终端环境诊断"
            className="flex flex-wrap items-center gap-2 border-b border-[#223024] bg-[#121914] px-4 py-2 text-xs"
          >
            <div className="mr-1 flex items-center gap-2 font-medium text-[#dbe8d8]">
              <SquareTerminal aria-hidden="true" size={14} strokeWidth={2} />
              终端环境
            </div>
            {environmentDiagnostics.slice(0, 6).map((environment) => {
              const StatusIcon = environmentStatusIcon(environment.status);

              return (
                <span
                  key={environment.environmentId}
                  className={`inline-flex max-w-[18rem] items-center gap-1.5 rounded-md border px-2 py-1 ${environmentStatusClass(
                    environment.status,
                  )}`}
                  title={`${environment.command} · ${environment.message} ${environment.userAction}`}
                >
                  <StatusIcon aria-hidden="true" size={13} strokeWidth={2} />
                  <span className="truncate font-medium">{environment.label}</span>
                  <span className="shrink-0">{environmentStatusLabel(environment.status)}</span>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => void loadEnvironmentDiagnostics()}
              className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#2d3b30] bg-[#101511] px-2 text-[#b8cbb3] transition hover:border-[#6f9369] hover:bg-[#223024] hover:text-[#f1f7ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
            >
              <RefreshCw aria-hidden="true" size={13} strokeWidth={2} />
              刷新环境
            </button>
          </section>
        ) : null}

        {errorNotice ? (
          <section
            role="alert"
            className="border-b border-[#5a332f] bg-[#2a1715] px-4 py-3 text-sm text-[#ffd7d3]"
          >
            <p className="font-medium">{errorNotice.message}</p>
            <p className="mt-1 text-xs text-[#f2b8b0]">
              影响范围：当前终端操作未完成，其他终端会话不受影响。
            </p>
            <p className="mt-1 text-xs text-[#f2b8b0]">
              下一步：{errorNotice.userAction ?? "请重试；如果问题持续，请查看诊断信息。"}
            </p>
            {errorNotice.details ? (
              <p className="mt-1 max-w-full truncate text-xs text-[#d99f98]">
                详情：{errorNotice.details}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="min-h-0 flex-1 bg-[#111712] p-3">
          <div className="relative h-[calc(100vh-8.5rem)] min-h-[420px] w-full overflow-auto rounded-md border border-[#2a372d] bg-[#111712] p-2">
            <div
              className="grid min-h-full gap-2"
              style={paneGridStyle(paneLayout)}
            >
              {visiblePaneIds.map((paneId) => {
                const assignedTab = getAssignedTab(paneId, paneAssignments, tabs);
                const paneSession = assignedTab
                  ? sessionsById[assignedTab.terminalSessionId] ?? null
                  : null;
                const paneClosed =
                  assignedTab?.status === "closed" || paneSession?.status === "exited";
                const paneSnapshotText = paneSession?.snapshot.text ?? "";
                const paneExitReason =
                  paneSession?.exitReason?.message ?? "终端会话已结束。";
                const focused = focusedPaneId === paneId;

                return (
                  <section
                    key={paneId}
                    aria-label={`${paneLabel(paneId)} 终端窗格`}
                    role="group"
                    tabIndex={0}
                    onClick={() => focusPane(paneId)}
                    onKeyDown={(event) => handlePaneKeyDown(event, paneId)}
                    className={`relative flex min-h-[12rem] min-w-[20rem] flex-col overflow-hidden rounded-md border bg-[#0f1511] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                      focused
                        ? "border-[#7daa75] shadow-[0_0_0_1px_rgba(157,208,142,0.25)]"
                        : "border-[#263428]"
                    }`}
                  >
                    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-[#223024] bg-[#151c17] px-2.5 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 font-medium text-[#9fd08e]">
                          {paneLabel(paneId)}
                        </span>
                        <span
                          className="min-w-0 truncate text-[#b8cbb3]"
                          title={assignedTab?.label ?? "未分配标签"}
                        >
                          {assignedTab?.label ?? "未分配标签"}
                        </span>
                      </div>
                      <span className="shrink-0 text-[#8fa08b]">
                        {paneSession ? sessionStatusLabel(paneSession) : "空闲"}
                      </span>
                    </div>
                    <div
                      ref={paneRefCallbacks[paneId]}
                      aria-label={`${paneLabel(paneId)} 终端输出`}
                      className={`min-h-0 flex-1 overflow-hidden ${
                        assignedTab ? "" : "opacity-40"
                      }`}
                    />
                    {!assignedTab ? (
                      <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-center">
                        <div className="max-w-xs text-center text-xs text-[#9bad98]">
                          <p className="leading-5">拖动标签到这里，或新建一个终端。</p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCreateTab(paneId);
                            }}
                            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#3d503f] bg-[#1b241d] px-2.5 font-medium text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                          >
                            <Plus aria-hidden="true" size={14} strokeWidth={2} />
                            新建终端
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {paneClosed ? (
                      <div className="pointer-events-none absolute inset-x-3 top-12 flex justify-center">
                        <div className="max-w-[min(34rem,calc(100%-1rem))] rounded-md border border-[#334436] bg-[#1a231c]/95 p-3 text-xs text-[#b8cbb3] shadow-lg">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                            <span>当前状态：{paneSession ? sessionStatusLabel(paneSession) : "已退出"}</span>
                            <span>退出原因：{paneExitReason}</span>
                          </div>
                          <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap break-words rounded border border-[#2d3b30] bg-[#0f1511] p-2 font-mono text-[11px] leading-4 text-[#dbe8d8]">
                            {paneSnapshotText.trim() ? paneSnapshotText : "暂无可观察输出"}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
            {isFindOpen ? (
              <div
                role="search"
                aria-label="终端查找"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeFind();
                  }
                }}
                className="absolute right-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-1 rounded-md border border-[#334436] bg-[#151c17] p-2 text-xs shadow-xl"
              >
                <TextSearch
                  aria-hidden="true"
                  size={14}
                  className="shrink-0 text-[#9fd08e]"
                />
                <input
                  ref={findInputRef}
                  aria-label="查找终端文本"
                  value={findQuery}
                  onChange={(event) => setFindQuery(event.target.value)}
                  onKeyDown={handleFindKeyDown}
                  className="h-8 w-44 min-w-0 rounded-md border border-[#3d503f] bg-[#101511] px-2 text-xs text-[#e5eee2] outline-none transition placeholder:text-[#82927f] focus:border-[#7daa75] focus:ring-2 focus:ring-[#7daa75]/25"
                  placeholder="查找文本"
                />
                <span
                  aria-label="查找结果"
                  className={`min-w-[3.75rem] rounded px-2 py-1 text-center font-medium ${
                    findResult.errorMessage ? "text-[#f0d6cf]" : "text-[#b8cbb3]"
                  }`}
                >
                  {findStatus}
                </span>
                <button
                  type="button"
                  aria-label="上一个匹配项"
                  onClick={() => runFind("previous")}
                  disabled={!findQuery.trim() || findResult.total === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="上一个"
                >
                  <ChevronUp aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="下一个匹配项"
                  onClick={() => runFind("next")}
                  disabled={!findQuery.trim() || findResult.total === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="下一个"
                >
                  <ChevronDown aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="区分大小写"
                  onClick={() => toggleFindOption("caseSensitive")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                    findOptions.caseSensitive ? "bg-[#243527]" : "bg-[#1b241d]"
                  }`}
                  title="区分大小写"
                >
                  <CaseSensitive aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="全字匹配"
                  onClick={() => toggleFindOption("wholeWord")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                    findOptions.wholeWord ? "bg-[#243527]" : "bg-[#1b241d]"
                  }`}
                  title="全字匹配"
                >
                  <WholeWord aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="正则查找"
                  onClick={() => toggleFindOption("regex")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e] ${
                    findOptions.regex ? "bg-[#243527]" : "bg-[#1b241d]"
                  }`}
                  title="正则"
                >
                  <Regex aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="关闭终端查找"
                  onClick={closeFind}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#3d503f] bg-[#1b241d] text-[#dbe8d8] transition hover:border-[#6f9369] hover:bg-[#223024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd08e]"
                  title="关闭"
                >
                  <X aria-hidden="true" size={14} strokeWidth={2} />
                </button>
              </div>
            ) : null}
          </div>
          {isLoading && !errorNotice ? (
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

function createEmptyPaneAssignments(): PaneAssignments {
  return {
    "pane-1": null,
    "pane-2": null,
    "pane-3": null,
    "pane-4": null,
  };
}

function createEmptyPaneElementMap(): Record<PaneId, HTMLDivElement | null> {
  return {
    "pane-1": null,
    "pane-2": null,
    "pane-3": null,
    "pane-4": null,
  };
}

function createDefaultFindOptions(): TerminalFindOptions {
  return {
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  };
}

function createEmptyFindResult(): TerminalFindResult {
  return {
    query: "",
    index: 0,
    total: 0,
    errorMessage: null,
  };
}

function findStatusLabel(result: TerminalFindResult, query: string) {
  if (result.errorMessage) {
    return result.errorMessage;
  }

  if (!query.trim()) {
    return "输入查找";
  }

  if (result.total === 0) {
    return "无结果";
  }

  return `${result.index}/${result.total}`;
}

function getAssignedTab(
  paneId: PaneId,
  paneAssignments: PaneAssignments,
  tabs: TerminalTabProfile[],
) {
  const tabId = paneAssignments[paneId];

  if (!tabId) {
    return null;
  }

  return tabs.find((tab) => tab.tabId === tabId) ?? null;
}

function findAssignedPaneForTab(tabId: string, paneAssignments: PaneAssignments) {
  return PANE_IDS.find((paneId) => paneAssignments[paneId] === tabId) ?? null;
}

function paneLabel(paneId: PaneId) {
  switch (paneId) {
    case "pane-1":
      return "窗格 1";
    case "pane-2":
      return "窗格 2";
    case "pane-3":
      return "窗格 3";
    case "pane-4":
      return "窗格 4";
    default:
      return paneId;
  }
}

function paneGridStyle(paneLayout: PaneLayout): React.CSSProperties {
  switch (paneLayout) {
    case "splitVertical":
      return {
        gridTemplateColumns: "repeat(2, minmax(20rem, 1fr))",
        gridTemplateRows: "minmax(0, 1fr)",
      };
    case "splitHorizontal":
      return {
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "repeat(2, minmax(12rem, 1fr))",
      };
    case "grid2x2":
      return {
        gridTemplateColumns: "repeat(2, minmax(20rem, 1fr))",
        gridTemplateRows: "repeat(2, minmax(12rem, 1fr))",
      };
    case "single":
    default:
      return {
        gridTemplateColumns: "minmax(0, 1fr)",
        gridTemplateRows: "minmax(0, 1fr)",
      };
  }
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

function environmentStatusIcon(status: TerminalEnvironmentProfile["status"]) {
  switch (status) {
    case "available":
      return CheckCircle2;
    case "invalid":
      return CircleSlash;
    case "missing":
    default:
      return AlertTriangle;
  }
}

function environmentStatusLabel(status: TerminalEnvironmentProfile["status"]) {
  switch (status) {
    case "available":
      return "可用";
    case "invalid":
      return "无效";
    case "missing":
    default:
      return "缺失";
  }
}

function environmentStatusClass(status: TerminalEnvironmentProfile["status"]) {
  switch (status) {
    case "available":
      return "border-[#345a39] bg-[#16231a] text-[#c9e7c1]";
    case "invalid":
      return "border-[#5a4034] bg-[#241b16] text-[#f0d6cf]";
    case "missing":
    default:
      return "border-[#5a5334] bg-[#242217] text-[#eadfa6]";
  }
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
