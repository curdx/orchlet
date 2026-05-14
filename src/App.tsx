import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { TerminalPage } from "./pages/terminal";
import { WorkspaceSelectionPage } from "./pages/workspace-selection";
import { notificationApi, settingsApi, terminalApi, windowContextApi } from "./shared/api";
import { isTauriRuntime } from "./shared/api/client";
import { useToastStore, type ToastMessage } from "./shared/ui";
import type { NotificationApi } from "./shared/api/notification-api";
import type { TerminalApi } from "./shared/api/terminal-api";
import type {
  AppLanguage,
  AppTheme,
  NotificationUnreadSummary,
  OpenedWorkspace,
  ProfileAvatarSnapshot,
  ProfileSettingsSnapshot,
  ProfileStatus,
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

const APP_NAME = "golutra";

type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

type MainTabId = "chat" | "friends" | "workspaces" | "store" | "plugins" | "settings";

const SHELL_TEXT = {
  "zh-CN": {
    loading: "Loading",
    terminal: "Terminal",
    workspaces: "Workspaces",
    home: "Home",
    windowControls: {
      minimize: "最小化窗口",
      maximize: "最大化窗口",
      restore: "还原窗口",
      close: "关闭窗口",
    },
    nav: {
      chat: "聊天",
      friends: "成员",
      workspaces: "工作区",
      store: "技能商店",
      plugins: "插件",
      settings: "设置",
    },
    status: {
      label: "状态",
      online: "在线",
      working: "工作中",
      dnd: "免打扰",
      offline: "离线",
    },
    avatar: "用户头像",
  },
  "en-US": {
    loading: "Loading",
    terminal: "Terminal",
    workspaces: "Workspaces",
    home: "Home",
    windowControls: {
      minimize: "Minimize window",
      maximize: "Maximize window",
      restore: "Restore window",
      close: "Close window",
    },
    nav: {
      chat: "Chat",
      friends: "Friends",
      workspaces: "Workspaces",
      store: "Skill store",
      plugins: "Plugins",
      settings: "Settings",
    },
    status: {
      label: "Status",
      online: "Online",
      working: "Working",
      dnd: "Do not disturb",
      offline: "Offline",
    },
    avatar: "User avatar",
  },
} as const;

const NAV_ITEMS: Array<{ id: Exclude<MainTabId, "settings">; icon: string }> = [
  { id: "chat", icon: "chat_bubble" },
  { id: "friends", icon: "group" },
  { id: "workspaces", icon: "folder_open" },
  { id: "store", icon: "storefront" },
  { id: "plugins", icon: "extension" },
];

type AccountStatus = "online" | "working" | "dnd" | "offline";
type ContextMenuItem = {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  action: () => void | Promise<void>;
};
type ContextMenuEntry = ContextMenuItem | { kind: "separator"; id: string };
type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  entries: ContextMenuEntry[];
};

const DEFAULT_SHELL_PROFILE_SETTINGS: ProfileSettingsSnapshot = {
  schemaVersion: 1,
  displayName: "Owner",
  timezone: "UTC",
  status: "online",
  statusMessage: null,
  avatar: {
    kind: "placeholder",
    presetId: null,
    uploadId: null,
    sourceFileName: null,
    contentType: null,
    sizeBytes: null,
    libraryRelativePath: null,
    updatedAtMs: 1,
  },
  createdAtMs: 1,
  updatedAtMs: 1,
};

