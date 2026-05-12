use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::RegisteredWindow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub enum TerminalSessionStatus {
    Starting,
    Running,
    Exited,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub enum TerminalStreamKind {
    Stdout,
    Stderr,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub enum TerminalTabStatus {
    Open,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub enum TerminalEnvironmentKind {
    Shell,
    BuiltInAiCli,
    CustomCli,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub enum TerminalEnvironmentSource {
    System,
    MemberRuntime,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub enum TerminalEnvironmentStatus {
    Available,
    Missing,
    Invalid,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalOpenRequest {
    pub member_id: Option<String>,
    #[serde(default)]
    pub attach_current: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalAttachRequest {
    pub terminal_session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalInputRequest {
    pub terminal_session_id: String,
    pub input: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalResizeRequest {
    pub terminal_session_id: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalCloseRequest {
    pub terminal_session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabsListRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalEnvironmentsListRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabCreateRequest {
    pub member_id: Option<String>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabCloseRequest {
    pub tab_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabRestoreRequest {
    pub tab_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabUpdateRequest {
    pub tab_id: String,
    pub label: Option<String>,
    pub is_pinned: Option<bool>,
    pub sort_index: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalSessionSnapshot {
    #[ts(type = "number")]
    pub last_seq: u64,
    pub text: String,
    pub truncated: bool,
    #[ts(type = "number | null")]
    pub updated_at_ms: Option<u64>,
}

impl Default for TerminalSessionSnapshot {
    fn default() -> Self {
        Self {
            last_seq: 0,
            text: String::new(),
            truncated: false,
            updated_at_ms: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalSessionExitReason {
    pub code: String,
    pub message: String,
    #[ts(type = "number")]
    pub occurred_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalSessionProfile {
    pub schema_version: u32,
    pub terminal_session_id: String,
    pub workspace_id: String,
    pub member_id: Option<String>,
    pub title: String,
    pub status: TerminalSessionStatus,
    pub cols: u16,
    pub rows: u16,
    pub snapshot: TerminalSessionSnapshot,
    pub exit_reason: Option<TerminalSessionExitReason>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalOpenResult {
    pub window: RegisteredWindow,
    pub window_opened: bool,
    pub session: TerminalSessionProfile,
    pub session_created: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalAttachResult {
    pub session: TerminalSessionProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalInputResult {
    pub session: TerminalSessionProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalResizeResult {
    pub session: TerminalSessionProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalCloseResult {
    pub session: TerminalSessionProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabProfile {
    pub schema_version: u32,
    pub tab_id: String,
    pub workspace_id: String,
    pub terminal_session_id: String,
    pub member_id: Option<String>,
    pub label: String,
    pub shell: String,
    pub status: TerminalTabStatus,
    pub is_pinned: bool,
    pub sort_index: i32,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    #[ts(type = "number | null")]
    pub closed_at_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabsListResult {
    pub tabs: Vec<TerminalTabProfile>,
    pub active_tab_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalEnvironmentProfile {
    pub schema_version: u32,
    pub environment_id: String,
    pub label: String,
    pub kind: TerminalEnvironmentKind,
    pub source: TerminalEnvironmentSource,
    pub command: String,
    pub resolved_path: Option<String>,
    pub member_id: Option<String>,
    pub status: TerminalEnvironmentStatus,
    pub message: String,
    pub user_action: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalEnvironmentsListResult {
    pub environments: Vec<TerminalEnvironmentProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabCreateResult {
    pub tab: TerminalTabProfile,
    pub session: TerminalSessionProfile,
    pub tabs: Vec<TerminalTabProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabCloseResult {
    pub tab: TerminalTabProfile,
    pub session: TerminalSessionProfile,
    pub tabs: Vec<TerminalTabProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabRestoreResult {
    pub tab: TerminalTabProfile,
    pub session: TerminalSessionProfile,
    pub tabs: Vec<TerminalTabProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalTabUpdateResult {
    pub tab: TerminalTabProfile,
    pub tabs: Vec<TerminalTabProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalOutputEventPayload {
    pub schema_version: u32,
    pub terminal_session_id: String,
    pub workspace_id: String,
    pub member_id: Option<String>,
    #[ts(type = "number")]
    pub seq: u64,
    pub chunk: String,
    pub kind: TerminalStreamKind,
    #[ts(type = "number")]
    pub emitted_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalStatusEventPayload {
    pub schema_version: u32,
    pub terminal_session_id: String,
    pub workspace_id: String,
    pub member_id: Option<String>,
    pub title: String,
    pub status: TerminalSessionStatus,
    pub cols: u16,
    pub rows: u16,
    pub snapshot: TerminalSessionSnapshot,
    pub exit_reason: Option<TerminalSessionExitReason>,
    #[ts(type = "number")]
    pub emitted_at_ms: u64,
}
