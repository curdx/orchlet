import { invoke } from "@tauri-apps/api/core";

import type { AppError } from "../../contracts/generated/common";
import type { WorkspaceSelectionStatus } from "../../contracts/generated/workspace";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

function invokeBrowserFallback<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (command === "workspace_selection_status") {
    return Promise.resolve({
      windowMode: "workspaceSelection",
      canOpenWorkspace: true,
      recentWorkspaceCount: 0,
    } satisfies WorkspaceSelectionStatus as T);
  }

  if (command === "workspace_recent_list") {
    return Promise.resolve([] as T);
  }

  if (command === "members_list") {
    return Promise.resolve({ members: [] } as T);
  }

  if (command === "contacts_list") {
    return Promise.resolve({ contacts: [] } as T);
  }

  if (command === "skills_library_list") {
    return Promise.resolve({ skills: [] } as T);
  }

  if (command === "workspace_skill_links_list") {
    return Promise.resolve({ skills: [] } as T);
  }

  if (command === "roadmap_tasks_list") {
    return Promise.resolve({ tasks: [] } as T);
  }

  if (command === "roadmap_goals_list") {
    return Promise.resolve({ goals: [] } as T);
  }

  if (command === "profile_settings_get") {
    return Promise.resolve({
      profile: {
        schemaVersion: 1,
        displayName: "Owner",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        status: "online",
        statusMessage: null,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      },
    } as T);
  }

  if (command === "profile_settings_update") {
    const request = (args?.request ?? {}) as {
      displayName?: string | null;
      timezone?: string | null;
      status?: string | null;
      statusMessage?: string | null;
    };

    return Promise.resolve({
      profile: {
        schemaVersion: 1,
        displayName: request.displayName?.trim() || "Owner",
        timezone: request.timezone || "UTC",
        status: request.status || "online",
        statusMessage: request.statusMessage?.trim() || null,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
      },
    } as T);
  }

  return Promise.reject({
    code: "ipc.command.unavailable",
    message: `命令 ${command} 在当前运行环境不可用。`,
    severity: "error",
    recoverable: true,
    userAction: "请在 Tauri 桌面运行时中重试。",
    details: null,
    correlationId: null,
  } satisfies AppError);
}

export function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    return invokeBrowserFallback<T>(command, args);
  }

  return invoke<T>(command, args);
}

export type { WorkspaceSelectionStatus };
