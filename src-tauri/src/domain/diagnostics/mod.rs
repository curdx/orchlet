use crate::contracts::{
    AppError, DiagnosticsConsistencyScope, DiagnosticsCorrelationIds, DiagnosticsEventSeverity,
    DiagnosticsExportSection, DiagnosticsIssueAffectedEntities, DiagnosticsIssueProfile,
    DiagnosticsMetadataEntry, DiagnosticsRedactionReason, DiagnosticsRedactionSummary,
    DiagnosticsRedactionWarning, RecordDiagnosticsEventRequest, TerminalSessionDiagnosticsInput,
    TerminalSessionStatus,
};
use ulid::Ulid;

const DIAGNOSTICS_LABEL_MAX_CHARS: usize = 96;
const DIAGNOSTICS_SUMMARY_MAX_CHARS: usize = 240;
const DIAGNOSTICS_METADATA_KEY_MAX_CHARS: usize = 48;
const DIAGNOSTICS_METADATA_VALUE_MAX_CHARS: usize = 160;
const DIAGNOSTICS_METADATA_MAX_ITEMS: usize = 12;
const DIAGNOSTICS_EXPORT_DEFAULT_LIMIT: u32 = 50;
const DIAGNOSTICS_EXPORT_MAX_LIMIT: u32 = 200;
const DIAGNOSTICS_EXPORT_CONTEXT_MAX_ITEMS: usize = 20;

pub fn validate_diagnostics_run_id(run_id: &str) -> Result<(), AppError> {
    if run_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "diagnostics.run.invalidId",
            "诊断 run 标识无效。",
            "请刷新后重试；如果问题持续，请重新开始诊断 run。",
            Some(format!("runId must be a ULID string: {}", run_id)),
        ));
    }

    Ok(())
}

pub fn normalize_diagnostics_label(
    value: Option<String>,
    fallback: &str,
) -> Result<Option<String>, AppError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.chars().count() > DIAGNOSTICS_LABEL_MAX_CHARS {
        return Err(AppError::recoverable_error(
            "diagnostics.label.tooLong",
            format!("{fallback}过长。"),
            "请使用更短的诊断说明后重试。",
            Some(format!(
                "maxChars={} actualChars={}",
                DIAGNOSTICS_LABEL_MAX_CHARS,
                trimmed.chars().count()
            )),
        ));
    }

    Ok(Some(trimmed.to_owned()))
}

pub fn normalize_diagnostics_summary(value: Option<String>) -> Result<Option<String>, AppError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    Ok(Some(truncate_chars(trimmed, DIAGNOSTICS_SUMMARY_MAX_CHARS)))
}

pub fn normalize_record_event_request(
    mut request: RecordDiagnosticsEventRequest,
) -> Result<RecordDiagnosticsEventRequest, AppError> {
    let event_name = request.event_name.trim();
    if event_name.is_empty() {
        return Err(AppError::recoverable_error(
            "diagnostics.eventName.required",
            "诊断事件名称不能为空。",
            "请提供稳定的事件名称后重试。",
            None,
        ));
    }
    request.event_name = truncate_chars(event_name, DIAGNOSTICS_LABEL_MAX_CHARS);
    request.correlations = normalize_correlations(request.correlations);
    request.metadata = normalize_metadata(request.metadata)?;

    Ok(request)
}

pub fn validate_optional_diagnostics_run_id(run_id: Option<&str>) -> Result<(), AppError> {
    if let Some(run_id) = run_id {
        validate_diagnostics_run_id(run_id)?;
    }

    Ok(())
}

