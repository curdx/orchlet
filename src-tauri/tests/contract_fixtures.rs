use std::{fs, path::Path};

use orchlet_lib::contracts::{
    AppError, ChatMessageStatus, ClearConversationRequest, ClearConversationResult, ContactKind,
    ConversationKind, ConversationParticipantKind, CreateContactRequest, CreateContactResult,
    CreateGroupConversationRequest, CreateGroupConversationResult, DataIntegrityValidateRequest,
    DataIntegrityValidateResult, DeleteContactRequest, DeleteContactResult,
    DeleteConversationRequest, DeleteConversationResult, InviteMemberRequest, InviteMemberResult,
    InvitedMemberType, ListContactsRequest, ListContactsResult, ListConversationsRequest,
    ListConversationsResult, ListMembersRequest, ListMembersResult, ListMessagesRequest,
    ListMessagesResult, MemberRole, MemberRuntimeKind, MemberStatus, OpenWorkspaceRequest,
    OpenWorkspaceResult, RemoveMemberRequest, RemoveMemberResult, SendMessageRequest,
    SendMessageResult, StartPrivateConversationRequest, StartPrivateConversationResult,
    UpdateContactRequest, UpdateContactResult, UpdateConversationSettingsRequest,
    UpdateConversationSettingsResult, UpdateGroupConversationMembersRequest,
    UpdateGroupConversationMembersResult, UpdateReadPositionRequest, UpdateReadPositionResult,
    WorkspaceOpenStatus,
};
use serde::de::DeserializeOwned;

#[test]
fn workspace_contract_fixtures_deserialize_into_rust_dtos() {
    let request: OpenWorkspaceRequest =
        read_fixture("../fixtures/contracts/workspace/workspace-open.request.json");
    let result: OpenWorkspaceResult =
        read_fixture("../fixtures/contracts/workspace/workspace-open.result.json");
    let error: AppError = read_fixture("../fixtures/contracts/workspace/workspace-open.error.json");

    assert_eq!(request.path, "/fixtures/workspaces/alpha");
    assert_eq!(request.conflict_resolution, None);
    assert_eq!(result.status, WorkspaceOpenStatus::Opened);
    assert_eq!(
        result
            .workspace
            .as_ref()
            .expect("workspace fixture")
            .metadata
            .name,
        "alpha"
    );
    assert_eq!(error.code, "workspace.metadata.invalidJson");
    assert!(error.recoverable);
}

#[test]
fn data_integrity_contract_fixtures_deserialize_into_rust_dtos() {
    let request: DataIntegrityValidateRequest =
        read_fixture("../fixtures/contracts/data-integrity/data-integrity-validate.request.json");
    let result: DataIntegrityValidateResult =
        read_fixture("../fixtures/contracts/data-integrity/data-integrity-validate.result.json");
    let error: AppError =
        read_fixture("../fixtures/contracts/data-integrity/data-integrity-validate.error.json");

    assert_eq!(
        request.workspace_root.as_deref(),
        Some("/fixtures/workspaces/alpha")
    );
    assert_eq!(result.report.total_checks, 5);
    assert_eq!(result.report.passed_checks, 5);
    assert!(!result.report.has_failures);
    assert_eq!(error.code, "dataIntegrity.appDataDirFailed");
    assert!(error.recoverable);
}

