use crate::{
    app::chat::start_workspace_private_conversation,
    contracts::{AppError, StartPrivateConversationRequest, StartPrivateConversationResult},
};
use tauri::{AppHandle, Manager};

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
            "私聊会话未创建；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
