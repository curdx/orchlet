use std::path::Path;

use crate::{
    contracts::{AppError, StartPrivateConversationRequest, StartPrivateConversationResult},
    infrastructure::persistence::sqlite::conversation_repository::start_private_conversation,
};

pub fn start_workspace_private_conversation(
    app_data_dir: impl AsRef<Path>,
    request: StartPrivateConversationRequest,
) -> Result<StartPrivateConversationResult, AppError> {
    start_private_conversation(app_data_dir.as_ref(), request)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::start_workspace_private_conversation;
    use crate::{
        app::{contacts::create_global_contact, members::invite_workspace_member},
        contracts::{
            ContactKind, ConversationParticipantKind, CreateContactRequest, InviteMemberRequest,
            InvitedMemberType, MemberRuntimeKind, MemberRuntimeProfile,
            StartPrivateConversationRequest,
        },
    };

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
            ConversationParticipantKind::Contact
        );
    }
}
