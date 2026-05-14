use std::path::Path;

use ulid::Ulid;

use crate::contracts::{AppError, WorkspaceMetadata};

pub const WORKSPACE_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_DIR_NAME: &str = ".orchlet";
pub const WORKSPACE_METADATA_FILE_NAME: &str = "workspace.json";
pub const LEGACY_GOLUTRA_WORKSPACE_DIR_NAME: &str = ".golutra";
pub const LEGACY_GOLUTRA_LOCAL_FILE_NAME: &str = "local.json";

pub fn workspace_name_from_path(root: &Path) -> String {
    root.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("workspace")
        .to_owned()
}

pub fn validate_workspace_metadata(metadata: &WorkspaceMetadata) -> Result<(), AppError> {
    if metadata.schema_version != WORKSPACE_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "workspace.metadata.unsupportedSchemaVersion",
            "工作区元数据版本暂不支持。",
            "当前工作区未打开；请先备份 .orchlet/workspace.json，再使用兼容版本的 orchlet 打开。",
            Some(format!(
                "schemaVersion={} expected={}",
                metadata.schema_version, WORKSPACE_SCHEMA_VERSION
            )),
        ));
    }

    if !is_valid_workspace_project_id(&metadata.project_id) {
        return Err(AppError::recoverable_error(
            "workspace.metadata.invalidProjectId",
            "工作区项目标识无效。",
            "当前工作区未打开；请检查 .orchlet/workspace.json；如果需要重建，请先备份该文件。",
            Some(project_id_validation_message(&metadata.project_id)),
        ));
    }

    if metadata.name.trim().is_empty() {
        return Err(AppError::recoverable_error(
            "workspace.metadata.invalidName",
            "工作区名称无效。",
            "当前工作区未打开；请检查 .orchlet/workspace.json 中的 name 字段。",
            Some("name must not be empty".to_owned()),
        ));
    }

    if metadata.created_at_ms == 0 || metadata.updated_at_ms < metadata.created_at_ms {
        return Err(AppError::recoverable_error(
            "workspace.metadata.invalidTimestamp",
            "工作区时间戳无效。",
            "当前工作区未打开；请检查 .orchlet/workspace.json 中的 createdAtMs 和 updatedAtMs 字段。",
            Some("createdAtMs must be > 0 and updatedAtMs must be >= createdAtMs".to_owned()),
        ));
    }

    Ok(())
}

pub fn is_valid_workspace_project_id(project_id: &str) -> bool {
    let project_id = project_id.trim();

    project_id.parse::<Ulid>().is_ok() || is_legacy_golutra_project_id(project_id)
}

pub fn project_id_validation_message(project_id: &str) -> String {
    format!(
        "projectId must be a ULID string or legacy 64-character SHA-256 hex string: {project_id}"
    )
}

fn is_legacy_golutra_project_id(project_id: &str) -> bool {
    project_id.len() == 64 && project_id.chars().all(|value| value.is_ascii_hexdigit())
}
