use std::sync::Arc;

use crate::{
    app::{
        chat::{
            clear_workspace_chat_data_use_case, clear_workspace_conversation,
            create_workspace_group_conversation, delete_workspace_conversation,
            list_workspace_conversations, list_workspace_messages,
            repair_workspace_chat_data_use_case, send_workspace_message,
            send_workspace_message_and_dispatch, start_workspace_private_conversation,
            update_workspace_conversation_settings, update_workspace_group_conversation_members,
            update_workspace_read_position,
        },
        terminal::TerminalRuntimeState,
        window_context::WindowContextRuntimeState,
    },
    contracts::{
        AppError, ClearConversationRequest, ClearConversationResult, ClearWorkspaceChatDataRequest,
        ClearWorkspaceChatDataResult, CreateGroupConversationRequest,
        CreateGroupConversationResult, DeleteConversationRequest, DeleteConversationResult,
        ListConversationsRequest, ListConversationsResult, ListMessagesRequest, ListMessagesResult,
        OpenedWorkspace, RepairWorkspaceChatDataRequest, RepairWorkspaceChatDataResult,
        SendMessageAndDispatchRequest, SendMessageAndDispatchResult, SendMessageRequest,
        SendMessageResult, StartPrivateConversationRequest, StartPrivateConversationResult,
        UpdateConversationSettingsRequest, UpdateConversationSettingsResult,
        UpdateGroupConversationMembersRequest, UpdateGroupConversationMembersResult,
        UpdateReadPositionRequest, UpdateReadPositionResult,
    },
    domain::terminal::{TERMINAL_OUTPUT_EVENT, TERMINAL_STATUS_CHANGE_EVENT},
};
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub fn chat_conversations_list(
    app: AppHandle,
    request: ListConversationsRequest,
) -> Result<ListConversationsResult, AppError> {
    list_workspace_conversations(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_group_conversation_create(
    app: AppHandle,
    request: CreateGroupConversationRequest,
) -> Result<CreateGroupConversationResult, AppError> {
    create_workspace_group_conversation(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_message_send(
    app: AppHandle,
    request: SendMessageRequest,
) -> Result<SendMessageResult, AppError> {
    send_workspace_message(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_message_send_and_dispatch(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    terminal_state: State<'_, TerminalRuntimeState>,
    request: SendMessageAndDispatchRequest,
) -> Result<SendMessageAndDispatchResult, AppError> {
    let workspace = active_workspace(&window_context_state)?;
    send_workspace_message_and_dispatch(
        app_data_dir(&app)?,
        &workspace,
        request,
        &terminal_state,
        terminal_output_sink(&app),
        terminal_status_sink(&app),
    )
}

#[tauri::command]
pub fn chat_conversation_settings_update(
    app: AppHandle,
    request: UpdateConversationSettingsRequest,
) -> Result<UpdateConversationSettingsResult, AppError> {
    update_workspace_conversation_settings(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_conversation_clear(
    app: AppHandle,
    request: ClearConversationRequest,
) -> Result<ClearConversationResult, AppError> {
    clear_workspace_conversation(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_data_repair(
    app: AppHandle,
    request: RepairWorkspaceChatDataRequest,
) -> Result<RepairWorkspaceChatDataResult, AppError> {
    repair_workspace_chat_data_use_case(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_data_clear(
    app: AppHandle,
    request: ClearWorkspaceChatDataRequest,
) -> Result<ClearWorkspaceChatDataResult, AppError> {
    clear_workspace_chat_data_use_case(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_conversation_delete(
    app: AppHandle,
    request: DeleteConversationRequest,
) -> Result<DeleteConversationResult, AppError> {
    delete_workspace_conversation(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_messages_page(
    app: AppHandle,
    request: ListMessagesRequest,
) -> Result<ListMessagesResult, AppError> {
    list_workspace_messages(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_read_position_update(
    app: AppHandle,
    request: UpdateReadPositionRequest,
) -> Result<UpdateReadPositionResult, AppError> {
    update_workspace_read_position(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_group_conversation_members_update(
    app: AppHandle,
    request: UpdateGroupConversationMembersRequest,
) -> Result<UpdateGroupConversationMembersResult, AppError> {
    update_workspace_group_conversation_members(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn chat_private_conversation_start(
    app: AppHandle,
    request: StartPrivateConversationRequest,
) -> Result<StartPrivateConversationResult, AppError> {
    start_workspace_private_conversation(app_data_dir(&app)?, request)
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "chat.appDataDirFailed",
            "无法定位应用数据目录。",
            "会话操作未完成；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}

fn active_workspace(
    window_context_state: &WindowContextRuntimeState,
) -> Result<OpenedWorkspace, AppError> {
    window_context_state.active_workspace().ok_or_else(|| {
        AppError::recoverable_error(
            "chat.workspace.required",
            "发送消息前需要先打开工作区。",
            "请先选择并打开一个工作区，然后再发送消息。",
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