#[test]
fn member_contract_fixtures_deserialize_into_rust_dtos() {
    let list_request: ListMembersRequest =
        read_fixture("../fixtures/contracts/member/members-list.request.json");
    let list_result: ListMembersResult =
        read_fixture("../fixtures/contracts/member/members-list.result.json");
    let list_error: AppError = read_fixture("../fixtures/contracts/member/members-list.error.json");
    let invite_request: InviteMemberRequest =
        read_fixture("../fixtures/contracts/member/member-invite.request.json");
    let invite_result: InviteMemberResult =
        read_fixture("../fixtures/contracts/member/member-invite.result.json");
    let invite_error: AppError =
        read_fixture("../fixtures/contracts/member/member-invite.error.json");
    let remove_request: RemoveMemberRequest =
        read_fixture("../fixtures/contracts/member/member-remove.request.json");
    let remove_result: RemoveMemberResult =
        read_fixture("../fixtures/contracts/member/member-remove.result.json");
    let remove_error: AppError =
        read_fixture("../fixtures/contracts/member/member-remove.error.json");

    assert_eq!(list_request.workspace_id, "01K00000000000000000000000");
    assert_eq!(list_result.members.len(), 1);
    assert_eq!(list_result.members[0].role, MemberRole::Owner);
    assert_eq!(list_error.code, "member.workspace.invalidId");
    assert_eq!(invite_request.member_type, InvitedMemberType::Assistant);
    assert_eq!(invite_request.instance_count, Some(2));
    assert_eq!(invite_request.runtime.kind, MemberRuntimeKind::BuiltInAiCli);
    assert_eq!(invite_result.member.status, MemberStatus::Offline);
    assert_eq!(invite_result.invited_members.len(), 2);
    assert_eq!(invite_result.members.len(), 3);
    assert_eq!(invite_result.member.instance_label, "Codex Reviewer 1");
    assert_eq!(invite_error.code, "member.runtime.commandMissing");
    assert_eq!(remove_request.member_id, "01K00000000000000000000031");
    assert_eq!(remove_result.removed_member_id, remove_request.member_id);
    assert_eq!(remove_result.members.len(), 1);
    assert_eq!(remove_error.code, "member.remove.forbidden");
}

#[test]
fn contact_contract_fixtures_deserialize_into_rust_dtos() {
    let _list_request: ListContactsRequest =
        read_fixture("../fixtures/contracts/contact/contacts-list.request.json");
    let list_result: ListContactsResult =
        read_fixture("../fixtures/contracts/contact/contacts-list.result.json");
    let list_error: AppError =
        read_fixture("../fixtures/contracts/contact/contacts-list.error.json");
    let create_request: CreateContactRequest =
        read_fixture("../fixtures/contracts/contact/contact-create.request.json");
    let create_result: CreateContactResult =
        read_fixture("../fixtures/contracts/contact/contact-create.result.json");
    let create_error: AppError =
        read_fixture("../fixtures/contracts/contact/contact-create.error.json");
    let update_request: UpdateContactRequest =
        read_fixture("../fixtures/contracts/contact/contact-update.request.json");
    let update_result: UpdateContactResult =
        read_fixture("../fixtures/contracts/contact/contact-update.result.json");
    let update_error: AppError =
        read_fixture("../fixtures/contracts/contact/contact-update.error.json");
    let delete_request: DeleteContactRequest =
        read_fixture("../fixtures/contracts/contact/contact-delete.request.json");
    let delete_result: DeleteContactResult =
        read_fixture("../fixtures/contracts/contact/contact-delete.result.json");
    let delete_error: AppError =
        read_fixture("../fixtures/contracts/contact/contact-delete.error.json");

    assert_eq!(list_result.contacts.len(), 1);
    assert_eq!(
        list_result.contacts[0].contact_kind,
        ContactKind::Administrator
    );
    assert_eq!(list_error.code, "contact.appDataDirFailed");
    assert_eq!(create_request.contact_kind, ContactKind::Administrator);
    assert_eq!(
        create_request.workspace_id.as_deref(),
        Some("01K00000000000000000000000")
    );
    assert_eq!(create_result.contact.display_name, "External Admin");
    assert_eq!(
        create_result
            .admin_member
            .as_ref()
            .expect("admin member fixture")
            .role,
        MemberRole::Admin
    );
    assert_eq!(create_error.code, "contact.displayName.empty");
    assert_eq!(update_request.contact_kind, ContactKind::Contact);
    assert_eq!(update_result.contact.display_name, "External Admin Updated");
    assert_eq!(update_error.code, "contact.get.notFound");
    assert_eq!(delete_result.deleted_contact_id, delete_request.contact_id);
    assert_eq!(delete_error.code, "contact.delete.notFound");
}

