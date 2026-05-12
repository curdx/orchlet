use std::{path::PathBuf, sync::Arc};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::{
    app::{terminal::TerminalRuntimeState, window_context::WindowContextRuntimeState},
    contracts::{AppError, TerminalOpenRequest, TerminalOpenResult, WindowMode},
    domain::terminal::TERMINAL_OUTPUT_EVENT,
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
    let event_app = app.clone();
    let event_sink = Arc::new(move |event| {
        let _ = event_app.emit(TERMINAL_OUTPUT_EVENT, event);
    });
    let (session, session_created) = terminal_state.open_or_create_session(
        app_data_dir(&app)?,
        &workspace,
        request,
        event_sink,
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
