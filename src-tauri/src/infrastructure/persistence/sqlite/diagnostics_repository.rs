use std::path::Path;

use rusqlite::{params, Connection, OpenFlags};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, CompleteDiagnosticsRunRequest, CompleteDiagnosticsRunResult,
        DiagnosticsConsistencyScope, DiagnosticsCorrelationIds, DiagnosticsEventProfile,
        DiagnosticsEventScope, DiagnosticsEventSeverity, DiagnosticsIssueAffectedEntities,
        DiagnosticsIssueProfile, DiagnosticsMetadataEntry, DiagnosticsRunOutcome,
        DiagnosticsRunProfile, DiagnosticsRunStatus, ListDiagnosticsEventsRequest,
        ListDiagnosticsEventsResult, RecordDiagnosticsEventRequest, RecordDiagnosticsEventResult,
        RunChatConsistencyDiagnosticsRequest, RunChatConsistencyDiagnosticsResult,
        StartDiagnosticsRunRequest, StartDiagnosticsRunResult,
    },
    domain::{
        diagnostics::{
            build_diagnostics_issue, metadata_entry, normalize_diagnostics_label,
            normalize_diagnostics_summary, normalize_record_event_request,
            validate_diagnostics_run_id,
        },
        member::validate_workspace_id,
    },
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms,
        sqlite::workspace_database::{
            open_workspace_database, sqlite_error, workspace_database_path,
        },
    },
};

const DIAGNOSTICS_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605122100__diagnostics_runs.sql");

pub fn start_diagnostics_run(
    app_data_dir: &Path,
    request: StartDiagnosticsRunRequest,
) -> Result<StartDiagnosticsRunResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let reason = normalize_diagnostics_label(request.reason, "诊断 run 说明")?;
    let initiated_by = normalize_diagnostics_label(request.initiated_by, "诊断 run 发起方")?;
    let mut connection = open_diagnostics_connection(app_data_dir, &request.workspace_id)?;
    let transaction = connection.transaction().map_err(diagnostics_sqlite_error(
        "diagnostics.run.transactionBeginFailed",
        &request.workspace_id,
    ))?;

    if active_run_exists(&transaction, &request.workspace_id)? {
        return Err(AppError::recoverable_error(
            "diagnostics.run.activeExists",
            "当前工作区已有正在记录的诊断 run。",
            "请先完成当前诊断 run，或复用当前 run 继续记录。",
            Some(format!("workspaceId={}", request.workspace_id)),
        ));
    }

    let timestamp = now_ms();
    let run = DiagnosticsRunProfile {
        run_id: Ulid::new().to_string(),
        workspace_id: request.workspace_id.clone(),
        status: DiagnosticsRunStatus::Active,
        reason,
        initiated_by,
        outcome: None,
        summary: None,
        started_at_ms: timestamp,
        completed_at_ms: None,
        updated_at_ms: timestamp,
    };
    insert_run(&transaction, &run)?;
    let start_event = insert_event(
        &transaction,
        &run,
        DiagnosticsEventScope::Backend,
        "diagnostics.run.started",
        DiagnosticsEventSeverity::Info,
        DiagnosticsCorrelationIds {
            workspace_id: Some(run.workspace_id.clone()),
            ..DiagnosticsCorrelationIds::default()
        },
        vec![DiagnosticsMetadataEntry {
            key: "status".to_owned(),
            value: "active".to_owned(),
        }],
        timestamp,
    )?;
    transaction.commit().map_err(diagnostics_sqlite_error(
        "diagnostics.run.transactionCommitFailed",
        &request.workspace_id,
    ))?;

    Ok(StartDiagnosticsRunResult { run, start_event })
}

pub fn complete_diagnostics_run(
    app_data_dir: &Path,
    request: CompleteDiagnosticsRunRequest,
) -> Result<CompleteDiagnosticsRunResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_diagnostics_run_id(&request.run_id)?;
    let summary = normalize_diagnostics_summary(request.summary)?;
    let mut connection = open_diagnostics_connection(app_data_dir, &request.workspace_id)?;
    let transaction = connection.transaction().map_err(diagnostics_sqlite_error(
        "diagnostics.run.transactionBeginFailed",
        &request.workspace_id,
    ))?;
    let current_run = run_by_id(&transaction, &request.workspace_id, &request.run_id)?;
    if current_run.status == DiagnosticsRunStatus::Completed {
        transaction.commit().map_err(diagnostics_sqlite_error(
            "diagnostics.run.transactionCommitFailed",
            &request.workspace_id,
        ))?;
        return Ok(CompleteDiagnosticsRunResult {
            run: current_run,
            completion_event: None,
        });
    }

    let timestamp = now_ms().max(current_run.started_at_ms);
    transaction
        .execute(
            "UPDATE diagnostics_runs
             SET status = 'completed',
                 outcome = ?1,
                 summary = ?2,
                 completed_at_ms = ?3,
                 updated_at_ms = ?3
             WHERE workspace_id = ?4 AND id = ?5 AND status = 'active'",
            params![
                run_outcome_to_db(&request.outcome),
                summary,
                timestamp as i64,
                request.workspace_id,
                request.run_id,
            ],
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.run.completeFailed",
            &request.workspace_id,
        ))?;
    let run = run_by_id(&transaction, &request.workspace_id, &request.run_id)?;
    let completion_event = insert_event(
        &transaction,
        &run,
        DiagnosticsEventScope::Backend,
        "diagnostics.run.completed",
        DiagnosticsEventSeverity::Info,
        DiagnosticsCorrelationIds {
            workspace_id: Some(run.workspace_id.clone()),
            ..DiagnosticsCorrelationIds::default()
        },
        vec![DiagnosticsMetadataEntry {
            key: "outcome".to_owned(),
            value: run
                .outcome
                .as_ref()
                .map(run_outcome_to_db)
                .unwrap_or("completed")
                .to_owned(),
        }],
        timestamp,
    )?;
    transaction.commit().map_err(diagnostics_sqlite_error(
        "diagnostics.run.transactionCommitFailed",
        &request.workspace_id,
    ))?;

    Ok(CompleteDiagnosticsRunResult {
        run,
        completion_event: Some(completion_event),
    })
}