#[test]
fn chat_contract_fixtures_deserialize_into_rust_dtos() {
    let list_request: ListConversationsRequest =
        read_fixture("../fixtures/contracts/chat/chat-conversations-list.request.json");
    let list_result: ListConversationsResult =
        read_fixture("../fixtures/contracts/chat/chat-conversations-list.result.json");
    let list_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-conversations-list.error.json");
    let create_group_request: CreateGroupConversationRequest =
        read_fixture("../fixtures/contracts/chat/chat-group-conversation-create.request.json");
    let create_group_result: CreateGroupConversationResult =
        read_fixture("../fixtures/contracts/chat/chat-group-conversation-create.result.json");
    let create_group_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-group-conversation-create.error.json");
    let settings_request: UpdateConversationSettingsRequest =
        read_fixture("../fixtures/contracts/chat/chat-conversation-settings-update.request.json");
    let settings_result: UpdateConversationSettingsResult =
        read_fixture("../fixtures/contracts/chat/chat-conversation-settings-update.result.json");
    let settings_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-conversation-settings-update.error.json");
    let clear_request: ClearConversationRequest =
        read_fixture("../fixtures/contracts/chat/chat-conversation-clear.request.json");
    let clear_result: ClearConversationResult =
        read_fixture("../fixtures/contracts/chat/chat-conversation-clear.result.json");
    let clear_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-conversation-clear.error.json");
    let delete_request: DeleteConversationRequest =
        read_fixture("../fixtures/contracts/chat/chat-conversation-delete.request.json");
    let delete_result: DeleteConversationResult =
        read_fixture("../fixtures/contracts/chat/chat-conversation-delete.result.json");
    let delete_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-conversation-delete.error.json");
    let send_message_request: SendMessageRequest =
        read_fixture("../fixtures/contracts/chat/chat-message-send.request.json");
    let send_message_result: SendMessageResult =
        read_fixture("../fixtures/contracts/chat/chat-message-send.result.json");
    let send_message_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-message-send.error.json");
    let list_messages_request: ListMessagesRequest =
        read_fixture("../fixtures/contracts/chat/chat-messages-page.request.json");
    let list_messages_result: ListMessagesResult =
        read_fixture("../fixtures/contracts/chat/chat-messages-page.result.json");
    let list_messages_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-messages-page.error.json");
    let update_read_position_request: UpdateReadPositionRequest =
        read_fixture("../fixtures/contracts/chat/chat-read-position-update.request.json");
    let update_read_position_result: UpdateReadPositionResult =
        read_fixture("../fixtures/contracts/chat/chat-read-position-update.result.json");
    let update_read_position_error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-read-position-update.error.json");
    let update_group_request: UpdateGroupConversationMembersRequest = read_fixture(
        "../fixtures/contracts/chat/chat-group-conversation-members-update.request.json",
    );
    let update_group_result: UpdateGroupConversationMembersResult = read_fixture(
        "../fixtures/contracts/chat/chat-group-conversation-members-update.result.json",
    );
    let update_group_error: AppError = read_fixture(
        "../fixtures/contracts/chat/chat-group-conversation-members-update.error.json",
    );
    let request: StartPrivateConversationRequest =
        read_fixture("../fixtures/contracts/chat/chat-private-conversation-start.request.json");
    let result: StartPrivateConversationResult =
        read_fixture("../fixtures/contracts/chat/chat-private-conversation-start.result.json");
    let error: AppError =
        read_fixture("../fixtures/contracts/chat/chat-private-conversation-start.error.json");

    assert_eq!(list_request.workspace_id, "01K00000000000000000000000");
    assert_eq!(list_result.conversations.len(), 3);
    assert_eq!(list_result.conversations[0].kind, ConversationKind::Channel);
    assert!(list_result.conversations[0].is_default);
    assert!(list_result.conversations[0].is_pinned);
    assert!(!list_result.conversations[0].is_muted);
    assert_eq!(list_result.conversations[1].kind, ConversationKind::Group);
    assert_eq!(list_result.conversations[1].members.len(), 2);
    assert_eq!(list_error.code, "member.workspace.invalidId");
    assert_eq!(create_group_request.title, " Review Room ");
    assert_eq!(create_group_request.member_ids.len(), 2);
    assert_eq!(
        create_group_result.conversation.kind,
        ConversationKind::Group
    );
    assert_eq!(create_group_result.conversation.members.len(), 2);
    assert_eq!(create_group_error.code, "conversation.title.empty");
    assert_eq!(settings_request.title.as_deref(), Some(" Renamed Room "));
    assert_eq!(settings_request.is_pinned, Some(true));
    assert_eq!(settings_request.is_muted, Some(true));
    assert_eq!(settings_result.conversation.title, "Renamed Room");
    assert!(settings_result.conversation.is_pinned);
    assert!(settings_result.conversation.is_muted);
    assert_eq!(settings_error.code, "conversation.getById.notFound");
    assert_eq!(
        clear_request.conversation_id,
        create_group_result.conversation.conversation_id
    );
    assert_eq!(clear_result.cleared_message_count, 3);
    assert_eq!(clear_result.conversation.unread_count, 0);
    assert_eq!(clear_result.conversation.last_message_preview, None);
    assert_eq!(clear_error.code, "conversation.getById.notFound");
    assert_eq!(
        delete_request.conversation_id,
        create_group_result.conversation.conversation_id
    );
    assert_eq!(
        delete_result.deleted_conversation_id,
        delete_request.conversation_id
    );
    assert_eq!(delete_result.conversations.len(), 1);
    assert_eq!(delete_error.code, "conversation.delete.defaultForbidden");
    assert_eq!(send_message_request.body, "Ship it");
    assert_eq!(send_message_result.message.status, ChatMessageStatus::Sent);
    assert_eq!(
        send_message_result.read_position.last_read_message_id,
        send_message_result.message.message_id
    );
    assert_eq!(send_message_error.code, "message.body.empty");
    assert_eq!(list_messages_request.limit, Some(30));
    assert_eq!(list_messages_result.messages.len(), 2);
    assert!(list_messages_result.has_more);
    assert_eq!(
        list_messages_result.messages[1].status,
        ChatMessageStatus::Sent
    );
    assert_eq!(list_messages_error.code, "message.cursor.notFound");
    assert_eq!(
        update_read_position_request.message_id,
        "01K00000000000000000000071"
    );
    assert_eq!(update_read_position_result.conversation.unread_count, 0);
    assert_eq!(
        update_read_position_error.code,
        "readPosition.message.notFound"
    );
    assert_eq!(
        update_group_request.conversation_id,
        create_group_result.conversation.conversation_id
    );
    assert_eq!(update_group_result.conversation.members.len(), 1);
    assert_eq!(
        update_group_result.conversation.members[0].member_id,
        "01K00000000000000000000032"
    );
    assert_eq!(
        update_group_error.code,
        "conversation.group.updateMembers.invalidKind"
    );
    assert_eq!(request.workspace_id, "01K00000000000000000000000");
    assert_eq!(
        request.participant_kind,
        ConversationParticipantKind::Contact
    );
    assert!(result.created);
    assert_eq!(result.conversation.title, "External Admin");
    assert_eq!(error.code, "conversation.participant.memberNotFound");
}

fn read_fixture<T: DeserializeOwned>(relative_path: &str) -> T {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(relative_path);
    let raw = fs::read_to_string(&path).unwrap_or_else(|error| {
        panic!("failed to read fixture {}: {}", path.display(), error);
    });

    serde_json::from_str(&raw).unwrap_or_else(|error| {
        panic!(
            "failed to deserialize fixture {}: {}",
            path.display(),
            error
        );
    })
}
