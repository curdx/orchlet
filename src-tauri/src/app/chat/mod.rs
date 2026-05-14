use std::path::{Path, PathBuf};

use crate::{
    app::{
        diagnostics::{best_effort_event, record_workspace_diagnostics_event_best_effort},
        orchestration::dispatch_chat_message_to_resolved_target_for_send,
        terminal::{TerminalEventSink, TerminalRuntimeState, TerminalStatusSink},
    },
    contracts::{
        AppError, ClearConversationRequest, ClearConversationResult, ClearWorkspaceChatDataRequest,
        ClearWorkspaceChatDataResult, CreateGroupConversationRequest,
        CreateGroupConversationResult, DeleteConversationRequest, DeleteConversationResult,
        DiagnosticsCorrelationIds, DiagnosticsEventScope, DiagnosticsEventSeverity,
        DiagnosticsMetadataEntry, DispatchChatMessageRequest, DispatchChatMessageResult,
        ListConversationsRequest, ListConversationsResult, ListMessagesRequest, ListMessagesResult,
        OpenedWorkspace, RepairWorkspaceChatDataRequest, RepairWorkspaceChatDataResult,
        SendMessageAndDispatchRequest, SendMessageAndDispatchResult, SendMessageRequest,
        SendMessageResult, StartPrivateConversationRequest, StartPrivateConversationResult,
        UpdateConversationSettingsRequest, UpdateConversationSettingsResult,
        UpdateGroupConversationMembersRequest, UpdateGroupConversationMembersResult,
        UpdateReadPositionRequest, UpdateReadPositionResult,
    },
    domain::{chat::has_all_mention_token, orchestration::plan_send_dispatch_targets},
    infrastructure::persistence::sqlite::conversation_repository::{
        clear_conversation, clear_workspace_chat_data, create_group_conversation,
        delete_conversation, list_conversations, list_messages, repair_workspace_chat_data,
        send_message, start_private_conversation, update_conversation_settings,
        update_group_conversation_members, update_read_position,
    },
    infrastructure::persistence::sqlite::dispatch_repository::create_failed_dispatch_with_sources,
    infrastructure::persistence::sqlite::member_repository::initialize_member_store,
};

pub fn list_workspace_conversations(
    app_data_dir: impl AsRef<Path>,
    request: ListConversationsRequest,
) -> Result<ListConversationsResult, AppError> {
    list_conversations(app_data_dir.as_ref(), request)
}

pub fn create_workspace_group_conversation(
    app_data_dir: impl AsRef<Path>,
    request: CreateGroupConversationRequest,
) -> Result<CreateGroupConversationResult, AppError> {
    create_group_conversation(app_data_dir.as_ref(), request)
}

pub fn send_workspace_message(
    app_data_dir: impl AsRef<Path>,
    request: SendMessageRequest,
) -> Result<SendMessageResult, AppError> {
    if has_all_mention_token(&request.body) {
        return Err(AppError::recoverable_error(
            "message.mention.allUnsupported",
            "@all 需要通过发送并派发入口处理。",
            "请使用当前聊天发送入口，或选择具体成员后重试。",
            None,
        ));
    }

    persist_workspace_message(app_data_dir.as_ref(), request)
}

fn persist_workspace_message(
    app_data_dir: &Path,
    request: SendMessageRequest,
) -> Result<SendMessageResult, AppError> {
    let result = send_message(app_data_dir.as_ref(), request)?;
    record_workspace_diagnostics_event_best_effort(
        app_data_dir,
        best_effort_event(
            &result.message.workspace_id,
            DiagnosticsEventScope::Chat,
            "chat.message.sent",
            DiagnosticsEventSeverity::Info,
            DiagnosticsCorrelationIds {
                workspace_id: Some(result.message.workspace_id.clone()),
                conversation_id: Some(result.message.conversation_id.clone()),
                message_id: Some(result.message.message_id.clone()),
                ..DiagnosticsCorrelationIds::default()
            },
            vec![DiagnosticsMetadataEntry {
                key: "status".to_owned(),
                value: "sent".to_owned(),
            }],
        ),
    );

    Ok(result)
}

