use std::path::Path;

use crate::{
    contracts::{
        AppError, CompleteDiagnosticsRunRequest, CompleteDiagnosticsRunResult,
        DiagnosticsConsistencySummary, DiagnosticsCorrelationIds, DiagnosticsEventProfile,
        DiagnosticsEventScope, DiagnosticsEventSeverity, DiagnosticsExportPackage,
        DiagnosticsExportRequest, DiagnosticsExportResult, DiagnosticsExportSection,
        DiagnosticsIssueProfile, DiagnosticsMetadataEntry, DiagnosticsOverviewRequest,
        DiagnosticsOverviewResult, DiagnosticsRedactionSummary, DiagnosticsRedactionWarning,
        DiagnosticsRunProfile, DiagnosticsSeverityCounts, DiagnosticsValidationAvailability,
        DiagnosticsValidationSummary, ListDiagnosticsEventsRequest, ListDiagnosticsEventsResult,
        RecordDiagnosticsEventRequest, RecordDiagnosticsEventResult,
        RunChatConsistencyDiagnosticsRequest, RunChatConsistencyDiagnosticsResult,
        RunTerminalConsistencyDiagnosticsRequest, RunTerminalConsistencyDiagnosticsResult,
        StartDiagnosticsRunRequest, StartDiagnosticsRunResult,
    },
    domain::{
        diagnostics::{
            default_export_sections, empty_redaction_summary, merge_redaction_summary,
            metadata_entry, normalize_additional_context, normalize_diagnostics_cursor,
            normalize_diagnostics_limit, redact_metadata_entries, redaction_section_limit_warning,
            terminal_consistency_issues, validate_optional_diagnostics_run_id,
        },
        member::validate_workspace_id,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
    infrastructure::persistence::sqlite::diagnostics_repository::{
        complete_diagnostics_run, ensure_active_diagnostics_run, list_diagnostics_events,
        list_diagnostics_key_events_page, list_diagnostics_runs_page, record_diagnostics_event,
        record_diagnostics_event_best_effort, run_chat_consistency_diagnostics,
        start_diagnostics_run,
    },
};

pub fn start_workspace_diagnostics_run(
    app_data_dir: impl AsRef<Path>,
    request: StartDiagnosticsRunRequest,
) -> Result<StartDiagnosticsRunResult, AppError> {
    start_diagnostics_run(app_data_dir.as_ref(), request)
}

pub fn complete_workspace_diagnostics_run(
    app_data_dir: impl AsRef<Path>,
    request: CompleteDiagnosticsRunRequest,
) -> Result<CompleteDiagnosticsRunResult, AppError> {
    complete_diagnostics_run(app_data_dir.as_ref(), request)
}

pub fn record_workspace_diagnostics_event(
    app_data_dir: impl AsRef<Path>,
    request: RecordDiagnosticsEventRequest,
) -> Result<RecordDiagnosticsEventResult, AppError> {
    record_diagnostics_event(app_data_dir.as_ref(), request)
}

pub fn list_workspace_diagnostics_events(
    app_data_dir: impl AsRef<Path>,
    request: ListDiagnosticsEventsRequest,
) -> Result<ListDiagnosticsEventsResult, AppError> {
    let result = list_diagnostics_events(app_data_dir.as_ref(), request)?;
    let mut redaction_summary = empty_redaction_summary();
    let mut redaction_warnings = Vec::new();
    let run = redact_run_profile(result.run, &mut redaction_summary, &mut redaction_warnings);
    let events = result
        .events
        .into_iter()
        .map(|event| redact_event_profile(event, &mut redaction_summary, &mut redaction_warnings))
        .collect();

    Ok(ListDiagnosticsEventsResult { run, events })
}

pub fn get_workspace_diagnostics_overview(
    app_data_dir: impl AsRef<Path>,
    request: DiagnosticsOverviewRequest,
) -> Result<DiagnosticsOverviewResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let offset = normalize_diagnostics_cursor(request.cursor.as_deref())?;
    let limit = normalize_diagnostics_limit(request.limit);
    let (runs, runs_have_more) =
        list_diagnostics_runs_page(app_data_dir.as_ref(), &request.workspace_id, limit, offset)?;
    let (key_events, events_have_more) = list_diagnostics_key_events_page(
        app_data_dir.as_ref(),
        &request.workspace_id,
        limit,
        offset,
    )?;
    let mut redaction_summary = empty_redaction_summary();
    let mut redaction_warnings = Vec::new();
    let runs = runs
        .into_iter()
        .map(|run| redact_run_profile(run, &mut redaction_summary, &mut redaction_warnings))
        .collect::<Vec<_>>();
    let key_events = key_events
        .into_iter()
        .map(|event| redact_event_profile(event, &mut redaction_summary, &mut redaction_warnings))
        .collect::<Vec<_>>();
    let has_more = runs_have_more || events_have_more;
    let next_cursor = has_more.then(|| (offset + limit).to_string());
    let consistency_summary = consistency_summary_from_events(&key_events);

    Ok(DiagnosticsOverviewResult {
        workspace_id: request.workspace_id,
        generated_at_ms: now_ms(),
        runs,
        key_events,
        consistency_summary,
        validation_summary: unavailable_validation_summary(),
        has_more,
        next_cursor,
    })
}

