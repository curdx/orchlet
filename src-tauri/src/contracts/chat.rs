use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub enum ConversationKind {
    Channel,
    Group,
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
    pub is_default: bool,
    pub is_pinned: bool,
    pub unread_count: u32,
    pub last_message_preview: Option<String>,
    pub participant_kind: Option<ConversationParticipantKind>,
    pub participant_id: Option<String>,
    pub members: Vec<ConversationMemberSummary>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    #[ts(type = "number")]
    pub last_activity_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct ConversationMemberSummary {
    pub member_id: String,
    pub display_name: String,
    pub instance_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct ListConversationsRequest {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct ListConversationsResult {
    pub conversations: Vec<ConversationProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct CreateGroupConversationRequest {
    pub workspace_id: String,
    pub title: String,
    pub member_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct CreateGroupConversationResult {
    pub conversation: ConversationProfile,
    pub conversations: Vec<ConversationProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct UpdateGroupConversationMembersRequest {
    pub workspace_id: String,
    pub conversation_id: String,
    pub member_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "chat.ts")]
pub struct UpdateGroupConversationMembersResult {
    pub conversation: ConversationProfile,
    pub conversations: Vec<ConversationProfile>,
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
