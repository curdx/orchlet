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
        AppError, MemberProfile, OpenedWorkspace, TerminalOpenRequest, TerminalOutputEventPayload,
        TerminalSessionProfile, TerminalSessionStatus, TerminalStreamKind,
    },
    domain::{
        member::validate_workspace_id,
        terminal::{
            ensure_terminal_capable_member, validate_terminal_member_id, TERMINAL_SCHEMA_VERSION,
        },
    },
    infrastructure::{
        persistence::sqlite::member_repository::initialize_member_store,
        terminal::{default_shell_command, PtyTerminalLauncher},
    },
};

pub type TerminalOutputHandler = Arc<dyn Fn(String, TerminalStreamKind) + Send + Sync + 'static>;
pub type TerminalEventSink = Arc<dyn Fn(TerminalOutputEventPayload) + Send + Sync + 'static>;

pub trait TerminalSessionHandle: Send {}

impl<T> TerminalSessionHandle for T where T: Send {}

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
    ) -> Result<(TerminalSessionProfile, bool), AppError> {
        validate_workspace_id(&workspace.metadata.project_id)?;
        let member = resolve_member(app_data_dir, &workspace.metadata.project_id, &request)?;
        let mut key = TerminalSessionKey {
            workspace_id: workspace.metadata.project_id.clone(),
            member_id: member.as_ref().map(|member| member.member_id.clone()),
        };

        if request.attach_current && request.member_id.is_none() {
            if let Some(active_key) = self.active_key_for_workspace(&workspace.metadata.project_id)
            {
                key = active_key;
            }
        }

        if let Some(profile) = self.session(&key) {
            self.set_active_key(key);
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
                _handle: handle,
            },
        );

        Ok((running_profile, true))
    }

    pub fn session_count(&self) -> usize {
        self.state().sessions.len()
    }

    fn active_key_for_workspace(&self, workspace_id: &str) -> Option<TerminalSessionKey> {
        self.state()
            .active_key
            .as_ref()
            .filter(|key| key.workspace_id == workspace_id)
            .cloned()
    }

    fn session(&self, key: &TerminalSessionKey) -> Option<TerminalSessionProfile> {
        self.state()
            .sessions
            .get(key)
            .map(|entry| entry.profile.clone())
    }

    fn insert_session(&self, key: TerminalSessionKey, entry: TerminalSessionEntry) {
        let mut state = self.state();
        state.active_key = Some(key.clone());
        state.sessions.insert(key, entry);
    }

    fn set_active_key(&self, key: TerminalSessionKey) {
        self.state().active_key = Some(key);
    }

    fn state(&self) -> MutexGuard<'_, TerminalState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

#[derive(Default)]
struct TerminalState {
    sessions: HashMap<TerminalSessionKey, TerminalSessionEntry>,
    active_key: Option<TerminalSessionKey>,
}

struct TerminalSessionEntry {
    profile: TerminalSessionProfile,
    _handle: Box<dyn TerminalSessionHandle>,
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
        TerminalSessionHandle, TerminalSessionLauncher,
    };
    use crate::{
        app::{members::invite_workspace_member, terminal::TerminalOpenRequest},
        contracts::{
            AppError, InviteMemberRequest, InvitedMemberType, MemberIsolation, MemberPermissions,
            MemberRuntimeKind, MemberRuntimeProfile, OpenedWorkspace, TerminalStreamKind,
            WorkspaceAccessMode, WorkspaceMetadata, WorkspaceRegistryAction,
            WorkspaceRegistryEntry,
        },
    };

    #[derive(Default)]
    struct MockLauncher {
        launches: Mutex<Vec<TerminalLaunchProfile>>,
    }

    impl TerminalSessionLauncher for MockLauncher {
        fn spawn(
            &self,
            profile: TerminalLaunchProfile,
            output_handler: TerminalOutputHandler,
        ) -> Result<Box<dyn TerminalSessionHandle>, AppError> {
            self.launches.lock().expect("launches").push(profile);
            output_handler("ready".to_owned(), TerminalStreamKind::System);
            Ok(Box::new(MockHandle))
        }
    }

    struct MockHandle;

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

        let (first, first_created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: None,
                    attach_current: false,
                },
                Arc::clone(&sink),
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
            )
            .expect("second session");

        assert!(first_created);
        assert!(!second_created);
        assert_eq!(first.terminal_session_id, second.terminal_session_id);
        assert_eq!(state.session_count(), 1);
        assert_eq!(launcher.launches.lock().expect("launches").len(), 1);
        assert_eq!(events.lock().expect("events")[0].seq, 1);
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

        let (first, created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(member.member_id.clone()),
                    attach_current: false,
                },
                Arc::clone(&sink),
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

        let missing = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some("01K00000000000000000000031".to_owned()),
                    attach_current: false,
                },
                Arc::clone(&sink),
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
            )
            .expect_err("non terminal member rejected");
        assert_eq!(
            non_terminal.code,
            "terminal.member.runtimeNotTerminalCapable"
        );
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
