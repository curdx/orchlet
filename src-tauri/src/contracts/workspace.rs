use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub enum WindowMode {
    Main,
    WorkspaceSelection,
    Terminal,
    NotificationPreview,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct WorkspaceSelectionStatus {
    pub window_mode: WindowMode,
    pub can_open_workspace: bool,
    pub recent_workspace_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenWorkspaceRequest {
    pub path: String,
    #[serde(default)]
    pub conflict_resolution: Option<WorkspaceConflictResolution>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct WorkspaceMetadata {
    pub schema_version: u32,
    pub project_id: String,
    pub name: String,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub enum WorkspaceConflictResolution {
    Move,
    Copy,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub enum WorkspaceOpenStatus {
    Opened,
    Conflict,
    FocusedExisting,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub enum WorkspaceRegistryAction {
    Created,
    Registered,
    Reopened,
    Moved,
    Copied,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub enum WorkspaceAccessMode {
    ReadWrite,
    ReadOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub enum AppTheme {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export, export_to = "workspace.ts")]
pub enum AppLanguage {
    #[serde(rename = "zh-CN")]
    ZhCn,
    #[serde(rename = "en-US")]
    EnUs,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct WorkspaceFallbackState {
    pub reason: String,
    pub fallback_path: String,
    pub limited_actions: Vec<String>,
    pub user_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct WorkspaceRegistryEntry {
    pub project_id: String,
    pub path: String,
    pub name: String,
    #[ts(type = "number")]
    pub first_opened_at_ms: u64,
    #[ts(type = "number")]
    pub last_opened_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct RecentWorkspaceEntry {
    pub project_id: String,
    pub path: String,
    pub name: String,
    #[ts(type = "number")]
    pub first_opened_at_ms: u64,
    #[ts(type = "number")]
    pub last_opened_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct WorkspaceRegistryConflict {
    pub project_id: String,
    pub name: String,
    pub existing_path: String,
    pub selected_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenedWorkspace {
    pub root_path: String,
    pub metadata: WorkspaceMetadata,
    pub created: bool,
    pub access_mode: WorkspaceAccessMode,
    pub fallback_state: Option<WorkspaceFallbackState>,
    pub registry_entry: WorkspaceRegistryEntry,
    pub registry_action: WorkspaceRegistryAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenWorkspaceResult {
    pub status: WorkspaceOpenStatus,
    pub workspace: Option<OpenedWorkspace>,
    pub conflict: Option<WorkspaceRegistryConflict>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenWorkspaceInFileManagerRequest {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenWorkspaceInFileManagerResult {
    pub path: String,
    pub opened: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct RegisteredWindow {
    pub label: String,
    pub mode: WindowMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct AppPreferencesSnapshot {
    pub theme: AppTheme,
    pub language: AppLanguage,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct WindowContextSnapshot {
    pub schema_version: u32,
    pub current_window: RegisteredWindow,
    pub active_workspace: Option<OpenedWorkspace>,
    pub preferences: AppPreferencesSnapshot,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    pub source_window_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct RegisterWindowRequest {
    pub label: String,
    pub mode: WindowMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenWindowModeRequest {
    pub mode: WindowMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct OpenWindowModeResult {
    pub window: RegisteredWindow,
    pub opened: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "workspace.ts")]
pub struct UpdateAppPreferencesRequest {
    pub theme: Option<AppTheme>,
    pub language: Option<AppLanguage>,
    pub source_window_label: Option<String>,
}
