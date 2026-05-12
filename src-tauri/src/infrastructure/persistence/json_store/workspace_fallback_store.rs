use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::{AppError, WorkspaceMetadata},
    domain::workspace::WORKSPACE_SCHEMA_VERSION,
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const WORKSPACE_FALLBACK_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_FALLBACK_FILE_NAME: &str = "workspace-fallbacks.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceFallbackDocument {
    pub schema_version: u32,
    pub entries: Vec<WorkspaceFallbackEntry>,
}

impl Default for WorkspaceFallbackDocument {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_FALLBACK_SCHEMA_VERSION,
            entries: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceFallbackEntry {
    pub path: String,
    pub project_id: String,
    pub name: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
}

pub fn workspace_fallback_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(WORKSPACE_FALLBACK_FILE_NAME)
}

pub fn load_workspace_fallbacks(
    app_data_dir: &Path,
) -> Result<WorkspaceFallbackDocument, AppError> {
    let fallback_path = workspace_fallback_path(app_data_dir);

    if !fallback_path.exists() {
        return Ok(WorkspaceFallbackDocument::default());
    }

    let raw = fs::read_to_string(&fallback_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.fallback.readFailed",
            "无法读取只读工作区 fallback 状态。",
            "工作区未打开；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", fallback_path.display(), error)),
        )
    })?;
    let fallback_value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "workspace.fallback.invalidJson",
            "只读工作区 fallback 状态不是有效 JSON。",
            "工作区未打开；请先备份或修复应用数据中的 workspace-fallbacks.json 后重试。",
            Some(format!("{}: {}", fallback_path.display(), error)),
        )
    })?;
    let fallback: WorkspaceFallbackDocument =
        serde_json::from_value(fallback_value).map_err(|error| {
            AppError::recoverable_error(
                "workspace.fallback.invalidFields",
                format!("只读工作区 fallback 状态字段无效：{}。", error),
                "工作区未打开；请先备份或修复应用数据中的 workspace-fallbacks.json 后重试。",
                Some(format!("{}: {}", fallback_path.display(), error)),
            )
        })?;

    validate_workspace_fallbacks(&fallback)?;

    Ok(fallback)
}

pub fn fallback_metadata_for_path(
    app_data_dir: &Path,
    path: String,
    name: String,
) -> Result<WorkspaceMetadata, AppError> {
    let mut fallbacks = load_workspace_fallbacks(app_data_dir)?;
    let timestamp = now_ms();

    let metadata = if let Some(entry) = fallbacks
        .entries
        .iter_mut()
        .find(|entry| entry.path == path)
    {
        entry.name = name;
        entry.updated_at_ms = timestamp;

        WorkspaceMetadata {
            schema_version: WORKSPACE_SCHEMA_VERSION,
            project_id: entry.project_id.clone(),
            name: entry.name.clone(),
            created_at_ms: entry.created_at_ms,
            updated_at_ms: entry.updated_at_ms,
        }
    } else {
        let entry = WorkspaceFallbackEntry {
            path,
            project_id: Ulid::new().to_string(),
            name,
            created_at_ms: timestamp,
            updated_at_ms: timestamp,
        };
        let metadata = WorkspaceMetadata {
            schema_version: WORKSPACE_SCHEMA_VERSION,
            project_id: entry.project_id.clone(),
            name: entry.name.clone(),
            created_at_ms: entry.created_at_ms,
            updated_at_ms: entry.updated_at_ms,
        };

        fallbacks.entries.push(entry);
        metadata
    };

    save_workspace_fallbacks(app_data_dir, &fallbacks)?;

    Ok(metadata)
}

pub fn find_fallback_metadata_for_path(
    app_data_dir: &Path,
    path: &str,
    name: String,
) -> Result<Option<WorkspaceMetadata>, AppError> {
    let fallbacks = load_workspace_fallbacks(app_data_dir)?;

    Ok(fallbacks
        .entries
        .iter()
        .find(|entry| entry.path == path)
        .map(|entry| WorkspaceMetadata {
            schema_version: WORKSPACE_SCHEMA_VERSION,
            project_id: entry.project_id.clone(),
            name,
            created_at_ms: entry.created_at_ms,
            updated_at_ms: now_ms().max(entry.updated_at_ms),
        }))
}

