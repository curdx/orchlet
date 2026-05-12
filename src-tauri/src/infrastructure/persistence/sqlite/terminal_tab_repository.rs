use std::path::Path;

use rusqlite::{params, Connection, OpenFlags};

use crate::{
    contracts::{AppError, TerminalTabProfile, TerminalTabStatus},
    domain::{
        member::validate_workspace_id,
        terminal::{validate_terminal_session_id, validate_terminal_tab_id},
    },
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms,
        sqlite::workspace_database::{
            open_workspace_database, sqlite_error, workspace_database_path,
        },
    },
};

const TERMINAL_TABS_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605121900__terminal_tabs.sql");

pub fn list_terminal_tabs(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<Vec<TerminalTabProfile>, AppError> {
    let connection = open_terminal_tab_connection(app_data_dir, workspace_id)?;
    list_terminal_tabs_from_connection(&connection, workspace_id)
}

pub fn create_terminal_tab(
    app_data_dir: &Path,
    tab: TerminalTabProfile,
) -> Result<TerminalTabProfile, AppError> {
    validate_workspace_id(&tab.workspace_id)?;
    validate_terminal_tab_id(&tab.tab_id)?;
    validate_terminal_session_id(&tab.terminal_session_id)?;

    let connection = open_terminal_tab_connection(app_data_dir, &tab.workspace_id)?;
    insert_terminal_tab(&connection, &tab)?;

    Ok(tab)
}

pub fn ensure_terminal_tab_for_session(
    app_data_dir: &Path,
    workspace_id: &str,
    terminal_session_id: &str,
    member_id: Option<String>,
    label: String,
    shell: String,
) -> Result<TerminalTabProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_terminal_session_id(terminal_session_id)?;

    let connection = open_terminal_tab_connection(app_data_dir, workspace_id)?;

    if let Some(tab) = terminal_tab_by_session(&connection, workspace_id, terminal_session_id)? {
        return Ok(tab);
    }

    let timestamp = now_ms();
    let tab = TerminalTabProfile {
        schema_version: 1,
        tab_id: ulid::Ulid::new().to_string(),
        workspace_id: workspace_id.to_owned(),
        terminal_session_id: terminal_session_id.to_owned(),
        member_id,
        label,
        shell,
        status: TerminalTabStatus::Open,
        is_pinned: false,
        sort_index: next_sort_index(&connection, workspace_id)?,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
        closed_at_ms: None,
    };
    insert_terminal_tab(&connection, &tab)?;

    Ok(tab)
}

pub fn terminal_tab_by_id(
    app_data_dir: &Path,
    workspace_id: &str,
    tab_id: &str,
) -> Result<TerminalTabProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_terminal_tab_id(tab_id)?;

    let connection = open_terminal_tab_connection(app_data_dir, workspace_id)?;
    terminal_tab_by_id_from_connection(&connection, workspace_id, tab_id)?
        .ok_or_else(|| terminal_tab_not_found(workspace_id, tab_id))
}

pub fn close_terminal_tab(
    app_data_dir: &Path,
    workspace_id: &str,
    tab_id: &str,
) -> Result<TerminalTabProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_terminal_tab_id(tab_id)?;

    let connection = open_terminal_tab_connection(app_data_dir, workspace_id)?;
    let timestamp = now_ms();
    let changed = connection
        .execute(
            "UPDATE terminal_tabs
             SET status = 'closed', updated_at_ms = ?3, closed_at_ms = ?3
             WHERE workspace_id = ?1 AND id = ?2",
            params![workspace_id, tab_id, timestamp as i64],
        )
        .map_err(sqlite_error("terminal.tab.close.persistFailed"))?;

    if changed == 0 {
        return Err(terminal_tab_not_found(workspace_id, tab_id));
    }

    terminal_tab_by_id_from_connection(&connection, workspace_id, tab_id)?
        .ok_or_else(|| terminal_tab_not_found(workspace_id, tab_id))
}

pub fn restore_terminal_tab(
    app_data_dir: &Path,
    workspace_id: &str,
    tab_id: &str,
    terminal_session_id: &str,
) -> Result<TerminalTabProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_terminal_tab_id(tab_id)?;
    validate_terminal_session_id(terminal_session_id)?;

    let connection = open_terminal_tab_connection(app_data_dir, workspace_id)?;
    let timestamp = now_ms();
    let changed = connection
        .execute(
            "UPDATE terminal_tabs
             SET status = 'open',
                 terminal_session_id = ?3,
                 updated_at_ms = ?4,
                 closed_at_ms = NULL
             WHERE workspace_id = ?1 AND id = ?2",
            params![workspace_id, tab_id, terminal_session_id, timestamp as i64],
        )
        .map_err(sqlite_error("terminal.tab.restore.persistFailed"))?;

    if changed == 0 {
        return Err(terminal_tab_not_found(workspace_id, tab_id));
    }

    terminal_tab_by_id_from_connection(&connection, workspace_id, tab_id)?
        .ok_or_else(|| terminal_tab_not_found(workspace_id, tab_id))
}