pub fn terminal_consistency_issues(
    workspace_id: &str,
    sessions: &[TerminalSessionDiagnosticsInput],
) -> Vec<DiagnosticsIssueProfile> {
    let mut issues = Vec::new();

    for session in sessions {
        let affected = DiagnosticsIssueAffectedEntities {
            workspace_id: Some(workspace_id.to_owned()),
            terminal_session_id: Some(session.terminal_session_id.clone()),
            terminal_tab_id: session.terminal_tab_id.clone(),
            ..DiagnosticsIssueAffectedEntities::default()
        };

        if let Some((first_missing, missing_count)) = missing_sequence_summary(session) {
            issues.push(build_diagnostics_issue(
                DiagnosticsConsistencyScope::Terminal,
                "terminal.sequence.missing",
                DiagnosticsEventSeverity::Error,
                "终端输出序列不连续，恢复时可能丢失片段。",
                affected.clone(),
                Some("重新 attach 该终端会话；如果问题持续，请关闭并重建会话。"),
                vec![
                    metadata_entry("firstMissingSeq", first_missing.to_string()),
                    metadata_entry("missingCount", missing_count.to_string()),
                ],
            ));
        }

        if let Some((latest_seq, latest_emitted_at_ms)) = latest_output_summary(session) {
            let snapshot_updated_at_ms = session.snapshot.updated_at_ms.unwrap_or(0);
            if session.snapshot.last_seq < latest_seq
                || session.snapshot.updated_at_ms.is_none()
                || snapshot_updated_at_ms < latest_emitted_at_ms
            {
                issues.push(build_diagnostics_issue(
                    DiagnosticsConsistencyScope::Terminal,
                    "terminal.snapshot.stale",
                    DiagnosticsEventSeverity::Warning,
                    "终端快照落后于已观察到的流序列。",
                    affected.clone(),
                    Some("重新 attach 该会话并刷新快照；如果快照仍落后，请重启终端会话。"),
                    vec![
                        metadata_entry("snapshotSeq", session.snapshot.last_seq.to_string()),
                        metadata_entry("latestSeq", latest_seq.to_string()),
                        metadata_entry("snapshotAtMs", snapshot_updated_at_ms.to_string()),
                        metadata_entry("latestAtMs", latest_emitted_at_ms.to_string()),
                    ],
                ));
            }
        }

        match (&session.status, &session.exit_reason) {
            (TerminalSessionStatus::Exited, None) => {
                issues.push(build_diagnostics_issue(
                    DiagnosticsConsistencyScope::Terminal,
                    "terminal.exitState.mismatch",
                    DiagnosticsEventSeverity::Error,
                    "终端会话已退出但缺少退出原因。",
                    affected.clone(),
                    Some("检查 PTY 退出事件记录；必要时关闭并重新创建会话。"),
                    vec![metadata_entry("status", "exited")],
                ));
            }
            (TerminalSessionStatus::Running | TerminalSessionStatus::Starting, Some(exit)) => {
                issues.push(build_diagnostics_issue(
                    DiagnosticsConsistencyScope::Terminal,
                    "terminal.exitState.mismatch",
                    DiagnosticsEventSeverity::Warning,
                    "终端会话仍处于活动状态但带有退出原因。",
                    affected,
                    Some("刷新终端状态；如果状态仍冲突，请关闭并重新 attach 会话。"),
                    vec![
                        metadata_entry(
                            "status",
                            match &session.status {
                                TerminalSessionStatus::Starting => "starting",
                                TerminalSessionStatus::Running => "running",
                                TerminalSessionStatus::Exited => "exited",
                            },
                        ),
                        metadata_entry("exitCode", exit.code.clone()),
                    ],
                ));
            }
            _ => {}
        }
    }

    issues
}

pub fn build_diagnostics_issue(
    scope: DiagnosticsConsistencyScope,
    code: &str,
    severity: DiagnosticsEventSeverity,
    message: &str,
    affected_entities: DiagnosticsIssueAffectedEntities,
    recommended_next_action: Option<&str>,
    metadata: Vec<DiagnosticsMetadataEntry>,
) -> DiagnosticsIssueProfile {
    DiagnosticsIssueProfile {
        issue_id: Ulid::new().to_string(),
        scope,
        code: code.to_owned(),
        severity,
        message: message.to_owned(),
        affected_entities,
        recommended_next_action: recommended_next_action.map(str::to_owned),
        metadata,
    }
}

pub fn metadata_entry(
    key: impl Into<String>,
    value: impl Into<String>,
) -> DiagnosticsMetadataEntry {
    DiagnosticsMetadataEntry {
        key: key.into(),
        value: value.into(),
    }
}

pub fn normalize_diagnostics_cursor(cursor: Option<&str>) -> Result<u32, AppError> {
    let Some(cursor) = cursor.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(0);
    };

    cursor.parse::<u32>().map_err(|_| {
        AppError::recoverable_error(
            "diagnostics.cursor.invalid",
            "诊断分页游标无效。",
            "请刷新诊断视图后重试。",
            Some(format!("cursor={cursor}")),
        )
    })
}

