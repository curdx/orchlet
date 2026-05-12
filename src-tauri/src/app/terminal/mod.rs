use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, MutexGuard,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use ulid::Ulid;

use crate::{
    contracts::{
        AppError, MemberProfile, OpenedWorkspace, TerminalAttachRequest, TerminalCloseRequest,
        TerminalInputRequest, TerminalOpenRequest, TerminalOutputEventPayload,
        TerminalResizeRequest, TerminalSessionProfile, TerminalSessionStatus,
        TerminalStatusEventPayload, TerminalStreamKind,
    },
    domain::{
        member::validate_workspace_id,
        terminal::{
            ensure_terminal_capable_member, validate_terminal_member_id,
            validate_terminal_session_id, validate_terminal_size, TERMINAL_DEFAULT_COLS,
            TERMINAL_DEFAULT_ROWS, TERMINAL_SCHEMA_VERSION,
        },
    },
    infrastructure::{
        persistence::sqlite::member_repository::initialize_member_store,
        terminal::{default_shell_command, PtyTerminalLauncher},
    },
};

pub type TerminalOutputHandler = Arc<dyn Fn(String, TerminalStreamKind) + Send + Sync + 'static>;
pub type TerminalEventSink = Arc<dyn Fn(TerminalOutputEventPayload) + Send + Sync + 'static>;
pub type TerminalStatusSink = Arc<dyn Fn(TerminalStatusEventPayload) + Send + Sync + 'static>;

pub trait TerminalSessionHandle: Send {
    fn write_input(&self, input: &str) -> Result<(), AppError>;
    fn resize(&self, cols: u16, rows: u16) -> Result<(), AppError>;
    fn close(&self) -> Result<(), AppError>;
}

pub trait TerminalSessionLauncher: Send + Sync {
    fn spawn(
        &self,
        profile: TerminalLaunchProfile,
        output_handler: TerminalOutputHandler,
    ) -> Result<Box<dyn TerminalSessionHandle>, AppError>;
}

#[derive(Debug, Clone)]
pub struct TerminalLaunchProfile {
    pub cwd: PathBuf,
    pub command: String,
    pub use_shell_wrapper: bool,
    pub cols: u16,
    pub rows: u16,
}

pub struct TerminalRuntimeState {
    inner: Mutex<TerminalState>,
    launcher: Arc<dyn TerminalSessionLauncher>,
}

impl Default for TerminalRuntimeState {
    fn default() -> Self {
        Self::with_launcher(Arc::new(PtyTerminalLauncher))
    }
}

impl TerminalRuntimeState {
    pub fn with_launcher(launcher: Arc<dyn TerminalSessionLauncher>) -> Self {
        Self {
            inner: Mutex::new(TerminalState::default()),
            launcher,
        }
    }

