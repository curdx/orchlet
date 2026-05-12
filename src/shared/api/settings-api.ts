import { open } from "@tauri-apps/plugin-dialog";
import type {
  DeleteUploadedProfileAvatarResult,
  GetProfileSettingsResult,
  GetShortcutPreferencesResult,
  ProfileStatus,
  ResetProfileAvatarResult,
  ResetShortcutPreferencesRequest,
  ResetShortcutPreferencesResult,
  SelectProfileAvatarPresetResult,
  ShortcutKeymapProfile,
  ShortcutPreferencesSnapshot,
  UpdateProfileSettingsResult,
  UpdateShortcutPreferencesRequest,
  UpdateShortcutPreferencesResult,
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
};

let browserShortcutPreferences = createDefaultShortcutPreferences("default");

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