pub fn normalize_diagnostics_limit(limit: Option<u32>) -> u32 {
    limit
        .unwrap_or(DIAGNOSTICS_EXPORT_DEFAULT_LIMIT)
        .clamp(1, DIAGNOSTICS_EXPORT_MAX_LIMIT)
}

pub fn default_export_sections() -> Vec<DiagnosticsExportSection> {
    vec![
        DiagnosticsExportSection::Runs,
        DiagnosticsExportSection::Events,
        DiagnosticsExportSection::ValidationReports,
        DiagnosticsExportSection::ConsistencySummaries,
        DiagnosticsExportSection::AppMetadata,
        DiagnosticsExportSection::AdditionalContext,
    ]
}

pub fn normalize_additional_context(
    entries: Vec<DiagnosticsMetadataEntry>,
) -> Vec<DiagnosticsMetadataEntry> {
    entries
        .into_iter()
        .take(DIAGNOSTICS_EXPORT_CONTEXT_MAX_ITEMS)
        .filter_map(|entry| {
            let key = entry.key.trim();
            let value = entry.value.trim();
            if key.is_empty() || value.is_empty() {
                None
            } else {
                Some(DiagnosticsMetadataEntry {
                    key: truncate_chars(key, DIAGNOSTICS_METADATA_KEY_MAX_CHARS),
                    value: truncate_chars(value, DIAGNOSTICS_METADATA_VALUE_MAX_CHARS * 4),
                })
            }
        })
        .collect()
}

#[derive(Debug, Clone)]
pub struct DiagnosticsRedactionOutcome<T> {
    pub value: T,
    pub summary: DiagnosticsRedactionSummary,
    pub warnings: Vec<DiagnosticsRedactionWarning>,
}

pub fn redact_metadata_entries(
    section: &str,
    entries: Vec<DiagnosticsMetadataEntry>,
) -> DiagnosticsRedactionOutcome<Vec<DiagnosticsMetadataEntry>> {
    let mut summary = empty_redaction_summary();
    let mut warnings = Vec::new();
    let value = entries
        .into_iter()
        .map(|entry| {
            let field = entry.key.clone();
            let redacted = redact_field(section, &field, entry.value, &mut summary, &mut warnings);
            DiagnosticsMetadataEntry {
                key: field,
                value: redacted,
            }
        })
        .collect();
    summary.warning_count = warnings.len() as u32;

    DiagnosticsRedactionOutcome {
        value,
        summary,
        warnings,
    }
}

pub fn merge_redaction_summary(
    target: &mut DiagnosticsRedactionSummary,
    source: &DiagnosticsRedactionSummary,
) {
    target.redacted_fields += source.redacted_fields;
    target.omitted_fields += source.omitted_fields;
    target.warning_count += source.warning_count;
    for section in &source.truncated_sections {
        if !target.truncated_sections.contains(section) {
            target.truncated_sections.push(section.clone());
        }
    }
}

pub fn redaction_section_limit_warning(section: &str) -> DiagnosticsRedactionWarning {
    DiagnosticsRedactionWarning {
        section: section.to_owned(),
        field: "items".to_owned(),
        reason: DiagnosticsRedactionReason::SectionLimit,
        message: "该导出分段已按请求上限截断；继续下一批可获取更多元数据。".to_owned(),
    }
}

pub fn empty_redaction_summary() -> DiagnosticsRedactionSummary {
    DiagnosticsRedactionSummary {
        redacted_fields: 0,
        omitted_fields: 0,
        warning_count: 0,
        truncated_sections: Vec::new(),
    }
}

fn missing_sequence_summary(session: &TerminalSessionDiagnosticsInput) -> Option<(u64, u64)> {
    let mut sequences = session
        .outputs
        .iter()
        .map(|event| event.seq)
        .filter(|seq| *seq > 0)
        .collect::<Vec<_>>();
    sequences.sort_unstable();
    sequences.dedup();

    let first = *sequences.first()?;
    let mut first_missing = if first > 1 { Some(1) } else { None };
    let mut missing_count = first.saturating_sub(1);

    for pair in sequences.windows(2) {
        let previous = pair[0];
        let current = pair[1];
        if current > previous + 1 {
            if first_missing.is_none() {
                first_missing = Some(previous + 1);
            }
            missing_count += current - previous - 1;
        }
    }

    first_missing.map(|first_missing| (first_missing, missing_count))
}

