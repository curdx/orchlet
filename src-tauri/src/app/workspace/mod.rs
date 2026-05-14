use std::{
    collections::HashMap,
    path::Path,
    sync::{Mutex, MutexGuard},
};

use crate::{
    contracts::{
        AppError, OpenWorkspaceInFileManagerRequest, OpenWorkspaceInFileManagerResult,
        OpenWorkspaceRequest, OpenWorkspaceResult, OpenedWorkspace, RecentWorkspaceEntry,
        WorkspaceAccessMode, WorkspaceConflictResolution, WorkspaceFallbackState,
        WorkspaceMetadata, WorkspaceOpenStatus, WorkspaceRegistryAction, WorkspaceRegistryConflict,
        WorkspaceRegistryEntry,
    },
    domain::workspace::workspace_name_from_path,
    infrastructure::{
        filesystem::canonicalize_existing_directory,
        persistence::json_store::{
            workspace_fallback_store::{
                fallback_metadata_for_path, find_fallback_metadata_for_path,
                persist_fallback_metadata, workspace_fallback_path,
            },
            workspace_metadata_store::{
                create_workspace_metadata, read_workspace_metadata, refresh_workspace_metadata,
                replace_workspace_metadata_for_copy, write_workspace_metadata,
            },
            workspace_registry_store::{
                list_recent_workspace_entries, load_workspace_registry, now_ms,
                save_workspace_registry, upsert_registry_entry,
            },
        },
    },
};

#[derive(Default)]
pub struct WorkspaceRuntimeState {
    open_workspace_windows: Mutex<HashMap<String, String>>,
}

impl WorkspaceRuntimeState {
    pub fn open_window_label(&self, project_id: &str) -> Option<String> {
        self.open_windows()
            .get(project_id)
            .map(std::string::ToString::to_string)
    }

    pub fn mark_open(&self, project_id: impl Into<String>, window_label: impl Into<String>) {
        self.open_windows()
            .insert(project_id.into(), window_label.into());
    }

