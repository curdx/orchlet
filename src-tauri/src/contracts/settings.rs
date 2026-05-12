use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub enum ProfileStatus {
    Online,
    Offline,
    Working,
    DoNotDisturb,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub enum ProfileAvatarKind {
    Placeholder,
    Preset,
    Uploaded,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ProfileAvatarSnapshot {
    pub kind: ProfileAvatarKind,
    pub preset_id: Option<String>,
    pub upload_id: Option<String>,
    pub source_file_name: Option<String>,
    pub content_type: Option<String>,
    #[ts(type = "number | null")]
    pub size_bytes: Option<u64>,
    pub library_relative_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub preview_data_url: Option<String>,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ProfileSettingsSnapshot {
    pub schema_version: u32,
    pub display_name: String,
    pub timezone: String,
    pub status: ProfileStatus,
    pub status_message: Option<String>,
    #[serde(default)]
    pub avatar: Option<ProfileAvatarSnapshot>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetProfileSettingsRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetProfileSettingsResult {
    pub profile: ProfileSettingsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateProfileSettingsRequest {
    pub display_name: Option<String>,
    pub timezone: Option<String>,
    pub status: Option<String>,
    pub status_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateProfileSettingsResult {
    pub profile: ProfileSettingsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UploadProfileAvatarRequest {
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UploadProfileAvatarResult {
    pub profile: ProfileSettingsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct SelectProfileAvatarPresetRequest {
    pub preset_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct SelectProfileAvatarPresetResult {
    pub profile: ProfileSettingsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetProfileAvatarRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetProfileAvatarResult {
    pub profile: ProfileSettingsSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct DeleteUploadedProfileAvatarRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct DeleteUploadedProfileAvatarResult {
    pub profile: ProfileSettingsSnapshot,
}
