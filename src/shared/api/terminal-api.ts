import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  TerminalAttachRequest,
  TerminalAttachResult,
  TerminalCloseRequest,
  TerminalCloseResult,
  TerminalEnvironmentsListRequest,
  TerminalEnvironmentsListResult,
  TerminalInputRequest,
  TerminalInputResult,
  TerminalOpenRequest,
  TerminalOpenResult,
  TerminalOutputEventPayload,
  TerminalResizeRequest,
  TerminalResizeResult,
  TerminalSessionProfile,
  TerminalStatusEventPayload,
  TerminalTabCloseRequest,
  TerminalTabCloseResult,
  TerminalTabCreateRequest,
  TerminalTabCreateResult,
  TerminalTabProfile,
  TerminalTabRestoreRequest,
  TerminalTabRestoreResult,
  TerminalTabStatus,
  TerminalTabUpdateRequest,
  TerminalTabUpdateResult,
  TerminalTabsListRequest,
  TerminalTabsListResult,
} from "../../contracts/generated/terminal";
import type { AppError } from "../../contracts/generated/common";
import { invokeCommand, isTauriRuntime } from "./client";

export const TERMINAL_OUTPUT_EVENT = "terminal-output";
export const TERMINAL_STATUS_CHANGE_EVENT = "terminal-status-change";

export type TerminalOpenInput = {
  memberId?: string | null;
  attachCurrent?: boolean;
};

export type TerminalAttachInput = {
  terminalSessionId?: string | null;
};

export type TerminalTabCreateInput = {
  memberId?: string | null;
  label?: string | null;
};

export type TerminalApi = {
  openTerminal: (input?: TerminalOpenInput) => Promise<TerminalOpenResult>;
  attachTerminal: (input?: TerminalAttachInput) => Promise<TerminalAttachResult>;
  sendInput: (request: TerminalInputRequest) => Promise<TerminalInputResult>;
  resizeTerminal: (request: TerminalResizeRequest) => Promise<TerminalResizeResult>;
  closeTerminal: (request: TerminalCloseRequest) => Promise<TerminalCloseResult>;
  listTabs: () => Promise<TerminalTabsListResult>;
  listEnvironments: () => Promise<TerminalEnvironmentsListResult>;
  createTab: (input?: TerminalTabCreateInput) => Promise<TerminalTabCreateResult>;
  closeTab: (request: TerminalTabCloseRequest) => Promise<TerminalTabCloseResult>;
  restoreTab: (request: TerminalTabRestoreRequest) => Promise<TerminalTabRestoreResult>;
  updateTab: (request: TerminalTabUpdateRequest) => Promise<TerminalTabUpdateResult>;
  subscribeOutput: (
    handler: (event: TerminalOutputEventPayload) => void,
  ) => Promise<UnlistenFn>;
  subscribeStatus: (
    handler: (event: TerminalStatusEventPayload) => void,
  ) => Promise<UnlistenFn>;
};

let browserSession: TerminalSessionProfile | null = null;
const browserSessions = new Map<string, TerminalSessionProfile>();
let browserTabs: TerminalTabProfile[] = [];
let browserActiveTabId: string | null = null;
let browserIdCounter = 90;
const browserStatusHandlers = new Set<(event: TerminalStatusEventPayload) => void>();