    fn open_windows(&self) -> MutexGuard<'_, HashMap<String, String>> {
        self.open_workspace_windows
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

pub fn list_recent_workspaces(
    app_data_dir: impl AsRef<Path>,
) -> Result<Vec<RecentWorkspaceEntry>, AppError> {
    list_recent_workspace_entries(app_data_dir.as_ref())
}

pub fn open_workspace(
    request: OpenWorkspaceRequest,
    app_data_dir: impl AsRef<Path>,
    runtime_state: &WorkspaceRuntimeState,
    window_label: &str,
) -> Result<OpenWorkspaceResult, AppError> {
    open_workspace_from_path(
        request.path,
        request.conflict_resolution,
        app_data_dir,
        runtime_state,
        window_label,
    )
}

pub fn open_workspace_from_path(
    path: impl AsRef<Path>,
    conflict_resolution: Option<WorkspaceConflictResolution>,
    app_data_dir: impl AsRef<Path>,
    runtime_state: &WorkspaceRuntimeState,
    window_label: &str,
) -> Result<OpenWorkspaceResult, AppError> {
    let root_path = canonicalize_existing_directory(path)?;
    let root_path_string = root_path.to_string_lossy().into_owned();
    let app_data_dir = app_data_dir.as_ref();
    let mut registry = load_workspace_registry(app_data_dir)?;

    let metadata = match read_workspace_metadata(&root_path)? {
        Some(metadata) => metadata,
        None => match create_workspace_metadata_reusing_fallback(
            app_data_dir,
            &root_path,
            &root_path_string,
        ) {
            Ok(metadata) => {
                let entry = upsert_registry_entry(
                    &mut registry,
                    &metadata.project_id,
                    root_path_string.clone(),
                    metadata.name.clone(),
                    now_ms(),
                );
                save_workspace_registry(app_data_dir, &registry)?;

                return Ok(opened_result(
                    root_path_string,
                    metadata,
                    true,
                    WorkspaceAccessMode::ReadWrite,
                    None,
                    entry,
                    WorkspaceRegistryAction::Created,
                    runtime_state,
                    window_label,
                ));
            }
            Err(error) if is_workspace_metadata_write_error(&error) => {
                let (metadata, fallback_state) =
                    fallback_metadata_for_missing_workspace(app_data_dir, &root_path, &error)?;
                let entry = upsert_registry_entry(
                    &mut registry,
                    &metadata.project_id,
                    root_path_string.clone(),
                    metadata.name.clone(),
                    now_ms(),
                );
                save_workspace_registry(app_data_dir, &registry)?;

                return Ok(opened_result(
                    root_path_string,
                    metadata,
                    true,
                    WorkspaceAccessMode::ReadOnly,
                    Some(fallback_state),
                    entry,
                    WorkspaceRegistryAction::Created,
                    runtime_state,
                    window_label,
                ));
            }
            Err(error) => return Err(error),
        },
    };

    if let Some(existing_entry) = registry
        .entries
        .iter()
        .find(|entry| entry.project_id == metadata.project_id)
        .cloned()
    {
        if existing_entry.path != root_path_string {
            return resolve_registry_conflict(
                conflict_resolution,
                app_data_dir,
                &root_path,
                root_path_string,
                metadata,
                existing_entry,
                registry,
                runtime_state,
                window_label,
            );
        }

        let (metadata, access_mode, fallback_state) =
            refresh_or_fallback_metadata(app_data_dir, &root_path, metadata)?;
        let entry = upsert_registry_entry(
            &mut registry,
            &metadata.project_id,
            root_path_string.clone(),
            metadata.name.clone(),
            now_ms(),
        );
        save_workspace_registry(app_data_dir, &registry)?;

        return Ok(opened_result(
            root_path_string,
            metadata,
            false,
            access_mode,
            fallback_state,
            entry,
            WorkspaceRegistryAction::Reopened,
            runtime_state,
            window_label,
        ));
    }

    let (metadata, access_mode, fallback_state) =
        refresh_or_fallback_metadata(app_data_dir, &root_path, metadata)?;
    let entry = upsert_registry_entry(
        &mut registry,
        &metadata.project_id,
        root_path_string.clone(),
        metadata.name.clone(),
        now_ms(),
    );
    save_workspace_registry(app_data_dir, &registry)?;

    Ok(opened_result(
        root_path_string,
        metadata,
        false,
        access_mode,
        fallback_state,
        entry,
        WorkspaceRegistryAction::Registered,
        runtime_state,
        window_label,
    ))
}

pub fn open_workspace_in_file_manager<F>(
    request: OpenWorkspaceInFileManagerRequest,
    open_path: F,
) -> Result<OpenWorkspaceInFileManagerResult, AppError>
where
    F: FnOnce(&Path) -> Result<(), String>,
{
    let root_path = canonicalize_existing_directory(request.path)?;
    let root_path_string = root_path.to_string_lossy().into_owned();

    open_path(&root_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.fileManager.openFailed",
            "无法打开系统文件管理器。",
            "工作区仍保持打开；请检查系统文件管理器是否可用，或手动打开该路径。",
            Some(format!("{}: {}", root_path.display(), error)),
        )
    })?;

    Ok(OpenWorkspaceInFileManagerResult {
        path: root_path_string,
        opened: true,
    })
}

fn refresh_or_fallback_metadata(
    app_data_dir: &Path,
    root_path: &Path,
    metadata: WorkspaceMetadata,
) -> Result<
    (
        WorkspaceMetadata,
        WorkspaceAccessMode,
        Option<WorkspaceFallbackState>,
    ),
    AppError,
> {
    match refresh_workspace_metadata(root_path, metadata.clone()) {
        Ok(metadata) => Ok((metadata, WorkspaceAccessMode::ReadWrite, None)),
        Err(error) if is_workspace_metadata_write_error(&error) => {
            let fallback_state = fallback_state_from_metadata_error(
                app_data_dir,
                "无法更新 .orchlet/workspace.json。",
                &error,
            );
            persist_fallback_metadata(
                app_data_dir,
                root_path.to_string_lossy().into_owned(),
                &metadata,
            )?;

            Ok((
                metadata,
                WorkspaceAccessMode::ReadOnly,
                Some(fallback_state),
            ))
        }
        Err(error) => Err(error),
    }
}