pub fn export_workspace_diagnostics(
    app_data_dir: impl AsRef<Path>,
    request: DiagnosticsExportRequest,
) -> Result<DiagnosticsExportResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let offset = normalize_diagnostics_cursor(request.cursor.as_deref())?;
    let limit = normalize_diagnostics_limit(request.max_events);
    let sections = if request.include_sections.is_empty() {
        default_export_sections()
    } else {
        request.include_sections.clone()
    };
    let include = |section: DiagnosticsExportSection| sections.contains(&section);
    let mut redaction_summary = empty_redaction_summary();
    let mut warnings = Vec::new();
    let mut has_more = false;

    let runs = if include(DiagnosticsExportSection::Runs) {
        let (runs, runs_have_more) = list_diagnostics_runs_page(
            app_data_dir.as_ref(),
            &request.workspace_id,
            limit,
            offset,
        )?;
        has_more |= runs_have_more;
        runs.into_iter()
            .map(|run| redact_run_profile(run, &mut redaction_summary, &mut warnings))
            .collect()
    } else {
        Vec::new()
    };

    let include_events = include(DiagnosticsExportSection::Events);
    let include_consistency = include(DiagnosticsExportSection::ConsistencySummaries);
    let events_for_export = if include_events || include_consistency {
        let (events, events_have_more) = list_diagnostics_key_events_page(
            app_data_dir.as_ref(),
            &request.workspace_id,
            limit,
            offset,
        )?;
        has_more |= events_have_more;
        events
            .into_iter()
            .map(|event| redact_event_profile(event, &mut redaction_summary, &mut warnings))
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };
    let consistency_summary =
        include_consistency.then(|| consistency_summary_from_events(&events_for_export));
    let key_events = if include_events {
        events_for_export
    } else {
        Vec::new()
    };

    if has_more {
        let warning = redaction_section_limit_warning("diagnostics");
        redaction_summary.warning_count += 1;
        redaction_summary
            .truncated_sections
            .push(warning.section.clone());
        warnings.push(warning);
    }

    let additional_context = if include(DiagnosticsExportSection::AdditionalContext) {
        let original_context_count = request.additional_context.len();
        let normalized = normalize_additional_context(request.additional_context);
        if original_context_count > normalized.len() {
            let warning = redaction_section_limit_warning("additionalContext");
            redaction_summary.warning_count += 1;
            redaction_summary
                .truncated_sections
                .push(warning.section.clone());
            warnings.push(warning);
        }
        let outcome = redact_metadata_entries("additionalContext", normalized);
        merge_redaction_summary(&mut redaction_summary, &outcome.summary);
        warnings.extend(outcome.warnings);
        outcome.value
    } else {
        Vec::new()
    };

    let validation_summary =
        include(DiagnosticsExportSection::ValidationReports).then(unavailable_validation_summary);
    let app_metadata = if include(DiagnosticsExportSection::AppMetadata) {
        vec![
            metadata_entry("schemaVersion", "1"),
            metadata_entry("generator", "orchlet.diagnostics.export"),
            metadata_entry("localOnly", "true"),
        ]
    } else {
        Vec::new()
    };
    redaction_summary.warning_count = warnings.len() as u32;

    Ok(DiagnosticsExportResult {
        package: DiagnosticsExportPackage {
            schema_version: 1,
            generated_at_ms: now_ms(),
            workspace_ref: format!("workspace:{}", request.workspace_id),
            runs,
            key_events,
            consistency_summary,
            validation_summary,
            app_metadata,
            additional_context,
        },
        redaction_summary,
        warnings,
        has_more,
        next_cursor: has_more.then(|| (offset + limit).to_string()),
    })
}

pub fn run_workspace_terminal_consistency_diagnostics(
    app_data_dir: impl AsRef<Path>,
    request: RunTerminalConsistencyDiagnosticsRequest,
) -> Result<RunTerminalConsistencyDiagnosticsResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_optional_diagnostics_run_id(request.run_id.as_deref())?;
    if let Some(run_id) = request.run_id.as_deref() {
        ensure_active_diagnostics_run(app_data_dir.as_ref(), &request.workspace_id, run_id)?;
    }
    let checked_at_ms = now_ms();
    let issues = terminal_consistency_issues(&request.workspace_id, &request.sessions);
    let events_recorded = record_consistency_issue_events(
        app_data_dir.as_ref(),
        &request.workspace_id,
        request.run_id.as_deref(),
        &issues,
    )?;

    Ok(RunTerminalConsistencyDiagnosticsResult {
        workspace_id: request.workspace_id,
        run_id: request.run_id,
        checked_at_ms,
        checked_session_count: request.sessions.len() as u32,
        issue_count: issues.len() as u32,
        events_recorded,
        issues,
    })
}

pub fn run_workspace_chat_consistency_diagnostics(
    app_data_dir: impl AsRef<Path>,
    request: RunChatConsistencyDiagnosticsRequest,
) -> Result<RunChatConsistencyDiagnosticsResult, AppError> {
    validate_optional_diagnostics_run_id(request.run_id.as_deref())?;
    if let Some(run_id) = request.run_id.as_deref() {
        ensure_active_diagnostics_run(app_data_dir.as_ref(), &request.workspace_id, run_id)?;
    }
    let mut result = run_chat_consistency_diagnostics(app_data_dir.as_ref(), request, now_ms())?;
    result.events_recorded = record_consistency_issue_events(
        app_data_dir.as_ref(),
        &result.workspace_id,
        result.run_id.as_deref(),
        &result.issues,
    )?;

    Ok(result)
}

pub fn record_workspace_diagnostics_event_best_effort(
    app_data_dir: impl AsRef<Path>,
    request: RecordDiagnosticsEventRequest,
) {
    record_diagnostics_event_best_effort(app_data_dir.as_ref(), request);
}

