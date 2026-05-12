use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadConversation {
    pub conversation_id: String,
    pub title: String,
    pub unread_count: u32,
    pub last_message_preview: Option<String>,
    pub terminal_member_id: Option<String>,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationTrayState {
    pub unread_count: u32,
    pub badge_label: Option<String>,
    pub has_unread: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadSummary {
    pub schema_version: u32,
    pub workspace_id: Option<String>,
    pub workspace_name: Option<String>,
    pub total_unread_count: u32,
    pub conversations: Vec<NotificationUnreadConversation>,
    pub tray: NotificationTrayState,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    pub source_window_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadSummaryRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadSummaryResult {
    pub summary: NotificationUnreadSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadUpdateRequest {
    pub workspace_id: Option<String>,
    pub workspace_name: Option<String>,
    pub conversations: Vec<NotificationUnreadConversation>,
    pub source_window_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadUpdateResult {
    pub summary: NotificationUnreadSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub enum NotificationNavigationKind {
    AllUnread,
    Conversation,
    MemberTerminal,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationNavigationAction {
    pub schema_version: u32,
    pub kind: NotificationNavigationKind,
    pub workspace_id: Option<String>,
    pub conversation_id: Option<String>,
    pub member_id: Option<String>,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    pub source_window_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationNavigationRequest {
    pub kind: NotificationNavigationKind,
    pub workspace_id: Option<String>,
    pub conversation_id: Option<String>,
    pub member_id: Option<String>,
    pub source_window_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationNavigationResult {
    pub action: NotificationNavigationAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationNavigationPendingRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationNavigationPendingResult {
    pub action: Option<NotificationNavigationAction>,
}
