import { open } from "@tauri-apps/plugin-dialog";
import type {
  ChatTerminalOutputPreferencesSnapshot,
  DeleteUploadedProfileAvatarResult,
  GetChatTerminalOutputPreferencesResult,
  GetProfileSettingsResult,
  GetShortcutPreferencesResult,
  GetTerminalConfigurationResult,
  ProfileStatus,
  ResetChatTerminalOutputPreferencesResult,
  ResetProfileAvatarResult,
  ResetShortcutPreferencesRequest,
  ResetShortcutPreferencesResult,
  ResetTerminalConfigurationResult,
  SelectProfileAvatarPresetResult,
  ShortcutKeymapProfile,
  ShortcutPreferencesSnapshot,
  TerminalConfigurationSnapshot,
  UpdateChatTerminalOutputPreferencesRequest,
  UpdateChatTerminalOutputPreferencesResult,
  UpdateProfileSettingsResult,
  UpdateShortcutPreferencesRequest,
  UpdateShortcutPreferencesResult,
  UpdateTerminalConfigurationRequest,
  UpdateTerminalConfigurationResult,
  UploadProfileAvatarResult,
} from "../../contracts/generated/settings";
import { invokeCommand, isTauriRuntime } from "./client";

export type UpdateProfileSettingsInput = {
  displayName: string;
  timezone: string;
  status: ProfileStatus;
  statusMessage: string;
};

export type SettingsApi = {
  getProfileSettings: () => Promise<GetProfileSettingsResult>;
  updateProfileSettings: (
    input: UpdateProfileSettingsInput,
  ) => Promise<UpdateProfileSettingsResult>;
  selectAvatarImage: () => Promise<string | null>;
  uploadProfileAvatar: (sourcePath: string) => Promise<UploadProfileAvatarResult>;
  selectProfileAvatarPreset: (
    presetId: string,
  ) => Promise<SelectProfileAvatarPresetResult>;
  resetProfileAvatar: () => Promise<ResetProfileAvatarResult>;
  deleteUploadedProfileAvatar: () => Promise<DeleteUploadedProfileAvatarResult>;
  getShortcutPreferences: () => Promise<GetShortcutPreferencesResult>;
  updateShortcutPreferences: (
    input: UpdateShortcutPreferencesRequest,
  ) => Promise<UpdateShortcutPreferencesResult>;
  resetShortcutPreferences: (
    input: ResetShortcutPreferencesRequest,
  ) => Promise<ResetShortcutPreferencesResult>;
  getChatTerminalOutputPreferences: () => Promise<GetChatTerminalOutputPreferencesResult>;
  updateChatTerminalOutputPreferences: (
    input: UpdateChatTerminalOutputPreferencesRequest,
  ) => Promise<UpdateChatTerminalOutputPreferencesResult>;
  resetChatTerminalOutputPreferences: () => Promise<ResetChatTerminalOutputPreferencesResult>;
  getTerminalConfiguration: () => Promise<GetTerminalConfigurationResult>;
  updateTerminalConfiguration: (
    input: UpdateTerminalConfigurationRequest,
  ) => Promise<UpdateTerminalConfigurationResult>;
  resetTerminalConfiguration: () => Promise<ResetTerminalConfigurationResult>;
};

let browserShortcutPreferences = createDefaultShortcutPreferences("default");
let browserChatTerminalOutputPreferences = createDefaultChatTerminalOutputPreferences();
let browserTerminalConfiguration = createDefaultTerminalConfiguration();

