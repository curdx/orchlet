use std::path::Path;

use rusqlite::{params, Connection};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, DispatchFailureProfile, DispatchRequestProfile, DispatchRequestStatus,
        DispatchTargetResolutionProfile, DispatchTargetResolutionSource,
    },
    domain::{
        member::validate_workspace_id,
        orchestration::{target_resolution_from_parts, DISPATCH_SCHEMA_VERSION},
    },
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms,
        sqlite::workspace_database::{open_workspace_database, sqlite_error},
    },
};

const DISPATCH_REQUESTS_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605122000__dispatch_requests.sql");

pub fn create_pending_dispatch(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
    target_resolution: &DispatchTargetResolutionProfile,
) -> Result<DispatchRequestProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    let connection = open_dispatch_connection(app_data_dir, workspace_id)?;
    let timestamp = now_ms();
    let dispatch = DispatchRequestProfile {
        schema_version: DISPATCH_SCHEMA_VERSION,
        dispatch_request_id: Ulid::new().to_string(),
        workspace_id: workspace_id.to_owned(),
        conversation_id: conversation_id.to_owned(),
        message_id: message_id.to_owned(),
        member_id: target_resolution.member_id.clone(),
        target_resolution: target_resolution.clone(),
        status: DispatchRequestStatus::Pending,
        terminal_session_id: None,
        failure: None,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    insert_dispatch(&connection, &dispatch)?;

    Ok(dispatch)
}

pub fn mark_dispatch_dispatched(
    app_data_dir: &Path,
    dispatch: &DispatchRequestProfile,
    terminal_session_id: &str,
) -> Result<DispatchRequestProfile, AppError> {
    let connection = open_dispatch_connection(app_data_dir, &dispatch.workspace_id)?;
    let timestamp = now_ms().max(dispatch.updated_at_ms);

    connection
        .execute(
            "UPDATE dispatch_requests
             SET status = ?1,
                 terminal_session_id = ?2,
                 failure_code = NULL,
                 failure_message = NULL,
                 failure_user_action = NULL,
                 failure_details = NULL,
                 updated_at_ms = ?3
             WHERE workspace_id = ?4 AND id = ?5",
            params![
                dispatch_status_to_str(&DispatchRequestStatus::Dispatched),
                terminal_session_id,
                timestamp as i64,
                dispatch.workspace_id,
                dispatch.dispatch_request_id,
            ],
        )
        .map_err(sqlite_error("dispatch.update.dispatchedFailed"))?;

    dispatch_by_id(
        &connection,
        &dispatch.workspace_id,
        &dispatch.dispatch_request_id,
    )
}

pub fn mark_dispatch_failed(
    app_data_dir: &Path,
    dispatch: &DispatchRequestProfile,
    error: &AppError,
) -> Result<DispatchRequestProfile, AppError> {
    let connection = open_dispatch_connection(app_data_dir, &dispatch.workspace_id)?;
    let timestamp = now_ms().max(dispatch.updated_at_ms);
    let failure = dispatch_failure_from_error(error);

    connection
        .execute(
            "UPDATE dispatch_requests
             SET status = ?1,
                 terminal_session_id = NULL,
                 failure_code = ?2,
                 failure_message = ?3,
                 failure_user_action = ?4,
                 failure_details = ?5,
                 updated_at_ms = ?6
             WHERE workspace_id = ?7 AND id = ?8",
            params![
                dispatch_status_to_str(&DispatchRequestStatus::Failed),
                failure.code,
                failure.message,
                failure.user_action,
                failure.details,
                timestamp as i64,
                dispatch.workspace_id,
                dispatch.dispatch_request_id,
            ],
        )
        .map_err(sqlite_error("dispatch.update.failedFailed"))?;

    dispatch_by_id(
        &connection,
        &dispatch.workspace_id,
        &dispatch.dispatch_request_id,
    )
}

