use std::path::Path;

use crate::{
    contracts::{
        AppError, CreateGroupConversationRequest, CreateGroupConversationResult,
        ListConversationsRequest, ListConversationsResult, ListMessagesRequest, ListMessagesResult,
        SendMessageRequest, SendMessageResult, StartPrivateConversationRequest,
        StartPrivateConversationResult, UpdateGroupConversationMembersRequest,
        UpdateGroupConversationMembersResult, UpdateReadPositionRequest, UpdateReadPositionResult,
    },
    infrastructure::persistence::sqlite::conversation_repository::{
        create_group_conversation, list_conversations, list_messages, send_message,
        start_private_conversation, update_group_conversation_members, update_read_position,
    },
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
    send_message(app_data_dir.as_ref(), request)
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
    use tempfile::tempdir;

    use super::{
        create_workspace_group_conversation, list_workspace_conversations, list_workspace_messages,
        send_workspace_message, start_workspace_private_conversation,
        update_workspace_group_conversation_members, update_workspace_read_position,
    };
    use crate::{
        app::{contacts::create_global_contact, members::invite_workspace_member},
        contracts::{
            ChatMessageStatus, ContactKind, ConversationKind, ConversationParticipantKind,
            CreateContactRequest, CreateGroupConversationRequest, InviteMemberRequest,
            InvitedMemberType, ListConversationsRequest, ListMessagesRequest, MemberRuntimeKind,
            MemberRuntimeProfile, SendMessageRequest, StartPrivateConversationRequest,
            UpdateGroupConversationMembersRequest, UpdateReadPositionRequest,
        },
    };

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
            },
        )
        .expect("second sent");
        let third = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace_id.clone(),
                conversation_id: default_channel.conversation_id.clone(),
                body: "third".to_owned(),
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
}
