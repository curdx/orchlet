import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  TerminalOpenRequest,
  TerminalOpenResult,
  TerminalOutputEventPayload,
  TerminalSessionProfile,
} from "../../contracts/generated/terminal";
import { invokeCommand, isTauriRuntime } from "./client";

export const TERMINAL_OUTPUT_EVENT = "terminal-output";

export type TerminalOpenInput = {
  memberId?: string | null;
  attachCurrent?: boolean;
};

export type TerminalApi = {
  openTerminal: (input?: TerminalOpenInput) => Promise<TerminalOpenResult>;
  subscribeOutput: (
    handler: (event: TerminalOutputEventPayload) => void,
  ) => Promise<UnlistenFn>;
};

let browserSession: TerminalSessionProfile | null = null;

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

  async subscribeOutput(handler) {
    if (!isTauriRuntime()) {
      return () => undefined;
    }

    return listen<TerminalOutputEventPayload>(TERMINAL_OUTPUT_EVENT, (event) => {
      handler(event.payload);
    });
  },
};

function createBrowserSession(memberId: string | null): TerminalSessionProfile {
  const timestamp = Date.now();

  return {
    schemaVersion: 1,
    terminalSessionId: `browser-terminal-${timestamp}`,
    workspaceId: "browser-workspace",
    memberId,
    title: memberId ? "Member terminal" : "Workspace terminal",
    status: "running",
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
}
