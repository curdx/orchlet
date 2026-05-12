use std::{path::PathBuf, sync::Arc};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::{
    app::{terminal::TerminalRuntimeState, window_context::WindowContextRuntimeState},
    contracts::{
        AppError, TerminalAttachRequest, TerminalAttachResult, TerminalCloseRequest,
        TerminalCloseResult, TerminalInputRequest, TerminalInputResult, TerminalOpenRequest,
        TerminalOpenResult, TerminalResizeRequest, TerminalResizeResult, WindowMode,
    },
    domain::terminal::{TERMINAL_OUTPUT_EVENT, TERMINAL_STATUS_CHANGE_EVENT},
    gateway::workspace_commands::open_or_focus_window_mode,
};

#[tauri::command]
pub async fn terminal_open(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: TerminalOpenRequest,
) -> Result<TerminalOpenResult, AppError> {
    let workspace = window_context_state.active_workspace().ok_or_else(|| {
        AppError::recoverable_error(
            "terminal.workspace.required",
            "打开终端前需要先打开工作区。",
            "请先选择并打开一个工作区，然后再打开终端。",
            None,
        )
    })?;
    let event_sink = terminal_output_sink(&app);
    let status_sink = terminal_status_sink(&app);
    let (session, session_created) = terminal_state.open_or_create_session(
        app_data_dir(&app)?,
        &workspace,
        request,
        event_sink,
        status_sink,
    )?;
    let window_result =
        open_or_focus_window_mode(&app, &window_context_state, WindowMode::Terminal).await?;

    Ok(TerminalOpenResult {
        window: window_result.window,
        window_opened: window_result.opened,
        session,
        session_created,
    })
}

#[tauri::command]
pub fn terminal_attach(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: TerminalAttachRequest,
) -> Result<TerminalAttachResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    let session = terminal_state.attach_session(
        &workspace.metadata.project_id,
        request,
        terminal_status_sink(&app),
    )?;

    Ok(TerminalAttachResult { session })
}

#[tauri::command]
pub fn terminal_input(
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: TerminalInputRequest,
) -> Result<TerminalInputResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    let session = terminal_state.write_input(&workspace.metadata.project_id, request)?;

    Ok(TerminalInputResult { session })
}

#[tauri::command]
pub fn terminal_resize(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: TerminalResizeRequest,
) -> Result<TerminalResizeResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    let session = terminal_state.resize_session(
        &workspace.metadata.project_id,
        request,
        terminal_status_sink(&app),
    )?;

    Ok(TerminalResizeResult { session })
}

#[tauri::command]
pub fn terminal_close(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: TerminalCloseRequest,
) -> Result<TerminalCloseResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    let session = terminal_state.close_session(
        &workspace.metadata.project_id,
        request,
        terminal_status_sink(&app),
    )?;

    Ok(TerminalCloseResult { session })
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "terminal.appDataDirFailed",
            "无法定位应用数据目录。",
            "终端会话未启动；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}

fn active_workspace(
    window_context_state: &WindowContextRuntimeState,
) -> Result<crate::contracts::OpenedWorkspace, AppError> {
    window_context_state.active_workspace().ok_or_else(|| {
        AppError::recoverable_error(
            "terminal.workspace.required",
            "打开终端前需要先打开工作区。",
            "请先选择并打开一个工作区，然后再打开终端。",
            None,
        )
    })
}

fn terminal_output_sink(
    app: &AppHandle,
) -> Arc<dyn Fn(crate::contracts::TerminalOutputEventPayload) + Send + Sync> {
    let app = app.clone();
    Arc::new(move |event| {
        let _ = app.emit(TERMINAL_OUTPUT_EVENT, event);
    })
}

fn terminal_status_sink(
    app: &AppHandle,
) -> Arc<dyn Fn(crate::contracts::TerminalStatusEventPayload) + Send + Sync> {
    let app = app.clone();
    Arc::new(move |event| {
        let _ = app.emit(TERMINAL_STATUS_CHANGE_EVENT, event);
    })
}