export const terminalApi: TerminalApi = {
  async openTerminal(input = {}) {
    const request: TerminalOpenRequest = {
      memberId: input.memberId ?? null,
      attachCurrent: input.attachCurrent ?? false,
    };

    if (!isTauriRuntime()) {
      const shouldCreateSession =
        browserSession === null ||
        (!request.attachCurrent && browserSession.memberId !== request.memberId);
      const sessionCreated = shouldCreateSession;
      if (shouldCreateSession || !browserSession) {
        browserSession = createBrowserSession(request.memberId);
        ensureBrowserTabForSession(browserSession);
      }
      const session = browserSession;

      return {
        window: {
          label: "terminal",
          mode: "terminal",
        },
        windowOpened: true,
        session,
        sessionCreated,
      };
    }

    return invokeCommand<TerminalOpenResult>("terminal_open", { request });
  },

  async attachTerminal(input = {}) {
    const request: TerminalAttachRequest = {
      terminalSessionId: input.terminalSessionId ?? null,
    };

    if (!isTauriRuntime()) {
      const session = requireBrowserSession(request.terminalSessionId);
      emitBrowserStatus(session);

      return { session };
    }

    return invokeCommand<TerminalAttachResult>("terminal_attach", { request });
  },

  async sendInput(request) {
    if (!isTauriRuntime()) {
      const session = requireRunningBrowserSession(request.terminalSessionId);
      browserSession = touchBrowserSession(session);
      browserSessions.set(browserSession.terminalSessionId, browserSession);

      return { session: browserSession };
    }

    return invokeCommand<TerminalInputResult>("terminal_input", { request });
  },

  async resizeTerminal(request) {
    if (!isTauriRuntime()) {
      const session = requireRunningBrowserSession(request.terminalSessionId);
      browserSession = {
        ...touchBrowserSession(session),
        cols: request.cols,
        rows: request.rows,
      };
      browserSessions.set(browserSession.terminalSessionId, browserSession);
      emitBrowserStatus(browserSession);

      return { session: browserSession };
    }

    return invokeCommand<TerminalResizeResult>("terminal_resize", { request });
  },

  async closeTerminal(request) {
    if (!isTauriRuntime()) {
      const session = requireBrowserSession(request.terminalSessionId);
      browserSession = {
        ...touchBrowserSession(session),
        status: "exited",
        exitReason: browserClosedExitReason(),
      };
      browserSessions.set(browserSession.terminalSessionId, browserSession);
      emitBrowserStatus(browserSession);

      return { session: browserSession };
    }

    return invokeCommand<TerminalCloseResult>("terminal_close", { request });
  },

  async listTabs() {
    if (!isTauriRuntime()) {
      if (!browserSession) {
        browserSession = createBrowserSession(null);
      }
      ensureBrowserTabForSession(browserSession);

      return {
        tabs: orderedBrowserTabs(),
        activeTabId: browserActiveTabId,
      };
    }

    const request: TerminalTabsListRequest = {};
    return invokeCommand<TerminalTabsListResult>("terminal_tabs_list", { request });
  },

  async listEnvironments() {
    if (!isTauriRuntime()) {
      return {
        environments: [
          {
            schemaVersion: 1,
            environmentId: "browser:shell",
            label: "Browser shell",
            kind: "shell",
            source: "system",
            command: "browser-shell",
            resolvedPath: "browser-shell",
            memberId: null,
            status: "available",
            message: "终端环境可用。",
            userAction: "可以直接启动该终端环境。",
            details: null,
          },
        ],
      };
    }

    const request: TerminalEnvironmentsListRequest = {};
    return invokeCommand<TerminalEnvironmentsListResult>("terminal_environments_list", {
      request,
    });
  },

  async createTab(input = {}) {
    const request: TerminalTabCreateRequest = {
      memberId: input.memberId ?? null,
      label: input.label ?? null,
    };

    if (!isTauriRuntime()) {
      const session = createBrowserSession(request.memberId);
      browserSession = session;
      const tab = createBrowserTab(
        session,
        request.label?.trim() || session.title,
        orderedBrowserTabs().length,
      );
      browserTabs = [...browserTabs, tab];
      browserActiveTabId = tab.tabId;
      emitBrowserStatus(session);

      return {
        tab,
        session,
        tabs: orderedBrowserTabs(),
      };
    }

    return invokeCommand<TerminalTabCreateResult>("terminal_tab_create", { request });
  },

  async closeTab(request) {
    if (!isTauriRuntime()) {
      const tab = requireBrowserTab(request.tabId);
      const session = requireBrowserSession(tab.terminalSessionId);
      const closedSession = {
        ...touchBrowserSession(session),
        status: "exited" as const,
        exitReason: browserClosedExitReason(),
      };
      browserSession = closedSession;
      browserSessions.set(closedSession.terminalSessionId, closedSession);
      const closedAtMs = Date.now();
      browserTabs = browserTabs.map((item) =>
        item.tabId === tab.tabId
          ? {
              ...item,
              status: "closed" as TerminalTabStatus,
              updatedAtMs: closedAtMs,
              closedAtMs,
            }
          : item,
      );
      browserActiveTabId = nextOpenBrowserTabId();
      emitBrowserStatus(closedSession);

      return {
        tab: requireBrowserTab(tab.tabId),
        session: closedSession,
        tabs: orderedBrowserTabs(),
      };
    }

    return invokeCommand<TerminalTabCloseResult>("terminal_tab_close", { request });
  },

  async restoreTab(request) {
    if (!isTauriRuntime()) {
      const tab = requireBrowserTab(request.tabId);
      const session = createBrowserSession(tab.memberId);
      browserSession = session;
      browserTabs = browserTabs.map((item) =>
        item.tabId === tab.tabId
          ? {
              ...item,
              terminalSessionId: session.terminalSessionId,
              status: "open" as TerminalTabStatus,
              updatedAtMs: session.updatedAtMs,
              closedAtMs: null,
            }
          : item,
      );
      browserActiveTabId = tab.tabId;
      emitBrowserStatus(session);

      return {
        tab: requireBrowserTab(tab.tabId),
        session,
        tabs: orderedBrowserTabs(),
      };
    }

    return invokeCommand<TerminalTabRestoreResult>("terminal_tab_restore", { request });
  },

  async updateTab(request) {
    if (!isTauriRuntime()) {
      const tab = requireBrowserTab(request.tabId);
      browserTabs = browserTabs.map((item) =>
        item.tabId === tab.tabId
          ? {
              ...item,
              label: request.label ?? item.label,
              isPinned: request.isPinned ?? item.isPinned,
              sortIndex: request.sortIndex ?? item.sortIndex,
              updatedAtMs: Date.now(),
            }
          : item,
      );

      return {
        tab: requireBrowserTab(tab.tabId),
        tabs: orderedBrowserTabs(),
      };
    }

    return invokeCommand<TerminalTabUpdateResult>("terminal_tab_update", { request });
  },

  async subscribeOutput(handler) {
    if (!isTauriRuntime()) {
      return () => undefined;
    }

    return listen<TerminalOutputEventPayload>(TERMINAL_OUTPUT_EVENT, (event) => {
      handler(event.payload);
    });
  },

  async subscribeStatus(handler) {
    if (!isTauriRuntime()) {
      browserStatusHandlers.add(handler);
      return () => {
        browserStatusHandlers.delete(handler);
      };
    }

    return listen<TerminalStatusEventPayload>(TERMINAL_STATUS_CHANGE_EVENT, (event) => {
      handler(event.payload);
    });
  },
};

