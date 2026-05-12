use std::{
    collections::HashMap,
    path::Path,
    sync::{Mutex, MutexGuard},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::contracts::{
    AppError, NotificationIgnoreAllRequest, NotificationIgnoreAllResult,
    NotificationNavigationAction, NotificationNavigationKind, NotificationNavigationRequest,
    NotificationPreferencesGetResult, NotificationPreferencesSnapshot,
    NotificationPreferencesUpdateRequest, NotificationPreferencesUpdateResult,
    NotificationTrayState, NotificationUnreadConversation, NotificationUnreadSummary,
    NotificationUnreadUpdateRequest,
};
use crate::{
    domain::notification::is_dnd_active_at_minute,
    infrastructure::persistence::json_store::{
        notification_preferences_store::{
            default_notification_preferences, load_notification_preferences,
            save_notification_preferences, unavailable_permission_snapshot,
            validate_notification_preferences_store,
        },
        workspace_registry_store::now_ms as store_now_ms,
    },
};

pub const NOTIFICATION_UNREAD_SCHEMA_VERSION: u32 = 1;
pub const NOTIFICATION_UNREAD_CHANGED_EVENT: &str = "notification-unread-changed";
pub const NOTIFICATION_NAVIGATION_CHANGED_EVENT: &str = "notification-navigation-requested";
pub const NOTIFICATION_PREFERENCES_CHANGED_EVENT: &str = "notification-preferences-changed";

pub fn get_notification_preferences(
    app_data_dir: impl AsRef<Path>,
) -> Result<NotificationPreferencesGetResult, AppError> {
    Ok(NotificationPreferencesGetResult {
        preferences: load_notification_preferences(app_data_dir.as_ref())?,
    })
}

pub fn update_notification_preferences(
    app_data_dir: impl AsRef<Path>,
    request: NotificationPreferencesUpdateRequest,
) -> Result<NotificationPreferencesUpdateResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut preferences = load_notification_preferences(app_data_dir)?;
    let mut changed = false;

    macro_rules! apply_bool {
        ($field:ident, $value:expr) => {
            if let Some(value) = $value {
                if preferences.$field != value {
                    preferences.$field = value;
                    changed = true;
                }
            }
        };
    }

    apply_bool!(
        desktop_notifications_enabled,
        request.desktop_notifications_enabled
    );
    apply_bool!(sound_enabled, request.sound_enabled);
    apply_bool!(mentions_only, request.mentions_only);
    apply_bool!(message_preview_enabled, request.message_preview_enabled);
    apply_bool!(dnd_enabled, request.dnd_enabled);

    if let Some(minutes) = request.dnd_start_minutes {
        if preferences.dnd_start_minutes != minutes {
            preferences.dnd_start_minutes = minutes;
            changed = true;
        }
    }

    if let Some(minutes) = request.dnd_end_minutes {
        if preferences.dnd_end_minutes != minutes {
            preferences.dnd_end_minutes = minutes;
            changed = true;
        }
    }

    if changed {
        preferences.updated_at_ms = store_now_ms().max(preferences.updated_at_ms + 1);
    }

    preferences.permission = unavailable_permission_snapshot();
    save_notification_preferences(app_data_dir, &preferences)?;

    Ok(NotificationPreferencesUpdateResult { preferences })
}

pub fn validate_notification_preferences_store_for_app_data(
    app_data_dir: impl AsRef<Path>,
) -> Result<(), AppError> {
    validate_notification_preferences_store(app_data_dir.as_ref())
}

#[derive(Default)]
pub struct NotificationRuntimeState {
    inner: Mutex<NotificationState>,
}

impl NotificationRuntimeState {
    pub fn unread_summary(&self) -> NotificationUnreadSummary {
        let preferences = default_notification_preferences();
        self.unread_summary_with_preferences(&preferences)
    }

    pub fn unread_summary_with_preferences(
        &self,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        state.rebuild_summary(preferences);
        state.summary.clone()
    }