pub fn record_diagnostics_event(
    app_data_dir: &Path,
    request: RecordDiagnosticsEventRequest,
) -> Result<RecordDiagnosticsEventResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let request = normalize_record_event_request(request)?;
    let connection = open_diagnostics_connection(app_data_dir, &request.workspace_id)?;
    let run = match request.run_id.as_deref() {
        Some(run_id) => {
            validate_diagnostics_run_id(run_id)?;
            let run = run_by_id(&connection, &request.workspace_id, run_id)?;
            if run.status != DiagnosticsRunStatus::Active {
                return Err(AppError::recoverable_error(
                    "diagnostics.run.completed",
                    "诊断 run 已完成，不能继续写入事件。",
                    "请开始新的诊断 run 后重试。",
                    Some(format!(
                        "workspaceId={} runId={}",
                        request.workspace_id, run_id
                    )),
                ));
            }
            Some(run)
        }
        None => active_run(&connection, &request.workspace_id)?,
    };

    let Some(run) = run else {
        return Ok(RecordDiagnosticsEventResult {
            recorded: false,
            skipped_reason: Some("diagnostics disabled".to_owned()),
            event: None,
        });
    };

    let event = insert_event(
        &connection,
        &run,
        request.scope,
        &request.event_name,
        request.severity,
        request.correlations,
        request.metadata,
        now_ms().max(run.started_at_ms),
    )?;

    Ok(RecordDiagnosticsEventResult {
        recorded: true,
        skipped_reason: None,
        event: Some(event),
    })
}

pub fn list_diagnostics_events(
    app_data_dir: &Path,
    request: ListDiagnosticsEventsRequest,
) -> Result<ListDiagnosticsEventsResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_diagnostics_run_id(&request.run_id)?;
    let connection = open_diagnostics_connection(app_data_dir, &request.workspace_id)?;
    let run = run_by_id(&connection, &request.workspace_id, &request.run_id)?;
    let mut statement = connection
        .prepare(
            "SELECT id, run_id, workspace_id, scope, event_name, severity,
                    conversation_id, message_id, member_id, terminal_session_id,
                    terminal_tab_id, window_label, dispatch_id, metadata_json, recorded_at_ms
             FROM diagnostic_events
             WHERE workspace_id = ?1 AND run_id = ?2
             ORDER BY recorded_at_ms ASC, id ASC",
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.events.prepareFailed",
            &request.workspace_id,
        ))?;
    let events = statement
        .query_map(
            params![request.workspace_id, request.run_id],
            event_from_row,
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.events.queryFailed",
            &run.workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(diagnostics_sqlite_error(
            "diagnostics.events.decodeFailed",
            &run.workspace_id,
        ))?;

    Ok(ListDiagnosticsEventsResult { run, events })
}

pub fn list_diagnostics_runs_page(
    app_data_dir: &Path,
    workspace_id: &str,
    limit: u32,
    offset: u32,
) -> Result<(Vec<DiagnosticsRunProfile>, bool), AppError> {
    validate_workspace_id(workspace_id)?;
    let connection = open_diagnostics_connection(app_data_dir, workspace_id)?;
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, status, reason, initiated_by, outcome, summary,
                    started_at_ms, completed_at_ms, updated_at_ms
             FROM diagnostics_runs
             WHERE workspace_id = ?1
             ORDER BY started_at_ms DESC, id DESC
             LIMIT ?2 OFFSET ?3",
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.runs.pagePrepareFailed",
            workspace_id,
        ))?;
    let mut rows = statement
        .query_map(
            params![workspace_id, (limit + 1) as i64, offset as i64],
            run_from_row,
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.runs.pageQueryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(diagnostics_sqlite_error(
            "diagnostics.runs.pageDecodeFailed",
            workspace_id,
        ))?;
    let has_more = rows.len() > limit as usize;
    rows.truncate(limit as usize);

    Ok((rows, has_more))
}

pub fn list_diagnostics_key_events_page(
    app_data_dir: &Path,
    workspace_id: &str,
    limit: u32,
    offset: u32,
) -> Result<(Vec<DiagnosticsEventProfile>, bool), AppError> {
    validate_workspace_id(workspace_id)?;
    let connection = open_diagnostics_connection(app_data_dir, workspace_id)?;
    let mut statement = connection
        .prepare(
            "SELECT id, run_id, workspace_id, scope, event_name, severity,
                    conversation_id, message_id, member_id, terminal_session_id,
                    terminal_tab_id, window_label, dispatch_id, metadata_json, recorded_at_ms
             FROM diagnostic_events
             WHERE workspace_id = ?1
             ORDER BY recorded_at_ms DESC, id DESC
             LIMIT ?2 OFFSET ?3",
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.events.pagePrepareFailed",
            workspace_id,
        ))?;
    let mut rows = statement
        .query_map(
            params![workspace_id, (limit + 1) as i64, offset as i64],
            event_from_row,
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.events.pageQueryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(diagnostics_sqlite_error(
            "diagnostics.events.pageDecodeFailed",
            workspace_id,
        ))?;
    let has_more = rows.len() > limit as usize;
    rows.truncate(limit as usize);

    Ok((rows, has_more))
}

pub fn ensure_active_diagnostics_run(
    app_data_dir: &Path,
    workspace_id: &str,
    run_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    validate_diagnostics_run_id(run_id)?;
    let connection = open_diagnostics_connection(app_data_dir, workspace_id)?;
    let run = run_by_id(&connection, workspace_id, run_id)?;
    if run.status != DiagnosticsRunStatus::Active {
        return Err(AppError::recoverable_error(
            "diagnostics.run.completed",
            "诊断 run 已完成，不能继续写入事件。",
            "请开始新的诊断 run 后重试。",
            Some(format!("workspaceId={workspace_id} runId={run_id}")),
        ));
    }

    Ok(())
}