const NOTIFICATION_PREVIEW_TEXT = {
  "zh-CN": {
    fallbackWorkspace: "Owner",
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
    openAllTerminals: "打开全部终端",
    noUnreadConversations: "暂无未读会话",
    openAllUnread: "查看全部",
    openAllUnreadAccessible: "查看全部未读",
    ignoreAll: "忽略全部",
    dark: "深色",
    light: "浅色",
    english: "English",
    chinese: "中文",
    loadError: "无法加载未读状态。",
    actionError: "通知操作失败。",
  },
  "en-US": {
    fallbackWorkspace: "Owner",
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
    openAllTerminals: "Open all terminals",
    noUnreadConversations: "No unread conversations",
    openAllUnread: "View all",
    openAllUnreadAccessible: "View all unread",
    ignoreAll: "Ignore all",
    dark: "Dark",
    light: "Light",
    english: "English",
    chinese: "Chinese",
    loadError: "Unable to load unread status.",
    actionError: "Notification action failed.",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;

const CONTEXT_MENU_TEXT = {
  "zh-CN": {
    copy: "复制",
    cut: "剪切",
    paste: "粘贴",
    selectAll: "全选",
  },
  "en-US": {
    copy: "Copy",
    cut: "Cut",
    paste: "Paste",
    selectAll: "Select All",
  },
} as const;

function App() {
  const [windowContext, setWindowContext] = useState<WindowContextSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<MainTabId>("chat");
  const [localOpenedWorkspace, setLocalOpenedWorkspace] = useState<OpenedWorkspace | null>(null);
  const mode = windowContext?.currentWindow.mode ?? "workspaceSelection";
  const language = windowContext?.preferences.language ?? "zh-CN";
  const shellText = SHELL_TEXT[language];
  const activeWorkspace = windowContext?.activeWorkspace ?? localOpenedWorkspace;
  const effectiveWindowContext =
    activeWorkspace && windowContext ? { ...windowContext, activeWorkspace } : windowContext;
  const showWorkspaceSelection = activeTab === "workspaces" || !activeWorkspace;
  const windowTitle = getWindowTitle({
    mode,
    snapshot: effectiveWindowContext,
    showWorkspaceSelection,
    text: shellText,
  });
  const windowChrome = useWindowChrome(windowTitle, mode === "notificationPreview");
  const totalUnreadCount = useTotalUnreadCount(mode === "notificationPreview");

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
    document.documentElement.dataset.resolvedTheme =
      mode === "notificationPreview" ? "dark" : resolveTheme(windowContext.preferences.theme);
    document.documentElement.lang = windowContext.preferences.language;
    document.title = windowTitle;
  }, [windowContext, windowTitle]);

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

  return (
    <QueryClientProvider client={queryClient}>
      {mode === "terminal" ? (
        <AppWindowFrame title={windowTitle} isTerminal text={shellText} chrome={windowChrome}>
          <div className="terminal-surface-bridge">
            <TerminalPage
              snapshot={windowContext}
              onPreferencesChange={handlePreferencesChange}
              onOpenWindowMode={handleOpenWindowMode}
            />
          </div>
        </AppWindowFrame>
      ) : mode === "notificationPreview" ? (
        <NotificationPreviewPage
          snapshot={windowContext}
          onPreferencesChange={handlePreferencesChange}
          onOpenWindowMode={handleOpenWindowMode}
        />
      ) : (
        <AppWindowFrame
          title={windowTitle}
          isWorkspaceSelection={showWorkspaceSelection}
          text={shellText}
          chrome={windowChrome}
        >
          {showWorkspaceSelection ? (
            <div className="workspace-selection-window custom-scrollbar">
              <LegacyWorkspaceSurface
                windowContext={effectiveWindowContext}
                onPreferencesChange={handlePreferencesChange}
                onOpenWindowMode={handleOpenWindowMode}
                onWorkspaceOpened={(workspace) => {
                  setLocalOpenedWorkspace(workspace);
                  setActiveTab("chat");
                }}
              />
            </div>
          ) : (
            <div className="app-shell-main">
              <SidebarNav
                activeTab={activeTab}
                language={language}
                totalUnreadCount={totalUnreadCount}
                onChange={(tab) => {
                  if (tab === "workspaces") {
                    void handleOpenWindowMode("workspaceSelection");
                    return;
                  }

                  setActiveTab(tab);
                }}
              />
              <section className="app-shell-main__content glass-panel" aria-label={shellText.nav[activeTab]}>
                <LegacyWorkspaceSurface
                  windowContext={effectiveWindowContext}
                  onPreferencesChange={handlePreferencesChange}
                  onOpenWindowMode={handleOpenWindowMode}
                  onWorkspaceOpened={(workspace) => {
                    setLocalOpenedWorkspace(workspace);
                    setActiveTab("chat");
                  }}
                  compact
                  parityWorkbench
                  parityView={activeTab}
                />
              </section>
            </div>
          )}
        </AppWindowFrame>
      )}
      <ShellToastStack />
      <ContextMenuHost language={language} />
    </QueryClientProvider>
  );
}

function LegacyWorkspaceSurface({
  windowContext,
  onPreferencesChange,
  onOpenWindowMode,
  onWorkspaceOpened,
  compact = false,
  parityWorkbench = false,
  parityView = "chat",
}: {
  windowContext: WindowContextSnapshot | null;
  onPreferencesChange: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode: (mode: WindowMode) => Promise<void>;
  onWorkspaceOpened?: (workspace: OpenedWorkspace) => void;
  compact?: boolean;
  parityWorkbench?: boolean;
  parityView?: MainTabId;
}) {
  return (
    <div
      className={
        compact
          ? "workspace-selection-surface-bridge workspace-selection-surface-bridge--compact"
          : "workspace-selection-surface-bridge"
      }
    >
      <WorkspaceSelectionPage
        windowContext={windowContext}
        onPreferencesChange={onPreferencesChange}
        onOpenWindowMode={onOpenWindowMode}
        onWorkspaceOpened={onWorkspaceOpened}
        showCompatibilityControls={false}
        renderLocalToast={false}
        parityWorkbench={parityWorkbench}
        parityView={parityView}
      />
    </div>
  );
}

