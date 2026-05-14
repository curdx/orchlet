use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use ulid::Ulid;

use crate::{
    contracts::{AppError, WorkspaceMetadata},
    domain::workspace::{
        is_valid_workspace_project_id, project_id_validation_message, validate_workspace_metadata,
        workspace_name_from_path, LEGACY_GOLUTRA_LOCAL_FILE_NAME,
        LEGACY_GOLUTRA_WORKSPACE_DIR_NAME, WORKSPACE_DIR_NAME, WORKSPACE_METADATA_FILE_NAME,
        WORKSPACE_SCHEMA_VERSION,
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
    if let Some(metadata) = read_legacy_workspace_metadata(root)? {
        write_workspace_metadata(root, &metadata)?;
        let _ = refresh_legacy_workspace_local_state(root);
        return Ok(metadata);
    }

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
    mirror_legacy_workspace_metadata(root, &metadata)?;
    let _ = refresh_legacy_workspace_local_state(root);

    Ok(metadata)
}

pub fn refresh_workspace_metadata(
    root: &Path,
    mut metadata: WorkspaceMetadata,
) -> Result<WorkspaceMetadata, AppError> {
    metadata.name = workspace_name_from_path(root);
    metadata.updated_at_ms = now_ms();
    write_workspace_metadata(root, &metadata)?;
    let _ = refresh_legacy_workspace_local_state(root);
    Ok(metadata)
}

pub fn replace_workspace_metadata_for_copy(root: &Path) -> Result<WorkspaceMetadata, AppError> {
    let metadata = new_workspace_metadata(root);
    write_workspace_metadata(root, &metadata)?;
    let _ = refresh_legacy_workspace_local_state(root);
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
        .and_then(|_| mirror_legacy_workspace_metadata(root, metadata))
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

pub fn read_legacy_workspace_metadata(root: &Path) -> Result<Option<WorkspaceMetadata>, AppError> {
    let metadata_path = legacy_workspace_metadata_path(root);

    if !metadata_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&metadata_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.legacyReadFailed",
            "无法读取 Golutra 工作区元数据。",
            "当前工作区未打开；请检查 .golutra/workspace.json 的权限后重试。",
            Some(format!("{}: {}", metadata_path.display(), error)),
        )
    })?;
    let metadata_value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.legacyInvalidJson",
            "Golutra 工作区元数据不是有效 JSON。",
            "当前工作区未打开；请先备份或修复 .golutra/workspace.json 后重试。",
            Some(format!("{}: {}", metadata_path.display(), error)),
        )
    })?;
    let object = metadata_value.as_object().ok_or_else(|| {
        AppError::recoverable_error(
            "workspace.metadata.legacyInvalidFields",
            "Golutra 工作区元数据字段无效。",
            "当前工作区未打开；请先备份或修复 .golutra/workspace.json 后重试。",
            Some(format!(
                "{}: metadata must be a JSON object",
                metadata_path.display()
            )),
        )
    })?;
    let project_id = object
        .get("projectId")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AppError::recoverable_error(
                "workspace.metadata.legacyMissingProjectId",
                "Golutra 工作区缺少项目标识。",
                "当前工作区未打开；请先备份或修复 .golutra/workspace.json 后重试。",
                Some(format!("{}: projectId is missing", metadata_path.display())),
            )
        })?;

    if !is_valid_workspace_project_id(project_id) {
        return Err(AppError::recoverable_error(
            "workspace.metadata.legacyInvalidProjectId",
            "Golutra 工作区项目标识无效。",
            "当前工作区未打开；请先备份或修复 .golutra/workspace.json 后重试。",
            Some(project_id_validation_message(project_id)),
        ));
    }

    let timestamp = now_ms();
    let created_at_ms = object
        .get("createdAtMs")
        .and_then(|value| value.as_u64())
        .filter(|value| *value > 0)
        .unwrap_or(timestamp);
    let updated_at_ms = object
        .get("updatedAtMs")
        .and_then(|value| value.as_u64())
        .filter(|value| *value >= created_at_ms)
        .unwrap_or(timestamp.max(created_at_ms));
    let metadata = WorkspaceMetadata {
        schema_version: WORKSPACE_SCHEMA_VERSION,
        project_id: project_id.to_owned(),
        name: object
            .get("name")
            .and_then(|value| value.as_str())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| workspace_name_from_path(root)),
        created_at_ms,
        updated_at_ms,
    };

    validate_workspace_metadata(&metadata)?;

    Ok(Some(metadata))
}