pub fn run_chat_consistency_diagnostics(
    app_data_dir: &Path,
    request: RunChatConsistencyDiagnosticsRequest,
    checked_at_ms: u64,
) -> Result<RunChatConsistencyDiagnosticsResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, &request.workspace_id);
    if !database_path.exists() {
        return Ok(RunChatConsistencyDiagnosticsResult {
            workspace_id: request.workspace_id,
            run_id: request.run_id,
            checked_at_ms,
            checked_conversation_count: 0,
            checked_message_count: 0,
            checked_dispatch_count: 0,
            issue_count: 0,
            events_recorded: 0,
            issues: Vec::new(),
        });
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "diagnostics.chat.databaseOpenFailed",
                "无法读取聊天一致性诊断数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    let conversations_exist = table_exists(&connection, "conversations")?;
    let messages_exist = table_exists(&connection, "messages")?;
    let mentions_exist = table_exists(&connection, "message_mentions")?;
    let read_positions_exist = table_exists(&connection, "conversation_read_positions")?;
    let members_exist = table_exists(&connection, "members")?;
    let dispatches_exist = table_exists(&connection, "dispatch_requests")?;
    let conversations_have_deleted_at =
        conversations_exist && table_column_exists(&connection, "conversations", "deleted_at_ms")?;

    let checked_conversation_count = if conversations_exist {
        count_workspace_rows(&connection, "conversations", &request.workspace_id)?
    } else {
        0
    };
    let checked_message_count = if messages_exist {
        count_workspace_rows(&connection, "messages", &request.workspace_id)?
    } else {
        0
    };
    let checked_dispatch_count = if dispatches_exist {
        count_workspace_rows(&connection, "dispatch_requests", &request.workspace_id)?
    } else {
        0
    };

    let mut issues = Vec::new();
    if conversations_exist && messages_exist {
        issues.extend(chat_orphan_message_issues(
            &connection,
            &request.workspace_id,
            conversations_have_deleted_at,
        )?);
        issues.extend(chat_invalid_message_status_issues(
            &connection,
            &request.workspace_id,
        )?);
    }
    if conversations_exist && messages_exist && mentions_exist {
        issues.extend(chat_orphan_mention_issues(
            &connection,
            &request.workspace_id,
            conversations_have_deleted_at,
            members_exist,
        )?);
    }
    if conversations_exist && messages_exist && read_positions_exist {
        issues.extend(chat_orphan_read_position_issues(
            &connection,
            &request.workspace_id,
            conversations_have_deleted_at,
        )?);
        issues.extend(chat_unread_mismatch_issues(
            &connection,
            &request.workspace_id,
            conversations_have_deleted_at,
        )?);
    }
    if conversations_exist && messages_exist && dispatches_exist {
        issues.extend(chat_dispatch_issues(
            &connection,
            &request.workspace_id,
            conversations_have_deleted_at,
            members_exist,
        )?);
    }

    Ok(RunChatConsistencyDiagnosticsResult {
        workspace_id: request.workspace_id,
        run_id: request.run_id,
        checked_at_ms,
        checked_conversation_count,
        checked_message_count,
        checked_dispatch_count,
        issue_count: issues.len() as u32,
        events_recorded: 0,
        issues,
    })
}

pub fn record_diagnostics_event_best_effort(
    app_data_dir: &Path,
    request: RecordDiagnosticsEventRequest,
) {
    let _ = record_diagnostics_event(app_data_dir, request);
}

pub fn validate_diagnostics_store(app_data_dir: &Path, workspace_id: &str) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "diagnostics.database.readOnlyOpenFailed",
                "无法读取诊断数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    let runs_table_exists = table_exists(&connection, "diagnostics_runs")?;
    let events_table_exists = table_exists(&connection, "diagnostic_events")?;
    match (runs_table_exists, events_table_exists) {
        (false, false) => return Ok(()),
        (true, false) => {
            return Err(AppError::recoverable_error(
                "diagnostics.events.missing",
                "诊断事件表缺失。",
                "请重新打开工作区以初始化诊断存储；如果问题持续，请运行数据验证。",
                Some(format!("workspaceId={workspace_id}")),
            ));
        }
        (false, true) => {
            return Err(AppError::recoverable_error(
                "diagnostics.runs.missing",
                "诊断 run 表缺失。",
                "请重新打开工作区以初始化诊断存储；如果问题持续，请运行数据验证。",
                Some(format!("workspaceId={workspace_id}")),
            ));
        }
        (true, true) => {}
    }

    connection
        .prepare(
            "SELECT id, workspace_id, status, started_at_ms, updated_at_ms
             FROM diagnostics_runs
             WHERE workspace_id = ?1
             LIMIT 1",
        )
        .and_then(|mut statement| statement.exists(params![workspace_id]))
        .map(|_| ())
        .map_err(sqlite_error("diagnostics.runs.validateFailed"))?;

    connection
        .prepare(
            "SELECT id, run_id, workspace_id, scope, event_name, severity,
                    metadata_json, recorded_at_ms
             FROM diagnostic_events
             WHERE workspace_id = ?1
             LIMIT 1",
        )
        .and_then(|mut statement| statement.exists(params![workspace_id]))
        .map(|_| ())
        .map_err(sqlite_error("diagnostics.events.validateFailed"))
}

