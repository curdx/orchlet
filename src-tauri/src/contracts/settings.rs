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
pub struct ProfileSettingsSnapshot {
    pub schema_version: u32,
    pub display_name: String,
    pub timezone: String,
    pub status: ProfileStatus,
    pub status_message: Option<String>,
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