pub fn best_effort_event(
    workspace_id: &str,
    scope: DiagnosticsEventScope,
    event_name: &str,
    severity: DiagnosticsEventSeverity,
    correlations: DiagnosticsCorrelationIds,
    metadata: Vec<DiagnosticsMetadataEntry>,
) -> RecordDiagnosticsEventRequest {
    RecordDiagnosticsEventRequest {
        workspace_id: workspace_id.to_owned(),
        run_id: None,
        scope,
        event_name: event_name.to_owned(),
        severity,
        correlations,
        metadata,
    }
}

fn record_consistency_issue_events(
    app_data_dir: &Path,
    workspace_id: &str,
    run_id: Option<&str>,
    issues: &[DiagnosticsIssueProfile],
) -> Result<u32, AppError> {
    let mut recorded = 0;
    for issue in issues {
        let result = record_diagnostics_event(
            app_data_dir,
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.to_owned(),
                run_id: run_id.map(str::to_owned),
                scope: match &issue.scope {
                    crate::contracts::DiagnosticsConsistencyScope::Terminal => {
                        DiagnosticsEventScope::Terminal
                    }
                    crate::contracts::DiagnosticsConsistencyScope::Chat => {
                        DiagnosticsEventScope::Chat
                    }
                },
                event_name: issue.code.clone(),
                severity: issue.severity.clone(),
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.to_owned()),
                    conversation_id: issue.affected_entities.conversation_id.clone(),
                    message_id: issue.affected_entities.message_id.clone(),
                    member_id: issue.affected_entities.member_id.clone(),
                    terminal_session_id: issue.affected_entities.terminal_session_id.clone(),
                    terminal_tab_id: issue.affected_entities.terminal_tab_id.clone(),
                    window_label: None,
                    dispatch_id: issue.affected_entities.dispatch_id.clone(),
                },
                metadata: issue_event_metadata(issue),
            },
        )?;
        if result.recorded {
            recorded += 1;
        }
    }

    Ok(recorded)
}

fn issue_event_metadata(issue: &DiagnosticsIssueProfile) -> Vec<DiagnosticsMetadataEntry> {
    let mut metadata = vec![
        metadata_entry("code", issue.code.clone()),
        metadata_entry(
            "action",
            if issue.recommended_next_action.is_some() {
                "available"
            } else {
                "none"
            },
        ),
    ];
    metadata.extend(issue.metadata.iter().take(10).cloned());
    metadata
}

fn consistency_summary_from_events(
    events: &[DiagnosticsEventProfile],
) -> DiagnosticsConsistencySummary {
    let mut terminal_issue_count = 0;
    let mut chat_issue_count = 0;
    let mut severity_counts = DiagnosticsSeverityCounts {
        info: 0,
        warning: 0,
        error: 0,
    };
    let mut recent_issue_codes = Vec::new();

    for event in events {
        match &event.severity {
            DiagnosticsEventSeverity::Info => severity_counts.info += 1,
            DiagnosticsEventSeverity::Warning => severity_counts.warning += 1,
            DiagnosticsEventSeverity::Error => severity_counts.error += 1,
        }

        let is_terminal_issue = event.scope == DiagnosticsEventScope::Terminal
            && event.event_name.starts_with("terminal.");
        let is_chat_issue =
            event.scope == DiagnosticsEventScope::Chat && event.event_name.starts_with("chat.");
        if is_terminal_issue {
            terminal_issue_count += 1;
        }
        if is_chat_issue {
            chat_issue_count += 1;
        }
        if (is_terminal_issue || is_chat_issue)
            && !recent_issue_codes.contains(&event.event_name)
            && recent_issue_codes.len() < 8
        {
            recent_issue_codes.push(event.event_name.clone());
        }
    }

    let mut recommended_next_actions = Vec::new();
    if terminal_issue_count > 0 {
        recommended_next_actions
            .push("重新 attach 受影响终端会话，并检查终端快照/退出状态。".to_owned());
    }
    if chat_issue_count > 0 {
        recommended_next_actions
            .push("运行聊天一致性诊断或聊天数据修复以定位孤立记录。".to_owned());
    }

    DiagnosticsConsistencySummary {
        terminal_issue_count,
        chat_issue_count,
        severity_counts,
        recent_issue_codes,
        recommended_next_actions,
    }
}

fn unavailable_validation_summary() -> DiagnosticsValidationSummary {
    DiagnosticsValidationSummary {
        availability: DiagnosticsValidationAvailability::NotAvailable,
        status: None,
        message: "当前诊断导出不持久化数据完整性报告；请从数据验证面板重新运行。".to_owned(),
        report_id: None,
        generated_at_ms: None,
        total_checks: 0,
        passed_checks: 0,
        failed_checks: 0,
        skipped_checks: 0,
    }
}

fn redact_run_profile(
    mut run: DiagnosticsRunProfile,
    summary: &mut DiagnosticsRedactionSummary,
    warnings: &mut Vec<DiagnosticsRedactionWarning>,
) -> DiagnosticsRunProfile {
    let entries = vec![
        metadata_entry("reason", run.reason.clone().unwrap_or_default()),
        metadata_entry("initiatedBy", run.initiated_by.clone().unwrap_or_default()),
        metadata_entry("summary", run.summary.clone().unwrap_or_default()),
    ];
    let outcome = redact_metadata_entries("runs", entries);
    merge_redaction_summary(summary, &outcome.summary);
    warnings.extend(outcome.warnings);
    for entry in outcome.value {
        match entry.key.as_str() {
            "reason" => run.reason = non_empty(entry.value),
            "initiatedBy" => run.initiated_by = non_empty(entry.value),
            "summary" => run.summary = non_empty(entry.value),
            _ => {}
        }
    }

    run
}

