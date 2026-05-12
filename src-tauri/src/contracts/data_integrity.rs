use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum StorageOwner {
    Workspace,
    Settings,
    Member,
    Contact,
    Chat,
    Terminal,
    Skill,
    Roadmap,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum StorageCategory {
    StorageManifest,
    WorkspaceMetadata,
    WorkspaceRegistry,
    WorkspaceFallbacks,
    ProfileSettings,
    AvatarLibrary,
    MemberProfiles,
    ContactProfiles,
    ConversationRecords,
    ConversationMembers,
    MessageRecords,
    MessageMentions,
    ConversationReadPositions,
    PrivateConversations,
    TerminalTabs,
    SkillLibrary,
    WorkspaceSkillLinks,
    RoadmapTasks,
    RoadmapGoals,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum StorageFormat {
    Json,
    Binary,
    Sqlite,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum StoragePathPolicy {
    WorkspaceLocalRelative,
    AppDataFile,
    AppDataWorkspaceFile,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum StoragePrivacyClass {
    LocalPath,
    AppState,
    WorkspaceData,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub struct StorageManifestEntry {
    pub id: String,
    pub owner: StorageOwner,
    pub category: StorageCategory,
    pub description: String,
    pub path_policy: StoragePathPolicy,
    pub relative_path: Option<String>,
    pub file_name: Option<String>,
    pub format: StorageFormat,
    pub schema_version: u32,
    pub readers: Vec<String>,
    pub writers: Vec<String>,
    pub privacy_class: StoragePrivacyClass,
    pub fixture_required: bool,
    pub validation_check_id: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum DataIntegrityStatus {
    Passed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub enum DataIntegritySeverity {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub struct DataIntegrityCheckResult {
    pub check_id: String,
    pub category: StorageCategory,
    pub status: DataIntegrityStatus,
    pub severity: DataIntegritySeverity,
    pub message: String,
    pub affected_paths: Vec<String>,
    pub user_action: Option<String>,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub struct DataIntegrityReport {
    pub schema_version: u32,
    pub report_id: String,
    #[ts(type = "number")]
    pub generated_at_ms: u64,
    pub manifest: Vec<StorageManifestEntry>,
    pub checks: Vec<DataIntegrityCheckResult>,
    pub total_checks: u32,
    pub passed_checks: u32,
    pub failed_checks: u32,
    pub skipped_checks: u32,
    pub has_failures: bool,
    pub batched: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub struct DataIntegrityValidateRequest {
    pub workspace_root: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "data_integrity.ts")]
pub struct DataIntegrityValidateResult {
    pub report: DataIntegrityReport,
}