fn latest_output_summary(session: &TerminalSessionDiagnosticsInput) -> Option<(u64, u64)> {
    session
        .outputs
        .iter()
        .max_by(|left, right| {
            left.seq
                .cmp(&right.seq)
                .then_with(|| left.emitted_at_ms.cmp(&right.emitted_at_ms))
        })
        .map(|event| (event.seq, event.emitted_at_ms))
}

fn normalize_correlations(correlations: DiagnosticsCorrelationIds) -> DiagnosticsCorrelationIds {
    DiagnosticsCorrelationIds {
        workspace_id: trim_optional(correlations.workspace_id),
        conversation_id: trim_optional(correlations.conversation_id),
        message_id: trim_optional(correlations.message_id),
        member_id: trim_optional(correlations.member_id),
        terminal_session_id: trim_optional(correlations.terminal_session_id),
        terminal_tab_id: trim_optional(correlations.terminal_tab_id),
        window_label: trim_optional(correlations.window_label)
            .map(|label| truncate_chars(&label, DIAGNOSTICS_LABEL_MAX_CHARS)),
        dispatch_id: trim_optional(correlations.dispatch_id),
    }
}

fn normalize_metadata(
    metadata: Vec<DiagnosticsMetadataEntry>,
) -> Result<Vec<DiagnosticsMetadataEntry>, AppError> {
    if metadata.len() > DIAGNOSTICS_METADATA_MAX_ITEMS {
        return Err(AppError::recoverable_error(
            "diagnostics.metadata.tooMany",
            "诊断事件元数据过多。",
            "请只记录少量结构化标记，不要记录原始内容。",
            Some(format!(
                "maxItems={} actualItems={}",
                DIAGNOSTICS_METADATA_MAX_ITEMS,
                metadata.len()
            )),
        ));
    }

    metadata
        .into_iter()
        .filter_map(|entry| {
            let key = entry.key.trim();
            let value = entry.value.trim();
            if key.is_empty() || value.is_empty() {
                None
            } else {
                Some((key.to_owned(), value.to_owned()))
            }
        })
        .map(|(key, value)| {
            reject_sensitive_metadata_key(&key)?;
            Ok(DiagnosticsMetadataEntry {
                key: truncate_chars(&key, DIAGNOSTICS_METADATA_KEY_MAX_CHARS),
                value: truncate_chars(&value, DIAGNOSTICS_METADATA_VALUE_MAX_CHARS),
            })
        })
        .collect()
}

fn reject_sensitive_metadata_key(key: &str) -> Result<(), AppError> {
    let lowered = key.to_ascii_lowercase();
    let unsafe_fragments = [
        "token", "secret", "password", "passwd", "apikey", "api_key", "body", "output", "stdout",
        "stderr", "env", "path", "source", "snippet",
    ];
    if unsafe_fragments
        .iter()
        .any(|fragment| lowered.contains(fragment))
    {
        return Err(AppError::recoverable_error(
            "diagnostics.metadata.sensitiveKey",
            "诊断事件元数据包含敏感字段。",
            "请只记录结构化标识符、状态或枚举值，不要记录路径、token、环境变量或原始文本。",
            Some(format!("key={key}")),
        ));
    }

    Ok(())
}