export const settingsApi: SettingsApi = {
  getProfileSettings() {
    return invokeCommand<GetProfileSettingsResult>("profile_settings_get", {
      request: {},
    });
  },

  updateProfileSettings(input) {
    return invokeCommand<UpdateProfileSettingsResult>("profile_settings_update", {
      request: {
        displayName: input.displayName,
        timezone: input.timezone,
        status: input.status,
        statusMessage: input.statusMessage,
      },
    });
  },

  async selectAvatarImage() {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Avatar images",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    return typeof selected === "string" ? selected : null;
  },

  uploadProfileAvatar(sourcePath) {
    return invokeCommand<UploadProfileAvatarResult>("profile_avatar_upload", {
      request: { sourcePath },
    });
  },

  selectProfileAvatarPreset(presetId) {
    return invokeCommand<SelectProfileAvatarPresetResult>("profile_avatar_preset_select", {
      request: { presetId },
    });
  },

  resetProfileAvatar() {
    return invokeCommand<ResetProfileAvatarResult>("profile_avatar_reset", {
      request: {},
    });
  },

  deleteUploadedProfileAvatar() {
    return invokeCommand<DeleteUploadedProfileAvatarResult>("profile_avatar_delete_uploaded", {
      request: {},
    });
  },

  async getShortcutPreferences() {
    if (!isTauriRuntime()) {
      return { preferences: browserShortcutPreferences };
    }

    return invokeCommand<GetShortcutPreferencesResult>("shortcut_preferences_get", {
      request: {},
    });
  },

  async updateShortcutPreferences(input) {
    if (!isTauriRuntime()) {
      const nextProfile = input.profile ?? browserShortcutPreferences.profile;
      const disabledActionIds =
        input.disabledActionIds ?? browserShortcutPreferences.disabledActionIds;
      browserShortcutPreferences = {
        ...browserShortcutPreferences,
        profile: nextProfile,
        shortcutsEnabled: input.shortcutsEnabled ?? browserShortcutPreferences.shortcutsEnabled,
        shortcutHintsEnabled:
          input.shortcutHintsEnabled ?? browserShortcutPreferences.shortcutHintsEnabled,
        disabledActionIds,
        bindings: shortcutBindingsForProfile(nextProfile, disabledActionIds),
        updatedAtMs: Date.now(),
      };

      return { preferences: browserShortcutPreferences };
    }

    return invokeCommand<UpdateShortcutPreferencesResult>("shortcut_preferences_update", {
      request: input,
    });
  },

  async resetShortcutPreferences(input) {
    if (!isTauriRuntime()) {
      browserShortcutPreferences = {
        ...createDefaultShortcutPreferences(input.profile ?? browserShortcutPreferences.profile),
        createdAtMs: browserShortcutPreferences.createdAtMs,
        updatedAtMs: Date.now(),
      };

      return { preferences: browserShortcutPreferences };
    }

    return invokeCommand<ResetShortcutPreferencesResult>("shortcut_preferences_reset", {
      request: input,
    });
  },

  async getChatTerminalOutputPreferences() {
    if (!isTauriRuntime()) {
      return { preferences: browserChatTerminalOutputPreferences };
    }

    return invokeCommand<GetChatTerminalOutputPreferencesResult>(
      "chat_terminal_output_preferences_get",
      {
        request: {},
      },
    );
  },

  async updateChatTerminalOutputPreferences(input) {
    if (!isTauriRuntime()) {
      browserChatTerminalOutputPreferences = {
        ...browserChatTerminalOutputPreferences,
        displayMode: input.displayMode,
        updatedAtMs: Date.now(),
      };

      return { preferences: browserChatTerminalOutputPreferences };
    }

    return invokeCommand<UpdateChatTerminalOutputPreferencesResult>(
      "chat_terminal_output_preferences_update",
      {
        request: input,
      },
    );
  },

  async resetChatTerminalOutputPreferences() {
    if (!isTauriRuntime()) {
      browserChatTerminalOutputPreferences = {
        ...createDefaultChatTerminalOutputPreferences(),
        createdAtMs: browserChatTerminalOutputPreferences.createdAtMs,
        updatedAtMs: Date.now(),
      };

      return { preferences: browserChatTerminalOutputPreferences };
    }

    return invokeCommand<ResetChatTerminalOutputPreferencesResult>(
      "chat_terminal_output_preferences_reset",
      {
        request: {},
      },
    );
  },

  async getTerminalConfiguration() {
    if (!isTauriRuntime()) {
      return { configuration: browserTerminalConfiguration };
    }

    return invokeCommand<GetTerminalConfigurationResult>("terminal_configuration_get", {
      request: {},
    });
  },

  async updateTerminalConfiguration(input) {
    if (!isTauriRuntime()) {
      browserTerminalConfiguration = {
        schemaVersion: browserTerminalConfiguration.schemaVersion,
        builtInCliEntries: input.builtInCliEntries.map((entry) => ({ ...entry })),
        customCliEntries: input.customCliEntries.map((entry) => ({ ...entry })),
        customTerminalEntries: input.customTerminalEntries.map((entry) => ({ ...entry })),
        defaultTerminalId: input.defaultTerminalId,
        createdAtMs: browserTerminalConfiguration.createdAtMs,
        updatedAtMs: Date.now(),
      };

      return { configuration: browserTerminalConfiguration };
    }

    return invokeCommand<UpdateTerminalConfigurationResult>("terminal_configuration_update", {
      request: input,
    });
  },

  async resetTerminalConfiguration() {
    if (!isTauriRuntime()) {
      browserTerminalConfiguration = {
        ...createDefaultTerminalConfiguration(),
        createdAtMs: browserTerminalConfiguration.createdAtMs,
        updatedAtMs: Date.now(),
      };

      return { configuration: browserTerminalConfiguration };
    }

    return invokeCommand<ResetTerminalConfigurationResult>("terminal_configuration_reset", {
      request: {},
    });
  },
};