fn chat_orphan_message_issues(
    connection: &Connection,
    workspace_id: &str,
    conversations_have_deleted_at: bool,
) -> Result<Vec<DiagnosticsIssueProfile>, AppError> {
    let deleted_filter = if conversations_have_deleted_at {
        " AND conversations.deleted_at_ms IS NULL"
    } else {
        ""
    };
    let sql = format!(
        "SELECT id, conversation_id, author_member_id
         FROM messages
         WHERE workspace_id = ?1
           AND NOT EXISTS (
             SELECT 1 FROM conversations
             WHERE conversations.workspace_id = messages.workspace_id
               AND conversations.id = messages.conversation_id
               {deleted_filter}
           )"
    );
    let mut statement = connection
        .prepare(&sql)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanMessage.prepareFailed",
            workspace_id,
        ))?;
    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanMessage.queryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanMessage.decodeFailed",
            workspace_id,
        ))?;

    Ok(rows
        .into_iter()
        .map(|(message_id, conversation_id, member_id)| {
            chat_issue(
                "chat.orphan.message",
                DiagnosticsEventSeverity::Error,
                "聊天消息引用了不存在或已删除的会话。",
                workspace_id,
                Some(conversation_id),
                Some(message_id),
                Some(member_id),
                None,
                "运行聊天数据修复，或删除孤立消息记录后重新验证。",
                vec![metadata_entry("missing", "conversation")],
            )
        })
        .collect())
}

fn chat_invalid_message_status_issues(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Vec<DiagnosticsIssueProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, conversation_id, author_member_id, send_status
             FROM messages
             WHERE workspace_id = ?1
               AND send_status NOT IN ('sending', 'sent', 'failed')",
        )
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.messageStatus.prepareFailed",
            workspace_id,
        ))?;
    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.messageStatus.queryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.messageStatus.decodeFailed",
            workspace_id,
        ))?;

    Ok(rows
        .into_iter()
        .map(|(message_id, conversation_id, member_id, status)| {
            chat_issue(
                "chat.status.invalid",
                DiagnosticsEventSeverity::Error,
                "聊天消息持久化状态不在已知枚举内。",
                workspace_id,
                Some(conversation_id),
                Some(message_id),
                Some(member_id),
                None,
                "检查写入来源并修复消息状态为 sending、sent 或 failed。",
                vec![metadata_entry("status", status)],
            )
        })
        .collect())
}

fn chat_orphan_mention_issues(
    connection: &Connection,
    workspace_id: &str,
    conversations_have_deleted_at: bool,
    members_exist: bool,
) -> Result<Vec<DiagnosticsIssueProfile>, AppError> {
    let deleted_filter = if conversations_have_deleted_at {
        " AND conversations.deleted_at_ms IS NULL"
    } else {
        ""
    };
    let sql = format!(
        "SELECT message_id, conversation_id, member_id
         FROM message_mentions
         WHERE workspace_id = ?1
           AND (
             NOT EXISTS (
               SELECT 1 FROM messages
               WHERE messages.workspace_id = message_mentions.workspace_id
                 AND messages.conversation_id = message_mentions.conversation_id
                 AND messages.id = message_mentions.message_id
             )
             OR NOT EXISTS (
               SELECT 1 FROM conversations
               WHERE conversations.workspace_id = message_mentions.workspace_id
                 AND conversations.id = message_mentions.conversation_id
                 {deleted_filter}
             )
             {member_clause}
           )",
        member_clause = if members_exist {
            "OR NOT EXISTS (
               SELECT 1 FROM members
               WHERE members.workspace_id = message_mentions.workspace_id
                 AND members.id = message_mentions.member_id
             )"
        } else {
            ""
        }
    );
    let mut statement = connection
        .prepare(&sql)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanMention.prepareFailed",
            workspace_id,
        ))?;
    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanMention.queryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanMention.decodeFailed",
            workspace_id,
        ))?;

    Ok(rows
        .into_iter()
        .map(|(message_id, conversation_id, member_id)| {
            chat_issue(
                "chat.orphan.mention",
                DiagnosticsEventSeverity::Warning,
                "消息提及引用了不存在的消息、会话或成员。",
                workspace_id,
                Some(conversation_id),
                Some(message_id),
                Some(member_id),
                None,
                "运行聊天数据修复以删除孤立提及记录。",
                vec![metadata_entry("record", "message_mentions")],
            )
        })
        .collect())
}

fn chat_orphan_read_position_issues(
    connection: &Connection,
    workspace_id: &str,
    conversations_have_deleted_at: bool,
) -> Result<Vec<DiagnosticsIssueProfile>, AppError> {
    let deleted_filter = if conversations_have_deleted_at {
        " AND conversations.deleted_at_ms IS NULL"
    } else {
        ""
    };
    let sql = format!(
        "SELECT conversation_id, last_read_message_id
         FROM conversation_read_positions
         WHERE workspace_id = ?1
           AND (
             NOT EXISTS (
               SELECT 1 FROM conversations
               WHERE conversations.workspace_id = conversation_read_positions.workspace_id
                 AND conversations.id = conversation_read_positions.conversation_id
                 {deleted_filter}
             )
             OR NOT EXISTS (
               SELECT 1 FROM messages
               WHERE messages.workspace_id = conversation_read_positions.workspace_id
                 AND messages.conversation_id = conversation_read_positions.conversation_id
                 AND messages.id = conversation_read_positions.last_read_message_id
             )
           )"
    );
    let mut statement = connection
        .prepare(&sql)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanReadPosition.prepareFailed",
            workspace_id,
        ))?;
    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanReadPosition.queryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.orphanReadPosition.decodeFailed",
            workspace_id,
        ))?;

    Ok(rows
        .into_iter()
        .map(|(conversation_id, message_id)| {
            chat_issue(
                "chat.orphan.readPosition",
                DiagnosticsEventSeverity::Error,
                "会话已读位置引用了不存在的会话或消息。",
                workspace_id,
                Some(conversation_id),
                Some(message_id),
                None,
                None,
                "运行聊天数据修复以移除无效已读位置并重新计算未读数。",
                vec![metadata_entry("record", "conversation_read_positions")],
            )
        })
        .collect())
}

