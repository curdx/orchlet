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
        AppError, MemberProfile, MemberRuntimeKind, OpenedWorkspace, TerminalAttachRequest,
        TerminalCloseRequest, TerminalConfigurationSnapshot, TerminalEnvironmentKind,
        TerminalEnvironmentProfile, TerminalEnvironmentSource, TerminalEnvironmentStatus,
        TerminalEnvironmentsListResult, TerminalInputRequest, TerminalOpenRequest,
        TerminalOutputEventPayload, TerminalResizeRequest, TerminalSessionExitReason,
        TerminalSessionProfile, TerminalSessionSnapshot, TerminalSessionStatus,
        TerminalStatusEventPayload, TerminalStreamKind, TerminalTabCloseRequest,
        TerminalTabCloseResult, TerminalTabCreateRequest, TerminalTabCreateResult,
        TerminalTabProfile, TerminalTabRestoreRequest, TerminalTabRestoreResult, TerminalTabStatus,
        TerminalTabUpdateRequest, TerminalTabUpdateResult, TerminalTabsListResult,
    },
    domain::{
        member::validate_workspace_id,
        terminal::{
            ensure_terminal_capable_member, normalize_terminal_tab_label,
            validate_terminal_member_id, validate_terminal_session_id, validate_terminal_size,
            TERMINAL_DEFAULT_COLS, TERMINAL_DEFAULT_ROWS, TERMINAL_SCHEMA_VERSION,
        },
    },
    infrastructure::{
        persistence::sqlite::{
            member_repository::initialize_member_store,
            terminal_tab_repository::{
                close_terminal_tab, create_terminal_tab, ensure_terminal_tab_for_session,
                list_terminal_tabs, restore_terminal_tab, terminal_tab_by_id, update_terminal_tab,
            },
        },
        terminal::{default_shell_command, PtyTerminalLauncher},
    },
};