function createDefaultShortcutPreferences(
  profile: ShortcutKeymapProfile,
): ShortcutPreferencesSnapshot {
  const timestamp = Date.now();
  const disabledActionIds: string[] = [];

  return {
    schemaVersion: 1,
    profile,
    shortcutsEnabled: true,
    shortcutHintsEnabled: true,
    disabledActionIds,
    bindings: shortcutBindingsForProfile(profile, disabledActionIds),
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
}

function shortcutBindingsForProfile(
  profile: ShortcutKeymapProfile,
  disabledActionIds: string[],
): ShortcutPreferencesSnapshot["bindings"] {
  const chatSendKeys =
    profile === "vscode" ? ["Ctrl+Enter", "Meta+Enter"] : ["Enter"];
  const specs = [
    ["chat.send", "发送聊天消息", chatSendKeys, true, null],
    ["chat.newline", "聊天输入换行", ["Shift+Enter"], true, null],
    ["chat.emoji.close", "关闭 Emoji 面板", ["Esc"], true, null],
    ["mention.insert", "插入提及建议", ["Enter", "Tab"], true, null],
    ["conversation.focus", "聚焦会话列表", ["Tab"], true, null],
    ["terminal.find.next", "终端查找下一个", ["Enter"], true, null],
    ["terminal.find.previous", "终端查找上一个", ["Shift+Enter"], true, null],
    ["terminal.find.close", "关闭终端查找", ["Esc"], true, null],
    ["settings.save", "保存设置", ["Enter"], true, null],
    ["notification.viewAll", "通知查看全部", ["Tab", "Enter"], true, null],
    ["notification.ignoreAll", "通知忽略全部", ["Tab", "Enter"], true, null],
    ["notification.openTerminal", "通知打开终端", ["Tab", "Enter"], true, null],
    [
      "app.globalOpenSettings",
      "全局打开设置",
      ["Ctrl+,"],
      false,
      "当前版本尚未注册 OS 全局快捷键。",
    ],
  ] as const;

  return specs.map(([actionId, label, keys, available, unavailableReason]) => ({
    actionId,
    label,
    keys: [...keys],
    available,
    enabled: available && !disabledActionIds.includes(actionId),
    unavailableReason,
  }));
}

function createDefaultChatTerminalOutputPreferences(): ChatTerminalOutputPreferencesSnapshot {
  const timestamp = Date.now();

  return {
    schemaVersion: 1,
    displayMode: "stream",
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
}

function createDefaultTerminalConfiguration(): TerminalConfigurationSnapshot {
  const timestamp = Date.now();

  return {
    schemaVersion: 1,
    builtInCliEntries: [
      { runtimeId: "claude-code", label: "Claude Code", command: "claude" },
      { runtimeId: "codex", label: "Codex CLI", command: "codex" },
      { runtimeId: "gemini-cli", label: "Gemini CLI", command: "gemini" },
      { runtimeId: "opencode", label: "OpenCode", command: "opencode" },
      { runtimeId: "qwen-code", label: "Qwen Code", command: "qwen" },
    ],
    customCliEntries: [],
    customTerminalEntries: [],
    defaultTerminalId: null,
    createdAtMs: timestamp,
    updatedAtMs: timestamp,
  };
}