fn chat_unread_mismatch_issues(
    connection: &Connection,
    workspace_id: &str,
    conversations_have_deleted_at: bool,
) -> Result<Vec<DiagnosticsIssueProfile>, AppError> {
    let sql = if conversations_have_deleted_at {
        "SELECT id, unread_count
         FROM conversations
         WHERE workspace_id = ?1 AND deleted_at_ms IS NULL"
    } else {
        "SELECT id, unread_count
         FROM conversations
         WHERE workspace_id = ?1"
    };
    let mut statement = connection
        .prepare(sql)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.unread.prepareFailed",
            workspace_id,
        ))?;
    let conversations = statement
        .query_map(params![workspace_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?.max(0) as u32,
            ))
        })
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.unread.queryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.unread.decodeFailed",
            workspace_id,
        ))?;

    let mut issues = Vec::new();
    for (conversation_id, stored_unread) in conversations {
        let Some((last_read_at_ms, last_read_message_id)) =
            read_position_for_unread(connection, workspace_id, &conversation_id)?
        else {
            if stored_unread != 0 {
                issues.push(chat_issue(
                    "chat.unread.mismatch",
                    DiagnosticsEventSeverity::Warning,
                    "会话未读数与已读位置重新计算结果不一致。",
                    workspace_id,
                    Some(conversation_id),
                    None,
                    None,
                    None,
                    "运行聊天数据修复以重新计算会话未读数。",
                    vec![
                        metadata_entry("storedUnread", stored_unread.to_string()),
                        metadata_entry("expectedUnread", "0"),
                    ],
                ));
            }
            continue;
        };

        if !message_exists_for_conversation(
            connection,
            workspace_id,
            &conversation_id,
            &last_read_message_id,
        )? {
            continue;
        }

        let expected_unread = unread_count_after(
            connection,
            workspace_id,
            &conversation_id,
            last_read_at_ms,
            &last_read_message_id,
        )?;
        if stored_unread != expected_unread {
            issues.push(chat_issue(
                "chat.unread.mismatch",
                DiagnosticsEventSeverity::Warning,
                "会话未读数与已读位置重新计算结果不一致。",
                workspace_id,
                Some(conversation_id),
                Some(last_read_message_id),
                None,
                None,
                "运行聊天数据修复以重新计算会话未读数。",
                vec![
                    metadata_entry("storedUnread", stored_unread.to_string()),
                    metadata_entry("expectedUnread", expected_unread.to_string()),
                ],
            ));
        }
    }

    Ok(issues)
}

fn chat_dispatch_issues(
    connection: &Connection,
    workspace_id: &str,
    conversations_have_deleted_at: bool,
    members_exist: bool,
) -> Result<Vec<DiagnosticsIssueProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, conversation_id, message_id, source_message_ids_json,
                    member_id, status, terminal_session_id, failure_code, failure_message
             FROM dispatch_requests
             WHERE workspace_id = ?1",
        )
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.dispatch.prepareFailed",
            workspace_id,
        ))?;
    let rows = statement
        .query_map(params![workspace_id], |row| {
            Ok(DispatchDiagnosticsRow {
                dispatch_id: row.get(0)?,
                conversation_id: row.get(1)?,
                message_id: row.get(2)?,
                source_message_ids_json: row.get(3)?,
                member_id: row.get(4)?,
                status: row.get(5)?,
                terminal_session_id: row.get(6)?,
                failure_code: row.get(7)?,
                failure_message: row.get(8)?,
            })
        })
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.dispatch.queryFailed",
            workspace_id,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.dispatch.decodeFailed",
            workspace_id,
        ))?;

    let mut issues = Vec::new();
    for row in rows {
        if !matches!(
            row.status.as_str(),
            "pending" | "queued" | "skipped" | "dispatched" | "failed"
        ) {
            issues.push(dispatch_issue(
                "chat.status.invalid",
                DiagnosticsEventSeverity::Error,
                "派发请求状态不在已知枚举内。",
                workspace_id,
                &row,
                "检查写入来源并修复派发状态。",
                vec![metadata_entry("status", row.status.clone())],
            ));
        }
        if row.status == "dispatched" && row.terminal_session_id.as_deref().unwrap_or("").is_empty()
        {
            issues.push(dispatch_issue(
                "chat.status.invalid",
                DiagnosticsEventSeverity::Error,
                "派发请求标记为已派发但缺少终端会话标识。",
                workspace_id,
                &row,
                "重新派发该消息，或修复派发记录的终端会话标识。",
                vec![metadata_entry("state", "dispatchedMissingSession")],
            ));
        }
        if row.status == "failed"
            && (row.failure_code.as_deref().unwrap_or("").is_empty()
                || row.failure_message.as_deref().unwrap_or("").is_empty())
        {
            issues.push(dispatch_issue(
                "chat.status.invalid",
                DiagnosticsEventSeverity::Warning,
                "派发请求标记为失败但缺少失败详情。",
                workspace_id,
                &row,
                "重试派发以生成新的失败详情，或清理该派发记录。",
                vec![metadata_entry("state", "failedMissingReason")],
            ));
        }
        if !conversation_exists(
            connection,
            workspace_id,
            &row.conversation_id,
            conversations_have_deleted_at,
        )? {
            issues.push(dispatch_issue(
                "chat.orphan.dispatch",
                DiagnosticsEventSeverity::Error,
                "派发请求引用了不存在或已删除的会话。",
                workspace_id,
                &row,
                "运行聊天数据修复以清理孤立派发记录。",
                vec![metadata_entry("missing", "conversation")],
            ));
        }
        if !message_exists_for_conversation(
            connection,
            workspace_id,
            &row.conversation_id,
            &row.message_id,
        )? {
            issues.push(dispatch_issue(
                "chat.orphan.dispatch",
                DiagnosticsEventSeverity::Error,
                "派发请求引用了不存在的消息。",
                workspace_id,
                &row,
                "运行聊天数据修复以清理孤立派发记录。",
                vec![metadata_entry("missing", "message")],
            ));
        }
        if members_exist && !member_exists(connection, workspace_id, &row.member_id)? {
            issues.push(dispatch_issue(
                "chat.orphan.dispatch",
                DiagnosticsEventSeverity::Warning,
                "派发请求引用了不存在的成员。",
                workspace_id,
                &row,
                "检查成员列表并清理无法派发的记录。",
                vec![metadata_entry("missing", "member")],
            ));
        }

        let source_ids = match serde_json::from_str::<Vec<String>>(&row.source_message_ids_json) {
            Ok(source_ids) => source_ids,
            Err(_) => {
                issues.push(dispatch_issue(
                    "chat.status.invalid",
                    DiagnosticsEventSeverity::Error,
                    "派发来源消息列表不是有效 JSON。",
                    workspace_id,
                    &row,
                    "清理该派发记录并重新派发消息。",
                    vec![metadata_entry("field", "sourceMessageIds")],
                ));
                continue;
            }
        };
        for source_message_id in source_ids {
            if source_message_id.trim().is_empty() {
                continue;
            }
            if !message_exists_for_conversation(
                connection,
                workspace_id,
                &row.conversation_id,
                &source_message_id,
            )? {
                issues.push(dispatch_issue(
                    "chat.orphan.dispatch",
                    DiagnosticsEventSeverity::Error,
                    "派发来源消息引用了不存在的消息。",
                    workspace_id,
                    &row,
                    "运行聊天数据修复以清理无效来源消息引用。",
                    vec![metadata_entry("linkedMessageId", source_message_id)],
                ));
            }
        }
    }

    Ok(issues)
}

