use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub enum ConversationKind {
    Private,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub enum ConversationParticipantKind {
    Member,
    Contact,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct ConversationProfile {
    pub conversation_id: String,
    pub workspace_id: String,
    pub kind: ConversationKind,
    pub title: String,
    pub participant_kind: ConversationParticipantKind,
    pub participant_id: String,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    #[ts(type = "number")]
    pub last_activity_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct StartPrivateConversationRequest {
    pub workspace_id: String,
    pub participant_kind: ConversationParticipantKind,
    pub participant_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct StartPrivateConversationResult {
    pub conversation: ConversationProfile,
    pub created: bool,
}