    pub fn update_unread_summary(
        &self,
        request: NotificationUnreadUpdateRequest,
    ) -> NotificationUnreadSummary {
        let preferences = default_notification_preferences();
        self.update_unread_summary_with_preferences(request, &preferences)
    }

    pub fn update_unread_summary_with_preferences(
        &self,
        request: NotificationUnreadUpdateRequest,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        state.source = NotificationSourceState {
            workspace_id: request.workspace_id,
            workspace_name: request.workspace_name,
            conversations: request.conversations,
            source_window_label: request.source_window_label,
        };
        state.rebuild_summary(preferences);

        state.summary.clone()
    }

    pub fn ignore_all_unread(
        &self,
        request: NotificationIgnoreAllRequest,
    ) -> NotificationIgnoreAllResult {
        let preferences = default_notification_preferences();
        self.ignore_all_unread_with_preferences(request, &preferences)
    }

    pub fn ignore_all_unread_with_preferences(
        &self,
        request: NotificationIgnoreAllRequest,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationIgnoreAllResult {
        let mut state = self.state();
        let target_workspace_id = request
            .workspace_id
            .clone()
            .or_else(|| state.summary.workspace_id.clone());
        let ignores_current_summary = target_workspace_id == state.summary.workspace_id;
        let ignored_count = if ignores_current_summary {
            let workspace_id = state.summary.workspace_id.as_deref();
            let ignored_pairs: Vec<(String, u64)> = state
                .summary
                .conversations
                .iter()
                .map(|conversation| {
                    (
                        ignored_key(workspace_id, &conversation.conversation_id),
                        conversation.updated_at_ms,
                    )
                })
                .collect();
            let ignored_count = ignored_pairs.len() as u32;

            for (key, updated_at_ms) in ignored_pairs {
                state.ignored_conversations.insert(key, updated_at_ms);
            }

            ignored_count
        } else {
            0
        };

        state.source.source_window_label = request.source_window_label;
        state.rebuild_summary(preferences);

        NotificationIgnoreAllResult {
            summary: state.summary.clone(),
            ignored_count,
        }
    }

    pub fn apply_preferences(
        &self,
        preferences: &NotificationPreferencesSnapshot,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        state.rebuild_summary(preferences);
        state.summary.clone()
    }

    pub fn pending_navigation_action(&self) -> Option<NotificationNavigationAction> {
        self.state().navigation_action.clone()
    }

    pub fn dispatch_navigation(
        &self,
        request: NotificationNavigationRequest,
    ) -> Result<NotificationNavigationAction, AppError> {
        validate_navigation_request(&request)?;

        let mut state = self.state();
        let updated_at_ms = now_ms().max(state.summary.updated_at_ms + 1).max(
            state
                .navigation_action
                .as_ref()
                .map(|action| action.updated_at_ms + 1)
                .unwrap_or(0),
        );
        let action = NotificationNavigationAction {
            schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
            kind: request.kind,
            workspace_id: request.workspace_id,
            conversation_id: request.conversation_id,
            member_id: request.member_id,
            updated_at_ms,
            source_window_label: request.source_window_label,
        };

        state.navigation_action = Some(action.clone());
        Ok(action)
    }

    fn state(&self) -> MutexGuard<'_, NotificationState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

struct NotificationState {
    summary: NotificationUnreadSummary,
    source: NotificationSourceState,
    navigation_action: Option<NotificationNavigationAction>,
    ignored_conversations: HashMap<String, u64>,
}

impl Default for NotificationState {
    fn default() -> Self {
        let source = NotificationSourceState::default();
        Self {
            summary: NotificationUnreadSummary {
                schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
                workspace_id: None,
                workspace_name: None,
                total_unread_count: 0,
                conversations: Vec::new(),
                tray: default_tray_state_for(0),
                updated_at_ms: now_ms(),
                source_window_label: None,
            },
            source,
            navigation_action: None,
            ignored_conversations: HashMap::new(),
        }
    }
}

#[derive(Default)]
struct NotificationSourceState {
    workspace_id: Option<String>,
    workspace_name: Option<String>,
    conversations: Vec<NotificationUnreadConversation>,
    source_window_label: Option<String>,
}

impl NotificationState {
    fn rebuild_summary(&mut self, preferences: &NotificationPreferencesSnapshot) {
        let conversations = apply_notification_preferences(
            &mut self.ignored_conversations,
            self.source.workspace_id.as_deref(),
            self.source.conversations.clone(),
            preferences,
        );
        let total_unread_count = total_unread_count(&conversations);
        let updated_at_ms = now_ms().max(self.summary.updated_at_ms + 1);

        self.summary = NotificationUnreadSummary {
            schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
            workspace_id: self.source.workspace_id.clone(),
            workspace_name: self.source.workspace_name.clone(),
            total_unread_count,
            conversations,
            tray: tray_state_for(total_unread_count, preferences),
            updated_at_ms,
            source_window_label: self.source.source_window_label.clone(),
        };
    }
}

fn apply_notification_preferences(
    ignored_conversations: &mut HashMap<String, u64>,
    workspace_id: Option<&str>,
    conversations: Vec<NotificationUnreadConversation>,
    preferences: &NotificationPreferencesSnapshot,
) -> Vec<NotificationUnreadConversation> {
    let conversations =
        filter_ignored_conversations(ignored_conversations, workspace_id, conversations);

    conversations
        .into_iter()
        .filter(|conversation| !preferences.mentions_only || conversation_has_mention(conversation))
        .map(|mut conversation| {
            if !preferences.message_preview_enabled {
                conversation.last_message_preview = None;
            }
            conversation
        })
        .collect()
}

fn filter_ignored_conversations(
    ignored_conversations: &mut HashMap<String, u64>,
    workspace_id: Option<&str>,
    conversations: Vec<NotificationUnreadConversation>,
) -> Vec<NotificationUnreadConversation> {
    conversations
        .into_iter()
        .filter(|conversation| {
            let key = ignored_key(workspace_id, &conversation.conversation_id);
            match ignored_conversations.get(&key).copied() {
                Some(ignored_at_ms) if conversation.updated_at_ms <= ignored_at_ms => false,
                Some(_) => {
                    ignored_conversations.remove(&key);
                    true
                }
                None => true,
            }
        })
        .collect()
}

fn conversation_has_mention(conversation: &NotificationUnreadConversation) -> bool {
    conversation
        .last_message_preview
        .as_deref()
        .is_some_and(|preview| preview.contains('@'))
}

fn ignored_key(workspace_id: Option<&str>, conversation_id: &str) -> String {
    format!("{}:{}", workspace_id.unwrap_or(""), conversation_id)
}

fn total_unread_count(conversations: &[NotificationUnreadConversation]) -> u32 {
    conversations
        .iter()
        .map(|conversation| conversation.unread_count)
        .sum()
}

fn validate_navigation_request(request: &NotificationNavigationRequest) -> Result<(), AppError> {
    match request.kind {
        NotificationNavigationKind::AllUnread => Ok(()),
        NotificationNavigationKind::Conversation if request.conversation_id.is_some() => Ok(()),
        NotificationNavigationKind::Conversation => Err(AppError::recoverable_error(
            "notification.navigation.missingConversation",
            "无法打开会话。",
            "通知缺少会话目标；请从主窗口查看未读会话。",
            None,
        )),
        NotificationNavigationKind::MemberTerminal if request.member_id.is_some() => Ok(()),
        NotificationNavigationKind::MemberTerminal => Err(AppError::recoverable_error(
            "notification.navigation.missingMemberTerminal",
            "无法打开成员终端。",
            "通知缺少成员终端目标；请从成员列表打开终端。",
            None,
        )),
    }
}

fn tray_state_for(
    unread_count: u32,
    preferences: &NotificationPreferencesSnapshot,
) -> NotificationTrayState {
    let dnd_active = is_dnd_active_at_minute(preferences, current_day_minute_utc());
    let can_interrupt = preferences.desktop_notifications_enabled && !dnd_active;

    NotificationTrayState {
        unread_count,
        badge_label: if unread_count > 0 {
            Some(if unread_count > 99 {
                "99+".to_owned()
            } else {
                unread_count.to_string()
            })
        } else {
            None
        },
        has_unread: unread_count > 0 && can_interrupt,
    }
}

fn default_tray_state_for(unread_count: u32) -> NotificationTrayState {
    tray_state_for(unread_count, &default_notification_preferences())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn current_day_minute_utc() -> u16 {
    ((now_ms() / 1_000 / 60) % 1_440_u64) as u16
}

#[cfg(test)]
mod tests {
    use super::{current_day_minute_utc, NotificationRuntimeState};
    use crate::contracts::{
        NotificationIgnoreAllRequest, NotificationNavigationKind, NotificationNavigationRequest,
        NotificationUnreadConversation, NotificationUnreadUpdateRequest,
    };
    use crate::infrastructure::persistence::json_store::notification_preferences_store::default_notification_preferences;

    #[test]
    fn aggregates_unread_count_and_tray_badge() {
        let state = NotificationRuntimeState::default();
        let summary = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![
                NotificationUnreadConversation {
                    conversation_id: "conversation-1".to_owned(),
                    title: "General".to_owned(),
                    unread_count: 2,
                    last_message_preview: Some("hello".to_owned()),
                    terminal_member_id: None,
                    updated_at_ms: 1,
                },
                NotificationUnreadConversation {
                    conversation_id: "conversation-2".to_owned(),
                    title: "Review".to_owned(),
                    unread_count: 3,
                    last_message_preview: None,
                    terminal_member_id: Some("member-1".to_owned()),
                    updated_at_ms: 2,
                },
            ],
            source_window_label: Some("main".to_owned()),
        });

        assert_eq!(summary.total_unread_count, 5);
        assert_eq!(summary.tray.badge_label.as_deref(), Some("5"));
        assert!(summary.tray.has_unread);
        assert_eq!(summary.conversations.len(), 2);
    }

    #[test]
    fn clears_tray_state_when_unread_count_is_zero() {
        let state = NotificationRuntimeState::default();
        let summary = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: Vec::new(),
            source_window_label: Some("main".to_owned()),
        });