fn legacy_workspace_metadata_path(root: &Path) -> std::path::PathBuf {
    root.join(LEGACY_GOLUTRA_WORKSPACE_DIR_NAME)
        .join(WORKSPACE_METADATA_FILE_NAME)
}

fn legacy_workspace_local_state_path(root: &Path) -> std::path::PathBuf {
    root.join(LEGACY_GOLUTRA_WORKSPACE_DIR_NAME)
        .join(LEGACY_GOLUTRA_LOCAL_FILE_NAME)
}

fn mirror_legacy_workspace_metadata(
    root: &Path,
    metadata: &WorkspaceMetadata,
) -> Result<(), AppError> {
    let metadata_path = legacy_workspace_metadata_path(root);
    let legacy_dir = metadata_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "workspace.metadata.legacyInvalidPath",
            "无法定位 Golutra 工作区元数据目录。",
            "当前工作区未打开；请选择其他本地目录后重试。",
            Some(metadata_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(legacy_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.legacyCreateDirFailed",
            "无法创建 .golutra 工作区目录。",
            "当前工作区未打开；请检查所选目录是否可写，或选择其他本地目录。",
            Some(format!("{}: {}", legacy_dir.display(), error)),
        )
    })?;

    let mut payload = match fs::read_to_string(&metadata_path) {
        Ok(raw) => serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|value| value.as_object().cloned())
            .map(serde_json::Value::Object)
            .unwrap_or_else(|| serde_json::json!({})),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => serde_json::json!({}),
        Err(error) => {
            return Err(AppError::recoverable_error(
                "workspace.metadata.legacyReadFailed",
                "无法读取 Golutra 工作区元数据。",
                "当前工作区未打开；请检查 .golutra/workspace.json 的权限后重试。",
                Some(format!("{}: {}", metadata_path.display(), error)),
            ))
        }
    };

    if let Some(object) = payload.as_object_mut() {
        object.insert(
            "projectId".to_owned(),
            serde_json::Value::String(metadata.project_id.clone()),
        );
        object
            .entry("name".to_owned())
            .or_insert_with(|| serde_json::Value::String(metadata.name.clone()));
        object
            .entry("createdAtMs".to_owned())
            .or_insert_with(|| serde_json::Value::Number(metadata.created_at_ms.into()));
        object.insert(
            "updatedAtMs".to_owned(),
            serde_json::Value::Number(metadata.updated_at_ms.into()),
        );
    }

    write_json_atomic(&metadata_path, &payload, WORKSPACE_METADATA_FILE_NAME)
}

fn refresh_legacy_workspace_local_state(root: &Path) -> Result<(), AppError> {
    let local_path = legacy_workspace_local_state_path(root);
    let legacy_dir = local_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "workspace.metadata.legacyLocalInvalidPath",
            "无法定位 Golutra 本地状态目录。",
            "当前工作区已打开，但 .golutra/local.json 未刷新。",
            Some(local_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(legacy_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.legacyLocalCreateDirFailed",
            "无法创建 .golutra 工作区目录。",
            "当前工作区已打开，但 .golutra/local.json 未刷新。",
            Some(format!("{}: {}", legacy_dir.display(), error)),
        )
    })?;

    let existing = match fs::read_to_string(&local_path) {
        Ok(raw) => serde_json::from_str::<serde_json::Value>(&raw).ok(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => {
            return Err(AppError::recoverable_error(
                "workspace.metadata.legacyLocalReadFailed",
                "无法读取 Golutra 本地状态。",
                "当前工作区已打开，但 .golutra/local.json 未刷新。",
                Some(format!("{}: {}", local_path.display(), error)),
            ))
        }
    };
    let local_machine_id = existing
        .as_ref()
        .and_then(|value| value.get("localMachineId"))
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| Ulid::new().to_string());
    let payload = serde_json::json!({
        "localMachineId": local_machine_id,
        "lastOpenedAt": now_ms(),
    });

    write_json_atomic(&local_path, &payload, LEGACY_GOLUTRA_LOCAL_FILE_NAME)
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

fn write_json_atomic(
    path: &Path,
    payload: &serde_json::Value,
    file_name: &str,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(payload).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.legacySerializeFailed",
            "无法序列化 Golutra 工作区兼容数据。",
            "当前工作区未打开；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!("{}.tmp-{}", file_name, Ulid::new()));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "workspace.metadata.legacyWriteFailed",
            "无法写入 Golutra 工作区兼容数据。",
            "当前工作区未打开；请检查所选目录是否可写，或选择其他本地目录。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "workspace.metadata.legacyRenameFailed",
            "无法完成 Golutra 工作区兼容数据写入。",
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
