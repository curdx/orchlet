use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use ulid::Ulid;

use crate::{
    contracts::{AppError, WorkspaceMetadata},
    domain::workspace::{
        validate_workspace_metadata, workspace_name_from_path, WORKSPACE_DIR_NAME,
        WORKSPACE_METADATA_FILE_NAME, WORKSPACE_SCHEMA_VERSION,
    },
};

pub struct WorkspaceMetadataRecord {
    pub metadata: WorkspaceMetadata,
    pub created: bool,
}

pub fn open_or_create_workspace_metadata(root: &Path) -> Result<WorkspaceMetadataRecord, AppError> {
    if let Some(metadata) = read_workspace_metadata(root)? {
        let metadata = refresh_workspace_metadata(root, metadata)?;
        return Ok(WorkspaceMetadataRecord {
            metadata,
            created: false,
        });
    }

    let metadata = create_workspace_metadata(root)?;

    Ok(WorkspaceMetadataRecord {
        metadata,
        created: true,
    })
}

pub fn read_workspace_metadata(root: &Path) -> Result<Option<WorkspaceMetadata>, AppError> {
    let metadata_path = workspace_metadata_path(root);

    if !metadata_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&metadata_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.readFailed",
            "无法读取工作区元数据。",
            "当前工作区未打开；请检查 .orchlet/workspace.json 的权限后重试。",
            Some(format!("{}: {}", metadata_path.display(), error)),
        )
    })?;
    let metadata_value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.invalidJson",
            "工作区元数据不是有效 JSON。",
            "当前工作区未打开；请先备份或修复 .orchlet/workspace.json 后重试。",
            Some(format!("{}: {}", metadata_path.display(), error)),
        )
    })?;
    let metadata: WorkspaceMetadata = serde_json::from_value(metadata_value).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.invalidFields",
            format!("工作区元数据字段无效：{}。", error),
            "当前工作区未打开；请先备份或修复 .orchlet/workspace.json 后重试。",
            Some(format!("{}: {}", metadata_path.display(), error)),
        )
    })?;

    validate_workspace_metadata(&metadata)?;

    Ok(Some(metadata))
}

pub fn create_workspace_metadata(root: &Path) -> Result<WorkspaceMetadata, AppError> {
    let metadata_path = workspace_metadata_path(root);
    let orchlet_dir = metadata_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "workspace.metadata.invalidPath",
            "无法定位工作区元数据目录。",
            "当前工作区未打开；请选择其他本地目录后重试。",
            Some(metadata_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(&orchlet_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.createDirFailed",
            "无法创建 .orchlet 工作区目录。",
            "当前工作区未打开；请检查所选目录是否可写，或选择其他本地目录。",
            Some(format!("{}: {}", orchlet_dir.display(), error)),
        )
    })?;

    let metadata = new_workspace_metadata(root);

    write_metadata_atomic(&metadata_path, &metadata)?;

    Ok(metadata)
}

pub fn refresh_workspace_metadata(
    root: &Path,
    mut metadata: WorkspaceMetadata,
) -> Result<WorkspaceMetadata, AppError> {
    metadata.name = workspace_name_from_path(root);
    metadata.updated_at_ms = now_ms();
    write_workspace_metadata(root, &metadata)?;
    Ok(metadata)
}

pub fn replace_workspace_metadata_for_copy(root: &Path) -> Result<WorkspaceMetadata, AppError> {
    let metadata = new_workspace_metadata(root);
    write_workspace_metadata(root, &metadata)?;
    Ok(metadata)
}

pub fn write_workspace_metadata(root: &Path, metadata: &WorkspaceMetadata) -> Result<(), AppError> {
    let metadata_path = workspace_metadata_path(root);
    let orchlet_dir = metadata_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "workspace.metadata.invalidPath",
            "无法定位工作区元数据目录。",
            "当前工作区未打开；请选择其他本地目录后重试。",
            Some(metadata_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(orchlet_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.createDirFailed",
            "无法创建 .orchlet 工作区目录。",
            "当前工作区未打开；请检查所选目录是否可写，或选择其他本地目录。",
            Some(format!("{}: {}", orchlet_dir.display(), error)),
        )
    })?;

    write_metadata_atomic(&metadata_path, metadata)
}

fn new_workspace_metadata(root: &Path) -> WorkspaceMetadata {
    let timestamp = now_ms();

    WorkspaceMetadata {
        schema_version: WORKSPACE_SCHEMA_VERSION,
        project_id: Ulid::new().to_string(),
        name: workspace_name_from_path(root),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

fn workspace_metadata_path(root: &Path) -> std::path::PathBuf {
    root.join(WORKSPACE_DIR_NAME)
        .join(WORKSPACE_METADATA_FILE_NAME)
}

fn write_metadata_atomic(path: &Path, metadata: &WorkspaceMetadata) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(metadata).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.serializeFailed",
            "无法序列化工作区元数据。",
            "当前工作区未打开；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        WORKSPACE_METADATA_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.writeFailed",
            "无法写入工作区元数据。",
            "当前工作区未打开；请检查所选目录是否可写，或选择其他本地目录。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "workspace.metadata.renameFailed",
            "无法完成工作区元数据写入。",
            "当前工作区未打开；请检查所选目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