pub fn persist_fallback_metadata(
    app_data_dir: &Path,
    path: String,
    metadata: &WorkspaceMetadata,
) -> Result<(), AppError> {
    let mut fallbacks = load_workspace_fallbacks(app_data_dir)?;

    if let Some(entry) = fallbacks
        .entries
        .iter_mut()
        .find(|entry| entry.path == path)
    {
        entry.project_id = metadata.project_id.clone();
        entry.name = metadata.name.clone();
        entry.created_at_ms = metadata.created_at_ms;
        entry.updated_at_ms = now_ms().max(metadata.updated_at_ms);
    } else {
        fallbacks.entries.push(WorkspaceFallbackEntry {
            path,
            project_id: metadata.project_id.clone(),
            name: metadata.name.clone(),
            created_at_ms: metadata.created_at_ms,
            updated_at_ms: now_ms().max(metadata.updated_at_ms),
        });
    }

    save_workspace_fallbacks(app_data_dir, &fallbacks)
}

fn save_workspace_fallbacks(
    app_data_dir: &Path,
    fallbacks: &WorkspaceFallbackDocument,
) -> Result<(), AppError> {
    validate_workspace_fallbacks(fallbacks)?;

    fs::create_dir_all(app_data_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.fallback.createDirFailed",
            "无法创建应用数据目录。",
            "只读工作区 fallback 状态未保存；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", app_data_dir.display(), error)),
        )
    })?;

    let fallback_path = workspace_fallback_path(app_data_dir);
    write_fallbacks_atomic(&fallback_path, fallbacks)
}

fn validate_workspace_fallbacks(fallbacks: &WorkspaceFallbackDocument) -> Result<(), AppError> {
    if fallbacks.schema_version != WORKSPACE_FALLBACK_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "workspace.fallback.unsupportedSchemaVersion",
            "只读工作区 fallback 状态版本暂不支持。",
            "工作区未打开；请使用兼容版本的 orchlet 或先备份该 fallback 文件。",
            Some(format!(
                "schemaVersion={} expected={}",
                fallbacks.schema_version, WORKSPACE_FALLBACK_SCHEMA_VERSION
            )),
        ));
    }

    let mut paths = HashSet::new();

    for entry in &fallbacks.entries {
        if entry.path.trim().is_empty() {
            return Err(AppError::recoverable_error(
                "workspace.fallback.invalidPath",
                "只读工作区 fallback 路径无效。",
                "工作区未打开；请修复 fallback 状态中的 path 后重试。",
                Some("path must not be empty".to_owned()),
            ));
        }

        if !paths.insert(entry.path.clone()) {
            return Err(AppError::recoverable_error(
                "workspace.fallback.duplicatePath",
                "只读工作区 fallback 存在重复路径。",
                "工作区未打开；请修复重复 path 后重试。",
                Some(entry.path.clone()),
            ));
        }

        if entry.project_id.parse::<Ulid>().is_err() {
            return Err(AppError::recoverable_error(
                "workspace.fallback.invalidProjectId",
                "只读工作区 fallback 项目标识无效。",
                "工作区未打开；请修复 fallback 状态中的 projectId 后重试。",
                Some(format!(
                    "projectId must be a ULID string: {}",
                    entry.project_id
                )),
            ));
        }

        if entry.name.trim().is_empty() {
            return Err(AppError::recoverable_error(
                "workspace.fallback.invalidName",
                "只读工作区 fallback 名称无效。",
                "工作区未打开；请修复 fallback 状态中的 name 后重试。",
                Some("name must not be empty".to_owned()),
            ));
        }

        if entry.created_at_ms == 0 || entry.updated_at_ms < entry.created_at_ms {
            return Err(AppError::recoverable_error(
                "workspace.fallback.invalidTimestamp",
                "只读工作区 fallback 时间戳无效。",
                "工作区未打开；请修复 createdAtMs 和 updatedAtMs 后重试。",
                Some("createdAtMs must be > 0 and updatedAtMs must be >= createdAtMs".to_owned()),
            ));
        }
    }

    Ok(())
}

fn write_fallbacks_atomic(
    path: &Path,
    fallbacks: &WorkspaceFallbackDocument,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(fallbacks).map_err(|error| {
        AppError::recoverable_error(
            "workspace.fallback.serializeFailed",
            "无法序列化只读工作区 fallback 状态。",
            "工作区未打开；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        WORKSPACE_FALLBACK_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "workspace.fallback.writeFailed",
            "无法写入只读工作区 fallback 状态。",
            "工作区未打开；请检查应用数据目录是否可写后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "workspace.fallback.renameFailed",
            "无法完成只读工作区 fallback 状态写入。",
            "工作区未打开；请检查应用数据目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}