fn chat_issue(
    code: &str,
    severity: DiagnosticsEventSeverity,
    message: &str,
    workspace_id: &str,
    conversation_id: Option<String>,
    message_id: Option<String>,
    member_id: Option<String>,
    dispatch_id: Option<String>,
    action: &str,
    metadata: Vec<DiagnosticsMetadataEntry>,
) -> DiagnosticsIssueProfile {
    build_diagnostics_issue(
        DiagnosticsConsistencyScope::Chat,
        code,
        severity,
        message,
        DiagnosticsIssueAffectedEntities {
            workspace_id: Some(workspace_id.to_owned()),
            conversation_id,
            message_id,
            member_id,
            dispatch_id,
            ..DiagnosticsIssueAffectedEntities::default()
        },
        Some(action),
        metadata,
    )
}

fn dispatch_issue(
    code: &str,
    severity: DiagnosticsEventSeverity,
    message: &str,
    workspace_id: &str,
    dispatch: &DispatchDiagnosticsRow,
    action: &str,
    metadata: Vec<DiagnosticsMetadataEntry>,
) -> DiagnosticsIssueProfile {
    chat_issue(
        code,
        severity,
        message,
        workspace_id,
        Some(dispatch.conversation_id.clone()),
        Some(dispatch.message_id.clone()),
        Some(dispatch.member_id.clone()),
        Some(dispatch.dispatch_id.clone()),
        action,
        metadata,
    )
}

fn count_workspace_rows(
    connection: &Connection,
    table_name: &str,
    workspace_id: &str,
) -> Result<u32, AppError> {
    let sql = format!("SELECT COUNT(*) FROM {table_name} WHERE workspace_id = ?1");
    connection
        .query_row(&sql, params![workspace_id], |row| row.get::<_, i64>(0))
        .map(|count| count.max(0) as u32)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.countFailed",
            workspace_id,
        ))
}

fn read_position_for_unread(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
) -> Result<Option<(u64, String)>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT messages.created_at_ms, messages.id
             FROM conversation_read_positions
             INNER JOIN messages
               ON messages.workspace_id = conversation_read_positions.workspace_id
              AND messages.conversation_id = conversation_read_positions.conversation_id
              AND messages.id = conversation_read_positions.last_read_message_id
             WHERE conversation_read_positions.workspace_id = ?1
               AND conversation_read_positions.conversation_id = ?2
             LIMIT 1",
        )
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.readPosition.prepareFailed",
            workspace_id,
        ))?;
    match statement.query_row(params![workspace_id, conversation_id], |row| {
        Ok((
            row.get::<_, i64>(0)?.max(0) as u64,
            row.get::<_, String>(1)?,
        ))
    }) {
        Ok(read_position) => Ok(Some(read_position)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.readPosition.queryFailed",
            workspace_id,
        )(error)),
    }
}

fn unread_count_after(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    last_read_at_ms: u64,
    last_read_message_id: &str,
) -> Result<u32, AppError> {
    connection
        .query_row(
            "SELECT COUNT(*)
             FROM messages
             WHERE workspace_id = ?1 AND conversation_id = ?2
               AND (
                 created_at_ms > ?3
                 OR (created_at_ms = ?3 AND id > ?4)
               )",
            params![
                workspace_id,
                conversation_id,
                last_read_at_ms as i64,
                last_read_message_id,
            ],
            |row| row.get::<_, i64>(0),
        )
        .map(|count| count.max(0) as u32)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.unreadCount.queryFailed",
            workspace_id,
        ))
}

fn conversation_exists(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    conversations_have_deleted_at: bool,
) -> Result<bool, AppError> {
    let sql = if conversations_have_deleted_at {
        "SELECT id FROM conversations
         WHERE workspace_id = ?1 AND id = ?2 AND deleted_at_ms IS NULL
         LIMIT 1"
    } else {
        "SELECT id FROM conversations
         WHERE workspace_id = ?1 AND id = ?2
         LIMIT 1"
    };
    connection
        .prepare(sql)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.conversationExists.prepareFailed",
            workspace_id,
        ))?
        .exists(params![workspace_id, conversation_id])
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.conversationExists.queryFailed",
            workspace_id,
        ))
}

fn message_exists_for_conversation(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
) -> Result<bool, AppError> {
    connection
        .prepare(
            "SELECT id FROM messages
             WHERE workspace_id = ?1 AND conversation_id = ?2 AND id = ?3
             LIMIT 1",
        )
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.messageExists.prepareFailed",
            workspace_id,
        ))?
        .exists(params![workspace_id, conversation_id, message_id])
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.messageExists.queryFailed",
            workspace_id,
        ))
}

fn member_exists(
    connection: &Connection,
    workspace_id: &str,
    member_id: &str,
) -> Result<bool, AppError> {
    connection
        .prepare(
            "SELECT id FROM members
             WHERE workspace_id = ?1 AND id = ?2
             LIMIT 1",
        )
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.memberExists.prepareFailed",
            workspace_id,
        ))?
        .exists(params![workspace_id, member_id])
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.memberExists.queryFailed",
            workspace_id,
        ))
}

