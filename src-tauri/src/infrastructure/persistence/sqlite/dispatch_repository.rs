use std::path::Path;

use rusqlite::{params, Connection};
use ulid::Ulid;

use crate::{
    contracts::{AppError, DispatchFailureProfile, DispatchRequestProfile, DispatchRequestStatus},
    domain::{member::validate_workspace_id, orchestration::DISPATCH_SCHEMA_VERSION},
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
    member_id: &str,
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
        member_id: member_id.to_owned(),
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
            "SELECT id, workspace_id, conversation_id, message_id, member_id, status,
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

    Ok(connection)
}

fn insert_dispatch(
    connection: &Connection,
    dispatch: &DispatchRequestProfile,
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO dispatch_requests (
                id, workspace_id, conversation_id, message_id, member_id, status,
                terminal_session_id, failure_code, failure_message, failure_user_action,
                failure_details, created_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                dispatch.dispatch_request_id,
                dispatch.workspace_id,
                dispatch.conversation_id,
                dispatch.message_id,
                dispatch.member_id,
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

fn dispatch_by_id(
    connection: &Connection,
    workspace_id: &str,
    dispatch_request_id: &str,
) -> Result<DispatchRequestProfile, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, conversation_id, message_id, member_id, status,
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
    let failure_code: Option<String> = row.get(7)?;
    let failure_message: Option<String> = row.get(8)?;
    let failure_user_action: Option<String> = row.get(9)?;
    let failure_details: Option<String> = row.get(10)?;
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
        member_id: row.get(4)?,
        status: dispatch_status_from_str(row.get::<_, String>(5)?.as_str()),
        terminal_session_id: row.get(6)?,
        failure,
        created_at_ms: row.get::<_, i64>(11)? as u64,
        updated_at_ms: row.get::<_, i64>(12)? as u64,
    })
}

fn dispatch_status_to_str(status: &DispatchRequestStatus) -> &'static str {
    match status {
        DispatchRequestStatus::Pending => "pending",
        DispatchRequestStatus::Dispatched => "dispatched",
        DispatchRequestStatus::Failed => "failed",
    }
}

fn dispatch_status_from_str(value: &str) -> DispatchRequestStatus {
    match value {
        "dispatched" => DispatchRequestStatus::Dispatched,
        "failed" => DispatchRequestStatus::Failed,
        "pending" => DispatchRequestStatus::Pending,
        _ => DispatchRequestStatus::Failed,
    }
}