pub fn update_terminal_tab(
    app_data_dir: &Path,
    workspace_id: &str,
    tab_id: &str,
    label: Option<String>,
    is_pinned: Option<bool>,
    sort_index: Option<i32>,
) -> Result<TerminalTabProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_terminal_tab_id(tab_id)?;

    let connection = open_terminal_tab_connection(app_data_dir, workspace_id)?;
    let current = terminal_tab_by_id_from_connection(&connection, workspace_id, tab_id)?
        .ok_or_else(|| terminal_tab_not_found(workspace_id, tab_id))?;
    let next_label = label.unwrap_or(current.label);
    let next_is_pinned = is_pinned.unwrap_or(current.is_pinned);
    let next_sort_index = sort_index.unwrap_or(current.sort_index);

    if next_sort_index < 0 {
        return Err(AppError::recoverable_error(
            "terminal.tab.order.invalid",
            "终端标签排序无效。",
            "请刷新终端标签后重试。",
            Some(format!("tabId={} sortIndex={}", tab_id, next_sort_index)),
        ));
    }

    let timestamp = now_ms();
    connection
        .execute(
            "UPDATE terminal_tabs
             SET label = ?3, is_pinned = ?4, sort_index = ?5, updated_at_ms = ?6
             WHERE workspace_id = ?1 AND id = ?2",
            params![
                workspace_id,
                tab_id,
                next_label,
                bool_to_i64(next_is_pinned),
                next_sort_index,
                timestamp as i64
            ],
        )
        .map_err(sqlite_error("terminal.tab.update.persistFailed"))?;

    terminal_tab_by_id_from_connection(&connection, workspace_id, tab_id)?
        .ok_or_else(|| terminal_tab_not_found(workspace_id, tab_id))
}

pub fn validate_terminal_tab_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "terminal.tab.database.readOnlyOpenFailed",
                "无法读取终端标签数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    if !table_exists(&connection, "terminal_tabs")? {
        return Ok(());
    }

    list_terminal_tabs_from_connection(&connection, workspace_id).map(|_| ())
}

pub fn terminal_tab_not_found(workspace_id: &str, tab_id: &str) -> AppError {
    AppError::recoverable_error(
        "terminal.tab.notFound",
        "未找到终端标签。",
        "请刷新终端窗口后重试。",
        Some(format!("workspaceId={} tabId={}", workspace_id, tab_id)),
    )
}

fn open_terminal_tab_connection(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<Connection, AppError> {
    let connection = open_workspace_database(app_data_dir, workspace_id)?;
    apply_terminal_tabs_migration(&connection)?;

    Ok(connection)
}

fn apply_terminal_tabs_migration(connection: &Connection) -> Result<(), AppError> {
    if !table_exists(connection, "terminal_tabs")? {
        connection
            .execute_batch(TERMINAL_TABS_MIGRATION_SQL)
            .map_err(sqlite_error("terminal.tab.migration.failed"))?;
    } else {
        record_migration(connection, "202605121900__terminal_tabs")?;
    }

    Ok(())
}

fn insert_terminal_tab(connection: &Connection, tab: &TerminalTabProfile) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO terminal_tabs (
                id, workspace_id, terminal_session_id, member_id, label, shell,
                status, is_pinned, sort_index, created_at_ms, updated_at_ms, closed_at_ms
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                tab.tab_id,
                tab.workspace_id,
                tab.terminal_session_id,
                tab.member_id,
                tab.label,
                tab.shell,
                terminal_tab_status_to_str(&tab.status),
                bool_to_i64(tab.is_pinned),
                tab.sort_index,
                tab.created_at_ms as i64,
                tab.updated_at_ms as i64,
                tab.closed_at_ms.map(|value| value as i64),
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("terminal.tab.insertFailed"))
}

