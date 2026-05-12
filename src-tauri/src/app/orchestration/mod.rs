use std::path::PathBuf;

use crate::{
    app::terminal::{TerminalEventSink, TerminalRuntimeState, TerminalStatusSink},
    contracts::{
        AppError, DispatchChatMessageRequest, DispatchChatMessageResult, OpenedWorkspace,
        TerminalInputRequest, TerminalOpenRequest,
    },
    domain::orchestration::{
        normalize_dispatch_payload, resolve_explicit_dispatch_member, validate_dispatch_scope,
    },
    infrastructure::persistence::sqlite::{
        conversation_repository::message_by_id,
        dispatch_repository::{
            create_pending_dispatch, mark_dispatch_dispatched, mark_dispatch_failed,
        },
    },
};

pub fn dispatch_chat_message(
    app_data_dir: PathBuf,
    workspace: &OpenedWorkspace,
    request: DispatchChatMessageRequest,
    terminal_state: &TerminalRuntimeState,
    event_sink: TerminalEventSink,
    status_sink: TerminalStatusSink,
) -> Result<DispatchChatMessageResult, AppError> {
    validate_dispatch_scope(
        &workspace.metadata.project_id,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
    )?;
    let message = message_by_id(
        &app_data_dir,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
    )?;
    let member_id = resolve_explicit_dispatch_member(
        request.member_id.as_deref(),
        &message.mentioned_member_ids,
    )?;
    let dispatch = create_pending_dispatch(
        &app_data_dir,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
        &member_id,
    )?;
    let terminal_result = terminal_state.open_or_create_session(
        app_data_dir.clone(),
        workspace,
        TerminalOpenRequest {
            member_id: Some(member_id),
            attach_current: false,
        },
        event_sink,
        status_sink,
    );
    let (session, session_created) = match terminal_result {
        Ok(result) => result,
        Err(error) => {
            let failed_dispatch = mark_dispatch_failed(&app_data_dir, &dispatch, &error)?;
            return Ok(DispatchChatMessageResult {
                dispatch: failed_dispatch,
                terminal_session: None,
                session_created: false,
            });
        }
    };

    if let Err(error) =
        terminal_state.ensure_tab_for_session(app_data_dir.clone(), &session, session.title.clone())
    {
        let failed_dispatch = mark_dispatch_failed(&app_data_dir, &dispatch, &error)?;
        return Ok(DispatchChatMessageResult {
            dispatch: failed_dispatch,
            terminal_session: Some(session),
            session_created,
        });
    }

    let input = normalize_dispatch_payload(&message.body);
    if let Err(error) = terminal_state.write_input(
        &workspace.metadata.project_id,
        TerminalInputRequest {
            terminal_session_id: session.terminal_session_id.clone(),
            input,
        },
    ) {
        let failed_dispatch = mark_dispatch_failed(&app_data_dir, &dispatch, &error)?;
        return Ok(DispatchChatMessageResult {
            dispatch: failed_dispatch,
            terminal_session: Some(session),
            session_created,
        });
    }

    let dispatched =
        mark_dispatch_dispatched(&app_data_dir, &dispatch, &session.terminal_session_id)?;

    Ok(DispatchChatMessageResult {
        dispatch: dispatched,
        terminal_session: Some(session),
        session_created,
    })
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        sync::{Arc, Mutex},
    };

    use tempfile::tempdir;

    use crate::contracts::AppError;
    use crate::{
        app::{
            chat::{list_workspace_conversations, send_workspace_message},
            members::invite_workspace_member,
            orchestration::dispatch_chat_message,
            terminal::{
                TerminalEventSink, TerminalLaunchProfile, TerminalOutputHandler,
                TerminalRuntimeState, TerminalSessionHandle, TerminalSessionLauncher,
                TerminalStatusSink,
            },
        },
        contracts::{
            DispatchChatMessageRequest, DispatchRequestStatus, InviteMemberRequest,
            InvitedMemberType, ListConversationsRequest, MemberRuntimeKind, MemberRuntimeProfile,
            OpenedWorkspace, SendMessageRequest, TerminalStreamKind, WorkspaceAccessMode,
            WorkspaceMetadata, WorkspaceRegistryAction, WorkspaceRegistryEntry,
        },
        infrastructure::persistence::sqlite::dispatch_repository::dispatches_for_message,
    };

    #[derive(Default)]
    struct MockLauncher {
        launches: Mutex<Vec<TerminalLaunchProfile>>,
        operations: Arc<Mutex<Vec<String>>>,
    }

    impl TerminalSessionLauncher for MockLauncher {
        fn spawn(
            &self,
            profile: TerminalLaunchProfile,
            output_handler: TerminalOutputHandler,
        ) -> Result<Box<dyn TerminalSessionHandle>, AppError> {
            self.launches.lock().expect("launches").push(profile);
            output_handler("ready".to_owned(), TerminalStreamKind::System);
            Ok(Box::new(MockHandle {
                operations: Arc::clone(&self.operations),
            }))
        }
    }

    struct MockHandle {
        operations: Arc<Mutex<Vec<String>>>,
    }

    impl TerminalSessionHandle for MockHandle {
        fn write_input(&self, input: &str) -> Result<(), AppError> {
            self.operations
                .lock()
                .expect("operations")
                .push(format!("input:{}", input));
            Ok(())
        }

        fn resize(&self, _cols: u16, _rows: u16) -> Result<(), AppError> {
            Ok(())
        }

        fn close(&self) -> Result<(), AppError> {
            Ok(())
        }
    }

    #[test]
    fn dispatch_creates_linked_request_and_writes_message_to_member_terminal() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Codex Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some(command.clone()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member")
        .member;
        let conversation = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace.metadata.project_id.clone(),
            },
        )
        .expect("conversations")
        .conversations
        .remove(0);
        let message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "Review this patch".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());

        let result = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                message_id: message.message_id.clone(),
                member_id: None,
            },
            &terminal_state,
            Arc::new(|_| {}) as TerminalEventSink,
            Arc::new(|_| {}) as TerminalStatusSink,
        )
        .expect("dispatch");

        assert_eq!(result.dispatch.status, DispatchRequestStatus::Dispatched);
        assert_eq!(result.dispatch.workspace_id, workspace.metadata.project_id);
        assert_eq!(
            result.dispatch.conversation_id,
            conversation.conversation_id
        );
        assert_eq!(result.dispatch.message_id, message.message_id);
        assert_eq!(result.dispatch.member_id, member.member_id);
        assert_eq!(
            result.dispatch.terminal_session_id.as_deref(),
            result
                .terminal_session
                .as_ref()
                .map(|session| session.terminal_session_id.as_str())
        );
        assert!(result.session_created);
        assert_eq!(terminal_state.session_count(), 1);
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:Review this patch\n"]
        );
        assert_eq!(
            launcher.launches.lock().expect("launches")[0].command,
            command
        );

        let persisted = dispatches_for_message(
            app_data.path(),
            &workspace.metadata.project_id,
            &conversation.conversation_id,
            &message.message_id,
        )
        .expect("persisted dispatches");
        assert_eq!(persisted.len(), 1);
        assert_eq!(persisted[0].status, DispatchRequestStatus::Dispatched);
    }

    #[test]
    fn dispatch_reuses_existing_member_terminal_session() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Codex Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some(command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member")
        .member;
        let conversation = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace.metadata.project_id.clone(),
            },
        )
        .expect("conversations")
        .conversations
        .remove(0);
        let first_message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "First task".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("first message")
        .message;
        let second_message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "Second task".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("second message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());
        let sink: TerminalEventSink = Arc::new(|_| {});
        let status_sink: TerminalStatusSink = Arc::new(|_| {});

        let first = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                message_id: first_message.message_id,
                member_id: Some(member.member_id.clone()),
            },
            &terminal_state,
            Arc::clone(&sink),
            Arc::clone(&status_sink),
        )
        .expect("first dispatch");
        let second = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id,
                message_id: second_message.message_id,
                member_id: Some(member.member_id),
            },
            &terminal_state,
            sink,
            status_sink,
        )
        .expect("second dispatch");

        assert!(first.session_created);
        assert!(!second.session_created);
        assert_eq!(
            first.dispatch.terminal_session_id,
            second.dispatch.terminal_session_id
        );
        assert_eq!(launcher.launches.lock().expect("launches").len(), 1);
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:First task\n", "input:Second task\n"]
        );
    }

    #[test]
    fn dispatch_records_recoverable_failure_when_member_terminal_cannot_start() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Missing Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::CustomCli,
                    runtime_id: Some("missing".to_owned()),
                    label: Some("Missing CLI".to_owned()),
                    command: Some("orchlet-missing-cli-for-dispatch".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member")
        .member;
        let conversation = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace.metadata.project_id.clone(),
            },
        )
        .expect("conversations")
        .conversations
        .remove(0);
        let message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "Run the missing CLI".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());

        let result = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                message_id: message.message_id.clone(),
                member_id: Some(member.member_id.clone()),
            },
            &terminal_state,
            Arc::new(|_| {}) as TerminalEventSink,
            Arc::new(|_| {}) as TerminalStatusSink,
        )
        .expect("failed dispatch result");

        assert_eq!(result.dispatch.status, DispatchRequestStatus::Failed);
        assert_eq!(result.dispatch.member_id, member.member_id);
        assert!(result.dispatch.terminal_session_id.is_none());
        let failure = result.dispatch.failure.as_ref().expect("failure");
        assert_eq!(failure.code, "terminal.command.missing");
        assert!(!failure.message.is_empty());
        assert!(!failure.user_action.is_empty());
        assert!(result.terminal_session.is_none());
        assert!(!result.session_created);
        assert_eq!(terminal_state.session_count(), 0);
        assert!(launcher.launches.lock().expect("launches").is_empty());

        let persisted = dispatches_for_message(
            app_data.path(),
            &workspace.metadata.project_id,
            &conversation.conversation_id,
            &message.message_id,
        )
        .expect("persisted dispatches");
        assert_eq!(persisted.len(), 1);
        assert_eq!(persisted[0].status, DispatchRequestStatus::Failed);
        assert_eq!(
            persisted[0]
                .failure
                .as_ref()
                .expect("persisted failure")
                .code,
            "terminal.command.missing"
        );
    }

    fn available_command(root: &std::path::Path, name: &str) -> String {
        let path = root.join(name);
        fs::write(&path, "").expect("test command file");
        path.display().to_string()
    }

    fn workspace() -> OpenedWorkspace {
        OpenedWorkspace {
            root_path: "/tmp/orchlet-demo".to_owned(),
            metadata: WorkspaceMetadata {
                schema_version: 1,
                project_id: "01K00000000000000000000000".to_owned(),
                name: "orchlet-demo".to_owned(),
                created_at_ms: 1760000000000,
                updated_at_ms: 1760000000000,
            },
            created: true,
            access_mode: WorkspaceAccessMode::ReadWrite,
            fallback_state: None,
            registry_entry: WorkspaceRegistryEntry {
                project_id: "01K00000000000000000000000".to_owned(),
                path: "/tmp/orchlet-demo".to_owned(),
                name: "orchlet-demo".to_owned(),
                first_opened_at_ms: 1760000000000,
                last_opened_at_ms: 1760000000000,
            },
            registry_action: WorkspaceRegistryAction::Created,
        }
    }
}