function createBrowserSession(memberId: string | null): TerminalSessionProfile {
  const timestamp = Date.now();

  const session: TerminalSessionProfile = {
    schemaVersion: 1,
    terminalSessionId: nextBrowserUlid(),
    workspaceId: "browser-workspace",
    memberId,
    title: memberId ? "Member terminal" : "Workspace terminal",
    status: "running",
    cols: 120,
    rows: 30,
    snapshot: {
      lastSeq: 0,
      text: "",
      truncated: false,
      updatedAtMs: null,
    },
    exitReason: null,
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
  browserSessions.set(session.terminalSessionId, session);

  return session;
}

function createBrowserTab(
  session: TerminalSessionProfile,
  label: string,
  sortIndex: number,
): TerminalTabProfile {
  return {
    schemaVersion: 1,
    tabId: nextBrowserUlid(),
    workspaceId: session.workspaceId,
    terminalSessionId: session.terminalSessionId,
    memberId: session.memberId,
    label,
    shell: session.memberId ? "member terminal" : "browser shell",
    status: "open",
    isPinned: false,
    sortIndex,
    createdAtMs: session.createdAtMs,
    updatedAtMs: session.updatedAtMs,
    closedAtMs: null,
  };
}

function ensureBrowserTabForSession(session: TerminalSessionProfile) {
  const existing = browserTabs.find(
    (tab) => tab.terminalSessionId === session.terminalSessionId,
  );

  if (existing) {
    browserActiveTabId = existing.tabId;
    return existing;
  }

  const tab = createBrowserTab(session, session.title, orderedBrowserTabs().length);
  browserTabs = [...browserTabs, tab];
  browserActiveTabId = tab.tabId;

  return tab;
}

function requireBrowserSession(terminalSessionId?: string | null): TerminalSessionProfile {
  if (!browserSession) {
    browserSession = createBrowserSession(null);
  }

  if (!terminalSessionId) {
    return browserSession;
  }

  const session = browserSessions.get(terminalSessionId);

  if (!session) {
    throw browserTerminalError("terminal.session.notFound", "未找到终端会话。");
  }

  return session;
}

function requireBrowserTab(tabId: string): TerminalTabProfile {
  const tab = browserTabs.find((item) => item.tabId === tabId);

  if (!tab) {
    throw browserTerminalError("terminal.tab.notFound", "未找到终端标签。");
  }

  return tab;
}

function requireRunningBrowserSession(terminalSessionId: string): TerminalSessionProfile {
  const session = requireBrowserSession(terminalSessionId);

  if (session.status === "exited") {
    throw browserTerminalError("terminal.session.closed", "终端会话已关闭。");
  }

  return session;
}

function touchBrowserSession(session: TerminalSessionProfile): TerminalSessionProfile {
  return {
    ...session,
    updatedAtMs: Date.now(),
  };
}

function emitBrowserStatus(session: TerminalSessionProfile) {
  const event: TerminalStatusEventPayload = {
    schemaVersion: session.schemaVersion,
    terminalSessionId: session.terminalSessionId,
    workspaceId: session.workspaceId,
    memberId: session.memberId,
    title: session.title,
    status: session.status,
    cols: session.cols,
    rows: session.rows,
    snapshot: session.snapshot,
    exitReason: session.exitReason,
    emittedAtMs: Date.now(),
  };

  browserStatusHandlers.forEach((handler) => handler(event));
}

function browserClosedExitReason() {
  return {
    code: "closedByUser",
    message: "用户关闭了终端会话。",
    occurredAtMs: Date.now(),
  };
}

function orderedBrowserTabs() {
  return [...browserTabs].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.createdAtMs - right.createdAtMs || left.tabId.localeCompare(right.tabId);
  });
}

function nextOpenBrowserTabId() {
  return orderedBrowserTabs().find((tab) => tab.status === "open")?.tabId ?? null;
}

function nextBrowserUlid() {
  const suffix = String(browserIdCounter++).padStart(2, "0");
  return `01K000000000000000000000${suffix}`;
}

function browserTerminalError(code: string, message: string): AppError {
  return {
    code,
    message,
    severity: "error",
    recoverable: true,
    userAction: "请重新打开终端会话后重试。",
    details: null,
    correlationId: null,
  };
}
