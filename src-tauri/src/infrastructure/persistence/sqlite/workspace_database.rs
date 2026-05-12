use std::{
    fs,
    path::{Path, PathBuf},
};

use rusqlite::Connection;

use crate::{contracts::AppError, domain::member::validate_workspace_id};

pub const WORKSPACE_SQLITE_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_SQLITE_FILE_NAME: &str = "orchlet.sqlite";
pub const WORKSPACE_SQLITE_RELATIVE_PATH: &str = "workspaces/<workspaceId>/orchlet.sqlite";

pub fn workspace_database_path(app_data_dir: &Path, workspace_id: &str) -> PathBuf {
    app_data_dir
        .join("workspaces")
        .join(workspace_id)
        .join(WORKSPACE_SQLITE_FILE_NAME)
}

pub fn open_workspace_database(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<Connection, AppError> {
    validate_workspace_id(workspace_id)?;

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    let database_dir = database_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "workspace.database.invalidPath",
            "无法定位工作区数据库目录。",
            "请重新打开工作区；如果问题持续，请运行数据验证。",
            Some(database_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(database_dir).map_err(|error| {
        AppError::recoverable_error(
            "workspace.database.createDirFailed",
            "无法创建工作区数据库目录。",
            "成员数据未保存；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", database_dir.display(), error)),
        )
    })?;

    let connection = Connection::open(&database_path).map_err(|error| {
        AppError::recoverable_error(
            "workspace.database.openFailed",
            "无法打开工作区数据库。",
            "成员数据未保存；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", database_path.display(), error)),
        )
    })?;

    configure_connection(&connection)?;

    Ok(connection)
}

pub fn configure_connection(connection: &Connection) -> Result<(), AppError> {
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(sqlite_error("workspace.database.configureFailed"))?;
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(sqlite_error("workspace.database.configureFailed"))?;

    Ok(())
}

pub fn sqlite_error(code: &'static str) -> impl FnOnce(rusqlite::Error) -> AppError {
    move |error| {
        AppError::recoverable_error(
            code,
            "工作区数据库操作失败。",
            "请重试；如果问题持续，请运行数据验证。",
            Some(error.to_string()),
        )
    }
}
