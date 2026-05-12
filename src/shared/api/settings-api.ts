import type {
  GetProfileSettingsResult,
  ProfileStatus,
  UpdateProfileSettingsResult,
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
};
