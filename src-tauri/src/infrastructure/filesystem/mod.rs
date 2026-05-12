use std::path::{Path, PathBuf};

use crate::contracts::AppError;

pub fn canonicalize_existing_directory(path: impl AsRef<Path>) -> Result<PathBuf, AppError> {
    let path = path.as_ref();

    if !path.exists() {
        return Err(AppError::recoverable_error(
            "workspace.path.notFound",
            "选择的工作区路径不存在。",
            "请选择一个存在的本地目录后重试。",
            Some(path.display().to_string()),
        ));
    }

    let metadata = path.metadata().map_err(|error| {
        AppError::recoverable_error(
            "workspace.path.metadataFailed",
            "无法读取工作区路径信息。",
            "请检查目录权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    if !metadata.is_dir() {
        return Err(AppError::recoverable_error(
            "workspace.path.notDirectory",
            "选择的路径不是文件夹。",
            "请选择一个本地目录作为工作区。",
            Some(path.display().to_string()),
        ));
    }

    path.canonicalize().map_err(|error| {
        AppError::recoverable_error(
            "workspace.path.canonicalizeFailed",
            "无法解析工作区真实路径。",
            "请检查目录权限或符号链接目标后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })
}
