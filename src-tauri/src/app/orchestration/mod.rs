use std::path::PathBuf;

use crate::{
    app::terminal::{TerminalEventSink, TerminalRuntimeState, TerminalStatusSink},
    contracts::{
        AppError, ChatMessageProfile, ChatMessageStatus, ConversationProfile,
        DispatchChatMessageRequest, DispatchChatMessageResult, DispatchQueueResumeRequest,
        DispatchQueueResumeResult, DispatchRequestProfile, DispatchTargetResolutionProfile,
        MemberProfile, MemberStatus, OpenedWorkspace, TerminalInputRequest, TerminalOpenRequest,
    },
    domain::orchestration::{
        normalize_dispatch_payload, resolve_dispatch_target, validate_dispatch_scope,
    },
    infrastructure::persistence::sqlite::{
        conversation_repository::{
            conversation_by_id, message_by_id, recent_messages_through_message,
        },
        dispatch_repository::{
            active_dispatch_for_source_message, create_pending_dispatch_with_sources,
            create_queued_dispatch_with_sources, create_skipped_dispatch_with_sources,
            mark_dispatch_dispatched, mark_dispatch_failed, oldest_queued_dispatch_for_member,
            queued_dispatch_count_for_member,
        },
        member_repository::initialize_member_store,
    },
};

const DISPATCH_MERGE_LOOKBACK_LIMIT: u32 = 8;
const DISPATCH_MERGE_WINDOW_MS: u64 = 5 * 60 * 1000;

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
    let conversation = conversation_by_id(
        &app_data_dir,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let members = initialize_member_store(&app_data_dir, &request.workspace_id)?.members;
    let target_resolution = resolve_dispatch_target(
        request.member_id.as_deref(),
        &message.mentioned_member_ids,
        &conversation,
        &members,
    )?;
    let target_member = members
        .iter()
        .find(|member| member.member_id == target_resolution.member_id)
        .expect("target resolution returns a member from members");

    if let Some(existing_dispatch) = active_dispatch_for_source_message(
        &app_data_dir,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
        &target_resolution.member_id,
    )? {
        return Ok(DispatchChatMessageResult {
            dispatch: existing_dispatch,
            terminal_session: None,
            session_created: false,
        });
    }

    let dispatch_plan = build_dispatch_plan(
        &app_data_dir,
        &request,
        &message,
        &conversation,
        &members,
        &target_resolution,
    )?;

    if target_member.status == MemberStatus::DoNotDisturb {
        let dispatch = create_skipped_dispatch_with_sources(
            &app_data_dir,
            &request.workspace_id,
            &request.conversation_id,
            &request.message_id,
            &dispatch_plan.source_message_ids,
            &target_resolution,
        )?;
        return Ok(DispatchChatMessageResult {
            dispatch,
            terminal_session: None,
            session_created: false,
        });
    }

    if target_member.status == MemberStatus::Working {
        let dispatch = create_queued_dispatch_with_sources(
            &app_data_dir,
            &request.workspace_id,
            &request.conversation_id,
            &request.message_id,
            &dispatch_plan.source_message_ids,
            &target_resolution,
        )?;
        return Ok(DispatchChatMessageResult {
            dispatch,
            terminal_session: None,
            session_created: false,
        });
    }

    let dispatch = create_pending_dispatch_with_sources(
        &app_data_dir,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
        &dispatch_plan.source_message_ids,
        &target_resolution,
    )?;
    run_dispatch_payload(
        app_data_dir,
        workspace,
        dispatch,
        &dispatch_plan.payload,
        terminal_state,
        event_sink,
        status_sink,
    )
}

