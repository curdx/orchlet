import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  TerminalEnvironmentProfile,
  TerminalSessionProfile,
  TerminalTabProfile,
  TerminalTabUpdateRequest,
} from "../../contracts/generated/terminal";
import type { AppError } from "../../contracts/generated/common";
import type { ShortcutPreferencesSnapshot } from "../../contracts/generated/settings";
import type {
  AppLanguage,
  AppTheme,
  WindowContextSnapshot,
  WindowMode,
} from "../../contracts/generated";
import { normalizeAppError, settingsApi, terminalApi } from "../../shared/api";
import type { SettingsApi } from "../../shared/api/settings-api";
import type { TerminalApi } from "../../shared/api/terminal-api";
import { SHORTCUT_ACTION, shortcutEventMatches } from "../../shared/shortcuts";
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
type TerminalPageSettingsApi = Pick<SettingsApi, "getShortcutPreferences">;

type PaneLayout = "single" | "splitVertical" | "splitHorizontal" | "grid2x2";
type PaneId = "pane-1" | "pane-2" | "pane-3" | "pane-4";
type PaneAssignments = Record<PaneId, string | null>;
type PaneAttachPhase = "idle" | "attaching" | "reconnecting";
type PaneAttachPhases = Record<PaneId, PaneAttachPhase>;
type PaneFatalErrors = Record<PaneId, string | null>;
type TerminalDragSource = "tab-bar" | "pane";
type TerminalDragState = {
  tabId: string;
  source: TerminalDragSource;
  sourcePaneId: PaneId | null;
  pointerId: number;
  started: boolean;
  startX: number;
  startY: number;
  ghostLeft: number;
  ghostTop: number;
  ghostWidth: number;
  ghostHeight: number;
  grabOffsetX: number;
  grabOffsetY: number;
  overTabId: string | null;
  overPaneId: PaneId | null;
};
type TerminalTabContextMenuState = {
  tabId: string;
  x: number;
  y: number;
} | null;

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
  iconName: string;
}> = [
  { id: "single", label: "单窗格布局", title: "单窗格", iconName: "check_box_outline_blank" },
  { id: "splitVertical", label: "左右分屏布局", title: "左右分屏", iconName: "splitscreen_right" },
  { id: "splitHorizontal", label: "上下分屏布局", title: "上下分屏", iconName: "splitscreen_top" },
  { id: "grid2x2", label: "四宫格布局", title: "四宫格", iconName: "grid_view" },
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
const DEFAULT_TERMINAL_SHORTCUT_PREFERENCES: ShortcutPreferencesSnapshot = {
  schemaVersion: 1,
  profile: "default",
  shortcutsEnabled: true,
  shortcutHintsEnabled: true,
  disabledActionIds: [],
  bindings: [
    {
      actionId: "terminal.find.next",
      label: "终端查找下一个",
      keys: ["Enter"],
      enabled: true,
      available: true,
      unavailableReason: null,
    },
    {
      actionId: "terminal.find.previous",
      label: "终端查找上一个",
      keys: ["Shift+Enter"],
      enabled: true,
      available: true,
      unavailableReason: null,
    },
    {
      actionId: "terminal.find.close",
      label: "关闭终端查找",
      keys: ["Esc"],
      enabled: true,
      available: true,
      unavailableReason: null,
    },
  ],
  createdAtMs: 1,
  updatedAtMs: 1,
};

function defaultCreateRendererAdapter(options: RendererAdapterOptions) {
  return new XtermRendererAdapter(options);
}

function MaterialSymbol({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`.trim()}>
      {name}
    </span>
  );
}

export function TerminalPage({
  snapshot,
  api = terminalApi,
  settingsApi: localSettingsApi = settingsApi,
  createRendererAdapter = defaultCreateRendererAdapter,
}: {
  snapshot: WindowContextSnapshot | null;
  api?: TerminalPageApi;
  settingsApi?: TerminalPageSettingsApi;
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
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<TerminalDragState | null>(null);
  const suppressTabClickRef = useRef(false);

  const [tabs, setTabs] = useState<TerminalTabProfile[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sessionsById, setSessionsById] = useState<Record<string, TerminalSessionProfile>>({});
  const [paneLayout, setPaneLayout] = useState<PaneLayout>("single");
  const [paneAssignments, setPaneAssignments] = useState<PaneAssignments>(
    createEmptyPaneAssignments,
  );
  const [paneAttachPhases, setPaneAttachPhases] = useState<PaneAttachPhases>(
    createIdlePaneAttachPhases,
  );
  const [paneFatalErrors, setPaneFatalErrors] = useState<PaneFatalErrors>(
    createEmptyPaneFatalErrors,
  );
  const [focusedPaneId, setFocusedPaneId] = useState<PaneId>("pane-1");
  const [dragState, setDragState] = useState<TerminalDragState | null>(null);
  const [tabContextMenu, setTabContextMenu] =
    useState<TerminalTabContextMenuState>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findOptions, setFindOptions] = useState<TerminalFindOptions>(
    createDefaultFindOptions,
  );
  const [findResult, setFindResult] = useState<TerminalFindResult>(
    createEmptyFindResult,
  );
  const [shortcutPreferences, setShortcutPreferences] = useState<ShortcutPreferencesSnapshot>(
    DEFAULT_TERMINAL_SHORTCUT_PREFERENCES,
  );
  const [environmentDiagnostics, setEnvironmentDiagnostics] = useState<
    TerminalEnvironmentProfile[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<AppError | null>(null);
  const workspace = snapshot?.activeWorkspace ?? null;
  const language = snapshot?.preferences.language ?? "zh-CN";
  const text = TERMINAL_TEXT[language];
  const setCurrentDragState = useCallback(
    (
      next:
        | TerminalDragState
        | null
        | ((current: TerminalDragState | null) => TerminalDragState | null),
    ) => {
      const resolved = typeof next === "function" ? next(dragStateRef.current) : next;
      dragStateRef.current = resolved;
      setDragState(resolved);
    },
    [],
  );
  const setPaneAttachPhase = useCallback((paneId: PaneId, phase: PaneAttachPhase) => {
    setPaneAttachPhases((currentPhases) => ({
      ...currentPhases,
      [paneId]: phase,
    }));
  }, []);
  const setPaneFatalError = useCallback((paneId: PaneId, message: string | null) => {
    setPaneFatalErrors((currentErrors) => ({
      ...currentErrors,
      [paneId]: message,
    }));
  }, []);

  useEffect(() => {
    let disposed = false;

    void localSettingsApi
      .getShortcutPreferences()
      .then((result) => {
        if (!disposed) {
          setShortcutPreferences(result.preferences);
        }
      })
      .catch((error) => {
        if (!disposed) {
          setErrorNotice(normalizeAppError(error));
        }
      });

    return () => {
      disposed = true;
    };
  }, [localSettingsApi]);

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
      if (
        shortcutEventMatches(
          shortcutPreferences,
          SHORTCUT_ACTION.terminalFindClose,
          event,
        )
      ) {
        event.preventDefault();
        closeFind();
        return;
      }

      if (
        shortcutEventMatches(
          shortcutPreferences,
          SHORTCUT_ACTION.terminalFindPrevious,
          event,
        )
      ) {
        event.preventDefault();
        runFind("previous");
        return;
      }

      if (
        !shortcutEventMatches(
          shortcutPreferences,
          SHORTCUT_ACTION.terminalFindNext,
          event,
        )
      ) {
        return;
      }

      event.preventDefault();
      runFind("next");
    },
    [closeFind, runFind, shortcutPreferences],
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
      const attachPhase = sessionsRef.current.has(tab.terminalSessionId)
        ? "reconnecting"
        : "attaching";
      assignTabToPane(targetPaneId, tab.tabId);
      focusedPaneIdRef.current = targetPaneId;
      setFocusedPaneId(targetPaneId);
      setActiveTabId(tab.tabId);
      setIsLoading(true);
      setPaneAttachPhase(targetPaneId, attachPhase);
      setPaneFatalError(targetPaneId, null);

      try {
        const result = await api.attachTerminal({
          terminalSessionId: tab.terminalSessionId,
        });

        if (attachRequestIdsRef.current.get(targetPaneId) !== requestId) {
          return;
        }

        storeSession(result.session);
        restoreRendererSnapshot(targetPaneId, result.session);
        setPaneAttachPhase(targetPaneId, "idle");
        setPaneFatalError(targetPaneId, null);
        setErrorNotice(null);
      } catch (error) {
        if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
          const appError = normalizeAppError(error);
          setPaneAttachPhase(targetPaneId, "idle");
          setPaneFatalError(targetPaneId, appError.message);
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
      setPaneAttachPhase,
      setPaneFatalError,
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
      setPaneAttachPhase(targetPaneId, "attaching");
      setPaneFatalError(targetPaneId, null);
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
      setPaneAttachPhase(targetPaneId, "idle");
      setPaneFatalError(targetPaneId, null);
      setErrorNotice(null);
    } catch (error) {
      if (attachRequestIdsRef.current.get(targetPaneId) === requestId) {
        const appError = normalizeAppError(error);
        setPaneAttachPhase(targetPaneId, "idle");
        setPaneFatalError(targetPaneId, appError.message);
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

  async function handleCloseTabFromBar(tab: TerminalTabProfile) {
    if (tab.tabId === activeTabId) {
      await handleCloseActiveTab();
      return;
    }

    if (tab.status === "closed") {
      return;
    }

    const assignedPaneId = findAssignedPaneForTab(tab.tabId, paneAssignmentsRef.current);

    try {
      const result = await api.closeTab({ tabId: tab.tabId });
      storeTabs(result.tabs);
      storeSession(result.session);

      if (assignedPaneId) {
        assignTabToPane(assignedPaneId, null);
      }

      setErrorNotice(null);
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

  async function handlePinTab(tab: TerminalTabProfile) {
    try {
      const result = await api.updateTab(tabUpdate(tab.tabId, {
        isPinned: !tab.isPinned,
      }));
      storeTabs(result.tabs);
      setErrorNotice(null);
    } catch (error) {
      const appError = normalizeAppError(error);
      setErrorNotice(appError);
    }
  }

  async function handleCloseTabsById(tabIds: string[]) {
    for (const tabId of tabIds) {
      const tab = tabsRef.current.find((candidate) => candidate.tabId === tabId);

      if (!tab || tab.status === "closed") {
        continue;
      }

      await handleCloseTabFromBar(tab);
    }
  }

  async function handleCloseOtherTabs(tab: TerminalTabProfile) {
    await attachTab(tab);
    const closableIds = orderTabs(tabsRef.current)
      .filter((candidate) => (
        candidate.status === "open" &&
        candidate.tabId !== tab.tabId &&
        !candidate.isPinned
      ))
      .map((candidate) => candidate.tabId);
    await handleCloseTabsById(closableIds);
  }

  async function handleCloseRightTabs(tab: TerminalTabProfile) {
    await attachTab(tab);
    const openOrderedTabs = orderTabs(tabsRef.current).filter(
      (candidate) => candidate.status === "open",
    );
    const tabIndex = openOrderedTabs.findIndex((candidate) => candidate.tabId === tab.tabId);

    if (tabIndex < 0) {
      return;
    }

    const closableIds = openOrderedTabs
      .slice(tabIndex + 1)
      .filter((candidate) => !candidate.isPinned)
      .map((candidate) => candidate.tabId);
    await handleCloseTabsById(closableIds);
  }

  async function handleTerminalContextLayout(tab: TerminalTabProfile, layout: PaneLayout) {
    setPaneLayout(layout);
    const candidatePaneId = VISIBLE_PANES_BY_LAYOUT[layout].includes(focusedPaneIdRef.current)
      ? focusedPaneIdRef.current
      : VISIBLE_PANES_BY_LAYOUT[layout][0];
    await attachTab(tab, candidatePaneId);
  }

  function handleOpenTabContextMenu(
    event: React.MouseEvent<HTMLElement>,
    tab: TerminalTabProfile,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setTabContextMenu({
      tabId: tab.tabId,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function resolveTabDropIndex(clientX: number, draggedTabId: string) {
    const tabBar = tabBarRef.current;

    if (!tabBar) {
      return null;
    }

    const tabElements = Array.from(
      tabBar.querySelectorAll<HTMLElement>("[data-terminal-tab-id]"),
    ).filter((element) => element.dataset.terminalTabId !== draggedTabId);

    if (!tabElements.length) {
      return 0;
    }

    for (let index = 0; index < tabElements.length; index += 1) {
      const rect = tabElements[index].getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;

      if (clientX < midpoint) {
        return index;
      }
    }

    return tabElements.length;
  }

  function resolveTabDragOverId(clientX: number, draggedTabId: string) {
    const tabBar = tabBarRef.current;

    if (!tabBar) {
      return null;
    }

    const tabElements = Array.from(
      tabBar.querySelectorAll<HTMLElement>("[data-terminal-tab-id]"),
    ).filter((element) => element.dataset.terminalTabId !== draggedTabId);

    for (const element of tabElements) {
      const rect = element.getBoundingClientRect();

      if (clientX >= rect.left && clientX <= rect.right) {
        return element.dataset.terminalTabId ?? null;
      }
    }

    return null;
  }

  function resolvePaneDropTarget(clientX: number, clientY: number) {
    const element =
      typeof document.elementFromPoint === "function"
        ? (document.elementFromPoint(clientX, clientY) as HTMLElement | null)
        : null;
    const pane = element?.closest("[data-terminal-pane-id]") as HTMLElement | null;
    const paneId = pane?.dataset.terminalPaneId as PaneId | undefined;

    if (!paneId || !PANE_IDS.includes(paneId)) {
      return null;
    }

    return paneId;
  }

  function isPointInTerminalTabBar(clientX: number, clientY: number) {
    const tabBar = tabBarRef.current;

    if (!tabBar) {
      return false;
    }

    const rect = tabBar.getBoundingClientRect();

    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  async function commitDraggedTabOrder(tabId: string, insertIndex: number) {
    const openOrderedTabs = orderTabs(tabsRef.current).filter(
      (candidate) => candidate.status === "open",
    );
    const draggedTab = openOrderedTabs.find((candidate) => candidate.tabId === tabId);

    if (!draggedTab) {
      return;
    }

    const remainingTabs = openOrderedTabs.filter((candidate) => candidate.tabId !== tabId);
    const clampedIndex = Math.max(0, Math.min(insertIndex, remainingTabs.length));
    const reorderedTabs = [
      ...remainingTabs.slice(0, clampedIndex),
      draggedTab,
      ...remainingTabs.slice(clampedIndex),
    ];
    const changedTabs = reorderedTabs.filter(
      (candidate, index) => candidate.sortIndex !== index,
    );

    if (!changedTabs.length) {
      return;
    }

    let latestTabs = tabsRef.current;

    for (const tab of changedTabs) {
      const nextIndex = reorderedTabs.findIndex((candidate) => candidate.tabId === tab.tabId);
      const result = await api.updateTab(tabUpdate(tab.tabId, {
        sortIndex: nextIndex,
      }));
      latestTabs = result.tabs.length ? result.tabs : latestTabs;
    }

    storeTabs(latestTabs);
    setErrorNotice(null);
  }

  function handleTerminalTabPointerDown(
    tab: TerminalTabProfile,
    event: React.PointerEvent<HTMLElement>,
    source: TerminalDragSource,
    sourcePaneId: PaneId | null = null,
  ) {
    if (event.button !== 0 || tab.status !== "open") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    setCurrentDragState({
      tabId: tab.tabId,
      source,
      sourcePaneId,
      pointerId: event.pointerId,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
      ghostLeft: event.clientX - (event.clientX - rect.left),
      ghostTop: event.clientY - (event.clientY - rect.top),
      ghostWidth: rect.width,
      ghostHeight: rect.height,
      grabOffsetX: event.clientX - rect.left,
      grabOffsetY: event.clientY - rect.top,
      overTabId: null,
      overPaneId: null,
    });

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  const handleTerminalDragMove = useCallback(
    (event: PointerEvent) => {
      const currentDragState = dragStateRef.current;

      if (!currentDragState || currentDragState.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.max(
        Math.abs(event.clientX - currentDragState.startX),
        Math.abs(event.clientY - currentDragState.startY),
      );
      const started = currentDragState.started || distance >= 4;

      if (!started) {
        return;
      }

      event.preventDefault();
      setCurrentDragState((current) => {
        if (!current || current.pointerId !== event.pointerId) {
          return current;
        }

        const overTabId =
          current.source === "tab-bar"
            ? resolveTabDragOverId(event.clientX, current.tabId)
            : null;
        const overPaneId = resolvePaneDropTarget(event.clientX, event.clientY);

        return {
          ...current,
          started: true,
          ghostLeft: event.clientX - current.grabOffsetX,
          ghostTop: event.clientY - current.grabOffsetY,
          overTabId,
          overPaneId,
        };
      });
    },
    [setCurrentDragState],
  );

  const handleTerminalDragEnd = useCallback(
    (event: PointerEvent) => {
      const currentDragState = dragStateRef.current;

      if (!currentDragState || currentDragState.pointerId !== event.pointerId) {
        return;
      }

      if (currentDragState.started) {
        suppressTabClickRef.current = true;
        window.setTimeout(() => {
          suppressTabClickRef.current = false;
        }, 0);
      }

      const draggedTab = tabsRef.current.find(
        (candidate) => candidate.tabId === currentDragState.tabId,
      );
      const paneDropTarget = currentDragState.started
        ? resolvePaneDropTarget(event.clientX, event.clientY) ?? currentDragState.overPaneId
        : null;
      const tabDropIndex = currentDragState.started
        ? resolveTabDropIndex(event.clientX, currentDragState.tabId)
        : null;
      const droppedInTabBar =
        currentDragState.started && isPointInTerminalTabBar(event.clientX, event.clientY);

      setCurrentDragState(null);

      if (!currentDragState.started || !draggedTab) {
        return;
      }

      if (paneDropTarget) {
        void attachTab(draggedTab, paneDropTarget);
        return;
      }

      if (droppedInTabBar) {
        if (currentDragState.source === "pane" && currentDragState.sourcePaneId) {
          assignTabToPane(currentDragState.sourcePaneId, null);
        }

        if (tabDropIndex !== null) {
          void commitDraggedTabOrder(currentDragState.tabId, tabDropIndex);
        }
      }
    },
    [assignTabToPane, attachTab, setCurrentDragState],
  );

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

  const terminalSubtitle = workspace
    ? `${workspace.metadata.name} · ${workspace.rootPath}`
    : text.noWorkspace;
  const canAssignActiveTab = activeTab?.status === "open";
  const visibleFocusedPaneId = visiblePaneIds.includes(focusedPaneId)
    ? focusedPaneId
    : visiblePaneIds[0];
  const focusedPaneTab = getAssignedTab(visibleFocusedPaneId, paneAssignments, tabs);
  const canUseTextControls = Boolean(focusedPaneTab);
  const findStatus = findStatusLabel(findResult, findQuery);
  const contextMenuTab = tabContextMenu
    ? tabs.find((tab) => tab.tabId === tabContextMenu.tabId) ?? null
    : null;
  const contextMenuOpenTabs = orderTabs(tabs).filter((tab) => tab.status === "open");
  const contextMenuTabIndex = contextMenuTab
    ? contextMenuOpenTabs.findIndex((tab) => tab.tabId === contextMenuTab.tabId)
    : -1;
  const contextMenuCanCloseOthers = contextMenuOpenTabs.some(
    (tab) => tab.tabId !== contextMenuTab?.tabId && !tab.isPinned,
  );
  const contextMenuCanCloseRight =
    contextMenuTabIndex >= 0 &&
    contextMenuOpenTabs.slice(contextMenuTabIndex + 1).some((tab) => !tab.isPinned);
  const dragGhostTab = dragState
    ? tabs.find((tab) => tab.tabId === dragState.tabId) ?? null
    : null;

  useEffect(() => {
    if (!dragState?.tabId) {
      return undefined;
    }

    window.addEventListener("pointermove", handleTerminalDragMove);
    window.addEventListener("pointerup", handleTerminalDragEnd);
    window.addEventListener("pointercancel", handleTerminalDragEnd);

    return () => {
      window.removeEventListener("pointermove", handleTerminalDragMove);
      window.removeEventListener("pointerup", handleTerminalDragEnd);
      window.removeEventListener("pointercancel", handleTerminalDragEnd);
    };
  }, [dragState?.tabId, handleTerminalDragEnd, handleTerminalDragMove]);

  useEffect(() => {
    if (!tabContextMenu) {
      return undefined;
    }

    function closeMenu() {
      const keepMenuOpen = (
        window as typeof window & { __ORCHLET_KEEP_TERMINAL_MENU_OPEN__?: boolean }
      ).__ORCHLET_KEEP_TERMINAL_MENU_OPEN__;

      if (keepMenuOpen) {
        return;
      }

      setTabContextMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tabContextMenu]);

  return (
    <main className="h-full min-h-0 overflow-hidden bg-transparent text-white">
      <section className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <header className="relative z-20 flex min-h-[44px] items-center justify-between gap-4 border-b border-white/5 bg-[rgb(var(--color-panel)/0.60)] px-6 py-1.5 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold leading-tight text-white">
              Terminal
            </h1>
            <p
              className="truncate text-[10px] leading-tight text-white/40"
              title={terminalSubtitle}
            >
              {terminalSubtitle}
            </p>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-3 text-xs">
            <div className="relative min-w-[13rem]">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <MaterialSymbol name="search" className="text-[16px] text-white/40" />
              </div>
                <input
                  aria-label={text.searchTabs}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-7 text-[11px] leading-tight text-white/80 outline-none transition-colors placeholder:text-white/30 focus:border-[rgb(var(--color-primary)/0.50)] focus:bg-white/10"
                  placeholder={text.searchPlaceholder}
                />
                {searchQuery.trim() ? (
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 transition-colors hover:text-white"
                  onClick={() => setSearchQuery("")}
                  aria-label="清空终端标签搜索"
                >
                  <MaterialSymbol name="close" className="text-[14px]" />
                </button>
              ) : null}
              {searchQuery.trim() ? (
                <div className="glass-modal absolute left-0 right-0 z-30 mt-2 flex max-h-72 flex-col overflow-hidden rounded-xl bg-[rgb(var(--color-panel-strong)/0.95)] py-1.5 shadow-2xl ring-1 ring-white/10">
                  <button
                    type="button"
                    onClick={() => void handleCreateTab()}
                    className="relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-white transition-colors hover:bg-white/15 hover:ring-1 hover:ring-white/10"
                  >
                    <MaterialSymbol name="add" className="text-lg opacity-70" />
                    新建匹配终端
                  </button>
                  <div className="mx-2 my-1 h-px bg-white/10" />
                    {searchResults.length ? (
                    <div className="custom-scrollbar max-h-56 overflow-y-auto">
                      {searchResults.map((tab) => (
                        <button
                          key={tab.tabId}
                          type="button"
                          onClick={() => void handleSearchResultSelect(tab)}
                          className="relative flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-xs font-bold text-white transition-colors hover:bg-white/15 hover:ring-1 hover:ring-white/10"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{tab.label}</span>
                            <span className="block truncate text-[11px] font-medium text-white/40">
                              {tab.shell} · {tab.memberId ?? tab.terminalSessionId}
                            </span>
                          </span>
                          <span className="shrink-0 text-white/40">
                            {tab.status === "closed" ? text.closed : text.open}
                          </span>
                        </button>
                      ))}
                    </div>
                    ) : (
                    <div className="px-4 py-2 text-[11px] font-medium text-white/40">
                        {text.noMatchingTabs}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleCreateTab()}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold uppercase leading-none tracking-wide text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))]"
              >
              <MaterialSymbol name="add" className="text-[15px]" />
                {text.newTab}
              </button>
            </div>
        </header>

        <div
          ref={tabBarRef}
          className="relative z-10 flex min-h-[38px] items-center gap-2 overflow-x-auto border-b border-white/5 bg-[rgb(var(--color-surface)/0.30)] px-6 py-1"
        >
            {recentClosedTab ? (
              <button
                type="button"
                onClick={() => void handleRestoreTab(recentClosedTab)}
                className="group flex max-w-[13rem] shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-[10.5px] font-semibold text-white/70 transition hover:border-white/40 hover:bg-white/20 hover:text-white"
                title={recentClosedTab.label}
              >
                <MaterialSymbol name="history" className="text-[16px]" />
                <span className="truncate">
                  {text.restorePrefix} {recentClosedTab.label}
                </span>
              </button>
            ) : null}
            <div
              aria-label={text.terminalTabs}
            className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
            >
              {openTabs.length ? (
                openTabs.map((tab) => {
                  const isDragged = dragState?.started && dragState.tabId === tab.tabId;
                  const isDragOver =
                    dragState?.started &&
                    dragState.overTabId === tab.tabId &&
                    dragState.tabId !== tab.tabId;

                  return (
                    <button
                      key={tab.tabId}
                      type="button"
                      data-terminal-tab-id={tab.tabId}
                      onPointerDown={(event) => handleTerminalTabPointerDown(tab, event, "tab-bar")}
                      onContextMenu={(event) => handleOpenTabContextMenu(event, tab)}
                      onClick={(event) => {
                        if (suppressTabClickRef.current) {
                          event.preventDefault();
                          event.stopPropagation();
                          suppressTabClickRef.current = false;
                          return;
                        }

                        void attachTab(tab);
                      }}
                      className={`group flex h-7 min-w-[8rem] max-w-[13rem] cursor-default items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-[10.5px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-primary))] ${
                        tab.tabId === activeTabId
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                      } ${isDragged ? "opacity-35" : ""} ${
                        isDragOver ? "ring-1 ring-[rgb(var(--color-primary)/0.60)]" : ""
                      }`}
                      title={`${tab.label} · ${tab.shell}`}
                    >
                      <MaterialSymbol name="terminal" className="text-[16px]" />
                      {tab.isPinned ? (
                        <MaterialSymbol name="push_pin" className="shrink-0 text-[12px] text-white/40" />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-left">{tab.label}</span>
                      {tab.tabId === activeTabId ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--color-primary))] shadow-[0_0_18px_rgb(var(--color-primary)/0.55)]" />
                      ) : null}
                      <span
                        className="terminal-tab__close-button inline-flex h-5 w-5 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-red-500/80 hover:text-white"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCloseTabFromBar(tab);
                        }}
                      >
                        <MaterialSymbol name="close" className="text-[14px]" />
                      </span>
                    </button>
                  );
                })
              ) : (
              <span className="px-2 text-xs text-white/40">没有打开的终端标签</span>
              )}
            </div>
          <div className="sr-only" aria-label="终端高级操作">
              <div
                aria-label="终端文本操作"
              className="mr-1 flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5"
              >
                <button
                  type="button"
                  aria-label="聚焦终端"
                  onClick={handleFocusTerminal}
                  disabled={!canUseTextControls}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="聚焦终端"
                >
                <MaterialSymbol name="keyboard" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="全选终端文本"
                  onClick={handleSelectAllTerminal}
                  disabled={!canUseTextControls}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="全选"
                >
                <MaterialSymbol name="select_all" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="复制选中文本"
                  onClick={handleCopySelection}
                  disabled={!canUseTextControls}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="复制选中文本"
                >
                <MaterialSymbol name="content_copy" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="清空终端显示"
                  onClick={handleClearTerminal}
                  disabled={!canUseTextControls}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="清空显示"
                >
                <MaterialSymbol name="ink_eraser" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="打开终端查找"
                  onClick={handleOpenFind}
                  disabled={!canUseTextControls}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 ${
                  isFindOpen ? "bg-white/15 text-white" : ""
                  }`}
                  title="查找"
                >
                <MaterialSymbol name="find_in_page" className="text-[16px]" />
                </button>
              </div>
              <div
                aria-label="终端窗格布局"
              className="mr-1 flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5"
              >
                {PANE_LAYOUTS.map((layout) => {
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      aria-label={layout.label}
                      onClick={() => setPaneLayout(layout.id)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white ${
                      paneLayout === layout.id ? "bg-white/15 text-white" : ""
                      }`}
                      title={layout.title}
                    >
                    <MaterialSymbol name={layout.iconName} className="text-[16px]" />
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
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="分配到聚焦窗格"
              >
              <MaterialSymbol name="input" className="text-[16px]" />
              </button>
              <button
                type="button"
                aria-label="置顶当前终端标签"
                onClick={() => void handlePinActiveTab()}
                disabled={!activeTab}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title={activeTab?.isPinned ? "取消置顶" : "置顶"}
              >
              <MaterialSymbol name="push_pin" className="text-[16px]" />
              </button>
              <button
                type="button"
                aria-label="向左移动当前终端标签"
                onClick={() => void handleMoveActiveTab(-1)}
                disabled={activeOpenTabIndex <= 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
              <MaterialSymbol name="arrow_back" className="text-[16px]" />
              </button>
              <button
                type="button"
                aria-label="向右移动当前终端标签"
                onClick={() => void handleMoveActiveTab(1)}
                disabled={activeOpenTabIndex < 0 || activeOpenTabIndex >= openTabs.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
              <MaterialSymbol name="arrow_forward" className="text-[16px]" />
              </button>
              <button
                type="button"
                aria-label="关闭当前终端标签"
                onClick={() => void handleCloseActiveTab()}
                disabled={!activeTab || activeTab.status === "closed"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-100/80 transition hover:border-red-400/50 hover:bg-red-500/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="关闭标签"
              >
              <MaterialSymbol name="close" className="text-[16px]" />
              </button>
            </div>
        </div>

        {environmentDiagnostics.length ? (
          <section
            aria-label="终端环境诊断"
          className="sr-only"
          >
          <div className="mr-1 flex items-center gap-2 font-medium text-white/80">
            <MaterialSymbol name="terminal" className="text-[16px]" />
              终端环境
            </div>
            {environmentDiagnostics.slice(0, 6).map((environment) => {
              return (
                <span
                  key={environment.environmentId}
                className={`inline-flex max-w-[18rem] items-center gap-1.5 rounded-lg border px-2 py-1 ${environmentStatusClass(
                    environment.status,
                  )}`}
                  title={`${environment.command} · ${environment.message} ${environment.userAction}`}
                >
                <MaterialSymbol name={environmentStatusIcon(environment.status)} className="text-[15px]" />
                  <span className="truncate font-medium">{environment.label}</span>
                  <span className="shrink-0">{environmentStatusLabel(environment.status)}</span>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => void loadEnvironmentDiagnostics()}
            className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
            <MaterialSymbol name="refresh" className="text-[15px]" />
              刷新环境
            </button>
          </section>
        ) : null}

        {errorNotice ? (
          <section
            role="alert"
          className="border-b border-red-400/20 bg-red-500/10 px-6 py-3 text-sm text-red-100"
          >
            <p className="font-medium">{errorNotice.message}</p>
          <p className="mt-1 text-xs text-red-100/80">
              影响范围：当前终端操作未完成，其他终端会话不受影响。
            </p>
          <p className="mt-1 text-xs text-red-100/80">
              下一步：{errorNotice.userAction ?? "请重试；如果问题持续，请查看诊断信息。"}
            </p>
            {errorNotice.details ? (
            <p className="mt-1 max-w-full truncate text-xs text-red-100/60">
                详情：{errorNotice.details}
              </p>
            ) : null}
          </section>
        ) : null}

      <section className="relative min-h-0 flex-1 bg-transparent">
        {tabs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/50">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <MaterialSymbol name="terminal" className="text-[28px]" />
            </div>
            <p className="text-sm font-semibold text-white/70">没有打开的终端</p>
            <p className="mt-1 text-xs text-white/40">创建一个标签开始当前工作区会话。</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--color-primary))] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[0_0_28px_rgb(var(--color-primary)/0.35)] transition hover:bg-[rgb(var(--color-primary-hover))]"
              onClick={() => void handleCreateTab()}
            >
              <MaterialSymbol name="add" className="text-[18px]" />
              {text.newTab}
            </button>
          </div>
        ) : (
          <div className="h-full w-full">
            <div className="grid h-full w-full gap-px bg-white/5" style={paneGridStyle(paneLayout)}>
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
                const isPaneDropTarget =
                  dragState?.started && dragState.overPaneId === paneId;
                const paneAttachPhase = paneAttachPhases[paneId];
                const paneFatalError = paneFatalErrors[paneId];

                return (
                  <section
                    key={paneId}
                    data-terminal-pane-id={paneId}
                    aria-label={`${paneLabel(paneId)} 终端窗格`}
                    role="group"
                    tabIndex={0}
                    onClick={() => focusPane(paneId)}
                    onKeyDown={(event) => handlePaneKeyDown(event, paneId)}
                  className={`relative flex min-h-[12rem] min-w-[18rem] flex-col overflow-hidden bg-[#0b0f14] transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[rgb(var(--color-primary))] ${
                      focused || isPaneDropTarget
                      ? "ring-2 ring-[rgb(var(--color-primary)/0.70)] shadow-[0_0_28px_rgb(var(--color-primary)/0.25)]"
                      : "ring-1 ring-white/10"
                    }`}
                  >
                  {assignedTab ? (
                    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/5 bg-[rgb(var(--color-panel))] px-3 py-2">
                      <button
                        type="button"
                        data-terminal-tab-id={assignedTab.tabId}
                        className="group flex max-w-[13rem] cursor-default items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10.5px] text-white/60 transition hover:border-white/20 hover:text-white"
                        onPointerDown={(event) =>
                          handleTerminalTabPointerDown(assignedTab, event, "pane", paneId)
                        }
                        onContextMenu={(event) => handleOpenTabContextMenu(event, assignedTab)}
                        onClick={(event) => {
                          if (suppressTabClickRef.current) {
                            event.preventDefault();
                            event.stopPropagation();
                            suppressTabClickRef.current = false;
                            return;
                          }

                          event.stopPropagation();
                          void attachTab(assignedTab, paneId);
                        }}
                        title={`${paneLabel(paneId)} · ${assignedTab.label}`}
                      >
                        <MaterialSymbol name="terminal" className="text-[16px]" />
                        <span className="truncate text-xs font-semibold">{assignedTab.label}</span>
                        {paneSession ? (
                          <span className="text-[10px] font-semibold text-white/30">
                            {sessionStatusLabel(paneSession)}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  ) : null}
                    <div
                      ref={paneRefCallbacks[paneId]}
                      aria-label={`${paneLabel(paneId)} 终端输出`}
                      className={`min-h-0 flex-1 overflow-hidden ${
                        assignedTab ? "" : "opacity-40"
                      }`}
                    />
                    {!assignedTab ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-white/50">
                      <div className="flex max-w-xs flex-col items-center gap-3 text-xs">
                        <MaterialSymbol name="drag_indicator" className="text-[22px] opacity-70" />
                          <p className="leading-5">拖动标签到这里，或新建一个终端。</p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCreateTab(paneId);
                            }}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-white/10 hover:text-white"
                          >
                          <MaterialSymbol name="add" className="text-[16px]" />
                            新建终端
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {paneClosed ? (
                      <div className="pointer-events-none absolute inset-x-3 top-12 flex justify-center">
                      <div className="max-w-[min(34rem,calc(100%-1rem))] rounded-lg border border-white/10 bg-black/60 p-3 text-xs text-white/70 shadow-2xl backdrop-blur">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                            <span>当前状态：{paneSession ? sessionStatusLabel(paneSession) : "已退出"}</span>
                            <span>退出原因：{paneExitReason}</span>
                          </div>
                        <pre className="mt-2 max-h-24 overflow-hidden whitespace-pre-wrap break-words rounded border border-white/10 bg-[#0b0f14] p-2 font-mono text-[11px] leading-4 text-white/80">
                            {paneSnapshotText.trim() ? paneSnapshotText : "暂无可观察输出"}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                    {paneAttachPhase !== "idle" ? (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                        <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs font-medium text-white/70">
                          {paneAttachPhase === "reconnecting"
                            ? "Reconnecting..."
                            : "Connecting..."}
                        </div>
                      </div>
                    ) : null}
                    {paneFatalError && !paneClosed ? (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <div
                          className="max-w-[min(30rem,calc(100%-2rem))] rounded-lg border border-white/10 bg-black/60 px-4 py-2 text-center text-xs font-medium text-white/80"
                          title={paneFatalError}
                        >
                          Terminal crashed. Please reopen.
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
            {dragGhostTab && dragState?.started ? (
              <div
                aria-hidden="true"
                className="pointer-events-none fixed z-50 flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/30 bg-white/10 px-3 text-[10.5px] text-white shadow-2xl backdrop-blur"
                style={{
                  left: dragState.ghostLeft,
                  top: dragState.ghostTop,
                  width: dragState.ghostWidth || undefined,
                  height: dragState.ghostHeight || 28,
                }}
              >
                <MaterialSymbol name="terminal" className="text-[16px]" />
                <span className="truncate text-xs font-semibold">{dragGhostTab.label}</span>
                <MaterialSymbol name="close" className="text-[14px] text-white/40" />
              </div>
            ) : null}
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
              className="absolute left-3 right-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs shadow-2xl backdrop-blur"
              >
              <MaterialSymbol name="search" className="shrink-0 text-[16px] text-white/60" />
                <input
                  ref={findInputRef}
                  aria-label="查找终端文本"
                  value={findQuery}
                  onChange={(event) => setFindQuery(event.target.value)}
                  onKeyDown={handleFindKeyDown}
                className="h-7 w-44 min-w-[120px] flex-1 bg-transparent px-1 text-xs text-white/80 outline-none placeholder:text-white/40"
                  placeholder="查找文本"
                />
                <span
                  aria-label="查找结果"
                className={`min-w-[4rem] rounded px-2 py-1 text-right font-medium ${
                  findResult.errorMessage ? "text-red-100" : "text-white/50"
                  }`}
                >
                  {findStatus}
                </span>
                <button
                  type="button"
                  aria-label="上一个匹配项"
                  onClick={() => runFind("previous")}
                  disabled={!findQuery.trim() || findResult.total === 0}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="上一个"
                >
                <MaterialSymbol name="keyboard_arrow_up" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="下一个匹配项"
                  onClick={() => runFind("next")}
                  disabled={!findQuery.trim() || findResult.total === 0}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="下一个"
                >
                <MaterialSymbol name="keyboard_arrow_down" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="区分大小写"
                  onClick={() => toggleFindOption("caseSensitive")}
                className={`inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold transition hover:bg-white/10 hover:text-white ${
                  findOptions.caseSensitive ? "bg-white/15 text-white" : "text-white/50"
                  }`}
                  title="区分大小写"
                >
                Aa
                </button>
                <button
                  type="button"
                  aria-label="全字匹配"
                  onClick={() => toggleFindOption("wholeWord")}
                className={`inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold transition hover:bg-white/10 hover:text-white ${
                  findOptions.wholeWord ? "bg-white/15 text-white" : "text-white/50"
                  }`}
                  title="全字匹配"
                >
                ab
                </button>
                <button
                  type="button"
                  aria-label="正则查找"
                  onClick={() => toggleFindOption("regex")}
                className={`inline-flex h-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold transition hover:bg-white/10 hover:text-white ${
                  findOptions.regex ? "bg-white/15 text-white" : "text-white/50"
                  }`}
                  title="正则"
                >
                .*
                </button>
                <button
                  type="button"
                  aria-label="关闭终端查找"
                  onClick={closeFind}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
                  title="关闭"
                >
                <MaterialSymbol name="close" className="text-[16px]" />
                </button>
              </div>
            ) : null}
          </div>
        )}
        {isLoading && !errorNotice ? (
          <div className="pointer-events-none fixed inset-x-0 top-28 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-medium text-white/70 shadow-2xl backdrop-blur">
              <MaterialSymbol name="progress_activity" className="animate-spin text-[16px]" />
              正在连接终端
            </span>
          </div>
        ) : null}
        {tabContextMenu && contextMenuTab ? (
          <div
            role="menu"
            aria-label="终端标签菜单"
            className="fixed z-50 w-56 overflow-hidden rounded-xl border border-white/10 bg-[rgb(var(--color-panel-strong)/0.95)] p-1.5 text-xs text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
            style={{
              left: tabContextMenu.x,
              top: tabContextMenu.y,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <TerminalContextMenuButton
              icon="close"
              label="关闭标签"
              onSelect={() => {
                setTabContextMenu(null);
                void handleCloseTabFromBar(contextMenuTab);
              }}
            />
            <TerminalContextMenuButton
              icon="close"
              label="关闭其他标签"
              disabled={!contextMenuCanCloseOthers}
              onSelect={() => {
                setTabContextMenu(null);
                void handleCloseOtherTabs(contextMenuTab);
              }}
            />
            <TerminalContextMenuButton
              icon="close"
              label="关闭右侧标签"
              disabled={!contextMenuCanCloseRight}
              onSelect={() => {
                setTabContextMenu(null);
                void handleCloseRightTabs(contextMenuTab);
              }}
            />
            <TerminalContextMenuButton
              icon="push_pin"
              label={contextMenuTab.isPinned ? "取消置顶" : "置顶标签"}
              onSelect={() => {
                setTabContextMenu(null);
                void handlePinTab(contextMenuTab);
              }}
            />
            <div className="mx-1 my-1 h-px bg-white/10" />
            <TerminalContextMenuButton
              icon="crop_square"
              label="单窗格"
              disabled={paneLayout === "single"}
              onSelect={() => {
                setTabContextMenu(null);
                void handleTerminalContextLayout(contextMenuTab, "single");
              }}
            />
            <TerminalContextMenuButton
              icon="view_column"
              label="左右分屏"
              disabled={paneLayout === "splitVertical"}
              onSelect={() => {
                setTabContextMenu(null);
                void handleTerminalContextLayout(contextMenuTab, "splitVertical");
              }}
            />
            <TerminalContextMenuButton
              icon="view_stream"
              label="上下分屏"
              disabled={paneLayout === "splitHorizontal"}
              onSelect={() => {
                setTabContextMenu(null);
                void handleTerminalContextLayout(contextMenuTab, "splitHorizontal");
              }}
            />
            <TerminalContextMenuButton
              icon="grid_view"
              label="四宫格"
              disabled={paneLayout === "grid2x2"}
              onSelect={() => {
                setTabContextMenu(null);
                void handleTerminalContextLayout(contextMenuTab, "grid2x2");
              }}
            />
          </div>
        ) : null}
      </section>
      </section>
    </main>
  );
}

function TerminalContextMenuButton({
  icon,
  label,
  disabled = false,
  onSelect,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-semibold text-white transition hover:bg-white/15 hover:ring-1 hover:ring-white/10 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:bg-transparent disabled:hover:ring-0"
    >
      <MaterialSymbol name={icon} className="text-[17px] opacity-70" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
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

function createIdlePaneAttachPhases(): PaneAttachPhases {
  return {
    "pane-1": "idle",
    "pane-2": "idle",
    "pane-3": "idle",
    "pane-4": "idle",
  };
}

function createEmptyPaneFatalErrors(): PaneFatalErrors {
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
      return "check_circle";
    case "invalid":
      return "block";
    case "missing":
    default:
      return "warning";
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