fn fallback_metadata_for_missing_workspace(
    app_data_dir: &Path,
    root_path: &Path,
    error: &AppError,
) -> Result<(WorkspaceMetadata, WorkspaceFallbackState), AppError> {
    let metadata = fallback_metadata_for_path(
        app_data_dir,
        root_path.to_string_lossy().into_owned(),
        workspace_name_from_path(root_path),
    )?;
    let fallback_state = fallback_state_from_metadata_error(
        app_data_dir,
        "无法创建 .orchlet/workspace.json。",
        error,
    );

    Ok((metadata, fallback_state))
}

fn create_workspace_metadata_reusing_fallback(
    app_data_dir: &Path,
    root_path: &Path,
    root_path_string: &str,
) -> Result<WorkspaceMetadata, AppError> {
    if let Some(metadata) = find_fallback_metadata_for_path(
        app_data_dir,
        root_path_string,
        workspace_name_from_path(root_path),
    )? {
        write_workspace_metadata(root_path, &metadata)?;
        return Ok(metadata);
    }

    create_workspace_metadata(root_path)
}

fn fallback_state_from_metadata_error(
    app_data_dir: &Path,
    reason_prefix: &str,
    error: &AppError,
) -> WorkspaceFallbackState {
    WorkspaceFallbackState {
        reason: format!("{} {}", reason_prefix, error.message),
        fallback_path: workspace_fallback_path(app_data_dir)
            .to_string_lossy()
            .into_owned(),
        limited_actions: vec![
            "工作区本地元数据写入".to_owned(),
            "依赖 .orchlet 的后续本地设置写入".to_owned(),
        ],
        user_action: "如需恢复可写模式，请授予该工作区目录写权限后重新打开。当前可继续查看项目，必要状态会暂存在应用数据目录。"
            .to_owned(),
    }
}

fn is_workspace_metadata_write_error(error: &AppError) -> bool {
    matches!(
        error.code.as_str(),
        "workspace.metadata.createDirFailed"
            | "workspace.metadata.writeFailed"
            | "workspace.metadata.renameFailed"
            | "workspace.metadata.legacyCreateDirFailed"
            | "workspace.metadata.legacyReadFailed"
            | "workspace.metadata.legacyWriteFailed"
            | "workspace.metadata.legacyRenameFailed"
    )
}

#[allow(clippy::too_many_arguments)]
fn resolve_registry_conflict(
    conflict_resolution: Option<WorkspaceConflictResolution>,
    app_data_dir: &Path,
    root_path: &Path,
    root_path_string: String,
    metadata: WorkspaceMetadata,
    existing_entry: WorkspaceRegistryEntry,
    mut registry: crate::infrastructure::persistence::json_store::workspace_registry_store::WorkspaceRegistryDocument,
    runtime_state: &WorkspaceRuntimeState,
    window_label: &str,
) -> Result<OpenWorkspaceResult, AppError> {
    match conflict_resolution {
        None => Ok(OpenWorkspaceResult {
            status: WorkspaceOpenStatus::Conflict,
            workspace: None,
            conflict: Some(WorkspaceRegistryConflict {
                project_id: metadata.project_id,
                name: metadata.name,
                existing_path: existing_entry.path,
                selected_path: root_path_string,
            }),
        }),
        Some(WorkspaceConflictResolution::Move) => {
            let (metadata, access_mode, fallback_state) =
                refresh_or_fallback_metadata(app_data_dir, root_path, metadata)?;
            let entry = upsert_registry_entry(
                &mut registry,
                &metadata.project_id,
                root_path_string.clone(),
                metadata.name.clone(),
                now_ms(),
            );
            save_workspace_registry(app_data_dir, &registry)?;

            Ok(opened_result(
                root_path_string,
                metadata,
                false,
                access_mode,
                fallback_state,
                entry,
                WorkspaceRegistryAction::Moved,
                runtime_state,
                window_label,
            ))
        }
        Some(WorkspaceConflictResolution::Copy) => {
            let (metadata, access_mode, fallback_state) =
                match replace_workspace_metadata_for_copy(root_path) {
                    Ok(metadata) => (metadata, WorkspaceAccessMode::ReadWrite, None),
                    Err(error) if is_workspace_metadata_write_error(&error) => {
                        let (metadata, fallback_state) = fallback_metadata_for_missing_workspace(
                            app_data_dir,
                            root_path,
                            &error,
                        )?;
                        (
                            metadata,
                            WorkspaceAccessMode::ReadOnly,
                            Some(fallback_state),
                        )
                    }
                    Err(error) => return Err(error),
                };
            let entry = upsert_registry_entry(
                &mut registry,
                &metadata.project_id,
                root_path_string.clone(),
                metadata.name.clone(),
                now_ms(),
            );
            save_workspace_registry(app_data_dir, &registry)?;

            Ok(opened_result(
                root_path_string,
                metadata,
                true,
                access_mode,
                fallback_state,
                entry,
                WorkspaceRegistryAction::Copied,
                runtime_state,
                window_label,
            ))
        }
    }
}