pub fn resume_member_dispatch_queue(
    app_data_dir: PathBuf,
    workspace: &OpenedWorkspace,
    request: DispatchQueueResumeRequest,
    terminal_state: &TerminalRuntimeState,
    event_sink: TerminalEventSink,
    status_sink: TerminalStatusSink,
) -> Result<DispatchQueueResumeResult, AppError> {
    crate::domain::member::validate_workspace_id(&request.workspace_id)?;
    if workspace.metadata.project_id != request.workspace_id {
        return Err(AppError::recoverable_error(
            "dispatch.workspace.mismatch",
            "派发请求不属于当前工作区。",
            "请刷新工作区上下文后重试。",
            Some(format!(
                "activeWorkspaceId={} requestWorkspaceId={}",
                workspace.metadata.project_id, request.workspace_id
            )),
        ));
    }
    crate::domain::member::validate_member_id(&request.member_id)?;
    let members = initialize_member_store(&app_data_dir, &request.workspace_id)?.members;
    let member = members
        .iter()
        .find(|member| member.member_id == request.member_id)
        .ok_or_else(|| {
            AppError::recoverable_error(
                "dispatch.queue.memberNotFound",
                "未找到要恢复队列的成员。",
                "请刷新成员列表后重试。",
                Some(format!("memberId={}", request.member_id)),
            )
        })?;

    if member.status == MemberStatus::Working || member.status == MemberStatus::DoNotDisturb {
        return Ok(DispatchQueueResumeResult {
            dispatch: None,
            terminal_session: None,
            session_created: false,
            queue_remaining: queued_dispatch_count_for_member(
                &app_data_dir,
                &request.workspace_id,
                &request.member_id,
            )?,
        });
    }

    let Some(dispatch) = oldest_queued_dispatch_for_member(
        &app_data_dir,
        &request.workspace_id,
        &request.member_id,
    )?
    else {
        return Ok(DispatchQueueResumeResult {
            dispatch: None,
            terminal_session: None,
            session_created: false,
            queue_remaining: 0,
        });
    };
    let payload = dispatch_payload_for_sources(&app_data_dir, &dispatch)?;
    let result = run_dispatch_payload(
        app_data_dir.clone(),
        workspace,
        dispatch,
        &payload,
        terminal_state,
        event_sink,
        status_sink,
    )?;
    let queue_remaining =
        queued_dispatch_count_for_member(&app_data_dir, &request.workspace_id, &request.member_id)?;

    Ok(DispatchQueueResumeResult {
        dispatch: Some(result.dispatch),
        terminal_session: result.terminal_session,
        session_created: result.session_created,
        queue_remaining,
    })
}

struct DispatchPlan {
    source_message_ids: Vec<String>,
    payload: String,
}

fn build_dispatch_plan(
    app_data_dir: &PathBuf,
    request: &DispatchChatMessageRequest,
    message: &ChatMessageProfile,
    conversation: &ConversationProfile,
    members: &[MemberProfile],
    target_resolution: &DispatchTargetResolutionProfile,
) -> Result<DispatchPlan, AppError> {
    let recent_messages = recent_messages_through_message(
        app_data_dir,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
        DISPATCH_MERGE_LOOKBACK_LIMIT,
    )?;
    let mut selected_newest_first = Vec::new();

    for candidate in recent_messages {
        if candidate.status != ChatMessageStatus::Sent {
            break;
        }

        if message
            .created_at_ms
            .saturating_sub(candidate.created_at_ms)
            > DISPATCH_MERGE_WINDOW_MS
        {
            break;
        }

        let candidate_resolution = if candidate.message_id == message.message_id {
            target_resolution.clone()
        } else {
            match resolve_dispatch_target(
                None,
                &candidate.mentioned_member_ids,
                conversation,
                members,
            ) {
                Ok(resolution) => resolution,
                Err(_) => break,
            }
        };

        if candidate_resolution.member_id != target_resolution.member_id {
            break;
        }

        if candidate.message_id != message.message_id
            && active_dispatch_for_source_message(
                app_data_dir,
                &request.workspace_id,
                &request.conversation_id,
                &candidate.message_id,
                &target_resolution.member_id,
            )?
            .is_some()
        {
            break;
        }

        selected_newest_first.push(candidate);
    }

    selected_newest_first.reverse();
    if selected_newest_first.is_empty() {
        selected_newest_first.push(message.clone());
    }
    let source_message_ids = selected_newest_first
        .iter()
        .map(|source_message| source_message.message_id.clone())
        .collect::<Vec<_>>();
    let payload = dispatch_payload_from_messages(&selected_newest_first);

    Ok(DispatchPlan {
        source_message_ids,
        payload,
    })
}

