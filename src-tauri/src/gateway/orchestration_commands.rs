use std::{path::PathBuf, sync::Arc};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::{
    app::{
        orchestration::{dispatch_chat_message, resume_member_dispatch_queue},
        terminal::TerminalRuntimeState,
        window_context::WindowContextRuntimeState,
    },
    contracts::{
        AppError, DispatchChatMessageRequest, DispatchChatMessageResult,
        DispatchQueueResumeRequest, DispatchQueueResumeResult, OpenedWorkspace,
    },
    domain::terminal::{TERMINAL_OUTPUT_EVENT, TERMINAL_STATUS_CHANGE_EVENT},
};

#[tauri::command]
pub fn orchestration_dispatch_chat_message(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: DispatchChatMessageRequest,
) -> Result<DispatchChatMessageResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    dispatch_chat_message(
        app_data_dir(&app)?,
        &workspace,
        request,
        &terminal_state,
        terminal_output_sink(&app),
        terminal_status_sink(&app),
    )
}

#[tauri::command]
pub fn orchestration_resume_member_dispatch_queue(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: DispatchQueueResumeRequest,
) -> Result<DispatchQueueResumeResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    resume_member_dispatch_queue(
        app_data_dir(&app)?,
        &workspace,
        request,
        &terminal_state,
        terminal_output_sink(&app),
        terminal_status_sink(&app),
    )
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "dispatch.appDataDirFailed",
            "无法定位应用数据目录。",
            "消息派发未完成；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}

fn active_workspace(
    window_context_state: &WindowContextRuntimeState,
) -> Result<OpenedWorkspace, AppError> {
    window_context_state.active_workspace().ok_or_else(|| {
        AppError::recoverable_error(
            "dispatch.workspace.required",
            "派发消息前需要先打开工作区。",
            "请先选择并打开一个工作区，然后再派发消息。",
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
