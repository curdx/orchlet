use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::contracts::{AppError, RecentWorkspaceEntry, WorkspaceRegistryEntry};

pub const WORKSPACE_REGISTRY_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_REGISTRY_FILE_NAME: &str = "workspace-registry.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRegistryDocument {
    pub schema_version: u32,
    pub entries: Vec<WorkspaceRegistryEntry>,
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
        if entry.project_id.parse::<Ulid>().is_err() {
            return Err(AppError::recoverable_error(
                "workspace.registry.invalidProjectId",
                "工作区 registry 项目标识无效。",
                "最近工作区未更新；请修复 registry 中的 projectId 后重试。",
                Some(format!(
                    "projectId must be a ULID string: {}",
                    entry.project_id
                )),
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
