use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::TerminalSessionStatus;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsRunStatus {
    Active,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsRunOutcome {
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsEventScope {
    Frontend,
    Backend,
    Terminal,
    Chat,
    Member,
    Window,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsEventSeverity {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsCorrelationIds {
    pub workspace_id: Option<String>,
    pub conversation_id: Option<String>,
    pub message_id: Option<String>,
    pub member_id: Option<String>,
    pub terminal_session_id: Option<String>,
    pub terminal_tab_id: Option<String>,
    pub window_label: Option<String>,
    pub dispatch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsMetadataEntry {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsRunProfile {
    pub run_id: String,
    pub workspace_id: String,
    pub status: DiagnosticsRunStatus,
    pub reason: Option<String>,
    pub initiated_by: Option<String>,
    pub outcome: Option<DiagnosticsRunOutcome>,
    pub summary: Option<String>,
    #[ts(type = "number")]
    pub started_at_ms: u64,
    #[ts(type = "number | null")]
    pub completed_at_ms: Option<u64>,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsEventProfile {
    pub event_id: String,
    pub run_id: String,
    pub workspace_id: String,
    pub scope: DiagnosticsEventScope,
    pub event_name: String,
    pub severity: DiagnosticsEventSeverity,
    pub correlations: DiagnosticsCorrelationIds,
    pub metadata: Vec<DiagnosticsMetadataEntry>,
    #[ts(type = "number")]
    pub recorded_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsConsistencyScope {
    Terminal,
    Chat,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsIssueAffectedEntities {
    pub workspace_id: Option<String>,
    pub conversation_id: Option<String>,
    pub message_id: Option<String>,
    pub member_id: Option<String>,
    pub terminal_session_id: Option<String>,
    pub terminal_tab_id: Option<String>,
    pub dispatch_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsIssueProfile {
    pub issue_id: String,
    pub scope: DiagnosticsConsistencyScope,
    pub code: String,
    pub severity: DiagnosticsEventSeverity,
    pub message: String,
    pub affected_entities: DiagnosticsIssueAffectedEntities,
    pub recommended_next_action: Option<String>,
    pub metadata: Vec<DiagnosticsMetadataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct TerminalSnapshotDiagnosticsSummary {
    #[ts(type = "number")]
    pub last_seq: u64,
    pub truncated: bool,
    #[ts(type = "number | null")]
    pub updated_at_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct TerminalOutputDiagnosticsSummary {
    #[ts(type = "number")]
    pub seq: u64,
    #[ts(type = "number")]
    pub emitted_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct TerminalExitDiagnosticsSummary {
    pub code: String,
    #[ts(type = "number")]
    pub occurred_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct TerminalSessionDiagnosticsInput {
    pub terminal_session_id: String,
    pub terminal_tab_id: Option<String>,
    pub status: TerminalSessionStatus,
    pub snapshot: TerminalSnapshotDiagnosticsSummary,
    pub exit_reason: Option<TerminalExitDiagnosticsSummary>,
    pub outputs: Vec<TerminalOutputDiagnosticsSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct RunTerminalConsistencyDiagnosticsRequest {
    pub workspace_id: String,
    pub run_id: Option<String>,
    pub sessions: Vec<TerminalSessionDiagnosticsInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct RunTerminalConsistencyDiagnosticsResult {
    pub workspace_id: String,
    pub run_id: Option<String>,
    #[ts(type = "number")]
    pub checked_at_ms: u64,
    pub checked_session_count: u32,
    pub issue_count: u32,
    pub events_recorded: u32,
    pub issues: Vec<DiagnosticsIssueProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct RunChatConsistencyDiagnosticsRequest {
    pub workspace_id: String,
    pub run_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct RunChatConsistencyDiagnosticsResult {
    pub workspace_id: String,
    pub run_id: Option<String>,
    #[ts(type = "number")]
    pub checked_at_ms: u64,
    pub checked_conversation_count: u32,
    pub checked_message_count: u32,
    pub checked_dispatch_count: u32,
    pub issue_count: u32,
    pub events_recorded: u32,
    pub issues: Vec<DiagnosticsIssueProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct StartDiagnosticsRunRequest {
    pub workspace_id: String,
    pub reason: Option<String>,
    pub initiated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct StartDiagnosticsRunResult {
    pub run: DiagnosticsRunProfile,
    pub start_event: DiagnosticsEventProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct CompleteDiagnosticsRunRequest {
    pub workspace_id: String,
    pub run_id: String,
    pub outcome: DiagnosticsRunOutcome,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct CompleteDiagnosticsRunResult {
    pub run: DiagnosticsRunProfile,
    pub completion_event: Option<DiagnosticsEventProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct RecordDiagnosticsEventRequest {
    pub workspace_id: String,
    pub run_id: Option<String>,
    pub scope: DiagnosticsEventScope,
    pub event_name: String,
    pub severity: DiagnosticsEventSeverity,
    pub correlations: DiagnosticsCorrelationIds,
    pub metadata: Vec<DiagnosticsMetadataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct RecordDiagnosticsEventResult {
    pub recorded: bool,
    pub skipped_reason: Option<String>,
    pub event: Option<DiagnosticsEventProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct ListDiagnosticsEventsRequest {
    pub workspace_id: String,
    pub run_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct ListDiagnosticsEventsResult {
    pub run: DiagnosticsRunProfile,
    pub events: Vec<DiagnosticsEventProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsValidationAvailability {
    Available,
    NotAvailable,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsValidationSummary {
    pub availability: DiagnosticsValidationAvailability,
    pub status: Option<String>,
    pub message: String,
    pub report_id: Option<String>,
    #[ts(type = "number | null")]
    pub generated_at_ms: Option<u64>,
    pub total_checks: u32,
    pub passed_checks: u32,
    pub failed_checks: u32,
    pub skipped_checks: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsSeverityCounts {
    pub info: u32,
    pub warning: u32,
    pub error: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsConsistencySummary {
    pub terminal_issue_count: u32,
    pub chat_issue_count: u32,
    pub severity_counts: DiagnosticsSeverityCounts,
    pub recent_issue_codes: Vec<String>,
    pub recommended_next_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsOverviewRequest {
    pub workspace_id: String,
    pub cursor: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsOverviewResult {
    pub workspace_id: String,
    #[ts(type = "number")]
    pub generated_at_ms: u64,
    pub runs: Vec<DiagnosticsRunProfile>,
    pub key_events: Vec<DiagnosticsEventProfile>,
    pub consistency_summary: DiagnosticsConsistencySummary,
    pub validation_summary: DiagnosticsValidationSummary,
    pub has_more: bool,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsExportSection {
    Runs,
    Events,
    ValidationReports,
    ConsistencySummaries,
    AppMetadata,
    AdditionalContext,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub enum DiagnosticsRedactionReason {
    SensitiveKey,
    TokenValue,
    EnvironmentValue,
    PrivatePath,
    SourceSnippet,
    SectionLimit,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsRedactionWarning {
    pub section: String,
    pub field: String,
    pub reason: DiagnosticsRedactionReason,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsRedactionSummary {
    pub redacted_fields: u32,
    pub omitted_fields: u32,
    pub warning_count: u32,
    pub truncated_sections: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsExportRequest {
    pub workspace_id: String,
    pub cursor: Option<String>,
    pub max_events: Option<u32>,
    pub include_sections: Vec<DiagnosticsExportSection>,
    pub additional_context: Vec<DiagnosticsMetadataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsExportPackage {
    pub schema_version: u32,
    #[ts(type = "number")]
    pub generated_at_ms: u64,
    pub workspace_ref: String,
    pub runs: Vec<DiagnosticsRunProfile>,
    pub key_events: Vec<DiagnosticsEventProfile>,
    pub consistency_summary: Option<DiagnosticsConsistencySummary>,
    pub validation_summary: Option<DiagnosticsValidationSummary>,
    pub app_metadata: Vec<DiagnosticsMetadataEntry>,
    pub additional_context: Vec<DiagnosticsMetadataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "diagnostics.ts")]
pub struct DiagnosticsExportResult {
    pub package: DiagnosticsExportPackage,
    pub redaction_summary: DiagnosticsRedactionSummary,
    pub warnings: Vec<DiagnosticsRedactionWarning>,
    pub has_more: bool,
    pub next_cursor: Option<String>,
}