pub fn send_workspace_message_and_dispatch(
    app_data_dir: PathBuf,
    workspace: &OpenedWorkspace,
    request: SendMessageAndDispatchRequest,
    terminal_state: &TerminalRuntimeState,
    event_sink: TerminalEventSink,
    status_sink: TerminalStatusSink,
) -> Result<SendMessageAndDispatchResult, AppError> {
    if workspace.metadata.project_id != request.workspace_id {
        return Err(AppError::recoverable_error(
            "chat.workspace.mismatch",
            "消息不属于当前工作区。",
            "请刷新工作区上下文后重试。",
            Some(format!(
                "activeWorkspaceId={} requestWorkspaceId={}",
                workspace.metadata.project_id, request.workspace_id
            )),
        ));
    }

    let mention_all = has_all_mention_token(&request.body);
    let sent = persist_workspace_message(
        &app_data_dir,
        SendMessageRequest {
            workspace_id: request.workspace_id,
            conversation_id: request.conversation_id,
            body: request.body,
            mentioned_member_ids: request.mentioned_member_ids,
        },
    )?;
    let members = initialize_member_store(&app_data_dir, &sent.message.workspace_id)?.members;
    let targets =
        plan_send_dispatch_targets(mention_all, &sent.message, &sent.conversation, &members);
    let mut dispatches = Vec::new();

    for target in targets {
        let dispatch_request = DispatchChatMessageRequest {
            workspace_id: sent.message.workspace_id.clone(),
            conversation_id: sent.message.conversation_id.clone(),
            message_id: sent.message.message_id.clone(),
            member_id: None,
        };
        let dispatch_result = dispatch_chat_message_to_resolved_target_for_send(
            app_data_dir.clone(),
            workspace,
            dispatch_request,
            target.clone(),
            terminal_state,
            event_sink.clone(),
            status_sink.clone(),
        )
        .or_else(|error| {
            create_failed_dispatch_with_sources(
                &app_data_dir,
                &sent.message.workspace_id,
                &sent.message.conversation_id,
                &sent.message.message_id,
                std::slice::from_ref(&sent.message.message_id),
                &target,
                &error,
            )
            .map(|dispatch| DispatchChatMessageResult {
                dispatch,
                terminal_session: None,
                session_created: false,
            })
        })?;
        dispatches.push(dispatch_result);
    }

    Ok(SendMessageAndDispatchResult {
        message: sent.message,
        conversation: sent.conversation,
        read_position: sent.read_position,
        dispatches,
    })
}

pub fn update_workspace_conversation_settings(
    app_data_dir: impl AsRef<Path>,
    request: UpdateConversationSettingsRequest,
) -> Result<UpdateConversationSettingsResult, AppError> {
    update_conversation_settings(app_data_dir.as_ref(), request)
}

pub fn clear_workspace_conversation(
    app_data_dir: impl AsRef<Path>,
    request: ClearConversationRequest,
) -> Result<ClearConversationResult, AppError> {
    clear_conversation(app_data_dir.as_ref(), request)
}

pub fn repair_workspace_chat_data_use_case(
    app_data_dir: impl AsRef<Path>,
    request: RepairWorkspaceChatDataRequest,
) -> Result<RepairWorkspaceChatDataResult, AppError> {
    repair_workspace_chat_data(app_data_dir.as_ref(), request)
}

pub fn clear_workspace_chat_data_use_case(
    app_data_dir: impl AsRef<Path>,
    request: ClearWorkspaceChatDataRequest,
) -> Result<ClearWorkspaceChatDataResult, AppError> {
    clear_workspace_chat_data(app_data_dir.as_ref(), request)
}

pub fn delete_workspace_conversation(
    app_data_dir: impl AsRef<Path>,
    request: DeleteConversationRequest,
) -> Result<DeleteConversationResult, AppError> {
    delete_conversation(app_data_dir.as_ref(), request)
}

pub fn list_workspace_messages(
    app_data_dir: impl AsRef<Path>,
    request: ListMessagesRequest,
) -> Result<ListMessagesResult, AppError> {
    list_messages(app_data_dir.as_ref(), request)
}

pub fn update_workspace_read_position(
    app_data_dir: impl AsRef<Path>,
    request: UpdateReadPositionRequest,
) -> Result<UpdateReadPositionResult, AppError> {
    update_read_position(app_data_dir.as_ref(), request)
}

pub fn update_workspace_group_conversation_members(
    app_data_dir: impl AsRef<Path>,
    request: UpdateGroupConversationMembersRequest,
) -> Result<UpdateGroupConversationMembersResult, AppError> {
    update_group_conversation_members(app_data_dir.as_ref(), request)
}

pub fn start_workspace_private_conversation(
    app_data_dir: impl AsRef<Path>,
    request: StartPrivateConversationRequest,
) -> Result<StartPrivateConversationResult, AppError> {
    start_private_conversation(app_data_dir.as_ref(), request)
}

#[cfg(test)]
mod tests {
    use std::{collections::HashMap, fs, path::Path};

    use redb::TableDefinition;
    use serde::{Deserialize, Serialize};
    use tempfile::tempdir;
    use ulid::Ulid;