fn redact_event_profile(
    mut event: DiagnosticsEventProfile,
    summary: &mut DiagnosticsRedactionSummary,
    warnings: &mut Vec<DiagnosticsRedactionWarning>,
) -> DiagnosticsEventProfile {
    let outcome = redact_metadata_entries("events", event.metadata);
    merge_redaction_summary(summary, &outcome.summary);
    warnings.extend(outcome.warnings);
    event.metadata = outcome.value;
    event
}

fn non_empty(value: String) -> Option<String> {
    let value = value.trim().to_owned();
    (!value.is_empty()).then_some(value)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{
        complete_workspace_diagnostics_run, export_workspace_diagnostics,
        get_workspace_diagnostics_overview, list_workspace_diagnostics_events,
        record_workspace_diagnostics_event, record_workspace_diagnostics_event_best_effort,
        run_workspace_chat_consistency_diagnostics, run_workspace_terminal_consistency_diagnostics,
        start_workspace_diagnostics_run,
    };
    use crate::{
        contracts::{
            CompleteDiagnosticsRunRequest, DiagnosticsCorrelationIds, DiagnosticsEventScope,
            DiagnosticsEventSeverity, DiagnosticsExportRequest, DiagnosticsExportSection,
            DiagnosticsMetadataEntry, DiagnosticsOverviewRequest, DiagnosticsRunOutcome,
            DiagnosticsValidationAvailability, ListDiagnosticsEventsRequest,
            RecordDiagnosticsEventRequest, RunChatConsistencyDiagnosticsRequest,
            RunTerminalConsistencyDiagnosticsRequest, StartDiagnosticsRunRequest,
            TerminalOutputDiagnosticsSummary, TerminalSessionDiagnosticsInput,
            TerminalSessionStatus, TerminalSnapshotDiagnosticsSummary,
        },
        infrastructure::persistence::sqlite::diagnostics_repository::list_diagnostics_events,
        infrastructure::persistence::sqlite::diagnostics_repository::validate_diagnostics_store,
        infrastructure::persistence::sqlite::workspace_database::open_workspace_database,
    };
    use rusqlite::params;

    const MEMBERS_SQL: &str =
        include_str!("../../../migrations/workspace/202605112300__members.sql");
    const PRIVATE_CONVERSATIONS_SQL: &str =
        include_str!("../../../migrations/workspace/202605121210__private_conversations.sql");
    const CONVERSATION_LIST_SQL: &str =
        include_str!("../../../migrations/workspace/202605121300__conversation_list_groups.sql");
    const MESSAGES_SQL: &str =
        include_str!("../../../migrations/workspace/202605121430__messages_read_positions.sql");
    const CONVERSATION_MANAGEMENT_SQL: &str =
        include_str!("../../../migrations/workspace/202605121600__conversation_management.sql");
    const MESSAGE_MENTIONS_SQL: &str =
        include_str!("../../../migrations/workspace/202605121700__message_mentions.sql");
    const DISPATCH_SQL: &str =
        include_str!("../../../migrations/workspace/202605122000__dispatch_requests.sql");

    #[test]
    fn diagnostics_recording_is_disabled_by_default() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();

        let result = record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.clone(),
                run_id: None,
                scope: DiagnosticsEventScope::Frontend,
                event_name: "frontend.clicked".to_owned(),
                severity: DiagnosticsEventSeverity::Info,
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.clone()),
                    ..DiagnosticsCorrelationIds::default()
                },
                metadata: Vec::new(),
            },
        )
        .expect("record skipped");

        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("workspace database");
        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM diagnostic_events WHERE workspace_id = ?1",
                params![workspace_id],
                |row| row.get(0),
            )
            .expect("diagnostic event count");

        assert!(!result.recorded);
        assert_eq!(
            result.skipped_reason.as_deref(),
            Some("diagnostics disabled")
        );
        assert_eq!(count, 0);
    }

    #[test]
    fn diagnostics_run_records_correlated_timeline_events() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: Some("/Users/alice/private/project".to_owned()),
                initiated_by: Some("test".to_owned()),
            },
        )
        .expect("run started");

        let recorded = record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.clone(),
                run_id: None,
                scope: DiagnosticsEventScope::Chat,
                event_name: "chat.message.sent".to_owned(),
                severity: DiagnosticsEventSeverity::Info,
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.clone()),
                    conversation_id: Some("01K00000000000000000000010".to_owned()),
                    message_id: Some("01K00000000000000000000011".to_owned()),
                    member_id: Some("01K00000000000000000000012".to_owned()),
                    ..DiagnosticsCorrelationIds::default()
                },
                metadata: vec![
                    DiagnosticsMetadataEntry {
                        key: "status".to_owned(),
                        value: "sent".to_owned(),
                    },
                    DiagnosticsMetadataEntry {
                        key: "detail".to_owned(),
                        value: "/Users/alice/private/project".to_owned(),
                    },
                ],
            },
        )
        .expect("event recorded");
        let listed = list_workspace_diagnostics_events(
            app_data.path(),
            ListDiagnosticsEventsRequest {
                workspace_id,
                run_id: started.run.run_id.clone(),
            },
        )
        .expect("events listed");

        assert!(recorded.recorded);
        assert_eq!(recorded.event.as_ref().unwrap().run_id, started.run.run_id);
        assert_eq!(listed.events.len(), 2);
        assert_eq!(listed.events[0].event_name, "diagnostics.run.started");
        assert_eq!(listed.events[1].scope, DiagnosticsEventScope::Chat);
        assert_eq!(
            listed.events[1].correlations.message_id.as_deref(),
            Some("01K00000000000000000000011")
        );
        assert_eq!(listed.events[1].metadata[0].key, "status");
        let serialized = serde_json::to_string(&listed).expect("serialize listed events");
        assert!(!serialized.contains("/Users/alice"));
        assert!(serialized.contains("<user>"));
    }

    #[test]
    fn diagnostics_completed_run_rejects_explicit_event_writes() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: None,
                initiated_by: None,
            },
        )
        .expect("run started");
        let completed = complete_workspace_diagnostics_run(
            app_data.path(),
            CompleteDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                run_id: started.run.run_id.clone(),
                outcome: DiagnosticsRunOutcome::Completed,
                summary: Some("Resolved".to_owned()),
            },
        )
        .expect("run completed");
        let repeated = complete_workspace_diagnostics_run(
            app_data.path(),
            CompleteDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                run_id: started.run.run_id.clone(),
                outcome: DiagnosticsRunOutcome::Completed,
                summary: Some("Resolved twice".to_owned()),
            },
        )
        .expect("completion is idempotent");
        let error = record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id,
                run_id: Some(started.run.run_id),
                scope: DiagnosticsEventScope::Backend,
                event_name: "backend.after.complete".to_owned(),
                severity: DiagnosticsEventSeverity::Warning,
                correlations: DiagnosticsCorrelationIds::default(),
                metadata: Vec::new(),
            },
        )
        .expect_err("completed run rejects event writes");

        assert!(completed.completion_event.is_some());
        assert!(repeated.completion_event.is_none());
        assert_eq!(error.code, "diagnostics.run.completed");
    }

    #[test]
    fn diagnostics_event_rejects_sensitive_metadata_keys() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: None,
                initiated_by: None,
            },
        )
        .expect("run started");

        let error = record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id,
                run_id: None,
                scope: DiagnosticsEventScope::Frontend,
                event_name: "frontend.unsafe".to_owned(),
                severity: DiagnosticsEventSeverity::Error,
                correlations: DiagnosticsCorrelationIds::default(),
                metadata: vec![DiagnosticsMetadataEntry {
                    key: "tokenValue".to_owned(),
                    value: "secret".to_owned(),
                }],
            },
        )
        .expect_err("sensitive metadata rejected");

        assert_eq!(error.code, "diagnostics.metadata.sensitiveKey");
    }

    #[test]
    fn diagnostics_run_id_must_be_ulid_for_explicit_commands() {
        let app_data = tempdir().expect("app data");
        let error = record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: "01K00000000000000000000000".to_owned(),
                run_id: Some("not-a-ulid".to_owned()),
                scope: DiagnosticsEventScope::Backend,
                event_name: "backend.invalid".to_owned(),
                severity: DiagnosticsEventSeverity::Info,
                correlations: DiagnosticsCorrelationIds::default(),
                metadata: Vec::new(),
            },
        )
        .expect_err("invalid run id rejected");

        assert_eq!(error.code, "diagnostics.run.invalidId");
    }

    #[test]
    fn diagnostics_validation_rejects_partial_diagnostics_schema() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000";
        let connection =
            open_workspace_database(app_data.path(), workspace_id).expect("workspace database");
        connection
            .execute_batch(
                "CREATE TABLE diagnostics_runs (
                    id TEXT PRIMARY KEY,
                    workspace_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at_ms INTEGER NOT NULL,
                    updated_at_ms INTEGER NOT NULL
                );",
            )
            .expect("partial diagnostics schema");

        let error = validate_diagnostics_store(app_data.path(), workspace_id)
            .expect_err("partial diagnostics schema rejected");

        assert_eq!(error.code, "diagnostics.events.missing");
    }

    #[test]
    fn diagnostics_best_effort_does_not_surface_invalid_workspace_errors() {
        let app_data = tempdir().expect("app data");

        record_workspace_diagnostics_event_best_effort(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: "invalid-workspace".to_owned(),
                run_id: None,
                scope: DiagnosticsEventScope::Backend,
                event_name: "backend.noop".to_owned(),
                severity: DiagnosticsEventSeverity::Info,
                correlations: DiagnosticsCorrelationIds::default(),
                metadata: Vec::new(),
            },
        );
    }

    #[test]
    fn diagnostics_overview_lists_runs_events_and_consistency_summary() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: Some("/Users/alice/private/project".to_owned()),
                initiated_by: Some("test".to_owned()),
            },
        )
        .expect("run started");
        record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.clone(),
                run_id: Some(started.run.run_id.clone()),
                scope: DiagnosticsEventScope::Terminal,
                event_name: "terminal.snapshot.stale".to_owned(),
                severity: DiagnosticsEventSeverity::Warning,
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.clone()),
                    terminal_session_id: Some("01K000000000000000000000AA".to_owned()),
                    ..DiagnosticsCorrelationIds::default()
                },
                metadata: vec![DiagnosticsMetadataEntry {
                    key: "latestSeq".to_owned(),
                    value: "3 from /home/alice/repo".to_owned(),
                }],
            },
        )
        .expect("terminal issue event recorded");
        record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.clone(),
                run_id: Some(started.run.run_id.clone()),
                scope: DiagnosticsEventScope::Chat,
                event_name: "chat.unread.mismatch".to_owned(),
                severity: DiagnosticsEventSeverity::Error,
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.clone()),
                    conversation_id: Some("01K00000000000000000000010".to_owned()),
                    ..DiagnosticsCorrelationIds::default()
                },
                metadata: vec![DiagnosticsMetadataEntry {
                    key: "expectedUnread".to_owned(),
                    value: "2".to_owned(),
                }],
            },
        )
        .expect("chat issue event recorded");

        let overview = get_workspace_diagnostics_overview(
            app_data.path(),
            DiagnosticsOverviewRequest {
                workspace_id: workspace_id.clone(),
                cursor: None,
                limit: Some(10),
            },
        )
        .expect("overview");

        assert_eq!(overview.workspace_id, workspace_id);
        assert_eq!(overview.runs.len(), 1);
        assert!(overview
            .key_events
            .iter()
            .any(|event| event.event_name == "terminal.snapshot.stale"));
        assert_eq!(overview.consistency_summary.terminal_issue_count, 1);
        assert_eq!(overview.consistency_summary.chat_issue_count, 1);
        assert_eq!(overview.consistency_summary.severity_counts.error, 1);
        assert_eq!(
            overview.validation_summary.availability,
            DiagnosticsValidationAvailability::NotAvailable
        );
        let serialized = serde_json::to_string(&overview).expect("serialize overview");
        assert!(!serialized.contains("/Users/alice"));
        assert!(!serialized.contains("/home/alice"));
        assert!(serialized.contains("<user>"));
    }

    #[test]
    fn diagnostics_export_redacts_private_values_and_reports_batch_cursor() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: Some("/Users/alice/private/project".to_owned()),
                initiated_by: Some("test".to_owned()),
            },
        )
        .expect("run started");
        record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.clone(),
                run_id: Some(started.run.run_id.clone()),
                scope: DiagnosticsEventScope::Backend,
                event_name: "backend.safe".to_owned(),
                severity: DiagnosticsEventSeverity::Info,
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.clone()),
                    ..DiagnosticsCorrelationIds::default()
                },
                metadata: vec![DiagnosticsMetadataEntry {
                    key: "status".to_owned(),
                    value: "ok".to_owned(),
                }],
            },
        )
        .expect("safe event recorded");
        record_workspace_diagnostics_event(
            app_data.path(),
            RecordDiagnosticsEventRequest {
                workspace_id: workspace_id.clone(),
                run_id: Some(started.run.run_id),
                scope: DiagnosticsEventScope::Terminal,
                event_name: "terminal.snapshot.stale".to_owned(),
                severity: DiagnosticsEventSeverity::Warning,
                correlations: DiagnosticsCorrelationIds {
                    workspace_id: Some(workspace_id.clone()),
                    terminal_session_id: Some("01K000000000000000000000AA".to_owned()),
                    ..DiagnosticsCorrelationIds::default()
                },
                metadata: vec![DiagnosticsMetadataEntry {
                    key: "latestSeq".to_owned(),
                    value: "3".to_owned(),
                }],
            },
        )
        .expect("terminal issue event recorded");

        let result = export_workspace_diagnostics(
            app_data.path(),
            DiagnosticsExportRequest {
                workspace_id: workspace_id.clone(),
                cursor: None,
                max_events: Some(1),
                include_sections: vec![
                    DiagnosticsExportSection::Runs,
                    DiagnosticsExportSection::Events,
                    DiagnosticsExportSection::AdditionalContext,
                ],
                additional_context: vec![
                    DiagnosticsMetadataEntry {
                        key: "apiToken".to_owned(),
                        value: "sk-secret-value".to_owned(),
                    },
                    DiagnosticsMetadataEntry {
                        key: "logLine".to_owned(),
                        value: "HOME=/Users/alice SECRET_TOKEN=abc".to_owned(),
                    },
                    DiagnosticsMetadataEntry {
                        key: "notes".to_owned(),
                        value: "fn private() {\n  println!(\"secret\");\n}".to_owned(),
                    },
                    DiagnosticsMetadataEntry {
                        key: "workingDir".to_owned(),
                        value: "C:\\Users\\alice\\repo".to_owned(),
                    },
                ],
            },
        )
        .expect("export");

        let serialized = serde_json::to_string(&result).expect("serialize export");
        assert!(!serialized.contains("sk-secret-value"));
        assert!(!serialized.contains("SECRET_TOKEN=abc"));
        assert!(!serialized.contains("fn private"));
        assert!(!serialized.contains("Users\\\\alice"));
        assert!(serialized.contains("<user>") || serialized.contains("[redacted]"));
        assert!(result.redaction_summary.redacted_fields >= 3);
        assert!(result.redaction_summary.omitted_fields >= 1);
        assert!(result.has_more);
        assert_eq!(result.next_cursor.as_deref(), Some("1"));
        assert!(!result.warnings.is_empty());

        let consistency_only = export_workspace_diagnostics(
            app_data.path(),
            DiagnosticsExportRequest {
                workspace_id,
                cursor: None,
                max_events: Some(25),
                include_sections: vec![DiagnosticsExportSection::ConsistencySummaries],
                additional_context: Vec::new(),
            },
        )
        .expect("consistency-only export");
        assert!(consistency_only.package.key_events.is_empty());
        assert_eq!(
            consistency_only
                .package
                .consistency_summary
                .expect("consistency summary")
                .terminal_issue_count,
            1
        );
    }

    #[test]
    fn terminal_consistency_detects_sequence_snapshot_and_exit_issues_without_active_run() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();

        let result = run_workspace_terminal_consistency_diagnostics(
            app_data.path(),
            RunTerminalConsistencyDiagnosticsRequest {
                workspace_id: workspace_id.clone(),
                run_id: None,
                sessions: vec![TerminalSessionDiagnosticsInput {
                    terminal_session_id: "01K000000000000000000000AA".to_owned(),
                    terminal_tab_id: Some("01K000000000000000000000AB".to_owned()),
                    status: TerminalSessionStatus::Exited,
                    snapshot: TerminalSnapshotDiagnosticsSummary {
                        last_seq: 1,
                        truncated: false,
                        updated_at_ms: Some(100),
                    },
                    exit_reason: None,
                    outputs: vec![
                        TerminalOutputDiagnosticsSummary {
                            seq: 1,
                            emitted_at_ms: 100,
                        },
                        TerminalOutputDiagnosticsSummary {
                            seq: 3,
                            emitted_at_ms: 300,
                        },
                    ],
                }],
            },
        )
        .expect("terminal diagnostics");

        assert_eq!(result.issue_count, 3);
        assert_eq!(result.events_recorded, 0);
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "terminal.sequence.missing"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "terminal.snapshot.stale"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "terminal.exitState.mismatch"));

        let connection =
            open_workspace_database(app_data.path(), &workspace_id).expect("workspace database");
        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM diagnostic_events WHERE workspace_id = ?1",
                params![workspace_id],
                |row| row.get(0),
            )
            .expect("diagnostic event count");
        assert_eq!(count, 0);
    }

    #[test]
    fn terminal_consistency_records_issue_events_when_diagnostics_run_is_active() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: Some("terminal consistency".to_owned()),
                initiated_by: Some("test".to_owned()),
            },
        )
        .expect("run started");

        let result = run_workspace_terminal_consistency_diagnostics(
            app_data.path(),
            RunTerminalConsistencyDiagnosticsRequest {
                workspace_id: workspace_id.clone(),
                run_id: Some(started.run.run_id.clone()),
                sessions: vec![TerminalSessionDiagnosticsInput {
                    terminal_session_id: "01K000000000000000000000AA".to_owned(),
                    terminal_tab_id: None,
                    status: TerminalSessionStatus::Running,
                    snapshot: TerminalSnapshotDiagnosticsSummary {
                        last_seq: 0,
                        truncated: false,
                        updated_at_ms: None,
                    },
                    exit_reason: None,
                    outputs: vec![TerminalOutputDiagnosticsSummary {
                        seq: 1,
                        emitted_at_ms: 100,
                    }],
                }],
            },
        )
        .expect("terminal diagnostics");
        let listed = list_diagnostics_events(
            app_data.path(),
            ListDiagnosticsEventsRequest {
                workspace_id,
                run_id: started.run.run_id,
            },
        )
        .expect("events listed");

        assert_eq!(result.issue_count, 1);
        assert_eq!(result.events_recorded, 1);
        assert!(listed
            .events
            .iter()
            .any(|event| event.event_name == "terminal.snapshot.stale"
                && event.correlations.terminal_session_id.as_deref()
                    == Some("01K000000000000000000000AA")));
    }

    #[test]
    fn consistency_diagnostics_reject_completed_explicit_run_even_without_issues() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: None,
                initiated_by: None,
            },
        )
        .expect("run started");
        complete_workspace_diagnostics_run(
            app_data.path(),
            CompleteDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                run_id: started.run.run_id.clone(),
                outcome: DiagnosticsRunOutcome::Completed,
                summary: None,
            },
        )
        .expect("run completed");

        let error = run_workspace_terminal_consistency_diagnostics(
            app_data.path(),
            RunTerminalConsistencyDiagnosticsRequest {
                workspace_id,
                run_id: Some(started.run.run_id),
                sessions: Vec::new(),
            },
        )
        .expect_err("completed run rejected");

        assert_eq!(error.code, "diagnostics.run.completed");
    }

    #[test]
    fn chat_consistency_detects_orphans_invalid_status_and_unread_mismatch() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        seed_inconsistent_chat_state(app_data.path(), &workspace_id);

        let result = run_workspace_chat_consistency_diagnostics(
            app_data.path(),
            RunChatConsistencyDiagnosticsRequest {
                workspace_id: workspace_id.clone(),
                run_id: None,
            },
        )
        .expect("chat diagnostics");

        assert!(result.issue_count >= 6);
        assert_eq!(result.events_recorded, 0);
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "chat.orphan.message"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "chat.orphan.mention"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "chat.orphan.readPosition"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "chat.orphan.dispatch"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "chat.status.invalid"));
        assert!(result
            .issues
            .iter()
            .any(|issue| issue.code == "chat.unread.mismatch"));
        assert!(result
            .issues
            .iter()
            .flat_map(|issue| &issue.metadata)
            .all(|entry| !entry.value.contains("secret chat body")));
    }

    #[test]
    fn chat_consistency_records_issue_events_when_diagnostics_run_is_active() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        seed_inconsistent_chat_state(app_data.path(), &workspace_id);
        let started = start_workspace_diagnostics_run(
            app_data.path(),
            StartDiagnosticsRunRequest {
                workspace_id: workspace_id.clone(),
                reason: Some("chat consistency".to_owned()),
                initiated_by: Some("test".to_owned()),
            },
        )
        .expect("run started");

        let result = run_workspace_chat_consistency_diagnostics(
            app_data.path(),
            RunChatConsistencyDiagnosticsRequest {
                workspace_id: workspace_id.clone(),
                run_id: Some(started.run.run_id.clone()),
            },
        )
        .expect("chat diagnostics");
        let listed = list_diagnostics_events(
            app_data.path(),
            ListDiagnosticsEventsRequest {
                workspace_id,
                run_id: started.run.run_id,
            },
        )
        .expect("events listed");

        assert_eq!(result.events_recorded, result.issue_count);
        assert!(listed.events.iter().any(|event| {
            event.event_name == "chat.unread.mismatch"
                && event.correlations.conversation_id.as_deref()
                    == Some("01K00000000000000000000010")
        }));
    }

    fn seed_inconsistent_chat_state(app_data_dir: &std::path::Path, workspace_id: &str) {
        let connection =
            open_workspace_database(app_data_dir, workspace_id).expect("workspace database");
        connection.execute_batch(MEMBERS_SQL).expect("members");
        connection
            .execute_batch(PRIVATE_CONVERSATIONS_SQL)
            .expect("conversations");
        connection
            .execute_batch(CONVERSATION_LIST_SQL)
            .expect("conversation list");
        connection.execute_batch(MESSAGES_SQL).expect("messages");
        connection
            .execute_batch(CONVERSATION_MANAGEMENT_SQL)
            .expect("conversation management");
        connection
            .execute_batch(MESSAGE_MENTIONS_SQL)
            .expect("mentions");
        connection.execute_batch(DISPATCH_SQL).expect("dispatches");

        connection
            .execute(
                "INSERT INTO members (
                    id, workspace_id, role, display_name, status, runtime_type,
                    runtime_id, runtime_label, runtime_command, created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, 'owner', 'Owner', 'available', 'shell', NULL, NULL, NULL, 1, 1)",
                params!["01K00000000000000000000001", workspace_id],
            )
            .expect("member");
        connection
            .execute(
                "INSERT INTO conversations (
                    id, workspace_id, kind, title, participant_kind, participant_id,
                    created_at_ms, updated_at_ms, last_activity_at_ms,
                    is_default, is_pinned, unread_count, last_message_preview,
                    is_muted, deleted_at_ms
                 ) VALUES (?1, ?2, 'channel', 'General', 'workspace', ?2, 1, 1, 300, 1, 1, 0, NULL, 0, NULL)",
                params!["01K00000000000000000000010", workspace_id],
            )
            .expect("conversation");
        connection
            .execute(
                "INSERT INTO messages (
                    id, workspace_id, conversation_id, author_member_id, body,
                    send_status, created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, 'secret chat body one', 'sent', 100, 100)",
                params![
                    "01K00000000000000000000020",
                    workspace_id,
                    "01K00000000000000000000010",
                    "01K00000000000000000000001"
                ],
            )
            .expect("message one");
        connection
            .execute(
                "INSERT INTO messages (
                    id, workspace_id, conversation_id, author_member_id, body,
                    send_status, created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, 'secret chat body two', 'sent', 200, 200)",
                params![
                    "01K00000000000000000000021",
                    workspace_id,
                    "01K00000000000000000000010",
                    "01K00000000000000000000001"
                ],
            )
            .expect("message two");
        connection
            .execute(
                "INSERT INTO messages (
                    id, workspace_id, conversation_id, author_member_id, body,
                    send_status, created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, 'secret chat body invalid', 'unknown', 300, 300)",
                params![
                    "01K00000000000000000000022",
                    workspace_id,
                    "01K00000000000000000000010",
                    "01K00000000000000000000001"
                ],
            )
            .expect("invalid status message");
        connection
            .execute(
                "INSERT INTO messages (
                    id, workspace_id, conversation_id, author_member_id, body,
                    send_status, created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, 'secret chat body orphan', 'sent', 400, 400)",
                params![
                    "01K00000000000000000000023",
                    workspace_id,
                    "01K00000000000000000009999",
                    "01K00000000000000000000001"
                ],
            )
            .expect("orphan message");
        connection
            .execute(
                "INSERT INTO conversation_read_positions (
                    workspace_id, conversation_id, last_read_message_id, last_read_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, 100, 100)",
                params![
                    workspace_id,
                    "01K00000000000000000000010",
                    "01K00000000000000000000020"
                ],
            )
            .expect("read position");
        connection
            .execute(
                "INSERT INTO conversation_read_positions (
                    workspace_id, conversation_id, last_read_message_id, last_read_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, 500, 500)",
                params![
                    workspace_id,
                    "01K00000000000000000008888",
                    "01K00000000000000000007777"
                ],
            )
            .expect("orphan read position");
        connection
            .execute(
                "INSERT INTO message_mentions (
                    workspace_id, conversation_id, message_id, member_id, created_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, 300)",
                params![
                    workspace_id,
                    "01K00000000000000000000010",
                    "01K00000000000000000009998",
                    "01K00000000000000000009997"
                ],
            )
            .expect("orphan mention");
        connection
            .execute(
                "INSERT INTO dispatch_requests (
                    id, workspace_id, conversation_id, message_id, source_message_ids_json,
                    member_id, target_source, target_reason, status, terminal_session_id,
                    failure_code, failure_message, failure_user_action, failure_details,
                    created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'user_selected', 'test', 'dispatched',
                    NULL, NULL, NULL, NULL, NULL, 500, 500)",
                params![
                    "01K00000000000000000000030",
                    workspace_id,
                    "01K00000000000000000000010",
                    "01K00000000000000000000021",
                    "[\"01K00000000000000000006666\"]",
                    "01K00000000000000000000001"
                ],
            )
            .expect("invalid dispatch");
        connection
            .execute(
                "INSERT INTO dispatch_requests (
                    id, workspace_id, conversation_id, message_id, source_message_ids_json,
                    member_id, target_source, target_reason, status, terminal_session_id,
                    failure_code, failure_message, failure_user_action, failure_details,
                    created_at_ms, updated_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, '[]', ?5, 'user_selected', 'test', 'unknown',
                    NULL, NULL, NULL, NULL, NULL, 600, 600)",
                params![
                    "01K00000000000000000000031",
                    workspace_id,
                    "01K00000000000000000009999",
                    "01K00000000000000000009998",
                    "01K00000000000000000009997"
                ],
            )
            .expect("orphan dispatch");
    }
}