fn list_terminal_tabs_from_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<TerminalTabProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, terminal_session_id, member_id, label, shell,
                    status, is_pinned, sort_index, created_at_ms, updated_at_ms, closed_at_ms
             FROM terminal_tabs
             WHERE workspace_id = ?1
             ORDER BY is_pinned DESC, sort_index ASC, created_at_ms ASC, id ASC",
        )
        .map_err(sqlite_error("terminal.tab.list.prepareFailed"))?;

    let tabs = statement
        .query_map(params![workspace_id], terminal_tab_from_row)
        .map_err(sqlite_error("terminal.tab.list.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("terminal.tab.list.decodeFailed"))?;

    Ok(tabs)
}

fn terminal_tab_by_session(
    connection: &Connection,
    workspace_id: &str,
    terminal_session_id: &str,
) -> Result<Option<TerminalTabProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, terminal_session_id, member_id, label, shell,
                    status, is_pinned, sort_index, created_at_ms, updated_at_ms, closed_at_ms
             FROM terminal_tabs
             WHERE workspace_id = ?1 AND terminal_session_id = ?2
             LIMIT 1",
        )
        .map_err(sqlite_error("terminal.tab.bySession.prepareFailed"))?;

    let mut rows = statement
        .query(params![workspace_id, terminal_session_id])
        .map_err(sqlite_error("terminal.tab.bySession.queryFailed"))?;
    let Some(row) = rows
        .next()
        .map_err(sqlite_error("terminal.tab.bySession.rowFailed"))?
    else {
        return Ok(None);
    };

    terminal_tab_from_row(row)
        .map(Some)
        .map_err(sqlite_error("terminal.tab.bySession.decodeFailed"))
}

fn terminal_tab_by_id_from_connection(
    connection: &Connection,
    workspace_id: &str,
    tab_id: &str,
) -> Result<Option<TerminalTabProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, terminal_session_id, member_id, label, shell,
                    status, is_pinned, sort_index, created_at_ms, updated_at_ms, closed_at_ms
             FROM terminal_tabs
             WHERE workspace_id = ?1 AND id = ?2
             LIMIT 1",
        )
        .map_err(sqlite_error("terminal.tab.byId.prepareFailed"))?;

    let mut rows = statement
        .query(params![workspace_id, tab_id])
        .map_err(sqlite_error("terminal.tab.byId.queryFailed"))?;
    let Some(row) = rows
        .next()
        .map_err(sqlite_error("terminal.tab.byId.rowFailed"))?
    else {
        return Ok(None);
    };

    terminal_tab_from_row(row)
        .map(Some)
        .map_err(sqlite_error("terminal.tab.byId.decodeFailed"))
}

fn next_sort_index(connection: &Connection, workspace_id: &str) -> Result<i32, AppError> {
    let next = connection
        .query_row(
            "SELECT COALESCE(MAX(sort_index), -1) + 1 FROM terminal_tabs WHERE workspace_id = ?1",
            params![workspace_id],
            |row| row.get::<_, i32>(0),
        )
        .map_err(sqlite_error("terminal.tab.nextSortIndex.failed"))?;

    Ok(next)
}

fn terminal_tab_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TerminalTabProfile> {
    let status = row.get::<_, String>(6)?;
    Ok(TerminalTabProfile {
        schema_version: 1,
        tab_id: row.get(0)?,
        workspace_id: row.get(1)?,
        terminal_session_id: row.get(2)?,
        member_id: row.get(3)?,
        label: row.get(4)?,
        shell: row.get(5)?,
        status: terminal_tab_status_from_str(&status),
        is_pinned: row.get::<_, i64>(7)? != 0,
        sort_index: row.get(8)?,
        created_at_ms: row.get::<_, i64>(9)? as u64,
        updated_at_ms: row.get::<_, i64>(10)? as u64,
        closed_at_ms: row.get::<_, Option<i64>>(11)?.map(|value| value as u64),
    })
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1")
        .map_err(sqlite_error("terminal.tab.tableExists.prepareFailed"))?;
    statement
        .exists(params![table_name])
        .map_err(sqlite_error("terminal.tab.tableExists.queryFailed"))
}

fn record_migration(connection: &Connection, version: &str) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms) VALUES (?1, ?2)",
            params![version, now_ms() as i64],
        )
        .map(|_| ())
        .map_err(sqlite_error("terminal.tab.migration.recordFailed"))
}

fn terminal_tab_status_to_str(status: &TerminalTabStatus) -> &'static str {
    match status {
        TerminalTabStatus::Open => "open",
        TerminalTabStatus::Closed => "closed",
    }
}

