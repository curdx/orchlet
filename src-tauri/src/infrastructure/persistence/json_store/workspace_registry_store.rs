use std::{
    collections::{BTreeMap, HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::{AppError, RecentWorkspaceEntry, WorkspaceRegistryEntry},
    domain::workspace::{is_valid_workspace_project_id, project_id_validation_message},
};

pub const WORKSPACE_REGISTRY_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_REGISTRY_FILE_NAME: &str = "workspace-registry.json";
pub const LEGACY_RECENT_WORKSPACES_FILE_NAME: &str = "recent-workspaces.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRegistryDocument {
    pub schema_version: u32,
    pub entries: Vec<WorkspaceRegistryEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyRecentWorkspaceEntry {
    id: String,
    name: String,
    path: String,
    last_opened_at: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyWorkspaceRegistryEntry {
    last_known_path: String,
    last_accessed: u64,
}

impl Default for WorkspaceRegistryDocument {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_REGISTRY_SCHEMA_VERSION,
            entries: Vec::new(),
        }
    }
}

pub fn load_workspace_registry(app_data_dir: &Path) -> Result<WorkspaceRegistryDocument, AppError> {
    let registry_path = workspace_registry_path(app_data_dir);

    if !registry_path.exists() {
        if let Some(registry) = load_legacy_recent_workspaces(app_data_dir)? {
            return Ok(registry);
        }
        return Ok(WorkspaceRegistryDocument::default());
    }

    let raw = fs::read_to_string(&registry_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.readFailed",
            "无法读取工作区 registry。",
            "最近工作区未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", registry_path.display(), error)),
        )
    })?;
    let registry_value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.invalidJson",
            "工作区 registry 不是有效 JSON。",
            "最近工作区未更新；请先备份或修复应用数据中的 workspace-registry.json 后重试。",
            Some(format!("{}: {}", registry_path.display(), error)),
        )
    })?;
    if registry_value.get("schemaVersion").is_none() {
        return legacy_registry_from_value(app_data_dir, registry_value);
    }

    let registry: WorkspaceRegistryDocument =
        serde_json::from_value(registry_value).map_err(|error| {
            AppError::recoverable_error(
                "workspace.registry.invalidFields",
                format!("工作区 registry 字段无效：{}。", error),
                "最近工作区未更新；请先备份或修复应用数据中的 workspace-registry.json 后重试。",
                Some(format!("{}: {}", registry_path.display(), error)),
            )
        })?;

    validate_workspace_registry(&registry)?;

    Ok(registry)
}

pub fn save_workspace_registry(
    app_data_dir: &Path,
    registry: &WorkspaceRegistryDocument,
) -> Result<(), AppError> {
    validate_workspace_registry(registry)?;

    fs::create_dir_all(app_data_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.createDirFailed",
            "无法创建应用数据目录。",
            "最近工作区未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", app_data_dir.display(), error)),
        )
    })?;

    let registry_path = workspace_registry_path(app_data_dir);
    write_registry_atomic(&registry_path, registry)
}

pub fn list_recent_workspace_entries(
    app_data_dir: &Path,
) -> Result<Vec<RecentWorkspaceEntry>, AppError> {
    let registry = load_workspace_registry(app_data_dir)?;
    Ok(sorted_recent_entries(&registry))
}

pub fn sorted_recent_entries(registry: &WorkspaceRegistryDocument) -> Vec<RecentWorkspaceEntry> {
    let mut entries = registry
        .entries
        .iter()
        .map(|entry| RecentWorkspaceEntry {
            project_id: entry.project_id.clone(),
            path: entry.path.clone(),
            name: entry.name.clone(),
            first_opened_at_ms: entry.first_opened_at_ms,
            last_opened_at_ms: entry.last_opened_at_ms,
        })
        .collect::<Vec<_>>();

    entries.sort_by(|a, b| {
        b.last_opened_at_ms
            .cmp(&a.last_opened_at_ms)
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.path.cmp(&b.path))
    });

    entries
}