fn dispatch_payload_for_sources(
    app_data_dir: &PathBuf,
    dispatch: &DispatchRequestProfile,
) -> Result<String, AppError> {
    let mut messages = Vec::new();
    for source_message_id in &dispatch.source_message_ids {
        messages.push(message_by_id(
            app_data_dir,
            &dispatch.workspace_id,
            &dispatch.conversation_id,
            source_message_id,
        )?);
    }

    if messages.is_empty() {
        messages.push(message_by_id(
            app_data_dir,
            &dispatch.workspace_id,
            &dispatch.conversation_id,
            &dispatch.message_id,
        )?);
    }

    messages.sort_by(|left, right| {
        left.created_at_ms
            .cmp(&right.created_at_ms)
            .then_with(|| left.message_id.cmp(&right.message_id))
    });

    Ok(dispatch_payload_from_messages(&messages))
}

fn dispatch_payload_from_messages(messages: &[ChatMessageProfile]) -> String {
    if let [message] = messages {
        return message.body.clone();
    }

    messages
        .iter()
        .map(|message| format!("[sourceMessageId:{}]\n{}", message.message_id, message.body))
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn run_dispatch_payload(
    app_data_dir: PathBuf,
    workspace: &OpenedWorkspace,
    dispatch: DispatchRequestProfile,
    body: &str,
    terminal_state: &TerminalRuntimeState,
    event_sink: TerminalEventSink,
    status_sink: TerminalStatusSink,
) -> Result<DispatchChatMessageResult, AppError> {
    let terminal_result = terminal_state.open_or_create_session(
        app_data_dir.clone(),
        workspace,
        TerminalOpenRequest {
            member_id: Some(dispatch.member_id.clone()),
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

    let input = normalize_dispatch_payload(body);
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
            chat::{
                list_workspace_conversations, send_workspace_message,
                start_workspace_private_conversation,
            },
            members::{invite_workspace_member, update_workspace_member_status},
            orchestration::{dispatch_chat_message, resume_member_dispatch_queue},
            terminal::{
                TerminalEventSink, TerminalLaunchProfile, TerminalOutputHandler,
                TerminalRuntimeState, TerminalSessionHandle, TerminalSessionLauncher,
                TerminalStatusSink,
            },
        },
        contracts::{
            ConversationParticipantKind, DispatchChatMessageRequest, DispatchQueueResumeRequest,
            DispatchRequestStatus, DispatchTargetResolutionSource, InviteMemberRequest,
            InvitedMemberType, ListConversationsRequest, MemberRuntimeKind, MemberRuntimeProfile,
            MemberStatus, OpenedWorkspace, SendMessageRequest, StartPrivateConversationRequest,
            TerminalStreamKind, UpdateMemberStatusRequest, WorkspaceAccessMode, WorkspaceMetadata,
            WorkspaceRegistryAction, WorkspaceRegistryEntry,
        },
        infrastructure::persistence::{
            json_store::terminal_configuration_store::{
                default_terminal_configuration, load_terminal_configuration,
                save_terminal_configuration,
            },
            sqlite::dispatch_repository::dispatches_for_message,
        },
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
        let other_command = available_command(app_data.path(), "gemini");
        invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Gemini Builder".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("gemini".to_owned()),
                    label: Some("Gemini CLI".to_owned()),
                    command: Some(other_command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("other member");
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
            result.dispatch.target_resolution.source,
            DispatchTargetResolutionSource::ExplicitMention
        );
        assert_eq!(
            result.dispatch.target_resolution.member_id,
            member.member_id
        );
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
    fn dispatch_reuses_existing_active_dispatch_for_same_source_message() {
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
        let message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "Run once".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());
        let sink: TerminalEventSink = Arc::new(|_| {});
        let status_sink: TerminalStatusSink = Arc::new(|_| {});
        let request = DispatchChatMessageRequest {
            workspace_id: workspace.metadata.project_id.clone(),
            conversation_id: conversation.conversation_id.clone(),
            message_id: message.message_id.clone(),
            member_id: None,
        };

        let first = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            request.clone(),
            &terminal_state,
            Arc::clone(&sink),
            Arc::clone(&status_sink),
        )
        .expect("first dispatch");
        let second = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            request,
            &terminal_state,
            sink,
            status_sink,
        )
        .expect("second dispatch");

        assert_eq!(
            second.dispatch.dispatch_request_id,
            first.dispatch.dispatch_request_id
        );
        assert_eq!(second.dispatch.status, DispatchRequestStatus::Dispatched);
        assert!(!second.session_created);
        assert_eq!(
            second.dispatch.source_message_ids,
            vec![message.message_id.clone()]
        );
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:Run once\n"]
        );
        assert_eq!(
            dispatches_for_message(
                app_data.path(),
                &workspace.metadata.project_id,
                &conversation.conversation_id,
                &message.message_id,
            )
            .expect("persisted dispatches")
            .len(),
            1
        );
    }

    #[test]
    fn dispatch_merges_consecutive_messages_for_same_target() {
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
                body: "First related instruction".to_owned(),
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
                body: "Second related instruction".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("second message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());

        let result = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                message_id: second_message.message_id.clone(),
                member_id: None,
            },
            &terminal_state,
            Arc::new(|_| {}) as TerminalEventSink,
            Arc::new(|_| {}) as TerminalStatusSink,
        )
        .expect("dispatch");

        assert_eq!(
            result.dispatch.source_message_ids,
            vec![
                first_message.message_id.clone(),
                second_message.message_id.clone()
            ]
        );
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            [format!(
                "input:[sourceMessageId:{}]\nFirst related instruction\n\n[sourceMessageId:{}]\nSecond related instruction\n",
                first_message.message_id, second_message.message_id
            )]
        );
        let persisted_for_first = dispatches_for_message(
            app_data.path(),
            &workspace.metadata.project_id,
            &conversation.conversation_id,
            &first_message.message_id,
        )
        .expect("persisted dispatches for first source");
        assert_eq!(persisted_for_first.len(), 1);
        assert_eq!(
            persisted_for_first[0].dispatch_request_id,
            result.dispatch.dispatch_request_id
        );
    }

    #[test]
    fn dispatch_does_not_merge_across_target_boundary() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let first_command = available_command(app_data.path(), "codex");
        let first = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "First Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some(first_command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("first member")
        .member;
        let second_command = available_command(app_data.path(), "gemini");
        let second = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Second Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("gemini".to_owned()),
                    label: Some("Gemini CLI".to_owned()),
                    command: Some(second_command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("second member")
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
        let _first_message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "First target instruction".to_owned(),
                mentioned_member_ids: vec![first.member_id],
            },
        )
        .expect("first message")
        .message;
        let second_message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "Second target instruction".to_owned(),
                mentioned_member_ids: vec![second.member_id],
            },
        )
        .expect("second message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());

        let result = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id,
                message_id: second_message.message_id.clone(),
                member_id: None,
            },
            &terminal_state,
            Arc::new(|_| {}) as TerminalEventSink,
            Arc::new(|_| {}) as TerminalStatusSink,
        )
        .expect("dispatch");

        assert_eq!(
            result.dispatch.source_message_ids,
            vec![second_message.message_id]
        );
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:Second target instruction\n"]
        );
    }

    #[test]
    fn dispatch_uses_private_conversation_context_and_records_reason() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Private Reviewer".to_owned(),
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
        let conversation = start_workspace_private_conversation(
            app_data.path(),
            StartPrivateConversationRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                participant_kind: ConversationParticipantKind::Member,
                participant_id: member.member_id.clone(),
            },
        )
        .expect("private conversation")
        .conversation;
        let message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "No mention needed in private chat".to_owned(),
                mentioned_member_ids: vec![],
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

        assert_eq!(result.dispatch.member_id, member.member_id);
        assert_eq!(
            result.dispatch.target_resolution.source,
            DispatchTargetResolutionSource::PrivateConversation
        );
        assert!(result
            .dispatch
            .target_resolution
            .reason
            .contains("Private Reviewer"));
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:No mention needed in private chat\n"]
        );
    }

    #[test]
    fn dispatch_uses_single_workspace_terminal_member_as_default_target() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Default Agent".to_owned(),
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
        let message = send_workspace_message(
            app_data.path(),
            SendMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id.clone(),
                body: "Use the default target".to_owned(),
                mentioned_member_ids: vec![],
            },
        )
        .expect("message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher);

        let result = dispatch_chat_message(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchChatMessageRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                conversation_id: conversation.conversation_id,
                message_id: message.message_id,
                member_id: None,
            },
            &terminal_state,
            Arc::new(|_| {}) as TerminalEventSink,
            Arc::new(|_| {}) as TerminalStatusSink,
        )
        .expect("dispatch");

        assert_eq!(result.dispatch.member_id, member.member_id);
        assert_eq!(
            result.dispatch.target_resolution.source,
            DispatchTargetResolutionSource::WorkspaceDefault
        );
    }

    #[test]
    fn dispatch_skips_do_not_disturb_member_without_launching_terminal() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Quiet Agent".to_owned(),
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
        update_workspace_member_status(
            app_data.path(),
            UpdateMemberStatusRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_id: member.member_id.clone(),
                status: MemberStatus::DoNotDisturb,
            },
        )
        .expect("dnd status");
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
                body: "Respect DND".to_owned(),
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

        assert_eq!(result.dispatch.status, DispatchRequestStatus::Skipped);
        assert!(result.terminal_session.is_none());
        assert!(!result.session_created);
        assert!(launcher.launches.lock().expect("launches").is_empty());
        assert_eq!(terminal_state.session_count(), 0);
        let persisted = dispatches_for_message(
            app_data.path(),
            &workspace.metadata.project_id,
            &conversation.conversation_id,
            &message.message_id,
        )
        .expect("persisted dispatches");
        assert_eq!(persisted[0].status, DispatchRequestStatus::Skipped);
    }

    #[test]
    fn dispatch_queues_working_member_without_launching_terminal() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Busy Agent".to_owned(),
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
        update_workspace_member_status(
            app_data.path(),
            UpdateMemberStatusRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_id: member.member_id.clone(),
                status: MemberStatus::Working,
            },
        )
        .expect("working status");
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
                body: "Queue this".to_owned(),
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

        assert_eq!(result.dispatch.status, DispatchRequestStatus::Queued);
        assert!(result.terminal_session.is_none());
        assert!(!result.session_created);
        assert!(launcher.launches.lock().expect("launches").is_empty());
        assert_eq!(terminal_state.session_count(), 0);
    }

    #[test]
    fn resume_member_dispatch_queue_runs_next_queued_dispatch_once() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let command = available_command(app_data.path(), "codex");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Queued Agent".to_owned(),
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
        update_workspace_member_status(
            app_data.path(),
            UpdateMemberStatusRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_id: member.member_id.clone(),
                status: MemberStatus::Working,
            },
        )
        .expect("working status");
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
                body: "First queued task".to_owned(),
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
                body: "Second queued task".to_owned(),
                mentioned_member_ids: vec![member.member_id.clone()],
            },
        )
        .expect("second message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());
        let sink: TerminalEventSink = Arc::new(|_| {});
        let status_sink: TerminalStatusSink = Arc::new(|_| {});

        for message_id in [&first_message.message_id, &second_message.message_id] {
            let result = dispatch_chat_message(
                app_data.path().to_path_buf(),
                &workspace,
                DispatchChatMessageRequest {
                    workspace_id: workspace.metadata.project_id.clone(),
                    conversation_id: conversation.conversation_id.clone(),
                    message_id: message_id.to_string(),
                    member_id: None,
                },
                &terminal_state,
                Arc::clone(&sink),
                Arc::clone(&status_sink),
            )
            .expect("queue dispatch");
            assert_eq!(result.dispatch.status, DispatchRequestStatus::Queued);
        }

        update_workspace_member_status(
            app_data.path(),
            UpdateMemberStatusRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_id: member.member_id.clone(),
                status: MemberStatus::Online,
            },
        )
        .expect("online status");
        let resumed = resume_member_dispatch_queue(
            app_data.path().to_path_buf(),
            &workspace,
            DispatchQueueResumeRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_id: member.member_id,
            },
            &terminal_state,
            sink,
            status_sink,
        )
        .expect("resume queue");

        let dispatch = resumed.dispatch.expect("resumed dispatch");
        assert_eq!(dispatch.message_id, first_message.message_id);
        assert_eq!(dispatch.status, DispatchRequestStatus::Dispatched);
        assert_eq!(resumed.queue_remaining, 1);
        assert_eq!(launcher.launches.lock().expect("launches").len(), 1);
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:First queued task\n"]
        );
    }

    #[test]
    fn dispatch_rejects_ambiguous_mentioned_targets_without_guessing() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let first_command = available_command(app_data.path(), "codex");
        let first = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "First Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some(first_command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("first member")
        .member;
        let second_command = available_command(app_data.path(), "gemini");
        let second = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Second Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("gemini".to_owned()),
                    label: Some("Gemini CLI".to_owned()),
                    command: Some(second_command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("second member")
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
                body: "@First @Second pick one".to_owned(),
                mentioned_member_ids: vec![first.member_id.clone(), second.member_id.clone()],
            },
        )
        .expect("message")
        .message;
        let launcher = Arc::new(MockLauncher::default());
        let terminal_state = TerminalRuntimeState::with_launcher(launcher.clone());

        let error = dispatch_chat_message(
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
        .expect_err("ambiguous dispatch should fail before opening terminal");

        assert_eq!(error.code, "dispatch.target.ambiguous");
        assert!(error
            .details
            .as_deref()
            .unwrap_or("")
            .contains(&first.member_id));
        assert!(error
            .details
            .as_deref()
            .unwrap_or("")
            .contains(&second.member_id));
        assert_eq!(terminal_state.session_count(), 0);
        assert!(launcher.launches.lock().expect("launches").is_empty());
        assert!(dispatches_for_message(
            app_data.path(),
            &workspace.metadata.project_id,
            &conversation.conversation_id,
            &message.message_id,
        )
        .expect("persisted dispatches")
        .is_empty());
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
        let command = path.display().to_string();

        configure_built_in_cli_command(root, name, &command);

        command
    }

    fn configure_built_in_cli_command(root: &std::path::Path, name: &str, command: &str) {
        let runtime_id = match name {
            "codex" => "codex",
            "claude" => "claude-code",
            "gemini" => "gemini-cli",
            "opencode" => "opencode",
            "qwen" => "qwen-code",
            _ => return,
        };
        let mut configuration =
            load_terminal_configuration(root).unwrap_or_else(|_| default_terminal_configuration());
        let entry = configuration
            .built_in_cli_entries
            .iter_mut()
            .find(|entry| entry.runtime_id == runtime_id)
            .expect("supported built-in CLI entry");
        entry.command = command.to_owned();
        save_terminal_configuration(root, &configuration).expect("saved terminal config");
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