    use super::{
        clear_workspace_chat_data_use_case, clear_workspace_conversation,
        create_workspace_group_conversation, delete_workspace_conversation,
        list_workspace_conversations, list_workspace_messages, repair_workspace_chat_data_use_case,
        send_workspace_message, start_workspace_private_conversation,
        update_workspace_conversation_settings, update_workspace_group_conversation_members,
        update_workspace_read_position,
    };
    use crate::{
        app::{contacts::create_global_contact, members::invite_workspace_member},
        contracts::{
            ChatDataMaintenanceItemStatus, ChatMessageStatus, ClearConversationRequest,
            ClearWorkspaceChatDataRequest, ContactKind, ConversationKind,
            ConversationParticipantKind, CreateContactRequest, CreateGroupConversationRequest,
            DeleteConversationRequest, DispatchTargetResolutionProfile,
            DispatchTargetResolutionSource, InviteMemberRequest, InvitedMemberType,
            ListConversationsRequest, ListMessagesRequest, MemberPermissions, MemberRuntimeKind,
            MemberRuntimeProfile, RepairWorkspaceChatDataRequest, SendMessageRequest,
            StartPrivateConversationRequest, UpdateConversationSettingsRequest,
            UpdateGroupConversationMembersRequest, UpdateReadPositionRequest,
        },
        infrastructure::persistence::sqlite::{
            dispatch_repository::create_queued_dispatch_with_sources,
            workspace_database::open_workspace_database,
        },
    };
    use rusqlite::params;

    type TestLegacyUserId = u128;
    type TestLegacyConvId = u128;
    type TestLegacyMsgId = u128;
    type TestLegacyTsRev = u64;

    const TEST_LEGACY_CONVERSATIONS: TableDefinition<TestLegacyConvId, &[u8]> =
        TableDefinition::new("conversations");
    const TEST_LEGACY_USER_CONVS: TableDefinition<(TestLegacyUserId, TestLegacyConvId), &[u8]> =
        TableDefinition::new("user_convs");
    const TEST_LEGACY_MESSAGES: TableDefinition<(TestLegacyConvId, TestLegacyMsgId), &[u8]> =
        TableDefinition::new("messages");
    const TEST_LEGACY_MEMBERS: TableDefinition<(TestLegacyConvId, TestLegacyUserId), &[u8]> =
        TableDefinition::new("members");
    const TEST_LEGACY_ATTACHMENTS_INDEX: TableDefinition<
        (TestLegacyConvId, u8, TestLegacyTsRev, TestLegacyMsgId),
        &[u8],
    > = TableDefinition::new("attachments_index");

    #[derive(Serialize, Deserialize, Clone, Copy)]
    enum TestLegacyConversationKind {
        Channel,
        Dm,
    }

    #[derive(Serialize, Deserialize)]
    struct TestLegacyConversationMeta {
        kind: TestLegacyConversationKind,
        created_at: u64,
        custom_name: Option<String>,
        is_default: bool,
        last_message_at: Option<u64>,
        last_message_preview: Option<String>,
    }

    #[derive(Serialize, Deserialize, Default)]
    struct TestLegacyUserConversationSettings {
        pinned: bool,
        muted: bool,
        last_read_message_id: Option<TestLegacyMsgId>,
        last_active_at: Option<u64>,
    }

    #[derive(Serialize, Deserialize, Clone)]
    enum TestLegacyMessageStatus {
        Sent,
        Sending,
        Failed,
    }

    #[derive(Serialize, Deserialize, Clone)]
    enum TestLegacyMessageContentDb {
        Text {
            text: String,
        },
        System {
            key: String,
            args: Option<HashMap<String, String>>,
        },
    }

    #[derive(Serialize, Deserialize, Clone)]
    enum TestLegacyMessageAttachmentDb {
        Roadmap { title: String },
    }

    #[derive(Serialize, Deserialize, Clone)]
    struct TestLegacyChatMessage {
        sender_id: Option<TestLegacyUserId>,
        content: TestLegacyMessageContentDb,
        created_at: u64,
        is_ai: bool,
        status: TestLegacyMessageStatus,
        attachment: Option<TestLegacyMessageAttachmentDb>,
    }

