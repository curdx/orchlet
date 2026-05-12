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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "terminal.ts")]
pub struct TerminalOpenRequest {
    pub member_id: Option<String>,
    #[serde(default)]
    pub attach_current: bool,
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
