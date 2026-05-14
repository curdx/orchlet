use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub enum NotificationPermissionState {
    Granted,
    Denied,
    Prompt,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationPermissionSnapshot {
    pub state: NotificationPermissionState,
    pub message: String,
    pub user_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationPreferencesSnapshot {
    pub schema_version: u32,
    pub desktop_notifications_enabled: bool,
    pub sound_enabled: bool,
    pub mentions_only: bool,
    pub message_preview_enabled: bool,
    pub dnd_enabled: bool,
    pub dnd_start_minutes: u16,
    pub dnd_end_minutes: u16,
    pub permission: NotificationPermissionSnapshot,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationPreferencesGetRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationPreferencesGetResult {
    pub preferences: NotificationPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationPreferencesUpdateRequest {
    pub desktop_notifications_enabled: Option<bool>,
    pub sound_enabled: Option<bool>,
    pub mentions_only: Option<bool>,
    pub message_preview_enabled: Option<bool>,
    pub dnd_enabled: Option<bool>,
    pub dnd_start_minutes: Option<u16>,
    pub dnd_end_minutes: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationPreferencesUpdateResult {
    pub preferences: NotificationPreferencesSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationUnreadConversation {
    pub conversation_id: String,
    pub title: String,
    pub unread_count: u32,
    pub last_message_preview: Option<String>,
    pub terminal_member_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub workspace_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub conversation_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub member_count: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub sender_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub sender_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub sender_avatar: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub sender_can_open_terminal: Option<bool>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub avatar_png: Option<Vec<u8>>,
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationIgnoreAllRequest {
    pub workspace_id: Option<String>,
    pub source_window_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "notification.ts")]
pub struct NotificationIgnoreAllResult {
    pub summary: NotificationUnreadSummary,
    pub ignored_count: u32,
}