pub fn upsert_registry_entry(
    registry: &mut WorkspaceRegistryDocument,
    project_id: &str,
    path: String,
    name: String,
    now_ms: u64,
) -> WorkspaceRegistryEntry {
    if let Some(entry) = registry
        .entries
        .iter_mut()
        .find(|entry| entry.project_id == project_id)
    {
        entry.path = path;
        entry.name = name;
        entry.last_opened_at_ms = now_ms;
        return entry.clone();
    }

    let entry = WorkspaceRegistryEntry {
        project_id: project_id.to_owned(),
        path,
        name,
        first_opened_at_ms: now_ms,
        last_opened_at_ms: now_ms,
    };
    registry.entries.push(entry.clone());
    entry
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub fn validate_workspace_registry(registry: &WorkspaceRegistryDocument) -> Result<(), AppError> {
    if registry.schema_version != WORKSPACE_REGISTRY_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "workspace.registry.unsupportedSchemaVersion",
            "工作区 registry 版本暂不支持。",
            "最近工作区未更新；请使用兼容版本的 orchlet 或先备份该 registry。",
            Some(format!(
                "schemaVersion={} expected={}",
                registry.schema_version, WORKSPACE_REGISTRY_SCHEMA_VERSION
            )),
        ));
    }

    let mut project_ids = HashSet::new();
    let mut paths = HashSet::new();

    for entry in &registry.entries {
        if !is_valid_workspace_project_id(&entry.project_id) {
            return Err(AppError::recoverable_error(
                "workspace.registry.invalidProjectId",
                "工作区 registry 项目标识无效。",
                "最近工作区未更新；请修复 registry 中的 projectId 后重试。",
                Some(project_id_validation_message(&entry.project_id)),
            ));
        }

        if !project_ids.insert(entry.project_id.clone()) {
            return Err(AppError::recoverable_error(
                "workspace.registry.duplicateProjectId",
                "工作区 registry 存在重复项目标识。",
                "最近工作区未更新；请修复重复 projectId 后重试。",
                Some(entry.project_id.clone()),
            ));
        }

        if entry.path.trim().is_empty() {
            return Err(AppError::recoverable_error(
                "workspace.registry.invalidPath",
                "工作区 registry 路径无效。",
                "最近工作区未更新；请修复 registry 中的 path 后重试。",
                Some("path must not be empty".to_owned()),
            ));
        }

        if !paths.insert(entry.path.clone()) {
            return Err(AppError::recoverable_error(
                "workspace.registry.duplicatePath",
                "工作区 registry 存在重复路径。",
                "最近工作区未更新；请修复重复 path 后重试。",
                Some(entry.path.clone()),
            ));
        }

        if entry.name.trim().is_empty() {
            return Err(AppError::recoverable_error(
                "workspace.registry.invalidName",
                "工作区 registry 名称无效。",
                "最近工作区未更新；请修复 registry 中的 name 后重试。",
                Some("name must not be empty".to_owned()),
            ));
        }

        if entry.first_opened_at_ms == 0 || entry.last_opened_at_ms < entry.first_opened_at_ms {
            return Err(AppError::recoverable_error(
                "workspace.registry.invalidTimestamp",
                "工作区 registry 时间戳无效。",
                "最近工作区未更新；请修复 firstOpenedAtMs 和 lastOpenedAtMs 后重试。",
                Some(
                    "firstOpenedAtMs must be > 0 and lastOpenedAtMs must be >= firstOpenedAtMs"
                        .to_owned(),
                ),
            ));
        }
    }

    Ok(())
}

pub fn workspace_registry_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(WORKSPACE_REGISTRY_FILE_NAME)
}

pub fn legacy_recent_workspaces_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(LEGACY_RECENT_WORKSPACES_FILE_NAME)
}

