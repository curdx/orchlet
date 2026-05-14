use crate::{
    app::chat::{
        clear_workspace_chat_data_use_case, clear_workspace_conversation,
        create_workspace_group_conversation, delete_workspace_conversation,
        list_workspace_conversations, list_workspace_messages, repair_workspace_chat_data_use_case,
        send_workspace_message, start_workspace_private_conversation,
        update_workspace_conversation_settings, update_workspace_group_conversation_members,
        update_workspace_read_position,
    },
    contracts::{
        AppError, ClearConversationRequest, ClearConversationResult, ClearWorkspaceChatDataRequest,
        ClearWorkspaceChatDataResult, CreateGroupConversationRequest,
        CreateGroupConversationResult, DeleteConversationRequest, DeleteConversationResult,
        ListConversationsRequest, ListConversationsResult, ListMessagesRequest, ListMessagesResult,
        RepairWorkspaceChatDataRequest, RepairWorkspaceChatDataResult, SendMessageRequest,
        SendMessageResult, StartPrivateConversationRequest, StartPrivateConversationResult,
        UpdateConversationSettingsRequest, UpdateConversationSettingsResult,
        UpdateGroupConversationMembersRequest, UpdateGroupConversationMembersResult,
        UpdateReadPositionRequest, UpdateReadPositionResult,
    },
};
use tauri::{AppHandle, Manager};

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
