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
pub struct TerminalSessionProfile {
    pub schema_version: u32,
    pub terminal_session_id: String,
    pub workspace_id: String,
    pub member_id: Option<String>,
    pub title: String,
    pub status: TerminalSessionStatus,
    pub cols: u16,
    pub rows: u16,
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
    #[ts(type = "number")]
    pub emitted_at_ms: u64,
}