pub fn dispatches_for_message(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
) -> Result<Vec<DispatchRequestProfile>, AppError> {
    let connection = open_dispatch_connection(app_data_dir, workspace_id)?;
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, conversation_id, message_id, member_id,
                    target_source, target_reason, status,
                    terminal_session_id, failure_code, failure_message,
                    failure_user_action, failure_details, created_at_ms, updated_at_ms
             FROM dispatch_requests
             WHERE workspace_id = ?1 AND conversation_id = ?2 AND message_id = ?3
             ORDER BY created_at_ms DESC, id DESC",
        )
        .map_err(sqlite_error("dispatch.list.prepareFailed"))?;

    let dispatches = statement
        .query_map(
            params![workspace_id, conversation_id, message_id],
            dispatch_from_row,
        )
        .map_err(sqlite_error("dispatch.list.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("dispatch.list.decodeFailed"))?;

    Ok(dispatches)
}

pub fn dispatch_failure_from_error(error: &AppError) -> DispatchFailureProfile {
    DispatchFailureProfile {
        code: error.code.clone(),
        message: error.message.clone(),
        user_action: error
            .user_action
            .clone()
            .unwrap_or_else(|| "请修复问题后重试派发。".to_owned()),
        details: error.details.clone(),
    }
}

fn open_dispatch_connection(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<Connection, AppError> {
    let connection = open_workspace_database(app_data_dir, workspace_id)?;
    connection
        .execute_batch(DISPATCH_REQUESTS_MIGRATION_SQL)
        .map_err(sqlite_error("dispatch.migration.failed"))?;
    apply_dispatch_target_resolution_migration(&connection)?;

    Ok(connection)
}

fn insert_dispatch(
    connection: &Connection,
    dispatch: &DispatchRequestProfile,
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO dispatch_requests (
                id, workspace_id, conversation_id, message_id, member_id,
                target_source, target_reason, status, terminal_session_id,
                failure_code, failure_message, failure_user_action, failure_details,
                created_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                dispatch.dispatch_request_id,
                dispatch.workspace_id,
                dispatch.conversation_id,
                dispatch.message_id,
                dispatch.member_id,
                target_source_to_str(&dispatch.target_resolution.source),
                dispatch.target_resolution.reason,
                dispatch_status_to_str(&dispatch.status),
                dispatch.terminal_session_id,
                dispatch
                    .failure
                    .as_ref()
                    .map(|failure| failure.code.as_str()),
                dispatch
                    .failure
                    .as_ref()
                    .map(|failure| failure.message.as_str()),
                dispatch
                    .failure
                    .as_ref()
                    .map(|failure| failure.user_action.as_str()),
                dispatch
                    .failure
                    .as_ref()
                    .and_then(|failure| failure.details.as_deref()),
                dispatch.created_at_ms as i64,
                dispatch.updated_at_ms as i64,
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("dispatch.insert.failed"))
}

pub fn create_queued_dispatch(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
    target_resolution: &DispatchTargetResolutionProfile,
) -> Result<DispatchRequestProfile, AppError> {
    create_dispatch_with_status(
        app_data_dir,
        workspace_id,
        conversation_id,
        message_id,
        target_resolution,
        DispatchRequestStatus::Queued,
    )
}

pub fn create_skipped_dispatch(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
    target_resolution: &DispatchTargetResolutionProfile,
) -> Result<DispatchRequestProfile, AppError> {
    create_dispatch_with_status(
        app_data_dir,
        workspace_id,
        conversation_id,
        message_id,
        target_resolution,
        DispatchRequestStatus::Skipped,
    )
}

pub fn oldest_queued_dispatch_for_member(
    app_data_dir: &Path,
    workspace_id: &str,
    member_id: &str,
) -> Result<Option<DispatchRequestProfile>, AppError> {
    let connection = open_dispatch_connection(app_data_dir, workspace_id)?;
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, conversation_id, message_id, member_id,
                    target_source, target_reason, status,
                    terminal_session_id, failure_code, failure_message,
                    failure_user_action, failure_details, created_at_ms, updated_at_ms
             FROM dispatch_requests
             WHERE workspace_id = ?1 AND member_id = ?2 AND status = ?3
             ORDER BY created_at_ms ASC, id ASC
             LIMIT 1",
        )
        .map_err(sqlite_error("dispatch.queue.get.prepareFailed"))?;

    match statement.query_row(
        params![
            workspace_id,
            member_id,
            dispatch_status_to_str(&DispatchRequestStatus::Queued)
        ],
        dispatch_from_row,
    ) {
        Ok(dispatch) => Ok(Some(dispatch)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(sqlite_error("dispatch.queue.get.queryFailed")(error)),
    }
}

pub fn queued_dispatch_count_for_member(
    app_data_dir: &Path,
    workspace_id: &str,
    member_id: &str,
) -> Result<u32, AppError> {
    let connection = open_dispatch_connection(app_data_dir, workspace_id)?;
    let count = connection
        .query_row(
            "SELECT COUNT(*)
             FROM dispatch_requests
             WHERE workspace_id = ?1 AND member_id = ?2 AND status = ?3",
            params![
                workspace_id,
                member_id,
                dispatch_status_to_str(&DispatchRequestStatus::Queued)
            ],
            |row| row.get::<_, i64>(0),
        )
        .map_err(sqlite_error("dispatch.queue.countFailed"))?;

    Ok(count.max(0) as u32)
}

fn create_dispatch_with_status(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
    target_resolution: &DispatchTargetResolutionProfile,
    status: DispatchRequestStatus,
) -> Result<DispatchRequestProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    let connection = open_dispatch_connection(app_data_dir, workspace_id)?;
    let timestamp = now_ms();
    let dispatch = DispatchRequestProfile {
        schema_version: DISPATCH_SCHEMA_VERSION,
        dispatch_request_id: Ulid::new().to_string(),
        workspace_id: workspace_id.to_owned(),
        conversation_id: conversation_id.to_owned(),
        message_id: message_id.to_owned(),
        member_id: target_resolution.member_id.clone(),
        target_resolution: target_resolution.clone(),
        status,
        terminal_session_id: None,
        failure: None,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    insert_dispatch(&connection, &dispatch)?;

    Ok(dispatch)
}

fn dispatch_by_id(
    connection: &Connection,
    workspace_id: &str,
    dispatch_request_id: &str,
) -> Result<DispatchRequestProfile, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, conversation_id, message_id, member_id,
                    target_source, target_reason, status,
                    terminal_session_id, failure_code, failure_message,
                    failure_user_action, failure_details, created_at_ms, updated_at_ms
             FROM dispatch_requests
             WHERE workspace_id = ?1 AND id = ?2",
        )
        .map_err(sqlite_error("dispatch.get.prepareFailed"))?;

    statement
        .query_row(
            params![workspace_id, dispatch_request_id],
            dispatch_from_row,
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::recoverable_error(
                "dispatch.get.notFound",
                "未找到派发请求。",
                "请刷新消息后重试。",
                Some(format!("dispatchRequestId={}", dispatch_request_id)),
            ),
            _ => sqlite_error("dispatch.get.queryFailed")(error),
        })
}