fn table_column_exists(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
) -> Result<bool, AppError> {
    let sql = format!("PRAGMA table_info({table_name})");
    let mut statement = connection
        .prepare(&sql)
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.tableInfo.prepareFailed",
            table_name,
        ))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.tableInfo.queryFailed",
            table_name,
        ))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(chat_diagnostics_sqlite_error(
            "diagnostics.chat.tableInfo.decodeFailed",
            table_name,
        ))?;

    Ok(columns.iter().any(|column| column == column_name))
}

#[derive(Debug)]
struct DispatchDiagnosticsRow {
    dispatch_id: String,
    conversation_id: String,
    message_id: String,
    source_message_ids_json: String,
    member_id: String,
    status: String,
    terminal_session_id: Option<String>,
    failure_code: Option<String>,
    failure_message: Option<String>,
}

fn open_diagnostics_connection(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<Connection, AppError> {
    let connection = open_workspace_database(app_data_dir, workspace_id)?;
    connection
        .execute_batch(DIAGNOSTICS_MIGRATION_SQL)
        .map_err(diagnostics_sqlite_error(
            "diagnostics.migration.failed",
            workspace_id,
        ))?;

    Ok(connection)
}

fn insert_run(connection: &Connection, run: &DiagnosticsRunProfile) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO diagnostics_runs (
                id, workspace_id, status, reason, initiated_by, outcome, summary,
                started_at_ms, completed_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                run.run_id,
                run.workspace_id,
                run_status_to_db(&run.status),
                run.reason,
                run.initiated_by,
                run.outcome.as_ref().map(run_outcome_to_db),
                run.summary,
                run.started_at_ms as i64,
                run.completed_at_ms.map(|value| value as i64),
                run.updated_at_ms as i64,
            ],
        )
        .map(|_| ())
        .map_err(diagnostics_sqlite_error(
            "diagnostics.run.insertFailed",
            &run.workspace_id,
        ))
}

fn insert_event(
    connection: &Connection,
    run: &DiagnosticsRunProfile,
    scope: DiagnosticsEventScope,
    event_name: &str,
    severity: DiagnosticsEventSeverity,
    mut correlations: DiagnosticsCorrelationIds,
    metadata: Vec<DiagnosticsMetadataEntry>,
    recorded_at_ms: u64,
) -> Result<DiagnosticsEventProfile, AppError> {
    correlations.workspace_id = Some(run.workspace_id.clone());
    let event = DiagnosticsEventProfile {
        event_id: Ulid::new().to_string(),
        run_id: run.run_id.clone(),
        workspace_id: run.workspace_id.clone(),
        scope,
        event_name: event_name.to_owned(),
        severity,
        correlations,
        metadata,
        recorded_at_ms,
    };
    let metadata_json = serde_json::to_string(&event.metadata).map_err(|error| {
        AppError::recoverable_error(
            "diagnostics.event.metadataEncodeFailed",
            "诊断事件元数据无法保存。",
            "请减少诊断元数据后重试。",
            Some(error.to_string()),
        )
    })?;
    connection
        .execute(
            "INSERT INTO diagnostic_events (
                id, run_id, workspace_id, scope, event_name, severity,
                conversation_id, message_id, member_id, terminal_session_id,
                terminal_tab_id, window_label, dispatch_id, metadata_json, recorded_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                event.event_id,
                event.run_id,
                event.workspace_id,
                event_scope_to_db(&event.scope),
                event.event_name,
                event_severity_to_db(&event.severity),
                event.correlations.conversation_id,
                event.correlations.message_id,
                event.correlations.member_id,
                event.correlations.terminal_session_id,
                event.correlations.terminal_tab_id,
                event.correlations.window_label,
                event.correlations.dispatch_id,
                metadata_json,
                event.recorded_at_ms as i64,
            ],
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.event.insertFailed",
            &run.workspace_id,
        ))?;

    Ok(event)
}

fn active_run_exists(connection: &Connection, workspace_id: &str) -> Result<bool, AppError> {
    connection
        .prepare(
            "SELECT id FROM diagnostics_runs
             WHERE workspace_id = ?1 AND status = 'active'
             LIMIT 1",
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.run.activePrepareFailed",
            workspace_id,
        ))?
        .exists(params![workspace_id])
        .map_err(diagnostics_sqlite_error(
            "diagnostics.run.activeQueryFailed",
            workspace_id,
        ))
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?1")
        .map_err(sqlite_error("diagnostics.tableExists.prepareFailed"))?;
    let exists = statement
        .exists(params![table_name])
        .map_err(sqlite_error("diagnostics.tableExists.queryFailed"))?;

    Ok(exists)
}

fn active_run(
    connection: &Connection,
    workspace_id: &str,
) -> Result<Option<DiagnosticsRunProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, status, reason, initiated_by, outcome, summary,
                    started_at_ms, completed_at_ms, updated_at_ms
             FROM diagnostics_runs
             WHERE workspace_id = ?1 AND status = 'active'
             ORDER BY started_at_ms DESC, id DESC
             LIMIT 1",
        )
        .map_err(diagnostics_sqlite_error(
            "diagnostics.run.activePrepareFailed",
            workspace_id,
        ))?;
    match statement.query_row(params![workspace_id], run_from_row) {
        Ok(run) => Ok(Some(run)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(diagnostics_sqlite_error(
            "diagnostics.run.activeQueryFailed",
            workspace_id,
        )(error)),
    }
}

fn run_by_id(
    connection: &Connection,
    workspace_id: &str,
    run_id: &str,
) -> Result<DiagnosticsRunProfile, AppError> {
    connection
        .query_row(
            "SELECT id, workspace_id, status, reason, initiated_by, outcome, summary,
                    started_at_ms, completed_at_ms, updated_at_ms
             FROM diagnostics_runs
             WHERE workspace_id = ?1 AND id = ?2",
            params![workspace_id, run_id],
            run_from_row,
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::recoverable_error(
                "diagnostics.run.notFound",
                "未找到诊断 run。",
                "请刷新诊断信息或重新开始诊断 run。",
                Some(format!("workspaceId={workspace_id} runId={run_id}")),
            ),
            other => diagnostics_sqlite_error("diagnostics.run.queryFailed", workspace_id)(other),
        })
}

