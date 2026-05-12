import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  TerminalAttachRequest,
  TerminalAttachResult,
  TerminalCloseRequest,
  TerminalCloseResult,
  TerminalInputRequest,
  TerminalInputResult,
  TerminalOpenRequest,
  TerminalOpenResult,
  TerminalOutputEventPayload,
  TerminalResizeRequest,
  TerminalResizeResult,
  TerminalSessionProfile,
  TerminalStatusEventPayload,
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

export type TerminalApi = {
  openTerminal: (input?: TerminalOpenInput) => Promise<TerminalOpenResult>;
  attachTerminal: (input?: TerminalAttachInput) => Promise<TerminalAttachResult>;
  sendInput: (request: TerminalInputRequest) => Promise<TerminalInputResult>;
  resizeTerminal: (request: TerminalResizeRequest) => Promise<TerminalResizeResult>;
  closeTerminal: (request: TerminalCloseRequest) => Promise<TerminalCloseResult>;
  subscribeOutput: (
    handler: (event: TerminalOutputEventPayload) => void,
  ) => Promise<UnlistenFn>;
  subscribeStatus: (
    handler: (event: TerminalStatusEventPayload) => void,
  ) => Promise<UnlistenFn>;
};

let browserSession: TerminalSessionProfile | null = null;
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
      };
      emitBrowserStatus(browserSession);

      return { session: browserSession };
    }

    return invokeCommand<TerminalCloseResult>("terminal_close", { request });
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

  return {
    schemaVersion: 1,
    terminalSessionId: "01K00000000000000000000090",
    workspaceId: "browser-workspace",
    memberId,
    title: memberId ? "Member terminal" : "Workspace terminal",
    status: "running",
    cols: 120,
    rows: 30,
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
}

function requireBrowserSession(terminalSessionId?: string | null): TerminalSessionProfile {
  if (!browserSession) {
    browserSession = createBrowserSession(null);
  }

  if (
    terminalSessionId &&
    terminalSessionId !== browserSession.terminalSessionId
  ) {
    throw browserTerminalError("terminal.session.notFound", "未找到终端会话。");
  }

  return browserSession;
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
    emittedAtMs: Date.now(),
  };

  browserStatusHandlers.forEach((handler) => handler(event));
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