    #[test]
    fn listing_conversations_initializes_default_channel() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let first = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let second = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest { workspace_id },
        )
        .expect("conversations listed again");

        assert_eq!(first.conversations.len(), 1);
        assert_eq!(second.conversations.len(), 1);
        assert_eq!(first.conversations[0].kind, ConversationKind::Channel);
        assert!(first.conversations[0].is_default);
        assert_eq!(
            first.conversations[0].conversation_id,
            second.conversations[0].conversation_id
        );
    }

    #[test]
    fn legacy_chat_redb_imports_conversations_and_messages_when_current_sqlite_empty() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let legacy = write_legacy_chat_redb(app_data.path(), &workspace_id);

        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("legacy conversations imported");
        let imported = listed
            .conversations
            .iter()
            .find(|conversation| conversation.conversation_id == legacy.conversation_id)
            .expect("legacy conversation listed");

        assert_eq!(imported.kind, ConversationKind::Channel);
        assert!(imported.is_default);
        assert_eq!(imported.title, "Legacy Workspace");
        assert_eq!(
            imported.last_message_preview.as_deref(),
            Some("legacy second")
        );

        let page = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id,
                conversation_id: legacy.conversation_id,
                before_message_id: None,
                limit: Some(30),
            },
        )
        .expect("legacy messages listed");

        assert_eq!(page.messages.len(), 2);
        assert_eq!(page.messages[0].body, "legacy first");
        assert_eq!(page.messages[1].body, "legacy second");
    }

    #[test]
    fn current_sqlite_chat_store_takes_precedence_over_legacy_chat_redb() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let current = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("current conversations initialized");
        let current_default_id = current.conversations[0].conversation_id.clone();
        let legacy = write_legacy_chat_redb(app_data.path(), &workspace_id);

        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest { workspace_id },
        )
        .expect("conversations listed");

        assert!(listed
            .conversations
            .iter()
            .any(|conversation| conversation.conversation_id == current_default_id));
        assert!(!listed
            .conversations
            .iter()
            .any(|conversation| conversation.conversation_id == legacy.conversation_id));
    }

    #[test]
    fn corrupt_legacy_chat_redb_returns_recoverable_error_without_importing_conversations() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let legacy_dir = app_data.path().join(&workspace_id);
        fs::create_dir_all(&legacy_dir).expect("legacy chat dir");
        fs::write(legacy_dir.join("chat.redb"), b"not a redb database").expect("corrupt redb");

        let error = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect_err("corrupt legacy chat.redb should be recoverable");

        assert_eq!(error.code, "chat.legacyRedb.openFailed");
        assert!(error.recoverable);

        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("database opened");
        let conversation_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM conversations WHERE workspace_id = ?1",
                params![workspace_id],
                |row| row.get(0),
            )
            .expect("conversation count read");
        assert_eq!(conversation_count, 0);
    }

    #[test]
    fn private_conversation_is_created_once_for_member_participant() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Collaborator".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member invited")
        .member;

        let first = start_workspace_private_conversation(
            app_data.path(),
            StartPrivateConversationRequest {
                workspace_id: workspace_id.clone(),
                participant_kind: ConversationParticipantKind::Member,
                participant_id: member.member_id.clone(),
            },
        )
        .expect("conversation created");
        let second = start_workspace_private_conversation(
            app_data.path(),
            StartPrivateConversationRequest {
                workspace_id,
                participant_kind: ConversationParticipantKind::Member,
                participant_id: member.member_id,
            },
        )
        .expect("conversation reused");

        assert!(first.created);
        assert!(!second.created);
        assert_eq!(
            first.conversation.conversation_id,
            second.conversation.conversation_id
        );
        assert_eq!(first.conversation.title, "Collaborator");
    }

    #[test]
    fn private_conversation_can_target_global_contact() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let contact = create_global_contact(
            app_data.path(),
            CreateContactRequest {
                display_name: "External Admin".to_owned(),
                contact_kind: ContactKind::Administrator,
                notes: None,
                source_label: None,
                workspace_id: None,
            },
        )
        .expect("contact created")
        .contact;

        let result = start_workspace_private_conversation(
            app_data.path(),
            StartPrivateConversationRequest {
                workspace_id,
                participant_kind: ConversationParticipantKind::Contact,
                participant_id: contact.contact_id,
            },
        )
        .expect("conversation created");

        assert!(result.created);
        assert_eq!(result.conversation.title, "External Admin");
        assert_eq!(
            result.conversation.participant_kind,
            Some(ConversationParticipantKind::Contact)
        );
    }

    #[test]
    fn group_conversation_members_can_be_created_and_replaced() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let first_member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("first member invited")
        .member;
        let second_member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Builder".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("second member invited")
        .member;

        let created = create_workspace_group_conversation(
            app_data.path(),
            CreateGroupConversationRequest {
                workspace_id: workspace_id.clone(),
                title: " Review Room ".to_owned(),
                member_ids: vec![first_member.member_id.clone(), first_member.member_id],
            },
        )
        .expect("group created");

        assert_eq!(created.conversation.title, "Review Room");
        assert_eq!(created.conversation.kind, ConversationKind::Group);
        assert_eq!(created.conversation.members.len(), 1);

        let updated = update_workspace_group_conversation_members(
            app_data.path(),
            UpdateGroupConversationMembersRequest {
                workspace_id,
                conversation_id: created.conversation.conversation_id,
                member_ids: vec![second_member.member_id],
            },
        )
        .expect("members replaced");

        assert_eq!(updated.conversation.members.len(), 1);
        assert_eq!(updated.conversation.members[0].instance_label, "Builder");
    }

    #[test]
    fn conversation_settings_update_pin_mute_and_rename() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member invited")
        .member;
        let group = create_workspace_group_conversation(
            app_data.path(),
            CreateGroupConversationRequest {
                workspace_id: workspace_id.clone(),
                title: "Review Room".to_owned(),
                member_ids: vec![member.member_id],
            },
        )
        .expect("group created")
        .conversation;

        let updated = update_workspace_conversation_settings(
            app_data.path(),
            UpdateConversationSettingsRequest {
                workspace_id,
                conversation_id: group.conversation_id.clone(),
                title: Some("  Renamed Room  ".to_owned()),
                is_pinned: Some(true),
                is_muted: Some(true),
            },
        )
        .expect("conversation settings updated");

        assert_eq!(updated.conversation.title, "Renamed Room");
        assert!(updated.conversation.is_pinned);
        assert!(updated.conversation.is_muted);
        assert_eq!(
            updated.conversations[0].conversation_id,
            group.conversation_id
        );
    }

    #[test]
    fn clear_conversation_removes_messages_and_read_position() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        let sent = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "Clear me".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("message sent");

        let cleared = clear_workspace_conversation(
            app_data.path(),
            ClearConversationRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
            },
        )
        .expect("conversation cleared");

        assert_eq!(cleared.cleared_message_count, 1);
        assert_eq!(cleared.conversation.unread_count, 0);
        assert_eq!(cleared.conversation.last_message_preview, None);

        let page = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                before_message_id: None,
                limit: Some(10),
            },
        )
        .expect("messages listed after clear");

        assert_eq!(sent.message.body, "Clear me");
        assert!(page.messages.is_empty());
        assert!(page.read_position.is_none());
    }

    #[test]
    fn delete_conversation_removes_non_default_conversation_from_active_lists() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Builder".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member invited")
        .member;
        let group = create_workspace_group_conversation(
            app_data.path(),
            CreateGroupConversationRequest {
                workspace_id: workspace_id.clone(),
                title: "Delete Room".to_owned(),
                member_ids: vec![member.member_id],
            },
        )
        .expect("group created")
        .conversation;
        send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: group.conversation_id.clone(),
                body: "Delete me".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("message sent");

        let deleted = delete_workspace_conversation(
            app_data.path(),
            DeleteConversationRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: group.conversation_id.clone(),
            },
        )
        .expect("conversation deleted");

        assert_eq!(deleted.deleted_conversation_id, group.conversation_id);
        assert!(!deleted
            .conversations
            .iter()
            .any(|conversation| conversation.conversation_id == group.conversation_id));

        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest { workspace_id },
        )
        .expect("conversations listed after delete");

        assert!(!listed
            .conversations
            .iter()
            .any(|conversation| conversation.conversation_id == group.conversation_id));
    }

    #[test]
    fn default_channel_delete_is_rejected() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();

        let error = delete_workspace_conversation(
            app_data.path(),
            DeleteConversationRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
            },
        )
        .expect_err("default channel delete should be rejected");

        assert_eq!(error.code, "conversation.delete.defaultForbidden");
    }

    #[test]
    fn message_send_stores_message_and_updates_conversation_metadata() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();

        let sent = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "  Hello\nworkspace  ".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("message sent");

        assert_eq!(sent.message.status, ChatMessageStatus::Sent);
        assert_eq!(sent.message.body, "Hello\nworkspace");
        assert_eq!(
            sent.conversation.last_message_preview,
            Some("Hello workspace".to_owned())
        );
        assert_eq!(sent.conversation.unread_count, 0);
        assert_eq!(
            sent.read_position.last_read_message_id,
            sent.message.message_id
        );

        let page = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                before_message_id: None,
                limit: Some(10),
            },
        )
        .expect("messages listed");

        assert_eq!(page.messages.len(), 1);
        assert_eq!(page.messages[0].message_id, sent.message.message_id);
        assert!(!page.has_more);
    }

    #[test]
    fn message_send_persists_and_hydrates_deduplicated_mentions() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: Some(MemberPermissions {
                    can_mention: true,
                    can_remove: true,
                }),
                isolation: None,
            },
        )
        .expect("member invited")
        .member;
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();

        let sent = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "@Reviewer please review".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone(), member.member_id.clone()],
            },
        )
        .expect("message sent");

        assert_eq!(
            sent.message.mentioned_member_ids,
            vec![member.member_id.clone()]
        );

        let page = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                before_message_id: None,
                limit: Some(10),
            },
        )
        .expect("messages listed");

        assert_eq!(page.messages.len(), 1);
        assert_eq!(
            page.messages[0].mentioned_member_ids,
            vec![member.member_id]
        );
    }

    #[test]
    fn message_send_rejects_missing_mentioned_member() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();

        let error = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                body: "@Missing please review".to_owned(),
                mentioned_member_ids: vec!["01K00000000000000000000099".to_owned()],
            },
        )
        .expect_err("missing mention should be rejected");

        assert_eq!(error.code, "message.mention.memberNotFound");
    }

    #[test]
    fn message_send_rejects_unmentionable_member() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Silent Member".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: Some(MemberPermissions {
                    can_mention: false,
                    can_remove: true,
                }),
                isolation: None,
            },
        )
        .expect("member invited")
        .member;
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();

        let error = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                body: "@Silent Member please review".to_owned(),
                mentioned_member_ids: vec![member.member_id],
            },
        )
        .expect_err("unmentionable member should be rejected");

        assert_eq!(error.code, "message.mention.memberNotAllowed");
    }

    #[test]
    fn message_send_rejects_all_mention_token() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();

        let error = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                body: "please review @all".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect_err("@all should use send-and-dispatch");

        assert_eq!(error.code, "message.mention.allUnsupported");
    }

    #[test]
    fn message_history_pages_with_stable_cursor() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        let mut sent_ids = Vec::new();

        for body in ["first", "second", "third"] {
            let sent = send_workspace_message(
                app_data.path(),
                SendMessageRequest {
                    workspace_id: workspace_id.clone(),
                    conversation_id: default_channel.conversation_id.clone(),
                    body: body.to_owned(),
                    mentioned_member_ids: Vec::new(),
                },
            )
            .expect("message sent");
            sent_ids.push(sent.message.message_id);
        }

        let latest_page = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                before_message_id: None,
                limit: Some(2),
            },
        )
        .expect("latest messages listed");

        assert_eq!(
            latest_page
                .messages
                .iter()
                .map(|message| message.body.as_str())
                .collect::<Vec<_>>(),
            vec!["second", "third"]
        );
        assert!(latest_page.has_more);
        assert_eq!(
            latest_page.next_before_message_id,
            Some(sent_ids[1].clone())
        );

        let older_page = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                before_message_id: latest_page.next_before_message_id,
                limit: Some(2),
            },
        )
        .expect("older messages listed");

        assert_eq!(older_page.messages.len(), 1);
        assert_eq!(older_page.messages[0].body, "first");
        assert!(!older_page.has_more);
    }

    #[test]
    fn read_position_updates_unread_count_for_newer_messages() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        let first = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "first".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("first sent")
        .message;
        send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "second".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("second sent");
        let third = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "third".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("third sent")
        .message;

        let first_read = update_workspace_read_position(
            app_data.path(),
            UpdateReadPositionRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                message_id: first.message_id,
            },
        )
        .expect("read position updated to first");

        assert_eq!(first_read.conversation.unread_count, 2);

        let latest_read = update_workspace_read_position(
            app_data.path(),
            UpdateReadPositionRequest {
                workspace_id,
                conversation_id: default_channel.conversation_id,
                message_id: third.message_id.clone(),
            },
        )
        .expect("read position updated to latest");

        assert_eq!(latest_read.conversation.unread_count, 0);
        assert_eq!(
            latest_read.read_position.last_read_message_id,
            third.message_id
        );
    }

    #[test]
    fn chat_data_repair_returns_zero_for_healthy_workspace() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");

        let result = repair_workspace_chat_data_use_case(
            app_data.path(),
            RepairWorkspaceChatDataRequest { workspace_id },
        )
        .expect("repair completed");

        assert_eq!(result.repaired_count, 0);
        assert_eq!(result.failed_count, 0);
        assert_eq!(result.skipped_count, 0);
        assert_eq!(result.conversations.len(), 1);
        assert_eq!(result.follow_up_action, "无需进一步操作。");
    }

    #[test]
    fn chat_data_repair_removes_orphans_and_recalculates_metadata() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        let sent = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "Repair me".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("message sent")
        .message;
        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("workspace database");
        connection
            .execute(
                "INSERT INTO message_mentions (
                    workspace_id, conversation_id, message_id, member_id, created_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    workspace_id,
                    default_channel.conversation_id,
                    "01K00000000000000000009999",
                    "01KMEMBER000000000000000999",
                    1_760_000_002_000_i64
                ],
            )
            .expect("orphan mention inserted");
        connection
            .execute(
                "INSERT OR REPLACE INTO conversation_read_positions (
                    workspace_id, conversation_id, last_read_message_id, last_read_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    workspace_id,
                    default_channel.conversation_id,
                    "01K00000000000000000008888",
                    1_760_000_002_000_i64,
                    1_760_000_002_000_i64
                ],
            )
            .expect("orphan read position inserted");
        connection
            .execute(
                "UPDATE conversations
                 SET unread_count = 7, last_message_preview = 'stale', last_activity_at_ms = 1
                 WHERE workspace_id = ?1 AND id = ?2",
                params![workspace_id, default_channel.conversation_id],
            )
            .expect("metadata corrupted");
        drop(connection);

        let result = repair_workspace_chat_data_use_case(
            app_data.path(),
            RepairWorkspaceChatDataRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("repair completed");

        assert_eq!(result.failed_count, 0);
        assert!(result.repaired_count >= 3);
        assert!(result
            .repaired_items
            .iter()
            .any(|item| item.affected_scope == "message_mentions"
                && item.status == ChatDataMaintenanceItemStatus::Repaired
                && item.count == 1));
        assert!(result
            .repaired_items
            .iter()
            .any(|item| item.affected_scope == "conversation_read_positions" && item.count == 1));
        let repaired_conversation = result
            .conversations
            .iter()
            .find(|conversation| conversation.conversation_id == default_channel.conversation_id)
            .expect("default channel remains");
        assert_eq!(
            repaired_conversation.last_message_preview.as_deref(),
            Some("Repair me")
        );
        assert_eq!(
            repaired_conversation.last_activity_at_ms,
            sent.created_at_ms
        );
    }

    #[test]
    fn chat_data_repair_resets_stale_metadata_when_conversation_has_no_messages() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("workspace database");
        connection
            .execute(
                "UPDATE conversations
                 SET unread_count = 9,
                     last_message_preview = 'deleted message preview',
                     last_activity_at_ms = ?1
                 WHERE workspace_id = ?2 AND id = ?3",
                params![
                    (default_channel.created_at_ms + 60_000) as i64,
                    workspace_id,
                    default_channel.conversation_id
                ],
            )
            .expect("metadata corrupted");
        drop(connection);

        let result = repair_workspace_chat_data_use_case(
            app_data.path(),
            RepairWorkspaceChatDataRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("repair completed");

        assert_eq!(result.failed_count, 0);
        let repaired_conversation = result
            .conversations
            .iter()
            .find(|conversation| conversation.conversation_id == default_channel.conversation_id)
            .expect("default channel remains");
        assert_eq!(repaired_conversation.unread_count, 0);
        assert_eq!(repaired_conversation.last_message_preview, None);
        assert_eq!(
            repaired_conversation.last_activity_at_ms,
            default_channel.created_at_ms
        );
        assert!(result
            .repaired_items
            .iter()
            .any(|item| item.affected_scope == "conversations.metadata" && item.count == 1));
    }

    #[test]
    fn chat_data_repair_removes_dispatch_rows_that_reference_missing_messages() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        create_queued_dispatch_with_sources(
            app_data.path(),
            &workspace_id,
            &default_channel.conversation_id,
            "01K00000000000000000009999",
            &["01K00000000000000000009999".to_owned()],
            &DispatchTargetResolutionProfile {
                member_id: "01KMEMBER000000000000000010".to_owned(),
                source: DispatchTargetResolutionSource::UserSelected,
                reason: "test fixture".to_owned(),
            },
        )
        .expect("queued dispatch created");

        let result = repair_workspace_chat_data_use_case(
            app_data.path(),
            RepairWorkspaceChatDataRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("repair completed");
        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("workspace database");
        let dispatch_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM dispatch_requests WHERE workspace_id = ?1",
                params![workspace_id],
                |row| row.get(0),
            )
            .expect("dispatch count");

        assert_eq!(dispatch_count, 0);
        assert!(result
            .repaired_items
            .iter()
            .any(|item| item.affected_scope == "dispatch_requests" && item.count == 1));
    }

    #[test]
    fn chat_data_clear_removes_workspace_messages_and_preserves_conversations() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "clear me".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("message sent");
        create_queued_dispatch_with_sources(
            app_data.path(),
            &workspace_id,
            &default_channel.conversation_id,
            "01K00000000000000000009999",
            &["01K00000000000000000009999".to_owned()],
            &DispatchTargetResolutionProfile {
                member_id: "01KMEMBER000000000000000010".to_owned(),
                source: DispatchTargetResolutionSource::UserSelected,
                reason: "test fixture".to_owned(),
            },
        )
        .expect("queued dispatch created");

        let result = clear_workspace_chat_data_use_case(
            app_data.path(),
            ClearWorkspaceChatDataRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("workspace chat cleared");

        assert_eq!(result.cleared_message_count, 1);
        assert_eq!(result.cleared_read_position_count, 1);
        assert_eq!(result.cleared_dispatch_count, 1);
        assert!(result
            .conversations
            .iter()
            .any(|conversation| conversation.is_default
                && conversation.kind == ConversationKind::Channel));
        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("workspace database");
        for table_name in [
            "messages",
            "message_mentions",
            "conversation_read_positions",
        ] {
            let count: i64 = connection
                .query_row(
                    &format!("SELECT COUNT(*) FROM {table_name} WHERE workspace_id = ?1"),
                    params![workspace_id],
                    |row| row.get(0),
                )
                .expect("table count");
            assert_eq!(count, 0, "{table_name} should be empty for workspace");
        }
    }

    #[test]
    fn chat_data_clear_rejects_invalid_workspace_without_mutating_existing_data() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("conversations listed");
        let default_channel = listed.conversations[0].clone();
        send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id,
                body: "keep me".to_owned(),
                mentioned_member_ids: Vec::new(),
            },
        )
        .expect("message sent");

        let error = clear_workspace_chat_data_use_case(
            app_data.path(),
            ClearWorkspaceChatDataRequest {
                workspace_id: "not-a-workspace".to_owned(),
            },
        )
        .expect_err("invalid workspace rejected");
        let messages = list_workspace_messages(
            app_data.path(),
            ListMessagesRequest {
                workspace_id,
                conversation_id: listed.conversations[0].conversation_id.clone(),
                before_message_id: None,
                limit: Some(30),
            },
        )
        .expect("messages still listed");

        assert_eq!(error.code, "member.workspace.invalidId");
        assert_eq!(messages.messages.len(), 1);
        assert_eq!(messages.messages[0].body, "keep me");
    }

    struct LegacyChatFixture {
        conversation_id: String,
    }

    fn write_legacy_chat_redb(app_data_dir: &Path, workspace_id: &str) -> LegacyChatFixture {
        let legacy_dir = app_data_dir.join(workspace_id);
        fs::create_dir_all(&legacy_dir).expect("legacy chat dir");
        let db = redb::Database::create(legacy_dir.join("chat.redb")).expect("legacy redb");
        let conv_id = Ulid::new();
        let member_id = Ulid::new();
        let first_message_id = Ulid::new();
        let second_message_id = Ulid::new();
        let write_txn = db.begin_write().expect("legacy write txn");

        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_CONVERSATIONS)
                .expect("legacy conversations");
            let meta = TestLegacyConversationMeta {
                kind: TestLegacyConversationKind::Channel,
                created_at: 1_760_000_000_000,
                custom_name: Some("Legacy Workspace".to_owned()),
                is_default: true,
                last_message_at: Some(1_760_000_000_200),
                last_message_preview: Some("legacy second".to_owned()),
            };
            let payload = bincode::serialize(&meta).expect("conversation encoded");
            table
                .insert(conv_id.0, payload.as_slice())
                .expect("legacy conversation inserted");
        }
        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_USER_CONVS)
                .expect("legacy user convs");
            let settings = TestLegacyUserConversationSettings {
                pinned: true,
                muted: false,
                last_read_message_id: Some(first_message_id.0),
                last_active_at: Some(1_760_000_000_200),
            };
            let payload = bincode::serialize(&settings).expect("settings encoded");
            table
                .insert((member_id.0, conv_id.0), payload.as_slice())
                .expect("legacy settings inserted");
        }
        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_MEMBERS)
                .expect("legacy members");
            let payload = bincode::serialize(&()).expect("member encoded");
            table
                .insert((conv_id.0, member_id.0), payload.as_slice())
                .expect("legacy member inserted");
        }
        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_MESSAGES)
                .expect("legacy messages");
            for (message_id, body, created_at) in [
                (first_message_id, "legacy first", 1_760_000_000_100),
                (second_message_id, "legacy second", 1_760_000_000_200),
            ] {
                let message = TestLegacyChatMessage {
                    sender_id: Some(member_id.0),
                    content: TestLegacyMessageContentDb::Text {
                        text: body.to_owned(),
                    },
                    created_at,
                    is_ai: false,
                    status: TestLegacyMessageStatus::Sent,
                    attachment: None,
                };
                let payload = bincode::serialize(&message).expect("message encoded");
                table
                    .insert((conv_id.0, message_id.0), payload.as_slice())
                    .expect("legacy message inserted");
            }
        }
        {
            let _ = write_txn
                .open_table(TEST_LEGACY_ATTACHMENTS_INDEX)
                .expect("legacy attachments index");
        }

        write_txn.commit().expect("legacy committed");

        LegacyChatFixture {
            conversation_id: conv_id.to_string(),
        }
    }
}
