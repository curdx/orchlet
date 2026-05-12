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

const BROWSER_PREFERENCES_STORAGE_KEY = "orchlet.appPreferences";

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
      browserSnapshot = { ...createBrowserSnapshot(), currentWindow: window };
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
      saveBrowserPreferences(browserSnapshot.preferences);
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

    const handleSnapshot = (event: { payload: WindowContextSnapshot }) => {
      handler({
        ...event.payload,
        currentWindow: this.getCurrentWindow(),
      });
    };
    const unlistenContext = await listen<WindowContextSnapshot>(
      WINDOW_CONTEXT_CHANGED_EVENT,
      handleSnapshot,
    );
    const unlistenPreferences = await listen<WindowContextSnapshot>(
      APP_PREFERENCES_CHANGED_EVENT,
      handleSnapshot,
    );

    return () => {
      unlistenContext();
      unlistenPreferences();
    };
  },
};

function createBrowserSnapshot(): WindowContextSnapshot {
  const preferences = loadBrowserPreferences();

  return {
    schemaVersion: 1,
    currentWindow: {
      label: "main",
      mode: "workspaceSelection",
    },
    activeWorkspace: null,
    preferences,
    updatedAtMs: Date.now(),
    sourceWindowLabel: null,
  };
}

function loadBrowserPreferences(): WindowContextSnapshot["preferences"] {
  const fallback = {
    theme: "system" as AppTheme,
    language: "zh-CN" as AppLanguage,
  };

  try {
    const raw = window.localStorage.getItem(BROWSER_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<WindowContextSnapshot["preferences"]>;
    return {
      theme: isAppTheme(parsed.theme) ? parsed.theme : fallback.theme,
      language: isAppLanguage(parsed.language) ? parsed.language : fallback.language,
    };
  } catch {
    return fallback;
  }
}

function saveBrowserPreferences(preferences: WindowContextSnapshot["preferences"]) {
  try {
    window.localStorage.setItem(BROWSER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Browser preview cache failures must not block desktop preference behavior.
  }
}

function isAppTheme(value: unknown): value is AppTheme {
  return value === "system" || value === "light" || value === "dark";
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "zh-CN" || value === "en-US";
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
