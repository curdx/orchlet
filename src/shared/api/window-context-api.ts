import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type {
  AppLanguage,
  AppTheme,
  RegisteredWindow,
  WindowContextSnapshot,
  WindowMode,
} from "../../contracts/generated/workspace";
import { invokeCommand, isTauriRuntime } from "./client";

export const WINDOW_CONTEXT_CHANGED_EVENT = "window-context-changed";
export const APP_PREFERENCES_CHANGED_EVENT = "app-preferences-changed";

type WindowContextUpdate = {
  theme?: AppTheme | null;
  language?: AppLanguage | null;
};

export type WindowContextApi = {
  getCurrentWindow: () => RegisteredWindow;
  registerCurrentWindow: () => Promise<WindowContextSnapshot>;
  updatePreferences: (update: WindowContextUpdate) => Promise<WindowContextSnapshot>;
  openWindowMode: (mode: WindowMode) => Promise<void>;
  subscribe: (handler: (snapshot: WindowContextSnapshot) => void) => Promise<UnlistenFn>;
};

let browserSnapshot: WindowContextSnapshot = createBrowserSnapshot();

export const windowContextApi: WindowContextApi = {
  getCurrentWindow() {
    if (!isTauriRuntime()) {
      return browserSnapshot.currentWindow;
    }

    const label = getCurrentWebviewWindow().label;
    return {
      label,
      mode: modeFromLabel(label),
    };
  },

  async registerCurrentWindow() {
    const window = this.getCurrentWindow();

    if (!isTauriRuntime()) {
      browserSnapshot = { ...browserSnapshot, currentWindow: window };
      return browserSnapshot;
    }

    return invokeCommand<WindowContextSnapshot>("window_context_register", {
      request: window,
    });
  },

  async updatePreferences(update) {
    if (!isTauriRuntime()) {
      browserSnapshot = {
        ...browserSnapshot,
        preferences: {
          theme: update.theme ?? browserSnapshot.preferences.theme,
          language: update.language ?? browserSnapshot.preferences.language,
        },
        updatedAtMs: Date.now(),
        sourceWindowLabel: browserSnapshot.currentWindow.label,
      };
      return browserSnapshot;
    }

    return invokeCommand<WindowContextSnapshot>("app_preferences_update", {
      request: {
        theme: update.theme ?? null,
        language: update.language ?? null,
        sourceWindowLabel: this.getCurrentWindow().label,
      },
    });
  },

  async openWindowMode(mode) {
    if (!isTauriRuntime()) {
      return;
    }

    await invokeCommand("window_open_mode", {
      request: { mode },
    });
  },

  async subscribe(handler) {
    if (!isTauriRuntime()) {
      return () => undefined;
    }

    return listen<WindowContextSnapshot>(WINDOW_CONTEXT_CHANGED_EVENT, (event) => {
      handler({
        ...event.payload,
        currentWindow: this.getCurrentWindow(),
      });
    });
  },
};

function createBrowserSnapshot(): WindowContextSnapshot {
  return {
    schemaVersion: 1,
    currentWindow: {
      label: "main",
      mode: "workspaceSelection",
    },
    activeWorkspace: null,
    preferences: {
      theme: "system",
      language: "zh-CN",
    },
    updatedAtMs: Date.now(),
    sourceWindowLabel: null,
  };
}

function modeFromLabel(label: string): WindowMode {
  switch (label) {
    case "terminal":
      return "terminal";
    case "notification-preview":
      return "notificationPreview";
    case "workspace-selection":
      return "workspaceSelection";
    case "main":
    default:
      return "main";
  }
}
