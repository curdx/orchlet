use std::{
    sync::{Mutex, MutexGuard},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::contracts::{
    AppError, NotificationNavigationAction, NotificationNavigationKind,
    NotificationNavigationRequest, NotificationTrayState, NotificationUnreadSummary,
    NotificationUnreadUpdateRequest,
};

pub const NOTIFICATION_UNREAD_SCHEMA_VERSION: u32 = 1;
pub const NOTIFICATION_UNREAD_CHANGED_EVENT: &str = "notification-unread-changed";
pub const NOTIFICATION_NAVIGATION_CHANGED_EVENT: &str = "notification-navigation-requested";

#[derive(Default)]
pub struct NotificationRuntimeState {
    inner: Mutex<NotificationState>,
}

impl NotificationRuntimeState {
    pub fn unread_summary(&self) -> NotificationUnreadSummary {
        self.state().summary.clone()
    }

    pub fn update_unread_summary(
        &self,
        request: NotificationUnreadUpdateRequest,
    ) -> NotificationUnreadSummary {
        let mut state = self.state();
        let total_unread_count = request
            .conversations
            .iter()
            .map(|conversation| conversation.unread_count)
            .sum();
        let updated_at_ms = now_ms().max(state.summary.updated_at_ms + 1);
        let tray = tray_state_for(total_unread_count);

        state.summary = NotificationUnreadSummary {
            schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
            workspace_id: request.workspace_id,
            workspace_name: request.workspace_name,
            total_unread_count,
            conversations: request.conversations,
            tray,
            updated_at_ms,
            source_window_label: request.source_window_label,
        };

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
    navigation_action: Option<NotificationNavigationAction>,
}

impl Default for NotificationState {
    fn default() -> Self {
        Self {
            summary: NotificationUnreadSummary {
                schema_version: NOTIFICATION_UNREAD_SCHEMA_VERSION,
                workspace_id: None,
                workspace_name: None,
                total_unread_count: 0,
                conversations: Vec::new(),
                tray: tray_state_for(0),
                updated_at_ms: now_ms(),
                source_window_label: None,
            },
            navigation_action: None,
        }
    }
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

fn tray_state_for(unread_count: u32) -> NotificationTrayState {
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
        has_unread: unread_count > 0,
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::NotificationRuntimeState;
    use crate::contracts::{
        NotificationNavigationKind, NotificationNavigationRequest, NotificationUnreadConversation,
        NotificationUnreadUpdateRequest,
    };

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
}