    pub fn open_or_create_session(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
        request: TerminalOpenRequest,
        event_sink: TerminalEventSink,
        status_sink: TerminalStatusSink,
    ) -> Result<(TerminalSessionProfile, bool), AppError> {
        validate_workspace_id(&workspace.metadata.project_id)?;
        let member = resolve_member(app_data_dir, &workspace.metadata.project_id, &request)?;
        let mut key = TerminalSessionKey {
            workspace_id: workspace.metadata.project_id.clone(),
            member_id: member.as_ref().map(|member| member.member_id.clone()),
        };

        if request.attach_current && request.member_id.is_none() {
            if let Some(active_key) =
                self.active_session_key_for_workspace(&workspace.metadata.project_id)
            {
                key = active_key;
            }
        }

        if let Some(profile) = self.running_session_for_key(&key) {
            self.set_active_session(profile.terminal_session_id.clone());
            emit_status(&profile, status_sink);
            return Ok((profile, false));
        }

        let session_id = Ulid::new().to_string();
        let timestamp = now_ms();
        let title = member
            .as_ref()
            .map(|member| member.instance_label.clone())
            .unwrap_or_else(|| workspace.metadata.name.clone());
        let command = member
            .as_ref()
            .and_then(|member| member.runtime.command.as_deref())
            .map(str::trim)
            .filter(|command| !command.is_empty())
            .map(ToOwned::to_owned)
            .unwrap_or_else(default_shell_command);
        let profile = TerminalSessionProfile {
            schema_version: TERMINAL_SCHEMA_VERSION,
            terminal_session_id: session_id.clone(),
            workspace_id: workspace.metadata.project_id.clone(),
            member_id: key.member_id.clone(),
            title,
            status: TerminalSessionStatus::Starting,
            cols: TERMINAL_DEFAULT_COLS,
            rows: TERMINAL_DEFAULT_ROWS,
            created_at_ms: timestamp,
            updated_at_ms: timestamp,
        };
        let seq = Arc::new(AtomicU64::new(0));
        let output_handler = output_handler_for(profile.clone(), seq, event_sink);
        let handle = self.launcher.spawn(
            TerminalLaunchProfile {
                cwd: PathBuf::from(&workspace.root_path),
                command,
                use_shell_wrapper: key.member_id.is_some(),
                cols: TERMINAL_DEFAULT_COLS,
                rows: TERMINAL_DEFAULT_ROWS,
            },
            output_handler,
        )?;
        let mut running_profile = profile;
        running_profile.status = TerminalSessionStatus::Running;
        running_profile.updated_at_ms = now_ms().max(running_profile.created_at_ms);

        self.insert_session(
            key,
            TerminalSessionEntry {
                profile: running_profile.clone(),
                handle,
            },
        );
        emit_status(&running_profile, status_sink);

        Ok((running_profile, true))
    }

    pub fn attach_session(
        &self,
        workspace_id: &str,
        request: TerminalAttachRequest,
        status_sink: TerminalStatusSink,
    ) -> Result<TerminalSessionProfile, AppError> {
        validate_workspace_id(workspace_id)?;
        let terminal_session_id = match request.terminal_session_id {
            Some(terminal_session_id) => {
                validate_terminal_session_id(&terminal_session_id)?;
                terminal_session_id
            }
            None => self
                .active_session_id_for_workspace(workspace_id)
                .ok_or_else(|| session_not_found("active", workspace_id))?,
        };
        let profile = self.session_by_id_for_workspace(&terminal_session_id, workspace_id)?;
        self.set_active_session(terminal_session_id);
        emit_status(&profile, status_sink);

        Ok(profile)
    }

    pub fn write_input(
        &self,
        workspace_id: &str,
        request: TerminalInputRequest,
    ) -> Result<TerminalSessionProfile, AppError> {
        validate_workspace_id(workspace_id)?;
        validate_terminal_session_id(&request.terminal_session_id)?;

        let mut state = self.state();
        let entry = state
            .sessions_by_id
            .get_mut(&request.terminal_session_id)
            .ok_or_else(|| session_not_found(&request.terminal_session_id, workspace_id))?;
        ensure_session_workspace(&entry.profile, workspace_id)?;
        ensure_session_running(&entry.profile)?;
        entry.handle.write_input(&request.input)?;
        entry.profile.updated_at_ms = now_ms().max(entry.profile.updated_at_ms);

        Ok(entry.profile.clone())
    }

    pub fn resize_session(
        &self,
        workspace_id: &str,
        request: TerminalResizeRequest,
        status_sink: TerminalStatusSink,
    ) -> Result<TerminalSessionProfile, AppError> {
        validate_workspace_id(workspace_id)?;
        validate_terminal_session_id(&request.terminal_session_id)?;
        validate_terminal_size(request.cols, request.rows)?;

        let profile = {
            let mut state = self.state();
            let entry = state
                .sessions_by_id
                .get_mut(&request.terminal_session_id)
                .ok_or_else(|| session_not_found(&request.terminal_session_id, workspace_id))?;
            ensure_session_workspace(&entry.profile, workspace_id)?;
            ensure_session_running(&entry.profile)?;
            entry.handle.resize(request.cols, request.rows)?;
            entry.profile.cols = request.cols;
            entry.profile.rows = request.rows;
            entry.profile.updated_at_ms = now_ms().max(entry.profile.updated_at_ms);
            entry.profile.clone()
        };
        emit_status(&profile, status_sink);

        Ok(profile)
    }

