import { open } from "@tauri-apps/plugin-dialog";
import type {
  DeleteUploadedProfileAvatarResult,
  GetProfileSettingsResult,
  ProfileStatus,
  ResetProfileAvatarResult,
  SelectProfileAvatarPresetResult,
  UpdateProfileSettingsResult,
  UploadProfileAvatarResult,
} from "../../contracts/generated/settings";
import { invokeCommand } from "./client";

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
};

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
};
