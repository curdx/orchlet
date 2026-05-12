import { open } from "@tauri-apps/plugin-dialog";

import type { AppError } from "../../contracts/generated/common";
import type {
  OpenWorkspaceInFileManagerResult,
  RecentWorkspaceEntry,
  WorkspaceConflictResolution,
  OpenWorkspaceResult,
  WorkspaceSelectionStatus,
} from "../../contracts/generated/workspace";
import { invokeCommand, isTauriRuntime } from "./client";

const desktopOnlyError: AppError = {
  code: "workspace.dialog.desktopOnly",
  message: "请在 Tauri 桌面应用中打开文件夹。",
  severity: "warning",
  recoverable: true,
  userAction: "启动桌面应用后重试；浏览器预览只用于界面验证。",
  details: null,
  correlationId: null,
};

const unexpectedDialogResultError: AppError = {
  code: "workspace.dialog.unexpectedSelection",
  message: "目录选择器返回了无法处理的结果。",
  severity: "error",
  recoverable: true,
  userAction: "请重新选择一个本地目录。",
  details: "Expected a single directory path, got multiple paths.",
  correlationId: null,
};

export type WorkspaceApi = {
  getWorkspaceSelectionStatus: () => Promise<WorkspaceSelectionStatus>;
  listRecentWorkspaces: () => Promise<RecentWorkspaceEntry[]>;
  pickAndOpenWorkspace: () => Promise<OpenWorkspaceResult | null>;
  openWorkspace: (
    path: string,
    options?: { conflictResolution?: WorkspaceConflictResolution | null },
  ) => Promise<OpenWorkspaceResult>;
  openWorkspaceInFileManager: (path: string) => Promise<OpenWorkspaceInFileManagerResult>;
};

export const workspaceApi: WorkspaceApi = {
  getWorkspaceSelectionStatus() {
    return invokeCommand<WorkspaceSelectionStatus>("workspace_selection_status");
  },

  listRecentWorkspaces() {
    return invokeCommand<RecentWorkspaceEntry[]>("workspace_recent_list");
  },

  async pickAndOpenWorkspace() {
    if (!isTauriRuntime()) {
      return Promise.reject(desktopOnlyError);
    }

    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (selected === null) {
      return null;
    }

    if (Array.isArray(selected)) {
      return Promise.reject(unexpectedDialogResultError);
    }

    return this.openWorkspace(selected);
  },

  openWorkspace(path: string, options = {}) {
    return invokeCommand<OpenWorkspaceResult>("workspace_open", {
      request: { path, conflictResolution: options.conflictResolution ?? null },
    });
  },

  openWorkspaceInFileManager(path: string) {
    return invokeCommand<OpenWorkspaceInFileManagerResult>("workspace_open_in_file_manager", {
      request: { path },
    });
  },
};