    pub fn close_session(
        &self,
        workspace_id: &str,
        request: TerminalCloseRequest,
        status_sink: TerminalStatusSink,
    ) -> Result<TerminalSessionProfile, AppError> {
        validate_workspace_id(workspace_id)?;
        validate_terminal_session_id(&request.terminal_session_id)?;

        let profile = {
            let mut state = self.state();
            let key_to_remove = {
                let entry = state
                    .sessions_by_id
                    .get_mut(&request.terminal_session_id)
                    .ok_or_else(|| session_not_found(&request.terminal_session_id, workspace_id))?;
                ensure_session_workspace(&entry.profile, workspace_id)?;
                if entry.profile.status != TerminalSessionStatus::Exited {
                    entry.handle.close()?;
                }
                entry.profile.status = TerminalSessionStatus::Exited;
                entry.profile.updated_at_ms = now_ms().max(entry.profile.updated_at_ms);
                TerminalSessionKey {
                    workspace_id: entry.profile.workspace_id.clone(),
                    member_id: entry.profile.member_id.clone(),
                }
            };
            state.session_ids_by_key.remove(&key_to_remove);
            if state.active_session_id.as_deref() == Some(request.terminal_session_id.as_str()) {
                state.active_session_id = None;
            }
            state
                .sessions_by_id
                .get(&request.terminal_session_id)
                .expect("session exists after close")
                .profile
                .clone()
        };
        emit_status(&profile, status_sink);

        Ok(profile)
    }

    pub fn session_count(&self) -> usize {
        self.state().sessions_by_id.len()
    }

    fn active_session_key_for_workspace(&self, workspace_id: &str) -> Option<TerminalSessionKey> {
        let state = self.state();
        let active_session_id = state.active_session_id.as_ref().filter(|session_id| {
            state
                .sessions_by_id
                .get(*session_id)
                .map(|entry| {
                    entry.profile.workspace_id == workspace_id
                        && entry.profile.status != TerminalSessionStatus::Exited
                })
                .unwrap_or(false)
        })?;
        state
            .sessions_by_id
            .get(active_session_id)
            .map(|entry| TerminalSessionKey {
                workspace_id: entry.profile.workspace_id.clone(),
                member_id: entry.profile.member_id.clone(),
            })
    }

    fn active_session_id_for_workspace(&self, workspace_id: &str) -> Option<String> {
        let state = self.state();
        state
            .active_session_id
            .as_ref()
            .filter(|session_id| {
                state
                    .sessions_by_id
                    .get(*session_id)
                    .map(|entry| entry.profile.workspace_id == workspace_id)
                    .unwrap_or(false)
            })
            .cloned()
    }

    fn running_session_for_key(&self, key: &TerminalSessionKey) -> Option<TerminalSessionProfile> {
        let state = self.state();
        let session_id = state.session_ids_by_key.get(key)?;
        state.sessions_by_id.get(session_id).and_then(|entry| {
            if entry.profile.status == TerminalSessionStatus::Exited {
                None
            } else {
                Some(entry.profile.clone())
            }
        })
    }

    fn session_by_id_for_workspace(
        &self,
        terminal_session_id: &str,
        workspace_id: &str,
    ) -> Result<TerminalSessionProfile, AppError> {
        let state = self.state();
        let entry = state
            .sessions_by_id
            .get(terminal_session_id)
            .ok_or_else(|| session_not_found(terminal_session_id, workspace_id))?;
        ensure_session_workspace(&entry.profile, workspace_id)?;
        Ok(entry.profile.clone())
    }

