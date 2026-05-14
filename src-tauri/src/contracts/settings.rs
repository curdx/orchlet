use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::workspace::{AppLanguage, AppTheme};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub enum ShortcutKeymapProfile {
    Default,
    Vscode,
    Slack,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct AppPreferencesSettingsSnapshot {
    pub schema_version: u32,
    pub theme: AppTheme,
    pub language: AppLanguage,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ShortcutBindingSnapshot {
    pub action_id: String,
    pub label: String,
    pub keys: Vec<String>,
    pub enabled: bool,
    pub available: bool,
    pub unavailable_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ShortcutPreferencesSnapshot {
    pub schema_version: u32,
    pub profile: ShortcutKeymapProfile,
    pub shortcuts_enabled: bool,
    pub shortcut_hints_enabled: bool,
    pub disabled_action_ids: Vec<String>,
    pub bindings: Vec<ShortcutBindingSnapshot>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetShortcutPreferencesRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetShortcutPreferencesResult {
    pub preferences: ShortcutPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateShortcutPreferencesRequest {
    pub profile: Option<ShortcutKeymapProfile>,
    pub shortcuts_enabled: Option<bool>,
    pub shortcut_hints_enabled: Option<bool>,
    pub disabled_action_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateShortcutPreferencesResult {
    pub preferences: ShortcutPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetShortcutPreferencesRequest {
    pub profile: Option<ShortcutKeymapProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetShortcutPreferencesResult {
    pub preferences: ShortcutPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub enum ChatTerminalOutputDisplayMode {
    Stream,
    FinalOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ChatTerminalOutputPreferencesSnapshot {
    pub schema_version: u32,
    pub display_mode: ChatTerminalOutputDisplayMode,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetChatTerminalOutputPreferencesRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetChatTerminalOutputPreferencesResult {
    pub preferences: ChatTerminalOutputPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateChatTerminalOutputPreferencesRequest {
    pub display_mode: ChatTerminalOutputDisplayMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateChatTerminalOutputPreferencesResult {
    pub preferences: ChatTerminalOutputPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetChatTerminalOutputPreferencesRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetChatTerminalOutputPreferencesResult {
    pub preferences: ChatTerminalOutputPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct TerminalBuiltInCliEntry {
    pub runtime_id: String,
    pub label: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct TerminalCustomCliEntry {
    pub cli_id: String,
    pub label: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct TerminalCustomTerminalEntry {
    pub terminal_id: String,
    pub label: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct TerminalConfigurationSnapshot {
    pub schema_version: u32,
    pub built_in_cli_entries: Vec<TerminalBuiltInCliEntry>,
    pub custom_cli_entries: Vec<TerminalCustomCliEntry>,
    pub custom_terminal_entries: Vec<TerminalCustomTerminalEntry>,
    pub default_terminal_id: Option<String>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetTerminalConfigurationRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct GetTerminalConfigurationResult {
    pub configuration: TerminalConfigurationSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateTerminalConfigurationRequest {
    pub built_in_cli_entries: Vec<TerminalBuiltInCliEntry>,
    pub custom_cli_entries: Vec<TerminalCustomCliEntry>,
    pub custom_terminal_entries: Vec<TerminalCustomTerminalEntry>,
    pub default_terminal_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct UpdateTerminalConfigurationResult {
    pub configuration: TerminalConfigurationSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetTerminalConfigurationRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "settings.ts")]
pub struct ResetTerminalConfigurationResult {
    pub configuration: TerminalConfigurationSnapshot,
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
