use std::{
    fs,
    path::{Path, PathBuf},
};

use rusqlite::{Connection, OpenFlags};

use crate::{
    contracts::AppError,
    infrastructure::persistence::sqlite::workspace_database::configure_connection,
};

pub const GLOBAL_SQLITE_SCHEMA_VERSION: u32 = 1;
pub const GLOBAL_SQLITE_FILE_NAME: &str = "orchlet.sqlite";
pub const GLOBAL_SQLITE_RELATIVE_PATH: &str = "global/orchlet.sqlite";

pub fn global_database_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("global").join(GLOBAL_SQLITE_FILE_NAME)
}

pub fn open_global_database(app_data_dir: &Path) -> Result<Connection, AppError> {
    let database_path = global_database_path(app_data_dir);
    let database_dir = database_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "global.database.invalidPath",
            "无法定位全局数据库目录。",
            "联系人数据未保存；请检查应用数据目录权限后重试。",
            Some(database_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(database_dir).map_err(|error| {
        AppError::recoverable_error(
            "global.database.createDirFailed",
            "无法创建全局数据库目录。",
            "联系人数据未保存；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", database_dir.display(), error)),
        )
    })?;

    let connection = Connection::open(&database_path).map_err(|error| {
        AppError::recoverable_error(
            "global.database.openFailed",
            "无法打开全局数据库。",
            "联系人数据未保存；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", database_path.display(), error)),
        )
    })?;

    configure_connection(&connection)?;

    Ok(connection)
}

pub fn open_global_database_read_only(app_data_dir: &Path) -> Result<Option<Connection>, AppError> {
    let database_path = global_database_path(app_data_dir);

    if !database_path.exists() {
        return Ok(None);
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "global.database.readOnlyOpenFailed",
                "无法读取全局数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    Ok(Some(connection))
}