    fn insert_session(&self, key: TerminalSessionKey, entry: TerminalSessionEntry) {
        let mut state = self.state();
        let terminal_session_id = entry.profile.terminal_session_id.clone();
        state
            .session_ids_by_key
            .insert(key, terminal_session_id.clone());
        state.active_session_id = Some(terminal_session_id.clone());
        state.sessions_by_id.insert(terminal_session_id, entry);
    }

    fn set_active_session(&self, terminal_session_id: String) {
        self.state().active_session_id = Some(terminal_session_id);
    }

    fn state(&self) -> MutexGuard<'_, TerminalState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

#[derive(Default)]
struct TerminalState {
    sessions_by_id: HashMap<String, TerminalSessionEntry>,
    session_ids_by_key: HashMap<TerminalSessionKey, String>,
    active_session_id: Option<String>,
}

struct TerminalSessionEntry {
    profile: TerminalSessionProfile,
    handle: Box<dyn TerminalSessionHandle>,
}

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
struct TerminalSessionKey {
    workspace_id: String,
    member_id: Option<String>,
}

fn resolve_member(
    app_data_dir: PathBuf,
    workspace_id: &str,
    request: &TerminalOpenRequest,
) -> Result<Option<MemberProfile>, AppError> {
    let Some(member_id) = request.member_id.as_deref() else {
        return Ok(None);
    };

    validate_terminal_member_id(member_id)?;
    let members = initialize_member_store(&app_data_dir, workspace_id)?.members;
    let member = members
        .into_iter()
        .find(|member| member.member_id == member_id)
        .ok_or_else(|| {
            AppError::recoverable_error(
                "terminal.member.notFound",
                "未找到要打开终端的成员。",
                "请刷新成员列表后重试。",
                Some(format!(
                    "workspaceId={} memberId={}",
                    workspace_id, member_id
                )),
            )
        })?;
    ensure_terminal_capable_member(&member)?;

    Ok(Some(member))
}

fn output_handler_for(
    profile: TerminalSessionProfile,
    seq: Arc<AtomicU64>,
    event_sink: TerminalEventSink,
) -> TerminalOutputHandler {
    Arc::new(move |chunk, kind| {
        let seq = seq.fetch_add(1, Ordering::SeqCst) + 1;
        event_sink(TerminalOutputEventPayload {
            schema_version: TERMINAL_SCHEMA_VERSION,
            terminal_session_id: profile.terminal_session_id.clone(),
            workspace_id: profile.workspace_id.clone(),
            member_id: profile.member_id.clone(),
            seq,
            chunk,
            kind,
            emitted_at_ms: now_ms(),
        });
    })
}

fn emit_status(profile: &TerminalSessionProfile, status_sink: TerminalStatusSink) {
    status_sink(TerminalStatusEventPayload {
        schema_version: TERMINAL_SCHEMA_VERSION,
        terminal_session_id: profile.terminal_session_id.clone(),
        workspace_id: profile.workspace_id.clone(),
        member_id: profile.member_id.clone(),
        title: profile.title.clone(),
        status: profile.status.clone(),
        cols: profile.cols,
        rows: profile.rows,
        emitted_at_ms: now_ms(),
    });
}

fn ensure_session_workspace(
    profile: &TerminalSessionProfile,
    workspace_id: &str,
) -> Result<(), AppError> {
    if profile.workspace_id == workspace_id {
        return Ok(());
    }

    Err(session_not_found(
        &profile.terminal_session_id,
        workspace_id,
    ))
}

fn ensure_session_running(profile: &TerminalSessionProfile) -> Result<(), AppError> {
    if profile.status != TerminalSessionStatus::Exited {
        return Ok(());
    }

    Err(AppError::recoverable_error(
        "terminal.session.closed",
        "终端会话已关闭。",
        "请重新打开终端会话后重试。",
        Some(format!("terminalSessionId={}", profile.terminal_session_id)),
    ))
}

fn session_not_found(terminal_session_id: &str, workspace_id: &str) -> AppError {
    AppError::recoverable_error(
        "terminal.session.notFound",
        "未找到终端会话。",
        "请刷新终端窗口或重新打开终端后重试。",
        Some(format!(
            "workspaceId={} terminalSessionId={}",
            workspace_id, terminal_session_id
        )),
    )
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use tempfile::tempdir;

    use super::{
        TerminalEventSink, TerminalLaunchProfile, TerminalOutputHandler, TerminalRuntimeState,
        TerminalSessionHandle, TerminalSessionLauncher, TerminalStatusSink,
    };
    use crate::{
        app::members::invite_workspace_member,
        contracts::{
            AppError, InviteMemberRequest, InvitedMemberType, MemberIsolation, MemberPermissions,
            MemberRuntimeKind, MemberRuntimeProfile, OpenedWorkspace, TerminalAttachRequest,
            TerminalCloseRequest, TerminalInputRequest, TerminalOpenRequest, TerminalResizeRequest,
            TerminalSessionStatus, TerminalStreamKind, WorkspaceAccessMode, WorkspaceMetadata,
            WorkspaceRegistryAction, WorkspaceRegistryEntry,
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

        fn resize(&self, cols: u16, rows: u16) -> Result<(), AppError> {
            self.operations
                .lock()
                .expect("operations")
                .push(format!("resize:{}x{}", cols, rows));
            Ok(())
        }

        fn close(&self) -> Result<(), AppError> {
            self.operations
                .lock()
                .expect("operations")
                .push("close".to_owned());
            Ok(())
        }
    }

    #[test]
    fn creates_and_reuses_workspace_session() {
        let app_data = tempdir().expect("app data");
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());
        let workspace = workspace();
        let events = Arc::new(Mutex::new(Vec::new()));
        let sink: TerminalEventSink = {
            let events = Arc::clone(&events);
            Arc::new(move |event| events.lock().expect("events").push(event))
        };
        let statuses = Arc::new(Mutex::new(Vec::new()));
        let status_sink: TerminalStatusSink = {
            let statuses = Arc::clone(&statuses);
            Arc::new(move |event| statuses.lock().expect("statuses").push(event))
        };

        let (first, first_created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: None,
                    attach_current: false,
                },
                Arc::clone(&sink),
                Arc::clone(&status_sink),
            )
            .expect("first session");
        let (second, second_created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: None,
                    attach_current: false,
                },
                sink,
                status_sink,
            )
            .expect("second session");

