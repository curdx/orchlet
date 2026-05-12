import { open } from "@tauri-apps/plugin-dialog";

import type { AppError } from "../../contracts/generated/common";
import type {
  DeleteSkillResult,
  ImportLocalSkillFolderResult,
  LinkWorkspaceSkillResult,
  ListWorkspaceSkillLinksResult,
  OpenSkillFolderResult,
  SkillLibraryListResult,
  UnlinkWorkspaceSkillResult,
} from "../../contracts/generated/skill";
import { invokeCommand, isTauriRuntime } from "./client";

const desktopOnlyError: AppError = {
  code: "skill.dialog.desktopOnly",
  message: "请在 Tauri 桌面应用中导入技能文件夹。",
  severity: "warning",
  recoverable: true,
  userAction: "启动桌面应用后重试；浏览器预览只用于界面验证。",
  details: null,
  correlationId: null,
};

const unexpectedDialogResultError: AppError = {
  code: "skill.dialog.unexpectedSelection",
  message: "目录选择器返回了无法处理的结果。",
  severity: "error",
  recoverable: true,
  userAction: "请重新选择一个本地技能文件夹。",
  details: "Expected a single directory path, got multiple paths.",
  correlationId: null,
};

export type SkillsApi = {
  listSkills: () => Promise<SkillLibraryListResult>;
  importFolder: (path: string) => Promise<ImportLocalSkillFolderResult>;
  importLocalFolder: () => Promise<ImportLocalSkillFolderResult | null>;
  openSkillFolder: (skillId: string) => Promise<OpenSkillFolderResult>;
  deleteSkill: (skillId: string, workspaceRoot: string | null) => Promise<DeleteSkillResult>;
  listWorkspaceLinks: (workspaceRoot: string) => Promise<ListWorkspaceSkillLinksResult>;
  linkWorkspaceSkill: (
    workspaceRoot: string,
    skillId: string,
  ) => Promise<LinkWorkspaceSkillResult>;
  unlinkWorkspaceSkill: (
    workspaceRoot: string,
    skillId: string,
  ) => Promise<UnlinkWorkspaceSkillResult>;
};

export const skillsApi: SkillsApi = {
  listSkills() {
    return invokeCommand<SkillLibraryListResult>("skills_library_list", {
      request: {},
    });
  },

  importFolder(path) {
    return invokeCommand<ImportLocalSkillFolderResult>("skills_import_folder", {
      request: { path },
    });
  },

  async importLocalFolder() {
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

    return this.importFolder(selected);
  },

  openSkillFolder(skillId) {
    return invokeCommand<OpenSkillFolderResult>("skills_open_folder", {
      request: { skillId },
    });
  },

  deleteSkill(skillId, workspaceRoot) {
    return invokeCommand<DeleteSkillResult>("skills_delete", {
      request: { skillId, workspaceRoot },
    });
  },

  listWorkspaceLinks(workspaceRoot) {
    return invokeCommand<ListWorkspaceSkillLinksResult>("workspace_skill_links_list", {
      request: { workspaceRoot },
    });
  },

  linkWorkspaceSkill(workspaceRoot, skillId) {
    return invokeCommand<LinkWorkspaceSkillResult>("workspace_skill_link", {
      request: { workspaceRoot, skillId },
    });
  },

  unlinkWorkspaceSkill(workspaceRoot, skillId) {
    return invokeCommand<UnlinkWorkspaceSkillResult>("workspace_skill_unlink", {
      request: { workspaceRoot, skillId },
    });
  },
};