function AppWindowFrame({
  title,
  children,
  isTerminal = false,
  isWorkspaceSelection = false,
  text,
  chrome,
}: {
  title: string;
  children: ReactNode;
  isTerminal?: boolean;
  isWorkspaceSelection?: boolean;
  text: (typeof SHELL_TEXT)[AppLanguage];
  chrome: ReturnType<typeof useWindowChrome>;
}) {
  const frameClassName = [
    "window-frame",
    chrome.isMaximized ? "window-frame--max" : "",
    chrome.isFocused ? "" : "window-frame--inactive",
    chrome.isPointerReady ? "" : "window-frame--hover-stale",
  ]
    .filter(Boolean)
    .join(" ");
  const titlebarClassName = [
    "titlebar",
    chrome.isMacOS ? "titlebar--mac" : "",
    isWorkspaceSelection ? "titlebar--workspace" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={frameClassName} data-window-surface={isTerminal ? "terminal" : "main"}>
      <header
        className={titlebarClassName}
        data-tauri-drag-region=""
        onDoubleClick={chrome.handleToggleMaximize}
      >
        <div className="titlebar__left" data-tauri-drag-region="">
          <span className="titlebar__title">{title}</span>
        </div>
        {chrome.showWindowControls ? (
          <div
            className="titlebar__controls"
            data-tauri-drag-region="false"
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="titlebar__btn"
              aria-label={text.windowControls.minimize}
              title={text.windowControls.minimize}
              data-tauri-drag-region="false"
              onClick={chrome.handleMinimize}
            >
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <line
                  x1="1"
                  y1="5"
                  x2="9"
                  y2="5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="titlebar__btn"
              aria-label={
                chrome.isMaximized
                  ? text.windowControls.restore
                  : text.windowControls.maximize
              }
              title={
                chrome.isMaximized
                  ? text.windowControls.restore
                  : text.windowControls.maximize
              }
              data-tauri-drag-region="false"
              onClick={chrome.handleToggleMaximize}
            >
              <svg viewBox="0 0 10 10" aria-hidden="true">
                {chrome.isMaximized ? (
                  <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
                    <rect x="3" y="1.5" width="5.5" height="5.5" rx="0.6" />
                    <rect x="1.5" y="3" width="5.5" height="5.5" rx="0.6" />
                  </g>
                ) : (
                  <rect
                    x="2"
                    y="2"
                    width="6"
                    height="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    rx="0.6"
                  />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="titlebar__btn titlebar__btn--close"
              aria-label={text.windowControls.close}
              title={text.windowControls.close}
              data-tauri-drag-region="false"
              onClick={chrome.handleClose}
            >
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <line
                  x1="2"
                  y1="2"
                  x2="8"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <line
                  x1="8"
                  y1="2"
                  x2="2"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </header>
      <div className="window-body">{children}</div>
      {chrome.showResizeHandles ? (
        <div className="resize-handles" aria-hidden="true">
          <div
            className="resize-handle resize-handle--north"
            onPointerDown={() => chrome.handleResizeStart("North")}
          />
          <div
            className="resize-handle resize-handle--south"
            onPointerDown={() => chrome.handleResizeStart("South")}
          />
          <div
            className="resize-handle resize-handle--west"
            onPointerDown={() => chrome.handleResizeStart("West")}
          />
          <div
            className="resize-handle resize-handle--east"
            onPointerDown={() => chrome.handleResizeStart("East")}
          />
          <div
            className="resize-handle resize-handle--north-west"
            onPointerDown={() => chrome.handleResizeStart("NorthWest")}
          />
          <div
            className="resize-handle resize-handle--north-east"
            onPointerDown={() => chrome.handleResizeStart("NorthEast")}
          />
          <div
            className="resize-handle resize-handle--south-west"
            onPointerDown={() => chrome.handleResizeStart("SouthWest")}
          />
          <div
            className="resize-handle resize-handle--south-east"
            onPointerDown={() => chrome.handleResizeStart("SouthEast")}
          />
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({
  activeTab,
  language,
  totalUnreadCount,
  onChange,
}: {
  activeTab: MainTabId;
  language: AppLanguage;
  totalUnreadCount: number;
  onChange: (tab: MainTabId) => void;
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [fallbackAccountStatus, setFallbackAccountStatus] = useState<AccountStatus>("online");
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const [statusMenuPosition, setStatusMenuPosition] = useState({ top: 24, left: 88 });
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["profile-settings"],
    queryFn: settingsApi.getProfileSettings,
    enabled: isTauriRuntime(),
  });
  const profile = profileQuery.data?.profile ?? DEFAULT_SHELL_PROFILE_SETTINGS;
  const accountStatus = isTauriRuntime()
    ? profileStatusToAccountStatus(profile.status)
    : fallbackAccountStatus;
  const text = SHELL_TEXT[language];

  function updateStatusMenuPosition() {
    const anchor = avatarButtonRef.current;

    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const menuHeight = 196;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    setStatusMenuPosition({
      top: Math.max(12, Math.min(rect.top, viewportHeight - menuHeight - 12)),
      left: rect.right + 12,
    });
  }

  useEffect(() => {
    if (!statusMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest(".sidebar-nav__status-menu") ||
        target?.closest(".sidebar-nav__avatar-button")
      ) {
        return;
      }

      setStatusMenuOpen(false);
    }

    updateStatusMenuPosition();
    window.addEventListener("resize", updateStatusMenuPosition);
    window.addEventListener("scroll", updateStatusMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("resize", updateStatusMenuPosition);
      window.removeEventListener("scroll", updateStatusMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [statusMenuOpen]);

  return (
    <nav className="sidebar-nav custom-scrollbar" aria-label="Primary">
      <div className="sidebar-nav__status">
        <button
          ref={avatarButtonRef}
          type="button"
          className="sidebar-nav__avatar-button"
          aria-label={text.status.label}
          aria-expanded={statusMenuOpen}
          title={text.status.label}
          onClick={() => {
            updateStatusMenuPosition();
            setStatusMenuOpen((isOpen) => !isOpen);
          }}
        >
          <ShellProfileAvatar avatar={profile.avatar} displayName={profile.displayName} label={text.avatar} />
          <span className={`sidebar-nav__status-dot sidebar-nav__status-dot--${accountStatus}`} />
        </button>
        {statusMenuOpen ? createPortal(
          <div
            className="sidebar-nav__status-menu"
            role="menu"
            style={{
              "--status-menu-top": `${statusMenuPosition.top}px`,
              "--status-menu-left": `${statusMenuPosition.left}px`,
            } as CSSProperties}
          >
            <div className="sidebar-nav__status-title">{text.status.label}</div>
            {(["online", "working", "dnd", "offline"] as AccountStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                className="sidebar-nav__status-option"
                role="menuitemradio"
                aria-checked={accountStatus === status}
                onClick={() => {
                  setFallbackAccountStatus(status);
                  void updateShellProfileStatus({
                    nextStatus: status,
                    profile,
                    queryClient,
                  });
                  setStatusMenuOpen(false);
                }}
              >
                <span className={`sidebar-nav__status-choice sidebar-nav__status-choice--${status}`} />
                {text.status[status]}
                {accountStatus === status ? (
                  <MaterialSymbol name="check" className="sidebar-nav__status-check" />
                ) : null}
              </button>
            ))}
          </div>,
          document.body,
        ) : null}
      </div>

      <div className="sidebar-nav__divider" />

      <div className="sidebar-nav__items">
        {NAV_ITEMS.map((item) => (
          <div key={item.id} className="sidebar-nav__item">
            {activeTab === item.id ? <div className="sidebar-nav__active-rail" /> : null}
            <button
              type="button"
              className={
                activeTab === item.id
                  ? "sidebar-nav__button sidebar-nav__button--active"
                  : "sidebar-nav__button"
              }
              aria-label={text.nav[item.id]}
              title={text.nav[item.id]}
              onClick={() => {
                setStatusMenuOpen(false);
                onChange(item.id);
              }}
            >
              <MaterialSymbol name={item.icon} />
              {item.id === "chat" && totalUnreadCount > 0 ? (
                <span className="sidebar-nav__unread">{unreadBadgeLabel(totalUnreadCount)}</span>
              ) : null}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={
          activeTab === "settings"
            ? "sidebar-nav__settings sidebar-nav__settings--active"
            : "sidebar-nav__settings"
        }
        aria-label={text.nav.settings}
        title={text.nav.settings}
        onClick={() => {
          setStatusMenuOpen(false);
          onChange("settings");
        }}
      >
        <MaterialSymbol name="settings" />
      </button>
    </nav>
  );
}

function ShellProfileAvatar({
  avatar,
  displayName,
  label,
}: {
  avatar: ProfileAvatarSnapshot | null;
  displayName: string;
  label: string;
}) {
  const normalizedName = displayName.trim() || "Owner";

  if (avatar?.kind === "uploaded" && avatar.previewDataUrl) {
    return (
      <img
        src={avatar.previewDataUrl}
        alt={label}
        className="sidebar-nav__avatar sidebar-nav__avatar--image"
      />
    );
  }

  const initial = normalizedName.slice(0, 1).toLocaleUpperCase();

  return (
    <span className="sidebar-nav__avatar" aria-label={label}>
      {initial}
    </span>
  );
}

async function updateShellProfileStatus({
  nextStatus,
  profile,
  queryClient,
}: {
  nextStatus: AccountStatus;
  profile: ProfileSettingsSnapshot;
  queryClient: QueryClient;
}) {
  const status = accountStatusToProfileStatus(nextStatus);
  const optimisticProfile: ProfileSettingsSnapshot = {
    ...profile,
    status,
    updatedAtMs: Date.now(),
  };

  queryClient.setQueryData(["profile-settings"], { profile: optimisticProfile });

  if (!isTauriRuntime()) {
    return;
  }

  try {
    const result = await settingsApi.updateProfileSettings({
      displayName: profile.displayName,
      timezone: profile.timezone,
      status,
      statusMessage: profile.statusMessage ?? "",
    });
    queryClient.setQueryData(["profile-settings"], { profile: result.profile });
  } catch {
    queryClient.setQueryData(["profile-settings"], { profile });
  }
}

function profileStatusToAccountStatus(status: ProfileStatus): AccountStatus {
  return status === "doNotDisturb" ? "dnd" : status;
}

function accountStatusToProfileStatus(status: AccountStatus): ProfileStatus {
  return status === "dnd" ? "doNotDisturb" : status;
}

function ShellToastStack() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`toast-stack__item toast-stack__item--${toast.tone}`}
          role="status"
          onClick={() => removeToast(toast.id)}
        >
          <MaterialSymbol name={toastIcon(toast.tone)} className="toast-stack__icon" />
          <span>
            <strong>{toast.title}</strong>
            <small>{toast.message}</small>
            {toast.action ? <em>{toast.action}</em> : null}
          </span>
        </button>
      ))}
    </div>
  );
}

function ContextMenuHost({ language }: { language: AppLanguage }) {
  const [menu, setMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    entries: [],
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const text = CONTEXT_MENU_TEXT[language];

  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      if (event.defaultPrevented) {
        return;
      }

      const context = buildDefaultContextMenu(event, text);

      event.preventDefault();
      event.stopPropagation();
      setMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        entries: context,
      });
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu((current) => ({ ...current, open: false }));
      }
    }

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [text]);

  useEffect(() => {
    if (!menu.open) {
      return;
    }

    const panel = menuRef.current;

    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const padding = 8;
    const left = Math.min(menu.x, Math.max(padding, window.innerWidth - rect.width - padding));
    const top = Math.min(menu.y, Math.max(padding, window.innerHeight - rect.height - padding));

    if (left !== menu.x || top !== menu.y) {
      setMenu((current) => ({ ...current, x: Math.max(padding, left), y: Math.max(padding, top) }));
    }
  }, [menu.open, menu.x, menu.y]);

  if (!menu.open) {
    return null;
  }

  return (
    <div className="context-menu-host">
      <button
        type="button"
        className="context-menu-host__scrim"
        aria-label="Close context menu"
        onPointerDown={() => setMenu((current) => ({ ...current, open: false }))}
        onContextMenu={(event) => event.preventDefault()}
      />
      <div
        ref={menuRef}
        className="context-menu-panel"
        style={{ left: menu.x, top: menu.y }}
        role="menu"
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        {menu.entries.map((entry) =>
          "kind" in entry ? (
            <div key={entry.id} className="context-menu-panel__separator" />
          ) : (
            <button
              key={entry.id}
              type="button"
              className="context-menu-panel__item"
              disabled={!entry.enabled}
              role="menuitem"
              onClick={() => {
                if (!entry.enabled) {
                  return;
                }
                void entry.action();
                setMenu((current) => ({ ...current, open: false }));
              }}
            >
              <MaterialSymbol name={entry.icon} className="context-menu-panel__icon" />
              <span>{entry.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function MaterialSymbol({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

function useWindowChrome(title: string, disabled: boolean) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isPointerReady, setIsPointerReady] = useState(true);
  const pointerReadyListenerRef = useRef<(() => void) | null>(null);
  const wasFocusedRef = useRef(true);
  const isMacOS = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const isTauri = isTauriRuntime();

  function clearPointerReadyListener() {
    if (typeof window === "undefined" || !pointerReadyListenerRef.current) {
      return;
    }

    window.removeEventListener("pointermove", pointerReadyListenerRef.current);
    pointerReadyListenerRef.current = null;
  }

  function armPointerReadyReset() {
    if (typeof window === "undefined") {
      return;
    }

    clearPointerReadyListener();
    setIsPointerReady(false);
    const listener = () => {
      setIsPointerReady(true);
      clearPointerReadyListener();
    };
    pointerReadyListenerRef.current = listener;
    window.addEventListener("pointermove", listener, { once: true });
  }

  useEffect(() => {
    if (disabled || !isTauriRuntime()) {
      return;
    }

    void getCurrentWindow().setTitle(title).catch(() => undefined);
  }, [disabled, title]);

  useEffect(() => {
    if (disabled || !isTauriRuntime()) {
      return;
    }

    const appWindow = getCurrentWindow();
    let unlistenResize: (() => void) | null = null;
    let unlistenFocus: (() => void) | null = null;
    let disposed = false;

    async function refreshMaximized() {
      try {
        const maximized = await appWindow.isMaximized();
        if (!disposed) {
          setIsMaximized(maximized);
        }
      } catch {
        if (!disposed) {
          setIsMaximized(false);
        }
      }
    }

    void refreshMaximized();
    appWindow
      .onResized(() => {
        void refreshMaximized();
      })
      .then((unlisten) => {
        unlistenResize = unlisten;
      })
      .catch(() => undefined);
    appWindow
      .onFocusChanged((event) => {
        setIsFocused(event.payload);
        if (event.payload && !wasFocusedRef.current) {
          armPointerReadyReset();
        }
        wasFocusedRef.current = event.payload;
      })
      .then((unlisten) => {
        unlistenFocus = unlisten;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlistenResize?.();
      unlistenFocus?.();
      clearPointerReadyListener();
    };
  }, [disabled]);

  const handleMinimize = () => {
    if (!isTauriRuntime()) {
      return;
    }

    void getCurrentWindow().minimize().catch(() => undefined);
  };

  const handleToggleMaximize = () => {
    if (!isTauriRuntime()) {
      return;
    }

    void getCurrentWindow().toggleMaximize().catch(() => undefined);
  };

  const handleClose = () => {
    if (!isTauriRuntime()) {
      return;
    }

    armPointerReadyReset();
    void getCurrentWindow().close().catch(() => undefined);
  };

  const handleResizeStart = (direction: ResizeDirection) => {
    if (!isTauriRuntime()) {
      return;
    }

    void getCurrentWindow().startResizeDragging(direction).catch(() => undefined);
  };

  return {
    isMacOS,
    isMaximized,
    isFocused,
    isPointerReady,
    showWindowControls: isTauri && !isMacOS,
    showResizeHandles: isTauri,
    handleMinimize,
    handleToggleMaximize,
    handleClose,
    handleResizeStart,
  };
}

function useTotalUnreadCount(disabled: boolean) {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (disabled) {
      return;
    }

    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    async function loadUnreadSummary() {
      try {
        const result = await notificationApi.getUnreadSummary();
        if (!disposed) {
          setTotalUnreadCount(result.summary.totalUnreadCount);
        }

        unsubscribe = await notificationApi.subscribeUnreadSummary((summary) => {
          if (!disposed) {
            setTotalUnreadCount(summary.totalUnreadCount);
          }
        });

        if (disposed) {
          unsubscribe();
        }
      } catch {
        if (!disposed) {
          setTotalUnreadCount(0);
        }
      }
    }

    void loadUnreadSummary();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [disabled]);

  return totalUnreadCount;
}

function getWindowTitle({
  mode,
  snapshot,
  showWorkspaceSelection,
  text,
}: {
  mode: WindowMode;
  snapshot: WindowContextSnapshot | null;
  showWorkspaceSelection: boolean;
  text: (typeof SHELL_TEXT)[AppLanguage];
}) {
  if (mode === "notificationPreview") {
    return APP_NAME;
  }

  if (mode === "terminal") {
    const name = snapshot?.activeWorkspace?.metadata.name?.trim();
    return `${name ? `${name} - ${text.terminal}` : text.terminal} - ${APP_NAME}`;
  }

  if (showWorkspaceSelection) {
    return `${text.workspaces} - ${APP_NAME}`;
  }

  const workspaceName = snapshot?.activeWorkspace?.metadata.name?.trim();
  return `${workspaceName || text.home} - ${APP_NAME}`;
}

function resolveTheme(theme: AppTheme) {
  if (theme !== "system") {
    return theme;
  }

  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function NotificationPreviewPage({
  snapshot,
  api = notificationApi,
  terminalApi: terminalsApi = terminalApi,
  onPreferencesChange: _onPreferencesChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot | null;
  api?: Pick<
    NotificationApi,
    | "getUnreadSummary"
    | "subscribeUnreadSummary"
    | "dispatchNavigation"
    | "ignoreAllUnread"
    | "setPreviewHovered"
    | "hidePreview"
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
      await hidePreviewBestEffort();
      await action();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : text.actionError);
    } finally {
      setIsActionPending(false);
    }
  }

  async function hidePreviewBestEffort() {
    try {
      await api.hidePreview();
    } catch {
      // The navigation/ignore action should still run if the native preview is already closed.
    }
  }

  function handlePreviewHover(hovered: boolean) {
    void api.setPreviewHovered(hovered);
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

  async function handleOpenAllMemberTerminals() {
    const terminalTargets = conversations
      .map((conversation) => conversation.terminalMemberId)
      .filter((memberId): memberId is string => Boolean(memberId));

    if (terminalTargets.length === 0) {
      return;
    }

    await runPreviewAction(async () => {
      for (const memberId of terminalTargets) {
        await terminalsApi.openTerminal({ memberId });
      }
    });
  }

  return (
    <main className="notification-preview-root">
      <section
        className="notification-preview-card"
        aria-labelledby="notification-preview-title"
        onMouseEnter={() => handlePreviewHover(true)}
        onMouseLeave={() => handlePreviewHover(false)}
      >
        <header className="notification-preview-header">
          <div className="notification-preview-title">
            <h1>{workspaceLabel.trim() || "Owner"}</h1>
            <h2 id="notification-preview-title" className="notification-preview__sr-only">
              {text.unreadStatus}
            </h2>
          </div>
          {totalUnreadCount > 0 ? (
            <span aria-label={text.totalUnreadLabel} className="notification-preview-count">
              {unreadBadgeLabel(totalUnreadCount)}
            </span>
          ) : (
            <span aria-label={text.totalUnreadLabel} className="notification-preview__sr-only">
              0
            </span>
          )}
        </header>

        <span className="notification-preview__sr-only">
          {summary?.tray.hasUnread
            ? `${text.trayPrefix} ${summary.tray.badgeLabel ?? summary.tray.unreadCount}`
            : text.noUnread}
        </span>

        <div className="notification-preview-body">
          {errorMessage ? (
            <p className="notification-preview-error">{errorMessage}</p>
          ) : null}
          <ul className="notification-preview-list" aria-label={text.unreadConversationList}>
            {conversations.length > 0 ? (
              conversations.map((conversation) => {
                const tagLabel =
                  conversation.terminalMemberId
                    ? language === "zh-CN" ? "私聊" : "DM"
                    : language === "zh-CN" ? "群聊" : "Channel";

                return (
                  <li key={conversation.conversationId} className="notification-preview-item">
                    <span className="notification-preview-avatar notification-preview-avatar--fallback" />
                    <div className="notification-preview-detail">
                      <div className="notification-preview-meta-row">
                        <div className="notification-preview-meta-left">
                          <span className="notification-preview-tag">{tagLabel}</span>
                          <span className="notification-preview-meta-text">
                            {conversation.title}
                          </span>
                        </div>
                        {conversation.unreadCount > 0 ? (
                          <span className="notification-preview-count notification-preview-count--secondary notification-preview-count--meta">
                            {unreadBadgeLabel(conversation.unreadCount)}
                          </span>
                        ) : null}
                      </div>
                      <div className="notification-preview-main-row">
                        <button
                          type="button"
                          onClick={() => void handleOpenConversation(conversation.conversationId)}
                          disabled={isActionPending}
                          aria-label={`${text.openConversationPrefix} ${conversation.title}`}
                          className="notification-preview-content"
                        >
                          <span className="notification-preview-text">
                            <span className="notification-preview-preview">
                              {conversation.lastMessagePreview ?? text.noPreview}
                            </span>
                          </span>
                        </button>
                        <div className="notification-preview-item-actions">
                          {conversation.terminalMemberId ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleOpenMemberTerminal(conversation.terminalMemberId!)
                              }
                              disabled={isActionPending}
                              className="notification-preview-action notification-preview-action--compact"
                            >
                              {text.openTerminal}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="notification-preview__sr-only">{text.noUnreadConversations}</li>
            )}
          </ul>
        </div>

        <footer className="notification-preview-footer">
          {conversations.some((conversation) => conversation.terminalMemberId) ? (
            <button
              type="button"
              className="notification-preview-action"
              onClick={() => void handleOpenAllMemberTerminals()}
              disabled={isActionPending}
            >
              {text.openAllTerminals}
            </button>
          ) : null}
          <div className="notification-preview-actions">
            <button
              type="button"
              className="notification-preview-action"
              onClick={() => void handleIgnoreAllUnread()}
              disabled={isActionPending}
            >
              {text.ignoreAll}
            </button>
            <button
              type="button"
              className="notification-preview-action"
              aria-label={text.openAllUnreadAccessible}
              onClick={() => void handleOpenAllUnread()}
              disabled={isActionPending}
            >
              {text.openAllUnread}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function unreadBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function toastIcon(tone: ToastMessage["tone"]) {
  if (tone === "error") {
    return "error";
  }
  if (tone === "warning") {
    return "warning";
  }
  return "info";
}

function buildDefaultContextMenu(
  event: MouseEvent,
  text: (typeof CONTEXT_MENU_TEXT)[AppLanguage],
): ContextMenuEntry[] {
  const target = resolveContextMenuTarget(event);
  const input = target?.closest("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
  const editable = resolveEditableElement(target);
  const selectionText = input ? selectedInputText(input) : window.getSelection()?.toString() ?? "";
  const isEditable =
    Boolean(input || editable) && !(input?.readOnly ?? false) && !(input?.disabled ?? false);

  return [
    {
      id: "copy",
      label: text.copy,
      icon: "content_copy",
      enabled: selectionText.length > 0,
      action: async () => {
        focusContextTarget(input, editable);
        if (!document.execCommand("copy")) {
          await writeClipboardText(selectionText);
        }
      },
    },
    {
      id: "cut",
      label: text.cut,
      icon: "content_cut",
      enabled: isEditable && selectionText.length > 0,
      action: async () => {
        focusContextTarget(input, editable);
        if (!document.execCommand("cut")) {
          await writeClipboardText(selectionText);
        }
      },
    },
    {
      id: "paste",
      label: text.paste,
      icon: "content_paste",
      enabled: isEditable,
      action: async () => {
        focusContextTarget(input, editable);
        const clipboardText = await readClipboardText();

        if (!clipboardText) {
          return;
        }

        if (input) {
          insertTextIntoInput(input, clipboardText);
        } else {
          document.execCommand("insertText", false, clipboardText);
        }
      },
    },
    { kind: "separator", id: "edit-separator" },
    {
      id: "select-all",
      label: text.selectAll,
      icon: "select_all",
      enabled: isEditable,
      action: () => {
        focusContextTarget(input, editable);
        document.execCommand("selectAll");
      },
    },
  ];
}

function resolveContextMenuTarget(event: MouseEvent) {
  if (typeof event.composedPath === "function") {
    const path = event.composedPath();
    const element = path.find((entry): entry is HTMLElement => entry instanceof HTMLElement);

    if (element) {
      return element;
    }
  }

  return event.target instanceof HTMLElement ? event.target : null;
}

function resolveEditableElement(target: HTMLElement | null) {
  if (!target) {
    return null;
  }

  const editable = target.closest('[contenteditable="true"], [contenteditable=""]');

  if (editable instanceof HTMLElement) {
    return editable;
  }

  return target.isContentEditable ? target : null;
}

function selectedInputText(input: HTMLInputElement | HTMLTextAreaElement) {
  const start = input.selectionStart;
  const end = input.selectionEnd;

  if (start === null || end === null || end <= start) {
    return "";
  }

  return input.value.slice(start, end);
}

function focusContextTarget(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  editable: HTMLElement | null,
) {
  if (input) {
    input.focus();
    return;
  }

  editable?.focus();
}

function insertTextIntoInput(input: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const nextValue = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
  const nextPosition = start + text.length;

  input.value = nextValue;
  input.setSelectionRange(nextPosition, nextPosition);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function writeClipboardText(text: string) {
  if (!text || !navigator.clipboard?.writeText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard permissions are best-effort in browser previews.
  }
}

async function readClipboardText() {
  if (!navigator.clipboard?.readText) {
    return "";
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

export default App;