fn run_from_row(row: &rusqlite::Row<'_>) -> Result<DiagnosticsRunProfile, rusqlite::Error> {
    let outcome: Option<String> = row.get(5)?;
    Ok(DiagnosticsRunProfile {
        run_id: row.get(0)?,
        workspace_id: row.get(1)?,
        status: run_status_from_db(row.get::<_, String>(2)?.as_str()),
        reason: row.get(3)?,
        initiated_by: row.get(4)?,
        outcome: outcome.as_deref().map(run_outcome_from_db),
        summary: row.get(6)?,
        started_at_ms: row.get::<_, i64>(7)?.max(0) as u64,
        completed_at_ms: row
            .get::<_, Option<i64>>(8)?
            .map(|value| value.max(0) as u64),
        updated_at_ms: row.get::<_, i64>(9)?.max(0) as u64,
    })
}

fn event_from_row(row: &rusqlite::Row<'_>) -> Result<DiagnosticsEventProfile, rusqlite::Error> {
    let metadata_json: String = row.get(13)?;
    let metadata =
        serde_json::from_str::<Vec<DiagnosticsMetadataEntry>>(&metadata_json).unwrap_or_default();
    Ok(DiagnosticsEventProfile {
        event_id: row.get(0)?,
        run_id: row.get(1)?,
        workspace_id: row.get(2)?,
        scope: event_scope_from_db(row.get::<_, String>(3)?.as_str()),
        event_name: row.get(4)?,
        severity: event_severity_from_db(row.get::<_, String>(5)?.as_str()),
        correlations: DiagnosticsCorrelationIds {
            workspace_id: Some(row.get(2)?),
            conversation_id: row.get(6)?,
            message_id: row.get(7)?,
            member_id: row.get(8)?,
            terminal_session_id: row.get(9)?,
            terminal_tab_id: row.get(10)?,
            window_label: row.get(11)?,
            dispatch_id: row.get(12)?,
        },
        metadata,
        recorded_at_ms: row.get::<_, i64>(14)?.max(0) as u64,
    })
}

fn run_status_to_db(status: &DiagnosticsRunStatus) -> &'static str {
    match status {
        DiagnosticsRunStatus::Active => "active",
        DiagnosticsRunStatus::Completed => "completed",
    }
}

fn run_status_from_db(value: &str) -> DiagnosticsRunStatus {
    match value {
        "completed" => DiagnosticsRunStatus::Completed,
        _ => DiagnosticsRunStatus::Active,
    }
}

fn run_outcome_to_db(outcome: &DiagnosticsRunOutcome) -> &'static str {
    match outcome {
        DiagnosticsRunOutcome::Completed => "completed",
        DiagnosticsRunOutcome::Cancelled => "cancelled",
        DiagnosticsRunOutcome::Failed => "failed",
    }
}

fn run_outcome_from_db(value: &str) -> DiagnosticsRunOutcome {
    match value {
        "cancelled" => DiagnosticsRunOutcome::Cancelled,
        "failed" => DiagnosticsRunOutcome::Failed,
        _ => DiagnosticsRunOutcome::Completed,
    }
}

fn event_scope_to_db(scope: &DiagnosticsEventScope) -> &'static str {
    match scope {
        DiagnosticsEventScope::Frontend => "frontend",
        DiagnosticsEventScope::Backend => "backend",
        DiagnosticsEventScope::Terminal => "terminal",
        DiagnosticsEventScope::Chat => "chat",
        DiagnosticsEventScope::Member => "member",
        DiagnosticsEventScope::Window => "window",
    }
}

fn event_scope_from_db(value: &str) -> DiagnosticsEventScope {
    match value {
        "frontend" => DiagnosticsEventScope::Frontend,
        "terminal" => DiagnosticsEventScope::Terminal,
        "chat" => DiagnosticsEventScope::Chat,
        "member" => DiagnosticsEventScope::Member,
        "window" => DiagnosticsEventScope::Window,
        _ => DiagnosticsEventScope::Backend,
    }
}

fn event_severity_to_db(severity: &DiagnosticsEventSeverity) -> &'static str {
    match severity {
        DiagnosticsEventSeverity::Info => "info",
        DiagnosticsEventSeverity::Warning => "warning",
        DiagnosticsEventSeverity::Error => "error",
    }
}

fn event_severity_from_db(value: &str) -> DiagnosticsEventSeverity {
    match value {
        "warning" => DiagnosticsEventSeverity::Warning,
        "error" => DiagnosticsEventSeverity::Error,
        _ => DiagnosticsEventSeverity::Info,
    }
}

fn diagnostics_sqlite_error<'a>(
    code: &'static str,
    workspace_id: &'a str,
) -> impl FnOnce(rusqlite::Error) -> AppError + 'a {
    move |error| {
        AppError::recoverable_error(
            code,
            "诊断记录写入失败。",
            "当前操作不会因为诊断失败而被视为完成；请检查应用数据目录权限后重试。",
            Some(format!("workspaceId={workspace_id}: {error}")),
        )
    }
}

fn chat_diagnostics_sqlite_error<'a>(
    code: &'static str,
    scope: &'a str,
) -> impl FnOnce(rusqlite::Error) -> AppError + 'a {
    move |error| {
        AppError::recoverable_error(
            code,
            "聊天一致性诊断读取失败。",
            "请重新运行诊断；如果问题持续，请运行数据完整性验证。",
            Some(format!("scope={scope}: {error}")),
        )
    }
}

#[allow(dead_code)]
fn _map_sqlite_error(code: &'static str) -> impl FnOnce(rusqlite::Error) -> AppError {
    sqlite_error(code)
}