fn dispatch_from_row(row: &rusqlite::Row<'_>) -> Result<DispatchRequestProfile, rusqlite::Error> {
    let target_resolution = target_resolution_from_parts(
        row.get(4)?,
        target_source_from_str(row.get::<_, String>(5)?.as_str()),
        row.get(6)?,
    );
    let failure_code: Option<String> = row.get(9)?;
    let failure_message: Option<String> = row.get(10)?;
    let failure_user_action: Option<String> = row.get(11)?;
    let failure_details: Option<String> = row.get(12)?;
    let failure = match (failure_code, failure_message, failure_user_action) {
        (Some(code), Some(message), Some(user_action)) => Some(DispatchFailureProfile {
            code,
            message,
            user_action,
            details: failure_details,
        }),
        _ => None,
    };

    Ok(DispatchRequestProfile {
        schema_version: DISPATCH_SCHEMA_VERSION,
        dispatch_request_id: row.get(0)?,
        workspace_id: row.get(1)?,
        conversation_id: row.get(2)?,
        message_id: row.get(3)?,
        member_id: target_resolution.member_id.clone(),
        target_resolution,
        status: dispatch_status_from_str(row.get::<_, String>(7)?.as_str()),
        terminal_session_id: row.get(8)?,
        failure,
        created_at_ms: row.get::<_, i64>(13)? as u64,
        updated_at_ms: row.get::<_, i64>(14)? as u64,
    })
}

