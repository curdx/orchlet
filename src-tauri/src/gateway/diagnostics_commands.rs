use tauri::{AppHandle, Manager};

use crate::{
    app::diagnostics::{
        complete_workspace_diagnostics_run, export_workspace_diagnostics,
        get_workspace_diagnostics_overview, list_workspace_diagnostics_events,
        record_workspace_diagnostics_event, run_workspace_chat_consistency_diagnostics,
        run_workspace_terminal_consistency_diagnostics, start_workspace_diagnostics_run,
    },
    contracts::{
        AppError, CompleteDiagnosticsRunRequest, CompleteDiagnosticsRunResult,
        DiagnosticsExportRequest, DiagnosticsExportResult, DiagnosticsOverviewRequest,
        DiagnosticsOverviewResult, ListDiagnosticsEventsRequest, ListDiagnosticsEventsResult,
        RecordDiagnosticsEventRequest, RecordDiagnosticsEventResult,
        RunChatConsistencyDiagnosticsRequest, RunChatConsistencyDiagnosticsResult,
        RunTerminalConsistencyDiagnosticsRequest, RunTerminalConsistencyDiagnosticsResult,
        StartDiagnosticsRunRequest, StartDiagnosticsRunResult,
    },
};

#[tauri::command]
pub fn diagnostics_run_start(
    app: AppHandle,
    request: StartDiagnosticsRunRequest,
) -> Result<StartDiagnosticsRunResult, AppError> {
    start_workspace_diagnostics_run(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_run_complete(
    app: AppHandle,
    request: CompleteDiagnosticsRunRequest,
) -> Result<CompleteDiagnosticsRunResult, AppError> {
    complete_workspace_diagnostics_run(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_event_record(
    app: AppHandle,
    request: RecordDiagnosticsEventRequest,
) -> Result<RecordDiagnosticsEventResult, AppError> {
    record_workspace_diagnostics_event(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_events_list(
    app: AppHandle,
    request: ListDiagnosticsEventsRequest,
) -> Result<ListDiagnosticsEventsResult, AppError> {
    list_workspace_diagnostics_events(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_terminal_consistency_run(
    app: AppHandle,
    request: RunTerminalConsistencyDiagnosticsRequest,
) -> Result<RunTerminalConsistencyDiagnosticsResult, AppError> {
    run_workspace_terminal_consistency_diagnostics(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_chat_consistency_run(
    app: AppHandle,
    request: RunChatConsistencyDiagnosticsRequest,
) -> Result<RunChatConsistencyDiagnosticsResult, AppError> {
    run_workspace_chat_consistency_diagnostics(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_overview_get(
    app: AppHandle,
    request: DiagnosticsOverviewRequest,
) -> Result<DiagnosticsOverviewResult, AppError> {
    get_workspace_diagnostics_overview(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn diagnostics_export_generate(
    app: AppHandle,
    request: DiagnosticsExportRequest,
) -> Result<DiagnosticsExportResult, AppError> {
    export_workspace_diagnostics(app_data_dir(&app)?, request)
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "diagnostics.appDataDirFailed",
            "无法定位应用数据目录。",
            "诊断操作未完成；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