fn opened_result(
    root_path: String,
    metadata: WorkspaceMetadata,
    created: bool,
    access_mode: WorkspaceAccessMode,
    fallback_state: Option<WorkspaceFallbackState>,
    registry_entry: WorkspaceRegistryEntry,
    registry_action: WorkspaceRegistryAction,
    runtime_state: &WorkspaceRuntimeState,
    window_label: &str,
) -> OpenWorkspaceResult {
    let status = if runtime_state
        .open_window_label(&metadata.project_id)
        .is_some()
    {
        WorkspaceOpenStatus::FocusedExisting
    } else {
        runtime_state.mark_open(metadata.project_id.clone(), window_label.to_owned());
        WorkspaceOpenStatus::Opened
    };

    OpenWorkspaceResult {
        status,
        workspace: Some(OpenedWorkspace {
            root_path,
            metadata,
            created,
            access_mode,
            fallback_state,
            registry_entry,
            registry_action,
        }),
        conflict: None,
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        list_recent_workspaces, open_workspace_from_path, open_workspace_in_file_manager,
        OpenWorkspaceInFileManagerRequest, WorkspaceAccessMode, WorkspaceConflictResolution,
        WorkspaceOpenStatus, WorkspaceRegistryAction, WorkspaceRuntimeState,
    };
    use crate::infrastructure::persistence::json_store::{
        workspace_fallback_store::load_workspace_fallbacks,
        workspace_metadata_store::{read_workspace_metadata, write_workspace_metadata},
        workspace_registry_store::load_workspace_registry,
    };

    #[test]
    fn creates_new_workspace_metadata_and_registry_entry() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let result = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("workspace opens");
        let metadata_path = temp.path().join(".orchlet/workspace.json");
        let workspace = result.workspace.expect("opened workspace");

        assert!(metadata_path.exists());
        assert_eq!(result.status, WorkspaceOpenStatus::Opened);
        assert!(workspace.created);
        assert_eq!(workspace.access_mode, WorkspaceAccessMode::ReadWrite);
        assert!(workspace.fallback_state.is_none());
        assert_eq!(workspace.registry_action, WorkspaceRegistryAction::Created);
        assert_eq!(workspace.metadata.schema_version, 1);
        assert!(!workspace.metadata.project_id.is_empty());

        let registry = load_workspace_registry(app_data.path()).expect("registry loads");
        assert_eq!(registry.entries.len(), 1);
        assert_eq!(
            registry.entries[0].project_id,
            workspace.metadata.project_id
        );
        assert_eq!(registry.entries[0].path, workspace.root_path);
    }

    #[test]
    fn reopens_valid_metadata_without_recreating_project_identity() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let first = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("first open")
            .workspace
            .expect("first workspace");
        let second = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("second open")
            .workspace
            .expect("second workspace");

        assert_eq!(second.metadata.project_id, first.metadata.project_id);
        assert_eq!(second.metadata.created_at_ms, first.metadata.created_at_ms);
        assert_eq!(second.access_mode, WorkspaceAccessMode::ReadWrite);
        assert_eq!(second.registry_action, WorkspaceRegistryAction::Reopened);
    }

    #[test]
    fn opens_legacy_golutra_workspace_metadata_without_recreating_project_identity() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let legacy_id = legacy_project_id();
        let legacy_dir = temp.path().join(".golutra");
        fs::create_dir_all(&legacy_dir).expect("create legacy dir");
        fs::write(
            legacy_dir.join("workspace.json"),
            format!(
                r#"{{
  "projectId": "{legacy_id}",
  "members": [{{"id": "legacy-member"}}],
  "customField": "preserve-me"
}}"#
            ),
        )
        .expect("write legacy metadata");

        let opened = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("legacy workspace opens")
            .workspace
            .expect("opened workspace");
        let current_metadata = read_workspace_metadata(temp.path())
            .expect("current metadata reads")
            .expect("current metadata exists");
        let mirrored_raw =
            fs::read_to_string(legacy_dir.join("workspace.json")).expect("legacy metadata mirrors");
        let mirrored: serde_json::Value =
            serde_json::from_str(&mirrored_raw).expect("legacy metadata json");
        let local_raw =
            fs::read_to_string(legacy_dir.join("local.json")).expect("legacy local state writes");
        let local: serde_json::Value = serde_json::from_str(&local_raw).expect("legacy local json");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");

        assert_eq!(opened.metadata.project_id, legacy_id);
        assert_eq!(current_metadata.project_id, legacy_id);
        assert_eq!(registry.entries[0].project_id, legacy_id);
        assert_eq!(mirrored["projectId"], legacy_id);
        assert_eq!(mirrored["customField"], "preserve-me");
        assert!(mirrored["members"].is_array());
        assert!(local["localMachineId"]
            .as_str()
            .is_some_and(|value| !value.is_empty()));
        assert!(local["lastOpenedAt"].as_u64().unwrap_or_default() > 0);
    }

    #[test]
    fn orchlet_metadata_takes_precedence_and_mirrors_active_id_to_golutra_metadata() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let first = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("first open")
            .workspace
            .expect("first workspace");
        let legacy_dir = temp.path().join(".golutra");
        fs::write(
            legacy_dir.join("workspace.json"),
            format!(
                r#"{{
  "projectId": "{}",
  "customField": "preserve-me"
}}"#,
                legacy_project_id()
            ),
        )
        .expect("replace legacy id");

        let second_runtime = WorkspaceRuntimeState::default();
        let reopened =
            open_workspace_from_path(temp.path(), None, app_data.path(), &second_runtime, "main")
                .expect("reopen with both metadata files")
                .workspace
                .expect("workspace");
        let mirrored_raw =
            fs::read_to_string(legacy_dir.join("workspace.json")).expect("legacy metadata mirrors");
        let mirrored: serde_json::Value =
            serde_json::from_str(&mirrored_raw).expect("legacy metadata json");

        assert_eq!(reopened.metadata.project_id, first.metadata.project_id);
        assert_eq!(mirrored["projectId"], first.metadata.project_id);
        assert_eq!(mirrored["customField"], "preserve-me");
    }

    #[test]
    fn preserves_existing_golutra_local_machine_id_when_refreshing_local_state() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let legacy_dir = temp.path().join(".golutra");
        fs::create_dir_all(&legacy_dir).expect("create legacy dir");
        fs::write(
            legacy_dir.join("local.json"),
            r#"{"localMachineId":"legacy-machine","lastOpenedAt":1}"#,
        )
        .expect("write legacy local state");

        open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("workspace opens");

        let local_raw =
            fs::read_to_string(legacy_dir.join("local.json")).expect("legacy local state reads");
        let local: serde_json::Value = serde_json::from_str(&local_raw).expect("legacy local json");

        assert_eq!(local["localMachineId"], "legacy-machine");
        assert!(local["lastOpenedAt"].as_u64().unwrap_or_default() > 1);
    }

    #[cfg(unix)]
    #[test]
    fn opens_missing_metadata_workspace_read_only_with_stable_fallback_identity() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        set_mode(temp.path(), 0o500);

        let first = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("read-only workspace opens")
            .workspace
            .expect("opened workspace");
        let second = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("read-only workspace reopens")
            .workspace
            .expect("opened workspace");
        set_mode(temp.path(), 0o700);

        assert_eq!(first.access_mode, WorkspaceAccessMode::ReadOnly);
        assert_eq!(second.access_mode, WorkspaceAccessMode::ReadOnly);
        assert_eq!(first.metadata.project_id, second.metadata.project_id);
        assert!(first.fallback_state.is_some());
        assert!(!temp.path().join(".orchlet/workspace.json").exists());

        let fallbacks = load_workspace_fallbacks(app_data.path()).expect("fallbacks load");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");
        let recent = list_recent_workspaces(app_data.path()).expect("recent list");

        assert_eq!(fallbacks.entries.len(), 1);
        assert_eq!(fallbacks.entries[0].project_id, first.metadata.project_id);
        assert_eq!(registry.entries.len(), 1);
        assert_eq!(registry.entries[0].project_id, first.metadata.project_id);
        assert_eq!(recent.len(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn reuses_fallback_identity_when_missing_metadata_workspace_becomes_writable() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let read_only_runtime = WorkspaceRuntimeState::default();
        set_mode(temp.path(), 0o500);
        let read_only = open_workspace_from_path(
            temp.path(),
            None,
            app_data.path(),
            &read_only_runtime,
            "main",
        )
        .expect("read-only workspace opens")
        .workspace
        .expect("read-only workspace");
        set_mode(temp.path(), 0o700);

        let writable_runtime = WorkspaceRuntimeState::default();
        let writable = open_workspace_from_path(
            temp.path(),
            None,
            app_data.path(),
            &writable_runtime,
            "main",
        )
        .expect("workspace opens after permissions recover")
        .workspace
        .expect("writable workspace");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");
        let stored_metadata = read_workspace_metadata(temp.path())
            .expect("metadata reads")
            .expect("metadata exists");

        assert_eq!(writable.access_mode, WorkspaceAccessMode::ReadWrite);
        assert_eq!(writable.metadata.project_id, read_only.metadata.project_id);
        assert_eq!(stored_metadata.project_id, read_only.metadata.project_id);
        assert_eq!(registry.entries.len(), 1);
        assert_eq!(
            registry.entries[0].project_id,
            read_only.metadata.project_id
        );
        assert_eq!(registry.entries[0].path, writable.root_path);
    }

    #[cfg(unix)]
    #[test]
    fn opens_existing_valid_metadata_read_only_when_metadata_refresh_cannot_write() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let first_runtime = WorkspaceRuntimeState::default();
        let first =
            open_workspace_from_path(temp.path(), None, app_data.path(), &first_runtime, "main")
                .expect("first open")
                .workspace
                .expect("first workspace");
        let orchlet_dir = temp.path().join(".orchlet");
        set_mode(&orchlet_dir, 0o500);

        let second_runtime = WorkspaceRuntimeState::default();
        let second =
            open_workspace_from_path(temp.path(), None, app_data.path(), &second_runtime, "main")
                .expect("read-only reopen")
                .workspace
                .expect("second workspace");
        set_mode(&orchlet_dir, 0o700);

        assert_eq!(second.access_mode, WorkspaceAccessMode::ReadOnly);
        assert_eq!(second.metadata.project_id, first.metadata.project_id);
        assert!(!second.created);
        assert!(second.fallback_state.is_some());

        let stored_metadata = read_workspace_metadata(temp.path())
            .expect("metadata reads")
            .expect("metadata exists");
        let fallbacks = load_workspace_fallbacks(app_data.path()).expect("fallbacks load");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");

        assert_eq!(stored_metadata.project_id, first.metadata.project_id);
        assert_eq!(fallbacks.entries.len(), 1);
        assert_eq!(fallbacks.entries[0].project_id, first.metadata.project_id);
        assert_eq!(registry.entries[0].project_id, first.metadata.project_id);
    }

    #[test]
    fn lists_recent_workspaces_sorted_by_last_activity() {
        let first_workspace = tempdir().expect("first workspace");
        let second_workspace = tempdir().expect("second workspace");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();

        open_workspace_from_path(
            first_workspace.path(),
            None,
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("first opens");
        open_workspace_from_path(
            second_workspace.path(),
            None,
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("second opens");

        let recent = list_recent_workspaces(app_data.path()).expect("recent list");

        assert_eq!(recent.len(), 2);
        assert!(recent[0].last_opened_at_ms >= recent[1].last_opened_at_ms);
    }

    #[test]
    fn detects_project_id_conflict_without_overwriting_metadata_or_registry() {
        let first_workspace = tempdir().expect("first workspace");
        let copied_workspace = tempdir().expect("copied workspace");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let first = open_workspace_from_path(
            first_workspace.path(),
            None,
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("first opens")
        .workspace
        .expect("first workspace");
        write_workspace_metadata(copied_workspace.path(), &first.metadata)
            .expect("copied metadata written");
        let before = fs::read_to_string(copied_workspace.path().join(".orchlet/workspace.json"))
            .expect("metadata before conflict");

        let result = open_workspace_from_path(
            copied_workspace.path(),
            None,
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("conflict response");
        let after = fs::read_to_string(copied_workspace.path().join(".orchlet/workspace.json"))
            .expect("metadata after conflict");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");

        assert_eq!(result.status, WorkspaceOpenStatus::Conflict);
        assert!(result.workspace.is_none());
        assert_eq!(before, after);
        assert_eq!(registry.entries.len(), 1);
        assert_eq!(registry.entries[0].path, first.root_path);
    }

    #[test]
    fn move_resolution_preserves_project_id_and_updates_registry_path() {
        let first_workspace = tempdir().expect("first workspace");
        let moved_workspace = tempdir().expect("moved workspace");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let first = open_workspace_from_path(
            first_workspace.path(),
            None,
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("first opens")
        .workspace
        .expect("first workspace");
        write_workspace_metadata(moved_workspace.path(), &first.metadata)
            .expect("moved metadata written");

        let moved = open_workspace_from_path(
            moved_workspace.path(),
            Some(WorkspaceConflictResolution::Move),
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("move resolves")
        .workspace
        .expect("moved workspace");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");

        assert_eq!(moved.metadata.project_id, first.metadata.project_id);
        assert_eq!(moved.registry_action, WorkspaceRegistryAction::Moved);
        assert_eq!(registry.entries.len(), 1);
        assert_eq!(registry.entries[0].path, moved.root_path);
    }

    #[test]
    fn copy_resolution_rewrites_project_id_and_adds_registry_entry() {
        let first_workspace = tempdir().expect("first workspace");
        let copied_workspace = tempdir().expect("copied workspace");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let first = open_workspace_from_path(
            first_workspace.path(),
            None,
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("first opens")
        .workspace
        .expect("first workspace");
        write_workspace_metadata(copied_workspace.path(), &first.metadata)
            .expect("copied metadata written");

        let copied = open_workspace_from_path(
            copied_workspace.path(),
            Some(WorkspaceConflictResolution::Copy),
            app_data.path(),
            &runtime,
            "main",
        )
        .expect("copy resolves")
        .workspace
        .expect("copied workspace");
        let stored_copy_metadata = read_workspace_metadata(copied_workspace.path())
            .expect("metadata reads")
            .expect("metadata exists");
        let registry = load_workspace_registry(app_data.path()).expect("registry loads");

        assert_ne!(copied.metadata.project_id, first.metadata.project_id);
        assert_eq!(copied.metadata.project_id, stored_copy_metadata.project_id);
        assert_eq!(copied.registry_action, WorkspaceRegistryAction::Copied);
        assert_eq!(registry.entries.len(), 2);
    }

    #[test]
    fn returns_focused_existing_when_workspace_is_already_open() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();

        open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("first open");
        let second = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect("second open");

        assert_eq!(second.status, WorkspaceOpenStatus::FocusedExisting);
    }

    #[test]
    fn rejects_invalid_metadata_without_overwriting_it() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let orchlet_dir = temp.path().join(".orchlet");
        fs::create_dir_all(&orchlet_dir).expect("create .orchlet");
        let metadata_path = orchlet_dir.join("workspace.json");
        fs::write(&metadata_path, "{not valid json").expect("write invalid metadata");

        let err = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect_err("invalid metadata rejected");

        assert_eq!(err.code, "workspace.metadata.invalidJson");
        assert_eq!(
            fs::read_to_string(metadata_path).unwrap(),
            "{not valid json"
        );
    }

    #[test]
    fn rejects_partial_metadata_without_overwriting_it_and_returns_recovery_details() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let orchlet_dir = temp.path().join(".orchlet");
        fs::create_dir_all(&orchlet_dir).expect("create .orchlet");
        let metadata_path = orchlet_dir.join("workspace.json");
        let partial_metadata = r#"{"schemaVersion":1,"name":"demo","createdAtMs":1760000000000,"updatedAtMs":1760000000000}"#;
        fs::write(&metadata_path, partial_metadata).expect("write partial metadata");

        let err = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect_err("partial metadata rejected");

        assert_eq!(err.code, "workspace.metadata.invalidFields");
        assert!(err.message.contains("projectId"));
        assert!(err.recoverable);
        assert!(err
            .user_action
            .as_deref()
            .unwrap_or_default()
            .contains("当前工作区未打开"));
        assert!(err
            .user_action
            .as_deref()
            .unwrap_or_default()
            .contains("修复"));
        assert!(err
            .details
            .as_deref()
            .unwrap_or_default()
            .contains("workspace.json"));
        assert_eq!(fs::read_to_string(metadata_path).unwrap(), partial_metadata);
    }

    #[test]
    fn rejects_unsupported_schema_without_overwriting_it() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        let orchlet_dir = temp.path().join(".orchlet");
        fs::create_dir_all(&orchlet_dir).expect("create .orchlet");
        let metadata_path = orchlet_dir.join("workspace.json");
        let unsupported_metadata = r#"{"schemaVersion":2,"projectId":"01ARZ3NDEKTSV4RRFFQ69G5FAV","name":"demo","createdAtMs":1760000000000,"updatedAtMs":1760000000000}"#;
        fs::write(&metadata_path, unsupported_metadata).expect("write unsupported metadata");

        let err = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect_err("unsupported schema rejected");

        assert_eq!(err.code, "workspace.metadata.unsupportedSchemaVersion");
        assert_eq!(
            fs::read_to_string(metadata_path).unwrap(),
            unsupported_metadata
        );
    }

    #[test]
    fn rejects_invalid_registry_without_overwriting_it() {
        let temp = tempdir().expect("workspace temp dir");
        let app_data = tempdir().expect("app data temp dir");
        let runtime = WorkspaceRuntimeState::default();
        fs::write(
            app_data.path().join("workspace-registry.json"),
            "{invalid registry",
        )
        .expect("write invalid registry");

        let err = open_workspace_from_path(temp.path(), None, app_data.path(), &runtime, "main")
            .expect_err("invalid registry rejected");

        assert_eq!(err.code, "workspace.registry.invalidJson");
        assert_eq!(
            fs::read_to_string(app_data.path().join("workspace-registry.json")).unwrap(),
            "{invalid registry"
        );
    }

    #[test]
    fn opens_workspace_path_in_file_manager_with_adapter() {
        let temp = tempdir().expect("workspace temp dir");
        let result = open_workspace_in_file_manager(
            OpenWorkspaceInFileManagerRequest {
                path: temp.path().to_string_lossy().into_owned(),
            },
            |_| Ok(()),
        )
        .expect("file manager opens");

        assert!(result.opened);
        assert_eq!(
            result.path,
            temp.path().canonicalize().unwrap().to_string_lossy()
        );
    }

    #[test]
    fn returns_recoverable_error_when_file_manager_adapter_fails() {
        let temp = tempdir().expect("workspace temp dir");
        let err = open_workspace_in_file_manager(
            OpenWorkspaceInFileManagerRequest {
                path: temp.path().to_string_lossy().into_owned(),
            },
            |_| Err("platform opener unavailable".to_owned()),
        )
        .expect_err("file manager failure returns error");

        assert_eq!(err.code, "workspace.fileManager.openFailed");
        assert!(err.recoverable);
        assert!(err
            .user_action
            .as_deref()
            .unwrap_or_default()
            .contains("手动打开"));
    }

    #[cfg(unix)]
    fn set_mode(path: &std::path::Path, mode: u32) {
        use std::os::unix::fs::PermissionsExt;

        let mut permissions = fs::metadata(path).expect("metadata").permissions();
        permissions.set_mode(mode);
        fs::set_permissions(path, permissions).expect("set permissions");
    }

    fn legacy_project_id() -> String {
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_owned()
    }
}