fn apply_dispatch_target_resolution_migration(connection: &Connection) -> Result<(), AppError> {
    let has_target_source = dispatch_column_exists(connection, "target_source")?;
    let has_target_reason = dispatch_column_exists(connection, "target_reason")?;

    if !has_target_source {
        connection
            .execute(
                "ALTER TABLE dispatch_requests ADD COLUMN target_source TEXT NOT NULL DEFAULT 'user_selected'",
                [],
            )
            .map_err(sqlite_error("dispatch.targetMigration.sourceFailed"))?;
    }

    if !has_target_reason {
        connection
            .execute(
                "ALTER TABLE dispatch_requests ADD COLUMN target_reason TEXT NOT NULL DEFAULT 'Existing dispatch target.'",
                [],
            )
            .map_err(sqlite_error("dispatch.targetMigration.reasonFailed"))?;
    }

    Ok(())
}

fn dispatch_column_exists(connection: &Connection, column_name: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("PRAGMA table_info(dispatch_requests)")
        .map_err(sqlite_error("dispatch.tableInfo.prepareFailed"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(sqlite_error("dispatch.tableInfo.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("dispatch.tableInfo.decodeFailed"))?;

    Ok(columns.iter().any(|column| column == column_name))
}

fn dispatch_status_to_str(status: &DispatchRequestStatus) -> &'static str {
    match status {
        DispatchRequestStatus::Pending => "pending",
        DispatchRequestStatus::Queued => "queued",
        DispatchRequestStatus::Skipped => "skipped",
        DispatchRequestStatus::Dispatched => "dispatched",
        DispatchRequestStatus::Failed => "failed",
    }
}

fn dispatch_status_from_str(value: &str) -> DispatchRequestStatus {
    match value {
        "queued" => DispatchRequestStatus::Queued,
        "skipped" => DispatchRequestStatus::Skipped,
        "dispatched" => DispatchRequestStatus::Dispatched,
        "failed" => DispatchRequestStatus::Failed,
        "pending" => DispatchRequestStatus::Pending,
        _ => DispatchRequestStatus::Failed,
    }
}

fn target_source_to_str(source: &DispatchTargetResolutionSource) -> &'static str {
    match source {
        DispatchTargetResolutionSource::UserSelected => "user_selected",
        DispatchTargetResolutionSource::ExplicitMention => "explicit_mention",
        DispatchTargetResolutionSource::PrivateConversation => "private_conversation",
        DispatchTargetResolutionSource::ConversationDefault => "conversation_default",
        DispatchTargetResolutionSource::WorkspaceDefault => "workspace_default",
    }
}

fn target_source_from_str(value: &str) -> DispatchTargetResolutionSource {
    match value {
        "explicit_mention" => DispatchTargetResolutionSource::ExplicitMention,
        "private_conversation" => DispatchTargetResolutionSource::PrivateConversation,
        "conversation_default" => DispatchTargetResolutionSource::ConversationDefault,
        "workspace_default" => DispatchTargetResolutionSource::WorkspaceDefault,
        _ => DispatchTargetResolutionSource::UserSelected,
    }
}