use crate::infrastructure::persistence::json_store::terminal_configuration_store::load_terminal_configuration;
use crate::infrastructure::terminal::{
    resolve_terminal_command, shell_command_candidates, terminal_command_unavailable_error,
    TerminalCommandResolution, TerminalCommandResolutionStatus,
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

const TERMINAL_SNAPSHOT_MAX_CHARS: usize = 4000;

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
        let member = resolve_member(
            app_data_dir.clone(),
            &workspace.metadata.project_id,
            &request,
        )?;
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
        let configuration = load_terminal_configuration(&app_data_dir)?;
        let launch_command = terminal_launch_command(member.as_ref(), &configuration);
        ensure_launch_command_available(&launch_command.command)?;
        let profile = TerminalSessionProfile {
            schema_version: TERMINAL_SCHEMA_VERSION,
            terminal_session_id: session_id.clone(),
            workspace_id: workspace.metadata.project_id.clone(),
            member_id: key.member_id.clone(),
            title,
            status: TerminalSessionStatus::Starting,
            cols: TERMINAL_DEFAULT_COLS,
            rows: TERMINAL_DEFAULT_ROWS,
            snapshot: TerminalSessionSnapshot::default(),
            exit_reason: None,
            created_at_ms: timestamp,
            updated_at_ms: timestamp,
        };
        let seq = Arc::new(AtomicU64::new(0));
        let snapshot_state = Arc::new(Mutex::new(TerminalSessionSnapshot::default()));
        let output_handler = output_handler_for(
            profile.clone(),
            Arc::clone(&seq),
            Arc::clone(&snapshot_state),
            event_sink,
        );
        let handle = self.launcher.spawn(
            TerminalLaunchProfile {
                cwd: PathBuf::from(&workspace.root_path),
                command: launch_command.command,
                use_shell_wrapper: launch_command.use_shell_wrapper,
                cols: TERMINAL_DEFAULT_COLS,
                rows: TERMINAL_DEFAULT_ROWS,
            },
            output_handler,
        )?;
        let mut running_profile = profile;
        running_profile.status = TerminalSessionStatus::Running;
        running_profile.updated_at_ms = now_ms().max(running_profile.created_at_ms);
        running_profile.snapshot = clone_snapshot(&snapshot_state);

        self.insert_session(
            key,
            TerminalSessionEntry {
                profile: running_profile.clone(),
                handle,
                snapshot_state,
            },
        );
        emit_status(&running_profile, status_sink);

        Ok((running_profile, true))
    }

    pub fn create_new_session(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
        request: TerminalOpenRequest,
        event_sink: TerminalEventSink,
        status_sink: TerminalStatusSink,
    ) -> Result<(TerminalSessionProfile, String), AppError> {
        validate_workspace_id(&workspace.metadata.project_id)?;
        let member = resolve_member(
            app_data_dir.clone(),
            &workspace.metadata.project_id,
            &request,
        )?;
        let key = TerminalSessionKey {
            workspace_id: workspace.metadata.project_id.clone(),
            member_id: member.as_ref().map(|member| member.member_id.clone()),
        };
        let session_id = Ulid::new().to_string();
        let timestamp = now_ms();
        let title = member
            .as_ref()
            .map(|member| member.instance_label.clone())
            .unwrap_or_else(|| workspace.metadata.name.clone());
        let configuration = load_terminal_configuration(&app_data_dir)?;
        let launch_command = terminal_launch_command(member.as_ref(), &configuration);
        ensure_launch_command_available(&launch_command.command)?;
        let profile = TerminalSessionProfile {
            schema_version: TERMINAL_SCHEMA_VERSION,
            terminal_session_id: session_id.clone(),
            workspace_id: workspace.metadata.project_id.clone(),
            member_id: key.member_id.clone(),
            title,
            status: TerminalSessionStatus::Starting,
            cols: TERMINAL_DEFAULT_COLS,
            rows: TERMINAL_DEFAULT_ROWS,
            snapshot: TerminalSessionSnapshot::default(),
            exit_reason: None,
            created_at_ms: timestamp,
            updated_at_ms: timestamp,
        };
        let seq = Arc::new(AtomicU64::new(0));
        let snapshot_state = Arc::new(Mutex::new(TerminalSessionSnapshot::default()));
        let output_handler = output_handler_for(
            profile.clone(),
            Arc::clone(&seq),
            Arc::clone(&snapshot_state),
            event_sink,
        );
        let handle = self.launcher.spawn(
            TerminalLaunchProfile {
                cwd: PathBuf::from(&workspace.root_path),
                command: launch_command.command.clone(),
                use_shell_wrapper: launch_command.use_shell_wrapper,
                cols: TERMINAL_DEFAULT_COLS,
                rows: TERMINAL_DEFAULT_ROWS,
            },
            output_handler,
        )?;
        let mut running_profile = profile;
        running_profile.status = TerminalSessionStatus::Running;
        running_profile.updated_at_ms = now_ms().max(running_profile.created_at_ms);
        running_profile.snapshot = clone_snapshot(&snapshot_state);

        self.insert_session(
            key,
            TerminalSessionEntry {
                profile: running_profile.clone(),
                handle,
                snapshot_state,
            },
        );
        emit_status(&running_profile, status_sink);

        Ok((running_profile, launch_command.command))
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
        self.set_active_session_for_profile(&profile);
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

        Ok(entry.profile_with_snapshot())
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
            entry.profile_with_snapshot()
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
                let timestamp = now_ms().max(entry.profile.updated_at_ms);
                entry.profile.status = TerminalSessionStatus::Exited;
                entry.profile.updated_at_ms = timestamp;
                entry.profile.exit_reason = Some(TerminalSessionExitReason {
                    code: "closedByUser".to_owned(),
                    message: "用户关闭了终端会话。".to_owned(),
                    occurred_at_ms: timestamp,
                });
                TerminalSessionKey {
                    workspace_id: entry.profile.workspace_id.clone(),
                    member_id: entry.profile.member_id.clone(),
                }
            };
            if state
                .session_ids_by_key
                .get(&key_to_remove)
                .map(|session_id| session_id == &request.terminal_session_id)
                .unwrap_or(false)
            {
                state.session_ids_by_key.remove(&key_to_remove);
            }
            if state.active_session_id.as_deref() == Some(request.terminal_session_id.as_str()) {
                state.active_session_id = None;
            }
            state
                .sessions_by_id
                .get(&request.terminal_session_id)
                .expect("session exists after close")
                .profile_with_snapshot()
        };
        emit_status(&profile, status_sink);

        Ok(profile)
    }

    pub fn list_tabs(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
    ) -> Result<TerminalTabsListResult, AppError> {
        let tabs = list_terminal_tabs(&app_data_dir, &workspace.metadata.project_id)?;
        let active_tab_id = self.active_tab_id_for_tabs(&workspace.metadata.project_id, &tabs);

        Ok(TerminalTabsListResult {
            tabs,
            active_tab_id,
        })
    }

    pub fn list_environments(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
    ) -> Result<TerminalEnvironmentsListResult, AppError> {
        validate_workspace_id(&workspace.metadata.project_id)?;

        let configuration = load_terminal_configuration(&app_data_dir)?;
        let mut environments = Vec::new();
        for shell in shell_command_candidates() {
            let resolution = resolve_terminal_command(&shell.command);
            environments.push(environment_profile(
                format!("shell:{}", shell.command),
                shell.label,
                TerminalEnvironmentKind::Shell,
                TerminalEnvironmentSource::System,
                shell.command,
                None,
                resolution,
            ));
        }

        for entry in &configuration.built_in_cli_entries {
            environments.push(environment_profile(
                format!("settings:builtInCli:{}", entry.runtime_id),
                entry.label.clone(),
                TerminalEnvironmentKind::BuiltInAiCli,
                TerminalEnvironmentSource::Settings,
                entry.command.clone(),
                None,
                settings_cli_resolution(&entry.command),
            ));
        }

        for entry in &configuration.custom_cli_entries {
            environments.push(environment_profile(
                format!("settings:customCli:{}", entry.cli_id),
                entry.label.clone(),
                TerminalEnvironmentKind::CustomCli,
                TerminalEnvironmentSource::Settings,
                entry.command.clone(),
                None,
                settings_cli_resolution(&entry.command),
            ));
        }

        for entry in &configuration.custom_terminal_entries {
            environments.push(environment_profile(
                format!("settings:terminal:{}", entry.terminal_id),
                entry.label.clone(),
                TerminalEnvironmentKind::Shell,
                TerminalEnvironmentSource::Settings,
                entry.command.clone(),
                None,
                settings_terminal_resolution(&entry.command),
            ));
        }

        let members = initialize_member_store(&app_data_dir, &workspace.metadata.project_id)?;
        for member in members
            .members
            .into_iter()
            .filter(|member| member.runtime.kind != MemberRuntimeKind::None)
        {
            let command = configured_member_runtime_command(&member, &configuration);
            let label = configured_member_runtime_label(&member, &configuration);
            let resolution = resolve_terminal_command(&command);
            environments.push(environment_profile(
                format!("member:{}", member.member_id),
                label,
                environment_kind_for_runtime(&member.runtime.kind),
                TerminalEnvironmentSource::MemberRuntime,
                command,
                Some(member.member_id),
                resolution,
            ));
        }

        Ok(TerminalEnvironmentsListResult { environments })
    }

    pub fn create_tab(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
        request: TerminalTabCreateRequest,
        event_sink: TerminalEventSink,
        status_sink: TerminalStatusSink,
    ) -> Result<TerminalTabCreateResult, AppError> {
        let existing_tabs = list_terminal_tabs(&app_data_dir, &workspace.metadata.project_id)?;
        let (session, shell) = self.create_new_session(
            app_data_dir.clone(),
            workspace,
            TerminalOpenRequest {
                member_id: request.member_id,
                attach_current: false,
            },
            event_sink,
            status_sink,
        )?;
        let label = normalize_terminal_tab_label(request.label, &session.title)?;
        let timestamp = now_ms();
        let tab = TerminalTabProfile {
            schema_version: TERMINAL_SCHEMA_VERSION,
            tab_id: Ulid::new().to_string(),
            workspace_id: workspace.metadata.project_id.clone(),
            terminal_session_id: session.terminal_session_id.clone(),
            member_id: session.member_id.clone(),
            label,
            shell,
            status: TerminalTabStatus::Open,
            is_pinned: false,
            sort_index: existing_tabs.len() as i32,
            created_at_ms: timestamp,
            updated_at_ms: timestamp,
            closed_at_ms: None,
        };
        let tab = create_terminal_tab(&app_data_dir, tab)?;
        let tabs = list_terminal_tabs(&app_data_dir, &workspace.metadata.project_id)?;

        Ok(TerminalTabCreateResult { tab, session, tabs })
    }

    pub fn ensure_tab_for_session(
        &self,
        app_data_dir: PathBuf,
        session: &TerminalSessionProfile,
        shell: String,
    ) -> Result<TerminalTabProfile, AppError> {
        ensure_terminal_tab_for_session(
            &app_data_dir,
            &session.workspace_id,
            &session.terminal_session_id,
            session.member_id.clone(),
            session.title.clone(),
            shell,
        )
    }

    pub fn close_tab(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
        request: TerminalTabCloseRequest,
        status_sink: TerminalStatusSink,
    ) -> Result<TerminalTabCloseResult, AppError> {
        let tab = terminal_tab_by_id(
            &app_data_dir,
            &workspace.metadata.project_id,
            &request.tab_id,
        )?;
        let session = self.close_session(
            &workspace.metadata.project_id,
            TerminalCloseRequest {
                terminal_session_id: tab.terminal_session_id,
            },
            status_sink,
        )?;
        let tab = close_terminal_tab(
            &app_data_dir,
            &workspace.metadata.project_id,
            &request.tab_id,
        )?;
        let tabs = list_terminal_tabs(&app_data_dir, &workspace.metadata.project_id)?;

        Ok(TerminalTabCloseResult { tab, session, tabs })
    }

    pub fn restore_tab(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
        request: TerminalTabRestoreRequest,
        event_sink: TerminalEventSink,
        status_sink: TerminalStatusSink,
    ) -> Result<TerminalTabRestoreResult, AppError> {
        let tab = terminal_tab_by_id(
            &app_data_dir,
            &workspace.metadata.project_id,
            &request.tab_id,
        )?;

        if tab.status != TerminalTabStatus::Closed {
            return Err(AppError::recoverable_error(
                "terminal.tab.restore.notClosed",
                "终端标签仍处于打开状态。",
                "请选择已关闭的终端标签进行恢复。",
                Some(format!("tabId={}", request.tab_id)),
            ));
        }

        let (session, _) = self.create_new_session(
            app_data_dir.clone(),
            workspace,
            TerminalOpenRequest {
                member_id: tab.member_id,
                attach_current: false,
            },
            event_sink,
            status_sink,
        )?;
        let tab = restore_terminal_tab(
            &app_data_dir,
            &workspace.metadata.project_id,
            &request.tab_id,
            &session.terminal_session_id,
        )?;
        let tabs = list_terminal_tabs(&app_data_dir, &workspace.metadata.project_id)?;

        Ok(TerminalTabRestoreResult { tab, session, tabs })
    }

    pub fn update_tab(
        &self,
        app_data_dir: PathBuf,
        workspace: &OpenedWorkspace,
        request: TerminalTabUpdateRequest,
    ) -> Result<TerminalTabUpdateResult, AppError> {
        let label = match request.label {
            Some(label) => Some(normalize_terminal_tab_label(Some(label), "")?),
            None => None,
        };
        let tab = update_terminal_tab(
            &app_data_dir,
            &workspace.metadata.project_id,
            &request.tab_id,
            label,
            request.is_pinned,
            request.sort_index,
        )?;
        let tabs = list_terminal_tabs(&app_data_dir, &workspace.metadata.project_id)?;

        Ok(TerminalTabUpdateResult { tab, tabs })
    }

    pub fn session_count(&self) -> usize {
        self.state().sessions_by_id.len()
    }

    fn active_tab_id_for_tabs(
        &self,
        workspace_id: &str,
        tabs: &[TerminalTabProfile],
    ) -> Option<String> {
        let active_session_id = self.active_session_id_for_workspace(workspace_id);
        active_session_id
            .as_deref()
            .and_then(|session_id| {
                tabs.iter()
                    .find(|tab| {
                        tab.status == TerminalTabStatus::Open
                            && tab.terminal_session_id == session_id
                    })
                    .map(|tab| tab.tab_id.clone())
            })
            .or_else(|| {
                tabs.iter()
                    .find(|tab| tab.status == TerminalTabStatus::Open)
                    .map(|tab| tab.tab_id.clone())
            })
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
                Some(entry.profile_with_snapshot())
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
        Ok(entry.profile_with_snapshot())
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

    fn set_active_session_for_profile(&self, profile: &TerminalSessionProfile) {
        let mut state = self.state();
        let terminal_session_id = profile.terminal_session_id.clone();
        let key = TerminalSessionKey {
            workspace_id: profile.workspace_id.clone(),
            member_id: profile.member_id.clone(),
        };
        state
            .session_ids_by_key
            .insert(key, terminal_session_id.clone());
        state.active_session_id = Some(terminal_session_id);
    }

    fn state(&self) -> MutexGuard<'_, TerminalState> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

struct ResolvedTerminalCommand {
    command: String,
    use_shell_wrapper: bool,
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
    snapshot_state: Arc<Mutex<TerminalSessionSnapshot>>,
}

impl TerminalSessionEntry {
    fn profile_with_snapshot(&self) -> TerminalSessionProfile {
        let mut profile = self.profile.clone();
        profile.snapshot = self
            .snapshot_state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone();
        profile
    }
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

fn terminal_launch_command(
    member: Option<&MemberProfile>,
    configuration: &TerminalConfigurationSnapshot,
) -> ResolvedTerminalCommand {
    match member {
        Some(member) => ResolvedTerminalCommand {
            command: configured_member_runtime_command(member, configuration),
            use_shell_wrapper: true,
        },
        None => workspace_terminal_command(configuration),
    }
}

fn workspace_terminal_command(
    configuration: &TerminalConfigurationSnapshot,
) -> ResolvedTerminalCommand {
    if let Some(default_terminal_id) = configuration.default_terminal_id.as_deref() {
        if let Some(entry) = configuration
            .custom_terminal_entries
            .iter()
            .find(|entry| entry.terminal_id == default_terminal_id)
        {
            return ResolvedTerminalCommand {
                command: entry.command.trim().to_owned(),
                use_shell_wrapper: true,
            };
        }
    }

    ResolvedTerminalCommand {
        command: default_shell_command(),
        use_shell_wrapper: false,
    }
}

fn configured_member_runtime_command(
    member: &MemberProfile,
    configuration: &TerminalConfigurationSnapshot,
) -> String {
    match member.runtime.kind {
        MemberRuntimeKind::BuiltInAiCli => member
            .runtime
            .runtime_id
            .as_deref()
            .and_then(|runtime_id| {
                configuration
                    .built_in_cli_entries
                    .iter()
                    .find(|entry| entry.runtime_id == runtime_id)
            })
            .map(|entry| entry.command.trim().to_owned())
            .or_else(|| trimmed_runtime_command(member))
            .unwrap_or_default(),
        MemberRuntimeKind::CustomCli => member
            .runtime
            .runtime_id
            .as_deref()
            .and_then(|cli_id| {
                configuration
                    .custom_cli_entries
                    .iter()
                    .find(|entry| entry.cli_id == cli_id)
            })
            .map(|entry| entry.command.trim().to_owned())
            .or_else(|| trimmed_runtime_command(member))
            .unwrap_or_default(),
        MemberRuntimeKind::Shell => trimmed_runtime_command(member).unwrap_or_default(),
        MemberRuntimeKind::None => String::new(),
    }
}

fn configured_member_runtime_label(
    member: &MemberProfile,
    configuration: &TerminalConfigurationSnapshot,
) -> String {
    match member.runtime.kind {
        MemberRuntimeKind::BuiltInAiCli => member
            .runtime
            .runtime_id
            .as_deref()
            .and_then(|runtime_id| {
                configuration
                    .built_in_cli_entries
                    .iter()
                    .find(|entry| entry.runtime_id == runtime_id)
            })
            .map(|entry| entry.label.clone())
            .or_else(|| member.runtime.label.clone())
            .unwrap_or_else(|| member.instance_label.clone()),
        MemberRuntimeKind::CustomCli => member
            .runtime
            .runtime_id
            .as_deref()
            .and_then(|cli_id| {
                configuration
                    .custom_cli_entries
                    .iter()
                    .find(|entry| entry.cli_id == cli_id)
            })
            .map(|entry| entry.label.clone())
            .or_else(|| member.runtime.label.clone())
            .unwrap_or_else(|| member.instance_label.clone()),
        MemberRuntimeKind::Shell | MemberRuntimeKind::None => member
            .runtime
            .label
            .clone()
            .unwrap_or_else(|| member.instance_label.clone()),
    }
}

fn trimmed_runtime_command(member: &MemberProfile) -> Option<String> {
    member
        .runtime
        .command
        .as_deref()
        .map(str::trim)
        .filter(|command| !command.is_empty())
        .map(ToOwned::to_owned)
}

fn ensure_launch_command_available(command: &str) -> Result<(), AppError> {
    let resolution = resolve_terminal_command(command);

    if resolution.is_available() {
        return Ok(());
    }

    Err(terminal_command_unavailable_error(command, &resolution))
}

fn settings_cli_resolution(command: &str) -> TerminalCommandResolution {
    let mut resolution = resolve_terminal_command(command);
    if !resolution.is_available() {
        resolution.user_action =
            "请在设置中更新该 CLI 命令，或安装缺失的可执行文件后重试。".to_owned();
    }
    resolution
}

fn settings_terminal_resolution(command: &str) -> TerminalCommandResolution {
    let mut resolution = resolve_terminal_command(command);
    if !resolution.is_available() {
        resolution.user_action =
            "请在设置中更新该终端命令，或恢复系统默认 shell 后重试。".to_owned();
    }
    resolution
}

fn environment_profile(
    environment_id: String,
    label: String,
    kind: TerminalEnvironmentKind,
    source: TerminalEnvironmentSource,
    command: String,
    member_id: Option<String>,
    resolution: TerminalCommandResolution,
) -> TerminalEnvironmentProfile {
    TerminalEnvironmentProfile {
        schema_version: TERMINAL_SCHEMA_VERSION,
        environment_id,
        label,
        kind,
        source,
        command,
        resolved_path: resolution
            .resolved_path
            .as_ref()
            .map(|path| path.display().to_string()),
        member_id,
        status: environment_status_for_resolution(&resolution.status),
        message: resolution.message,
        user_action: resolution.user_action,
        details: resolution.details,
    }
}

fn environment_status_for_resolution(
    status: &TerminalCommandResolutionStatus,
) -> TerminalEnvironmentStatus {
    match status {
        TerminalCommandResolutionStatus::Available => TerminalEnvironmentStatus::Available,
        TerminalCommandResolutionStatus::Missing => TerminalEnvironmentStatus::Missing,
        TerminalCommandResolutionStatus::Invalid => TerminalEnvironmentStatus::Invalid,
    }
}

fn environment_kind_for_runtime(kind: &MemberRuntimeKind) -> TerminalEnvironmentKind {
    match kind {
        MemberRuntimeKind::BuiltInAiCli => TerminalEnvironmentKind::BuiltInAiCli,
        MemberRuntimeKind::CustomCli => TerminalEnvironmentKind::CustomCli,
        MemberRuntimeKind::Shell | MemberRuntimeKind::None => TerminalEnvironmentKind::Shell,
    }
}

fn output_handler_for(
    profile: TerminalSessionProfile,
    seq: Arc<AtomicU64>,
    snapshot_state: Arc<Mutex<TerminalSessionSnapshot>>,
    event_sink: TerminalEventSink,
) -> TerminalOutputHandler {
    Arc::new(move |chunk, kind| {
        let seq = seq.fetch_add(1, Ordering::SeqCst) + 1;
        let emitted_at_ms = now_ms();
        update_snapshot(&snapshot_state, seq, &chunk, emitted_at_ms);
        event_sink(TerminalOutputEventPayload {
            schema_version: TERMINAL_SCHEMA_VERSION,
            terminal_session_id: profile.terminal_session_id.clone(),
            workspace_id: profile.workspace_id.clone(),
            member_id: profile.member_id.clone(),
            seq,
            chunk,
            kind,
            emitted_at_ms,
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
        snapshot: profile.snapshot.clone(),
        exit_reason: profile.exit_reason.clone(),
        emitted_at_ms: now_ms(),
    });
}

fn update_snapshot(
    snapshot_state: &Arc<Mutex<TerminalSessionSnapshot>>,
    seq: u64,
    chunk: &str,
    emitted_at_ms: u64,
) {
    let mut snapshot = snapshot_state
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    snapshot.last_seq = seq;
    snapshot.updated_at_ms = Some(emitted_at_ms);

    if chunk.is_empty() {
        return;
    }

    snapshot.text.push_str(chunk);

    let char_count = snapshot.text.chars().count();
    if char_count <= TERMINAL_SNAPSHOT_MAX_CHARS {
        return;
    }

    snapshot.text = snapshot
        .text
        .chars()
        .rev()
        .take(TERMINAL_SNAPSHOT_MAX_CHARS)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    snapshot.truncated = true;
}

fn clone_snapshot(snapshot_state: &Arc<Mutex<TerminalSessionSnapshot>>) -> TerminalSessionSnapshot {
    snapshot_state
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
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
    use std::{
        fs,
        sync::{Arc, Mutex},
    };

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
            TerminalCloseRequest, TerminalEnvironmentSource, TerminalEnvironmentStatus,
            TerminalInputRequest, TerminalOpenRequest, TerminalResizeRequest,
            TerminalSessionStatus, TerminalStreamKind, TerminalTabCloseRequest,
            TerminalTabCreateRequest, TerminalTabRestoreRequest, TerminalTabStatus,
            TerminalTabUpdateRequest, WorkspaceAccessMode, WorkspaceMetadata,
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
        let cli_command = available_command(app_data.path(), "codex");
        let mut configuration =
            crate::infrastructure::persistence::json_store::terminal_configuration_store::default_terminal_configuration();
        configuration
            .built_in_cli_entries
            .iter_mut()
            .find(|entry| entry.runtime_id == "codex")
            .expect("codex entry")
            .command = cli_command.clone();
        configuration.updated_at_ms = configuration.created_at_ms + 1;
        crate::domain::settings::normalize_terminal_configuration(&mut configuration)
            .expect("normalized");
        crate::infrastructure::persistence::json_store::terminal_configuration_store::save_terminal_configuration(
            app_data.path(),
            &configuration,
        )
        .expect("terminal configuration saved");
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
                    command: Some(cli_command.clone()),
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
            cli_command
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
    fn lists_shell_and_member_environment_diagnostics() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let available = available_command(app_data.path(), "codex");
        let missing_command = "orchlet-missing-cli-for-test".to_owned();
        let available_member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Codex Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some(available),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("available member")
        .member;
        let missing_member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Missing Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::CustomCli,
                    runtime_id: Some("missing".to_owned()),
                    label: Some("Missing CLI".to_owned()),
                    command: Some(missing_command.clone()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("missing member")
        .member;
        let state = TerminalRuntimeState::with_launcher(Arc::new(MockLauncher::default()));

        let result = state
            .list_environments(app_data.path().to_path_buf(), &workspace)
            .expect("environment diagnostics");

        assert!(result
            .environments
            .iter()
            .any(|environment| environment.environment_id.starts_with("shell:")));
        let available_environment = result
            .environments
            .iter()
            .find(|environment| {
                environment.member_id.as_deref() == Some(available_member.member_id.as_str())
            })
            .expect("available member environment");
        assert_eq!(
            available_environment.status,
            TerminalEnvironmentStatus::Available
        );
        assert!(available_environment.resolved_path.is_some());

        let missing_environment = result
            .environments
            .iter()
            .find(|environment| {
                environment.member_id.as_deref() == Some(missing_member.member_id.as_str())
            })
            .expect("missing member environment");
        assert_eq!(
            missing_environment.status,
            TerminalEnvironmentStatus::Missing
        );
        assert_eq!(missing_environment.command, missing_command);
        assert!(!missing_environment.user_action.is_empty());
    }

    #[test]
    fn settings_environment_diagnostics_point_back_to_settings() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let missing_command = "orchlet-missing-settings-cli-for-test";
        let mut configuration =
            crate::infrastructure::persistence::json_store::terminal_configuration_store::default_terminal_configuration();
        configuration
            .built_in_cli_entries
            .iter_mut()
            .find(|entry| entry.runtime_id == "codex")
            .expect("codex entry")
            .command = missing_command.to_owned();
        configuration.updated_at_ms = configuration.created_at_ms + 1;
        crate::domain::settings::normalize_terminal_configuration(&mut configuration)
            .expect("normalized");
        crate::infrastructure::persistence::json_store::terminal_configuration_store::save_terminal_configuration(
            app_data.path(),
            &configuration,
        )
        .expect("terminal configuration saved");
        let state = TerminalRuntimeState::with_launcher(Arc::new(MockLauncher::default()));

        let result = state
            .list_environments(app_data.path().to_path_buf(), &workspace)
            .expect("environment diagnostics");
        let settings_environment = result
            .environments
            .iter()
            .find(|environment| environment.environment_id == "settings:builtInCli:codex")
            .expect("settings environment");

        assert_eq!(
            settings_environment.status,
            TerminalEnvironmentStatus::Missing
        );
        assert_eq!(settings_environment.command, missing_command);
        assert!(settings_environment.user_action.contains("设置"));
        assert!(!settings_environment.user_action.contains("成员运行时"));
    }

    #[test]
    fn uses_configured_default_terminal_for_workspace_launches() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let configured_shell = available_command(app_data.path(), "workspace-shell");
        let mut configuration =
            crate::infrastructure::persistence::json_store::terminal_configuration_store::default_terminal_configuration();
        configuration
            .custom_terminal_entries
            .push(crate::contracts::TerminalCustomTerminalEntry {
                terminal_id: "workspace-shell".to_owned(),
                label: "Workspace Shell".to_owned(),
                command: configured_shell.clone(),
            });
        configuration.default_terminal_id = Some("workspace-shell".to_owned());
        configuration.updated_at_ms = configuration.created_at_ms + 1;
        crate::domain::settings::normalize_terminal_configuration(&mut configuration)
            .expect("normalized");
        crate::infrastructure::persistence::json_store::terminal_configuration_store::save_terminal_configuration(
            app_data.path(),
            &configuration,
        )
        .expect("terminal configuration saved");

        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());
        state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: None,
                    attach_current: false,
                },
                Arc::new(|_| {}),
                Arc::new(|_| {}),
            )
            .expect("workspace terminal");

        let launches = launcher.launches.lock().expect("launches");
        assert_eq!(launches[0].command, configured_shell);
        assert!(launches[0].use_shell_wrapper);
    }

    #[test]
    fn resolves_built_in_member_runtime_through_terminal_configuration() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let stored_command = available_command(app_data.path(), "legacy-codex");
        let configured_command = available_command(app_data.path(), "configured-codex");
        let mut configuration =
            crate::infrastructure::persistence::json_store::terminal_configuration_store::default_terminal_configuration();
        let codex = configuration
            .built_in_cli_entries
            .iter_mut()
            .find(|entry| entry.runtime_id == "codex")
            .expect("codex entry");
        codex.command = configured_command.clone();
        codex.label = "Configured Codex".to_owned();
        configuration.updated_at_ms = configuration.created_at_ms + 1;
        crate::domain::settings::normalize_terminal_configuration(&mut configuration)
            .expect("normalized");
        crate::infrastructure::persistence::json_store::terminal_configuration_store::save_terminal_configuration(
            app_data.path(),
            &configuration,
        )
        .expect("terminal configuration saved");
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
                    command: Some(stored_command),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member")
        .member;
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());

        state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(member.member_id.clone()),
                    attach_current: false,
                },
                Arc::new(|_| {}),
                Arc::new(|_| {}),
            )
            .expect("member terminal");
        let environments = state
            .list_environments(app_data.path().to_path_buf(), &workspace)
            .expect("environment diagnostics")
            .environments;

        assert_eq!(
            launcher.launches.lock().expect("launches")[0].command,
            configured_command
        );
        assert!(environments.iter().any(|environment| {
            environment.environment_id == "settings:builtInCli:codex"
                && environment.source == TerminalEnvironmentSource::Settings
                && environment.command == configured_command
        }));
        assert!(environments.iter().any(|environment| {
            environment.member_id.as_deref() == Some(member.member_id.as_str())
                && environment.label == "Configured Codex"
                && environment.command == configured_command
        }));
    }

    #[test]
    fn resolves_custom_cli_member_runtime_through_terminal_configuration() {
        let app_data = tempdir().expect("app data");
        let workspace = workspace();
        let configured_command = available_command(app_data.path(), "local-reviewer");
        let mut configuration =
            crate::infrastructure::persistence::json_store::terminal_configuration_store::default_terminal_configuration();
        configuration
            .custom_cli_entries
            .push(crate::contracts::TerminalCustomCliEntry {
                cli_id: "local-reviewer".to_owned(),
                label: "Local Reviewer".to_owned(),
                command: configured_command.clone(),
            });
        configuration.updated_at_ms = configuration.created_at_ms + 1;
        crate::domain::settings::normalize_terminal_configuration(&mut configuration)
            .expect("normalized");
        crate::infrastructure::persistence::json_store::terminal_configuration_store::save_terminal_configuration(
            app_data.path(),
            &configuration,
        )
        .expect("terminal configuration saved");
        let member = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace.metadata.project_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Local Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::CustomCli,
                    runtime_id: Some("local-reviewer".to_owned()),
                    label: Some("Old Reviewer".to_owned()),
                    command: Some("old-reviewer".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member")
        .member;
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());

        state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(member.member_id.clone()),
                    attach_current: false,
                },
                Arc::new(|_| {}),
                Arc::new(|_| {}),
            )
            .expect("custom cli terminal");
        let environments = state
            .list_environments(app_data.path().to_path_buf(), &workspace)
            .expect("environment diagnostics")
            .environments;

        assert_eq!(
            launcher.launches.lock().expect("launches")[0].command,
            configured_command
        );
        assert!(environments.iter().any(|environment| {
            environment.environment_id == "settings:customCli:local-reviewer"
                && environment.source == TerminalEnvironmentSource::Settings
                && environment.command == configured_command
        }));
        assert!(environments.iter().any(|environment| {
            environment.member_id.as_deref() == Some(member.member_id.as_str())
                && environment.label == "Local Reviewer"
                && environment.command == configured_command
        }));
    }

    #[test]
    fn rejects_missing_member_cli_before_launching_pty() {
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
                    command: Some("orchlet-missing-cli-for-launch".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member")
        .member;
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());

        let error = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: Some(member.member_id),
                    attach_current: false,
                },
                Arc::new(|_| {}),
                Arc::new(|_| {}),
            )
            .expect_err("missing command is rejected before launch");

        assert_eq!(error.code, "terminal.command.missing");
        assert!(error
            .details
            .as_deref()
            .unwrap_or_default()
            .contains("impactScope=current terminal session was not created"));
        assert_eq!(state.session_count(), 0);
        assert!(launcher.launches.lock().expect("launches").is_empty());
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
        assert_eq!(session.snapshot.text, "ready");
        assert_eq!(active_attach.snapshot.text, "ready");
        assert_eq!(explicit_attach.snapshot.last_seq, 1);

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
        assert_eq!(closed.snapshot.text, "ready");
        assert_eq!(
            closed.exit_reason.as_ref().expect("exit reason").code,
            "closedByUser"
        );
        assert_eq!(after_close.code, "terminal.session.closed");
        assert_eq!(
            launcher.operations.lock().expect("operations").as_slice(),
            ["input:pwd\n", "resize:100x32", "close"]
        );
        assert!(statuses.lock().expect("statuses").iter().any(|event| {
            event.status == TerminalSessionStatus::Exited
                && event.snapshot.text == "ready"
                && event
                    .exit_reason
                    .as_ref()
                    .map(|reason| reason.code.as_str())
                    == Some("closedByUser")
        }));
    }

    #[test]
    fn creates_closes_restores_and_updates_terminal_tabs() {
        let app_data = tempdir().expect("app data");
        let launcher = Arc::new(MockLauncher::default());
        let state = TerminalRuntimeState::with_launcher(launcher.clone());
        let workspace = workspace();
        let output_sink: TerminalEventSink = Arc::new(|_| {});
        let status_sink: TerminalStatusSink = Arc::new(|_| {});

        let first = state
            .create_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabCreateRequest {
                    member_id: None,
                    label: Some("Alpha".to_owned()),
                },
                Arc::clone(&output_sink),
                Arc::clone(&status_sink),
            )
            .expect("first tab");
        let second = state
            .create_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabCreateRequest {
                    member_id: None,
                    label: Some("Beta".to_owned()),
                },
                Arc::clone(&output_sink),
                Arc::clone(&status_sink),
            )
            .expect("second tab");

        assert_ne!(
            first.session.terminal_session_id,
            second.session.terminal_session_id
        );
        assert_eq!(state.session_count(), 2);
        assert_eq!(
            state
                .list_tabs(app_data.path().to_path_buf(), &workspace)
                .expect("tabs")
                .tabs
                .len(),
            2
        );

        let closed = state
            .close_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabCloseRequest {
                    tab_id: first.tab.tab_id.clone(),
                },
                Arc::clone(&status_sink),
            )
            .expect("closed tab");
        assert_eq!(closed.tab.status, TerminalTabStatus::Closed);
        assert_eq!(closed.session.status, TerminalSessionStatus::Exited);

        let (reused, created) = state
            .open_or_create_session(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalOpenRequest {
                    member_id: None,
                    attach_current: false,
                },
                Arc::clone(&output_sink),
                Arc::clone(&status_sink),
            )
            .expect("reuse surviving tab session");
        assert!(!created);
        assert_eq!(
            reused.terminal_session_id,
            second.session.terminal_session_id
        );

        let restored = state
            .restore_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabRestoreRequest {
                    tab_id: first.tab.tab_id.clone(),
                },
                Arc::clone(&output_sink),
                Arc::clone(&status_sink),
            )
            .expect("restored tab");
        assert_eq!(restored.tab.status, TerminalTabStatus::Open);
        assert_ne!(
            restored.session.terminal_session_id,
            first.session.terminal_session_id
        );
        assert_eq!(
            restored.tab.terminal_session_id,
            restored.session.terminal_session_id
        );

        let updated = state
            .update_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabUpdateRequest {
                    tab_id: restored.tab.tab_id.clone(),
                    label: Some("Pinned".to_owned()),
                    is_pinned: Some(true),
                    sort_index: Some(0),
                },
            )
            .expect("updated tab");
        assert_eq!(updated.tab.label, "Pinned");
        assert!(updated.tab.is_pinned);
        assert_eq!(updated.tabs[0].tab_id, updated.tab.tab_id);
        assert!(launcher
            .operations
            .lock()
            .expect("operations")
            .iter()
            .any(|operation| operation == "close"));
    }

    #[test]
    fn terminal_tab_use_cases_reject_invalid_or_missing_tabs() {
        let app_data = tempdir().expect("app data");
        let state = TerminalRuntimeState::with_launcher(Arc::new(MockLauncher::default()));
        let workspace = workspace();

        let invalid = state
            .update_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabUpdateRequest {
                    tab_id: "bad-tab".to_owned(),
                    label: None,
                    is_pinned: None,
                    sort_index: None,
                },
            )
            .expect_err("invalid tab id rejected");
        assert_eq!(invalid.code, "terminal.tab.invalidId");

        let missing = state
            .close_tab(
                app_data.path().to_path_buf(),
                &workspace,
                TerminalTabCloseRequest {
                    tab_id: "01K00000000000000000000099".to_owned(),
                },
                Arc::new(|_| {}),
            )
            .expect_err("missing tab rejected");
        assert_eq!(missing.code, "terminal.tab.notFound");
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