        assert_eq!(summary.total_unread_count, 0);
        assert_eq!(summary.tray.badge_label, None);
        assert!(!summary.tray.has_unread);
    }

    #[test]
    fn stores_pending_navigation_action_for_late_subscribers() {
        let state = NotificationRuntimeState::default();
        let action = state
            .dispatch_navigation(NotificationNavigationRequest {
                kind: NotificationNavigationKind::Conversation,
                workspace_id: Some("workspace-1".to_owned()),
                conversation_id: Some("conversation-1".to_owned()),
                member_id: None,
                source_window_label: Some("notification-preview".to_owned()),
            })
            .expect("navigation action should be valid");

        assert_eq!(action.kind, NotificationNavigationKind::Conversation);
        assert_eq!(action.conversation_id.as_deref(), Some("conversation-1"));
        assert_eq!(
            state
                .pending_navigation_action()
                .as_ref()
                .map(|action| action.updated_at_ms),
            Some(action.updated_at_ms),
        );
    }

    #[test]
    fn rejects_member_terminal_navigation_without_member_id() {
        let state = NotificationRuntimeState::default();
        let error = state
            .dispatch_navigation(NotificationNavigationRequest {
                kind: NotificationNavigationKind::MemberTerminal,
                workspace_id: Some("workspace-1".to_owned()),
                conversation_id: None,
                member_id: None,
                source_window_label: Some("notification-preview".to_owned()),
            })
            .expect_err("member terminal navigation requires a member id");

        assert_eq!(error.code, "notification.navigation.missingMemberTerminal");
    }

    #[test]
    fn ignore_all_filters_current_unread_without_marking_future_activity_ignored() {
        let state = NotificationRuntimeState::default();
        state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![NotificationUnreadConversation {
                conversation_id: "conversation-1".to_owned(),
                title: "General".to_owned(),
                unread_count: 2,
                last_message_preview: Some("hello".to_owned()),
                terminal_member_id: None,
                updated_at_ms: 10,
            }],
            source_window_label: Some("main".to_owned()),
        });

        let ignored = state.ignore_all_unread(NotificationIgnoreAllRequest {
            workspace_id: Some("workspace-1".to_owned()),
            source_window_label: Some("notification-preview".to_owned()),
        });

        assert_eq!(ignored.ignored_count, 1);
        assert_eq!(ignored.summary.total_unread_count, 0);
        assert!(ignored.summary.conversations.is_empty());
        assert!(!ignored.summary.tray.has_unread);

        let repeated = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![NotificationUnreadConversation {
                conversation_id: "conversation-1".to_owned(),
                title: "General".to_owned(),
                unread_count: 2,
                last_message_preview: Some("hello".to_owned()),
                terminal_member_id: None,
                updated_at_ms: 10,
            }],
            source_window_label: Some("main".to_owned()),
        });

        assert_eq!(repeated.total_unread_count, 0);

        let newer = state.update_unread_summary(NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![NotificationUnreadConversation {
                conversation_id: "conversation-1".to_owned(),
                title: "General".to_owned(),
                unread_count: 3,
                last_message_preview: Some("new".to_owned()),
                terminal_member_id: None,
                updated_at_ms: 11,
            }],
            source_window_label: Some("main".to_owned()),
        });

        assert_eq!(newer.total_unread_count, 3);
        assert_eq!(newer.conversations.len(), 1);
    }

    #[test]
    fn dnd_preferences_suppress_tray_interruption_without_dropping_unread_count() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        let current_minute = current_day_minute_utc();
        preferences.dnd_enabled = true;
        preferences.dnd_start_minutes = current_minute;
        preferences.dnd_end_minutes = (current_minute + 1) % 1440;

        let summary = state
            .update_unread_summary_with_preferences(unread_request("build ready"), &preferences);

        assert_eq!(summary.total_unread_count, 2);
        assert_eq!(summary.tray.unread_count, 2);
        assert_eq!(summary.tray.badge_label.as_deref(), Some("2"));
        assert!(!summary.tray.has_unread);
    }

    #[test]
    fn disabled_message_preview_hides_conversation_previews() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        preferences.message_preview_enabled = false;

        let summary = state
            .update_unread_summary_with_preferences(unread_request("build ready"), &preferences);

        assert_eq!(summary.total_unread_count, 2);
        assert_eq!(summary.conversations.len(), 1);
        assert_eq!(summary.conversations[0].last_message_preview, None);
    }

    #[test]
    fn mentions_only_filters_non_mention_conversations() {
        let state = NotificationRuntimeState::default();
        let mut preferences = default_notification_preferences();
        preferences.mentions_only = true;

        let summary = state.update_unread_summary_with_preferences(
            NotificationUnreadUpdateRequest {
                workspace_id: Some("workspace-1".to_owned()),
                workspace_name: Some("alpha".to_owned()),
                conversations: vec![
                    unread_conversation("conversation-1", "no direct ping", 1),
                    unread_conversation("conversation-2", "@owner please review", 3),
                ],
                source_window_label: Some("main".to_owned()),
            },
            &preferences,
        );

        assert_eq!(summary.total_unread_count, 3);
        assert_eq!(summary.conversations.len(), 1);
        assert_eq!(
            summary.conversations[0].conversation_id.as_str(),
            "conversation-2"
        );
    }

    fn unread_request(preview: &str) -> NotificationUnreadUpdateRequest {
        NotificationUnreadUpdateRequest {
            workspace_id: Some("workspace-1".to_owned()),
            workspace_name: Some("alpha".to_owned()),
            conversations: vec![unread_conversation("conversation-1", preview, 2)],
            source_window_label: Some("main".to_owned()),
        }
    }

    fn unread_conversation(
        conversation_id: &str,
        preview: &str,
        unread_count: u32,
    ) -> NotificationUnreadConversation {
        NotificationUnreadConversation {
            conversation_id: conversation_id.to_owned(),
            title: "General".to_owned(),
            unread_count,
            last_message_preview: Some(preview.to_owned()),
            terminal_member_id: None,
            updated_at_ms: 10,
        }
    }
}
