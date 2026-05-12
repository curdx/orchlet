use crate::{
    app::chat::{
        create_workspace_group_conversation, list_workspace_conversations,
        start_workspace_private_conversation, update_workspace_group_conversation_members,
    },
    contracts::{
        AppError, CreateGroupConversationRequest, CreateGroupConversationResult,
        ListConversationsRequest, ListConversationsResult, StartPrivateConversationRequest,
        StartPrivateConversationResult, UpdateGroupConversationMembersRequest,
        UpdateGroupConversationMembersResult,
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