fn legacy_registry_from_value(
    app_data_dir: &Path,
    registry_value: serde_json::Value,
) -> Result<WorkspaceRegistryDocument, AppError> {
    let registry_path = workspace_registry_path(app_data_dir);
    let legacy_registry: BTreeMap<String, LegacyWorkspaceRegistryEntry> =
        serde_json::from_value(registry_value).map_err(|error| {
            AppError::recoverable_error(
                "workspace.registry.legacyInvalidFields",
                format!("Golutra 工作区 registry 字段无效：{}。", error),
                "最近工作区未更新；请先备份或修复旧 workspace-registry.json 后重试。",
                Some(registry_path.display().to_string()),
            )
        })?;
    let recent_by_id = load_legacy_recent_workspace_map(app_data_dir)?;
    let mut document = WorkspaceRegistryDocument {
        schema_version: WORKSPACE_REGISTRY_SCHEMA_VERSION,
        entries: Vec::new(),
    };
    let mut seen_paths = HashSet::new();

    for (project_id, entry) in legacy_registry {
        let path = entry.last_known_path.trim().to_owned();
        if project_id.trim().is_empty() || path.is_empty() || !seen_paths.insert(path.clone()) {
            continue;
        }
        let recent = recent_by_id.get(&project_id);
        let name = recent
            .map(|entry| entry.name.trim())
            .filter(|name| !name.is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| workspace_name_from_path_string(&path));
        let last_opened_at_ms = recent
            .map(|entry| entry.last_opened_at)
            .unwrap_or_default()
            .max(entry.last_accessed)
            .max(1);

        document.entries.push(WorkspaceRegistryEntry {
            project_id,
            path,
            name,
            first_opened_at_ms: last_opened_at_ms,
            last_opened_at_ms,
        });
    }

    validate_workspace_registry(&document)?;
    Ok(document)
}

fn load_legacy_recent_workspaces(
    app_data_dir: &Path,
) -> Result<Option<WorkspaceRegistryDocument>, AppError> {
    let recent_path = legacy_recent_workspaces_path(app_data_dir);

    if !recent_path.exists() {
        return Ok(None);
    }

    let recent = load_legacy_recent_workspace_entries(app_data_dir)?;
    let mut document = WorkspaceRegistryDocument {
        schema_version: WORKSPACE_REGISTRY_SCHEMA_VERSION,
        entries: Vec::new(),
    };
    let mut seen_project_ids = HashSet::new();
    let mut seen_paths = HashSet::new();

    for entry in recent {
        let project_id = entry.id.trim().to_owned();
        let path = entry.path.trim().to_owned();
        let name = entry.name.trim().to_owned();
        if project_id.is_empty()
            || path.is_empty()
            || name.is_empty()
            || !seen_project_ids.insert(project_id.clone())
            || !seen_paths.insert(path.clone())
        {
            continue;
        }
        let last_opened_at_ms = entry.last_opened_at.max(1);
        document.entries.push(WorkspaceRegistryEntry {
            project_id,
            path,
            name,
            first_opened_at_ms: last_opened_at_ms,
            last_opened_at_ms,
        });
    }

    validate_workspace_registry(&document)?;
    Ok(Some(document))
}

fn load_legacy_recent_workspace_map(
    app_data_dir: &Path,
) -> Result<HashMap<String, LegacyRecentWorkspaceEntry>, AppError> {
    Ok(load_legacy_recent_workspace_entries(app_data_dir)?
        .into_iter()
        .map(|entry| (entry.id.clone(), entry))
        .collect())
}

fn load_legacy_recent_workspace_entries(
    app_data_dir: &Path,
) -> Result<Vec<LegacyRecentWorkspaceEntry>, AppError> {
    let recent_path = legacy_recent_workspaces_path(app_data_dir);

    if !recent_path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(&recent_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.legacyRecentReadFailed",
            "无法读取 Golutra 最近工作区。",
            "最近工作区未更新；请检查 recent-workspaces.json 权限后重试。",
            Some(format!("{}: {}", recent_path.display(), error)),
        )
    })?;
    serde_json::from_str::<Vec<LegacyRecentWorkspaceEntry>>(&raw).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.legacyRecentInvalidFields",
            format!("Golutra 最近工作区字段无效：{}。", error),
            "最近工作区未更新；请先备份或修复旧 recent-workspaces.json 后重试。",
            Some(recent_path.display().to_string()),
        )
    })
}

fn workspace_name_from_path_string(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or("workspace")
        .to_owned()
}