        assert!(first_created);
        assert!(!second_created);
        assert_eq!(first.terminal_session_id, second.terminal_session_id);
        assert_eq!(state.session_count(), 1);
        assert_eq!(launcher.launches.lock().expect("launches").len(), 1);
        assert_eq!(events.lock().expect("events")[0].seq, 1);
        assert_eq!(statuses.lock().expect("statuses").len(), 2);
    }

    #[test]
    fn validates_member_runtime_and_reuses_member_session() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
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
                    command: Some("codex".to_owned()),
                },
                instance_count: None,
                permissions: Some(MemberPermissions {
                    can_mention: true,
                    can_remove: true,
                }),
                isolation: Some(MemberIsolation {
                    sandboxed: true,
                    unlimited_access: false,
                }),
            },
        )
        .expect("member")
        .member;
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());
        let sink: TerminalEventSink = Arc::new(|_| {});
        let status_sink: TerminalStatusSink = Arc::new(|_| {});

        let (first, created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(member.member_id.clone()),
                    attach_current: false,
                },
                Arc::clone(&sink),
                Arc::clone(&status_sink),
            )
            .expect("member session");
        let (second, reused_created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(member.member_id.clone()),
                    attach_current: false,
                },
                sink,
                status_sink,
            )
            .expect("reused member session");

        assert!(created);
        assert!(!reused_created);
        assert_eq!(first.member_id.as_deref(), Some(member.member_id.as_str()));
        assert_eq!(first.terminal_session_id, second.terminal_session_id);
        assert_eq!(
            launcher.launches.lock().expect("launches")[0].command,
            "codex"
        );
    }

    #[test]
    fn rejects_missing_and_non_terminal_members() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let state = TerminalRuntimeState::with_launcher(Arc::new(MockLauncher::default()));
        let sink: TerminalEventSink = Arc::new(|_| {});
        let status_sink: TerminalStatusSink = Arc::new(|_| {});

        let missing = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some("01K00000000000000000000031".to_owned()),
                    attach_current: false,
                },
                Arc::clone(&sink),
                Arc::clone(&status_sink),
            )
            .expect_err("missing member rejected");
        assert_eq!(missing.code, "terminal.member.notFound");

        let owner_id = crate::app::members::initialize_members(
            app_data.path(),
            &workspace.metadata.project_id,
        )
        .expect("owner")
        .members[0]
            .member_id
            .clone();
        let non_terminal = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(owner_id),
                    attach_current: false,
                },
                sink,
                status_sink,
            )
            .expect_err("non terminal member rejected");
        assert_eq!(
            non_terminal.code,
            "terminal.member.runtimeNotTerminalCapable"
        );
    }

    #[test]
    fn attach_input_resize_and_close_session_by_id() {
        let app_data = tempdir().expect("app data");
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());
        let workspace = workspace();
        let output_sink: TerminalEventSink = Arc::new(|_| {});
        let statuses = Arc::new(Mutex::new(Vec::new()));
        let status_sink: TerminalStatusSink = {
            let statuses = Arc::clone(&statuses);
            Arc::new(move |event| statuses.lock().expect("statuses").push(event))
        };
        let (session, _) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: None,
                    attach_current: false,
                },
                output_sink,
                Arc::clone(&status_sink),
            )
            .expect("session");

        let active_attach = state
            .attach_session(
                &workspace.metadata.project_id,
                TerminalAttachRequest {
                    terminal_session_id: None,
                },
                Arc::clone(&status_sink),
            )
            .expect("active attach");
        let explicit_attach = state
            .attach_session(
                &workspace.metadata.project_id,
                TerminalAttachRequest {
                    terminal_session_id: Some(session.terminal_session_id.clone()),
                },
                Arc::clone(&status_sink),
            )
            .expect("explicit attach");

        assert_eq!(
            active_attach.terminal_session_id,
            session.terminal_session_id
        );
        assert_eq!(
            explicit_attach.terminal_session_id,
            session.terminal_session_id
        );

        state
            .write_input(
                &workspace.metadata.project_id,
                TerminalInputRequest {
                    terminal_session_id: session.terminal_session_id.clone(),
                    input: "pwd\n".to_owned(),
                },
            )
            .expect("input");
        let resized = state
            .resize_session(
                &workspace.metadata.project_id,
                TerminalResizeRequest {
                    terminal_session_id: session.terminal_session_id.clone(),
                    cols: 100,
                    rows: 32,
                },
                Arc::clone(&status_sink),
            )
            .expect("resize");
        let closed = state
            .close_session(
                &workspace.metadata.project_id,
                TerminalCloseRequest {
                    terminal_session_id: session.terminal_session_id.clone(),
                },
                status_sink,
            )
            .expect("close");
        let after_close = state
            .write_input(
                &workspace.metadata.project_id,
                TerminalInputRequest {
                    terminal_session_id: session.terminal_session_id,
                    input: "echo no\n".to_owned(),
                },
            )
            .expect_err("closed session rejects input");

        assert_eq!(resized.cols, 100);
        assert_eq!(resized.rows, 32);
        assert_eq!(closed.status, TerminalSessionStatus::Exited);
        assert_eq!(after_close.code, "terminal.session.closed");
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:pwd\n", "resize:100x32", "close"]
        );
        assert!(statuses
            .lock()
            .expect("statuses")
            .iter()
            .any(|event| event.status == TerminalSessionStatus::Exited));
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