fn redact_field(
    section: &str,
    field: &str,
    value: String,
    summary: &mut DiagnosticsRedactionSummary,
    warnings: &mut Vec<DiagnosticsRedactionWarning>,
) -> String {
    if is_sensitive_key(field) {
        summary.redacted_fields += 1;
        warnings.push(redaction_warning(
            section,
            field,
            DiagnosticsRedactionReason::SensitiveKey,
            "敏感字段名称已脱敏。",
        ));
        return "[redacted]".to_owned();
    }

    if looks_like_source_snippet(&value) {
        summary.omitted_fields += 1;
        warnings.push(redaction_warning(
            section,
            field,
            DiagnosticsRedactionReason::SourceSnippet,
            "疑似源码片段或原始多行内容已省略。",
        ));
        return "[omitted: raw snippet]".to_owned();
    }

    if contains_token_value(&value) {
        summary.redacted_fields += 1;
        warnings.push(redaction_warning(
            section,
            field,
            DiagnosticsRedactionReason::TokenValue,
            "疑似 token 或认证值已脱敏。",
        ));
        return "[redacted]".to_owned();
    }

    if contains_env_assignment(&value) {
        summary.redacted_fields += 1;
        warnings.push(redaction_warning(
            section,
            field,
            DiagnosticsRedactionReason::EnvironmentValue,
            "疑似环境变量赋值已脱敏。",
        ));
        return "[redacted]".to_owned();
    }

    let redacted_paths = redact_private_paths(&value);
    if redacted_paths != value {
        summary.redacted_fields += 1;
        warnings.push(redaction_warning(
            section,
            field,
            DiagnosticsRedactionReason::PrivatePath,
            "本机私有路径已脱敏。",
        ));
        return truncate_chars(&redacted_paths, DIAGNOSTICS_METADATA_VALUE_MAX_CHARS);
    }

    truncate_chars(&value, DIAGNOSTICS_METADATA_VALUE_MAX_CHARS)
}

fn redaction_warning(
    section: &str,
    field: &str,
    reason: DiagnosticsRedactionReason,
    message: &str,
) -> DiagnosticsRedactionWarning {
    DiagnosticsRedactionWarning {
        section: section.to_owned(),
        field: truncate_chars(field, DIAGNOSTICS_METADATA_KEY_MAX_CHARS),
        reason,
        message: message.to_owned(),
    }
}

fn is_sensitive_key(key: &str) -> bool {
    let lowered = key.to_ascii_lowercase();
    [
        "token",
        "secret",
        "password",
        "passwd",
        "apikey",
        "api_key",
        "access_key",
        "auth",
        "bearer",
        "private_key",
        "env",
        "source",
        "snippet",
        "body",
        "stdout",
        "stderr",
        "output",
    ]
    .iter()
    .any(|fragment| lowered.contains(fragment))
}

fn looks_like_source_snippet(value: &str) -> bool {
    let trimmed = value.trim();
    trimmed.lines().count() > 1
        || trimmed.contains("fn ")
        || trimmed.contains("function ")
        || trimmed.contains("class ")
        || trimmed.contains("import ")
        || trimmed.contains("export ")
        || trimmed.contains("#include")
        || trimmed.contains("```")
}

fn contains_token_value(value: &str) -> bool {
    let lowered = value.to_ascii_lowercase();
    lowered.contains("bearer ")
        || lowered.contains("authorization:")
        || lowered.contains("x-api-key")
        || lowered.contains("ghp_")
        || lowered.contains("sk-")
}

fn contains_env_assignment(value: &str) -> bool {
    value.split_whitespace().any(|part| {
        let Some((key, tail)) = part.split_once('=') else {
            return false;
        };
        !tail.is_empty() && is_sensitive_key(key)
    })
}

fn redact_private_paths(value: &str) -> String {
    let mut redacted = redact_unix_home_path(value, "/Users/");
    redacted = redact_unix_home_path(&redacted, "/home/");
    redact_windows_home_path(&redacted)
}

fn redact_unix_home_path(value: &str, prefix: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut remaining = value;
    while let Some(index) = remaining.find(prefix) {
        output.push_str(&remaining[..index]);
        output.push_str(prefix);
        output.push_str("<user>");
        let after_prefix = &remaining[index + prefix.len()..];
        let after_user = after_prefix
            .find('/')
            .map(|slash| &after_prefix[slash..])
            .unwrap_or("");
        remaining = after_user;
    }
    output.push_str(remaining);
    output
}

fn redact_windows_home_path(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut remaining = value;
    while let Some(index) = remaining.to_ascii_lowercase().find("c:\\users\\") {
        output.push_str(&remaining[..index]);
        output.push_str("C:\\Users\\<user>");
        let after_prefix = &remaining[index + "C:\\Users\\".len()..];
        let after_user = after_prefix
            .find('\\')
            .map(|slash| &after_prefix[slash..])
            .unwrap_or("");
        remaining = after_user;
    }
    output.push_str(remaining);
    output
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    if value.chars().count() <= max_chars {
        return value.to_owned();
    }

    value.chars().take(max_chars).collect()
}