fn write_registry_atomic(
    path: &Path,
    registry: &WorkspaceRegistryDocument,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(registry).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.serializeFailed",
            "无法序列化工作区 registry。",
            "最近工作区未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        WORKSPACE_REGISTRY_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.writeFailed",
            "无法写入工作区 registry。",
            "最近工作区未更新；请检查应用数据目录是否可写后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "workspace.registry.renameFailed",
            "无法完成工作区 registry 写入。",
            "最近工作区未更新；请检查应用数据目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        legacy_recent_workspaces_path, load_workspace_registry, save_workspace_registry,
        sorted_recent_entries, workspace_registry_path, WorkspaceRegistryDocument,
    };
    use crate::contracts::WorkspaceRegistryEntry;

    const LEGACY_ID_A: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const LEGACY_ID_B: &str = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    #[test]
    fn loads_legacy_golutra_workspace_registry_map() {
        let app_data = tempdir().expect("app data");
        fs::write(
            workspace_registry_path(app_data.path()),
            serde_json::json!({
                LEGACY_ID_A: {
                    "lastKnownPath": "/tmp/alpha",
                    "lastAccessed": 1760000000100_u64
                }
            })
            .to_string(),
        )
        .expect("legacy registry");

        let registry = load_workspace_registry(app_data.path()).expect("registry");

        assert_eq!(registry.entries.len(), 1);
        assert_eq!(registry.entries[0].project_id, LEGACY_ID_A);
        assert_eq!(registry.entries[0].path, "/tmp/alpha");
        assert_eq!(registry.entries[0].name, "alpha");
        assert_eq!(registry.entries[0].last_opened_at_ms, 1760000000100);
    }

    #[test]
    fn combines_legacy_registry_paths_with_recent_workspace_names() {
        let app_data = tempdir().expect("app data");
        fs::write(
            workspace_registry_path(app_data.path()),
            serde_json::json!({
                LEGACY_ID_A: {
                    "lastKnownPath": "/tmp/alpha-moved",
                    "lastAccessed": 1760000000300_u64
                }
            })
            .to_string(),
        )
        .expect("legacy registry");
        fs::write(
            legacy_recent_workspaces_path(app_data.path()),
            serde_json::json!([
                {
                    "id": LEGACY_ID_A,
                    "name": "Alpha Project",
                    "path": "/tmp/alpha-old",
                    "lastOpenedAt": 1760000000200_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy recent");

        let registry = load_workspace_registry(app_data.path()).expect("registry");

        assert_eq!(registry.entries[0].name, "Alpha Project");
        assert_eq!(registry.entries[0].path, "/tmp/alpha-moved");
        assert_eq!(registry.entries[0].last_opened_at_ms, 1760000000300);
    }

    #[test]
    fn loads_legacy_recent_workspaces_when_current_registry_missing() {
        let app_data = tempdir().expect("app data");
        fs::write(
            legacy_recent_workspaces_path(app_data.path()),
            serde_json::json!([
                {
                    "id": LEGACY_ID_A,
                    "name": "Alpha",
                    "path": "/tmp/alpha",
                    "lastOpenedAt": 1760000000100_u64
                },
                {
                    "id": LEGACY_ID_B,
                    "name": "Beta",
                    "path": "/tmp/beta",
                    "lastOpenedAt": 1760000000500_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy recent");

        let registry = load_workspace_registry(app_data.path()).expect("registry");
        let recent = sorted_recent_entries(&registry);

        assert_eq!(registry.entries.len(), 2);
        assert_eq!(recent[0].project_id, LEGACY_ID_B);
        assert_eq!(recent[1].project_id, LEGACY_ID_A);
    }

    #[test]
    fn current_workspace_registry_takes_precedence_over_legacy_files() {
        let app_data = tempdir().expect("app data");
        fs::write(
            legacy_recent_workspaces_path(app_data.path()),
            serde_json::json!([
                {
                    "id": LEGACY_ID_A,
                    "name": "Legacy",
                    "path": "/tmp/legacy",
                    "lastOpenedAt": 1760000000100_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy recent");
        let current_id = "01K7Q9Y7P5QY4S0W2Z6F8D3X1A";
        save_workspace_registry(
            app_data.path(),
            &WorkspaceRegistryDocument {
                schema_version: super::WORKSPACE_REGISTRY_SCHEMA_VERSION,
                entries: vec![WorkspaceRegistryEntry {
                    project_id: current_id.to_owned(),
                    path: "/tmp/current".to_owned(),
                    name: "Current".to_owned(),
                    first_opened_at_ms: 1760000000200,
                    last_opened_at_ms: 1760000000300,
                }],
            },
        )
        .expect("current registry");

        let registry = load_workspace_registry(app_data.path()).expect("registry");

        assert_eq!(registry.entries.len(), 1);
        assert_eq!(registry.entries[0].project_id, current_id);
        assert_eq!(registry.entries[0].name, "Current");
    }
}