fn terminal_tab_status_from_str(value: &str) -> TerminalTabStatus {
    match value {
        "closed" => TerminalTabStatus::Closed,
        _ => TerminalTabStatus::Open,
    }
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{
        close_terminal_tab, create_terminal_tab, list_terminal_tabs, restore_terminal_tab,
        terminal_tab_by_id, update_terminal_tab,
    };
    use crate::contracts::{TerminalTabProfile, TerminalTabStatus};

    const WORKSPACE_ID: &str = "01K00000000000000000000000";

    #[test]
    fn creates_and_lists_tabs_with_deterministic_pinned_order() {
        let app_data = tempdir().expect("app data");
        let unpinned = tab(
            "01K00000000000000000000080",
            "01K00000000000000000000090",
            "Beta",
            false,
            1,
        );
        let pinned = tab(
            "01K00000000000000000000081",
            "01K00000000000000000000091",
            "Alpha",
            true,
            0,
        );

        create_terminal_tab(app_data.path(), unpinned.clone()).expect("unpinned tab");
        create_terminal_tab(app_data.path(), pinned.clone()).expect("pinned tab");

        let tabs = list_terminal_tabs(app_data.path(), WORKSPACE_ID).expect("tabs");

        assert_eq!(tabs.len(), 2);
        assert_eq!(tabs[0].tab_id, pinned.tab_id);
        assert_eq!(tabs[1].tab_id, unpinned.tab_id);

        let persisted = terminal_tab_by_id(app_data.path(), WORKSPACE_ID, &pinned.tab_id)
            .expect("persisted tab");
        assert_eq!(persisted.label, "Alpha");
        assert!(persisted.is_pinned);
    }

    #[test]
    fn closes_restores_and_updates_tabs_without_deleting_metadata() {
        let app_data = tempdir().expect("app data");
        let created = create_terminal_tab(
            app_data.path(),
            tab(
                "01K00000000000000000000082",
                "01K00000000000000000000092",
                "Shell",
                false,
                0,
            ),
        )
        .expect("created tab");

        let closed =
            close_terminal_tab(app_data.path(), WORKSPACE_ID, &created.tab_id).expect("closed tab");
        assert_eq!(closed.status, TerminalTabStatus::Closed);
        assert!(closed.closed_at_ms.is_some());

        let restored = restore_terminal_tab(
            app_data.path(),
            WORKSPACE_ID,
            &created.tab_id,
            "01K00000000000000000000093",
        )
        .expect("restored tab");
        assert_eq!(restored.status, TerminalTabStatus::Open);
        assert_eq!(restored.terminal_session_id, "01K00000000000000000000093");
        assert_eq!(restored.closed_at_ms, None);

        let updated = update_terminal_tab(
            app_data.path(),
            WORKSPACE_ID,
            &created.tab_id,
            Some("Renamed".to_owned()),
            Some(true),
            Some(2),
        )
        .expect("updated tab");
        assert_eq!(updated.label, "Renamed");
        assert!(updated.is_pinned);
        assert_eq!(updated.sort_index, 2);
    }

    #[test]
    fn rejects_invalid_tab_ids_and_negative_sort_indexes() {
        let app_data = tempdir().expect("app data");
        let created = create_terminal_tab(
            app_data.path(),
            tab(
                "01K00000000000000000000083",
                "01K00000000000000000000094",
                "Shell",
                false,
                0,
            ),
        )
        .expect("created tab");

        let invalid = terminal_tab_by_id(app_data.path(), WORKSPACE_ID, "bad-tab")
            .expect_err("invalid tab id rejected");
        assert_eq!(invalid.code, "terminal.tab.invalidId");

        let invalid_order = update_terminal_tab(
            app_data.path(),
            WORKSPACE_ID,
            &created.tab_id,
            None,
            None,
            Some(-1),
        )
        .expect_err("negative sort index rejected");
        assert_eq!(invalid_order.code, "terminal.tab.order.invalid");
    }

    fn tab(
        tab_id: &str,
        terminal_session_id: &str,
        label: &str,
        is_pinned: bool,
        sort_index: i32,
    ) -> TerminalTabProfile {
        TerminalTabProfile {
            schema_version: 1,
            tab_id: tab_id.to_owned(),
            workspace_id: WORKSPACE_ID.to_owned(),
            terminal_session_id: terminal_session_id.to_owned(),
            member_id: None,
            label: label.to_owned(),
            shell: "zsh".to_owned(),
            status: TerminalTabStatus::Open,
            is_pinned,
            sort_index,
            created_at_ms: 1_760_000_000_000 + sort_index as u64,
            updated_at_ms: 1_760_000_000_001 + sort_index as u64,
            closed_at_ms: None,
        }
    }
}
