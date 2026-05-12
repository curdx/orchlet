use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::TerminalSessionProfile;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub enum DispatchRequestStatus {
    Pending,
    Queued,
    Skipped,
    Dispatched,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub enum DispatchTargetResolutionSource {
    UserSelected,
    ExplicitMention,
    PrivateConversation,
    ConversationDefault,
    WorkspaceDefault,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchTargetResolutionProfile {
    pub member_id: String,
    pub source: DispatchTargetResolutionSource,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchFailureProfile {
    pub code: String,
    pub message: String,
    pub user_action: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchRequestProfile {
    pub schema_version: u32,
    pub dispatch_request_id: String,
    pub workspace_id: String,
    pub conversation_id: String,
    pub message_id: String,
    pub member_id: String,
    pub target_resolution: DispatchTargetResolutionProfile,
    pub status: DispatchRequestStatus,
    pub terminal_session_id: Option<String>,
    pub failure: Option<DispatchFailureProfile>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchChatMessageRequest {
    pub workspace_id: String,
    pub conversation_id: String,
    pub message_id: String,
    pub member_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchChatMessageResult {
    pub dispatch: DispatchRequestProfile,
    pub terminal_session: Option<TerminalSessionProfile>,
    pub session_created: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchQueueResumeRequest {
    pub workspace_id: String,
    pub member_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "orchestration.ts")]
pub struct DispatchQueueResumeResult {
    pub dispatch: Option<DispatchRequestProfile>,
    pub terminal_session: Option<TerminalSessionProfile>,
    pub session_created: bool,
    pub queue_remaining: u32,
}
