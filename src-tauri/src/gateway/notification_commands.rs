use crate::{
    app::notification::{NotificationRuntimeState, NOTIFICATION_UNREAD_CHANGED_EVENT},
    contracts::{
        AppError, NotificationUnreadSummaryRequest, NotificationUnreadSummaryResult,
        NotificationUnreadUpdateRequest, NotificationUnreadUpdateResult,
    },
};
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn notification_unread_summary_get(
    notification_state: State<'_, NotificationRuntimeState>,
    _request: NotificationUnreadSummaryRequest,
) -> NotificationUnreadSummaryResult {
    NotificationUnreadSummaryResult {
        summary: notification_state.unread_summary(),
    }
}

#[tauri::command]
pub fn notification_unread_summary_update(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    request: NotificationUnreadUpdateRequest,
) -> Result<NotificationUnreadUpdateResult, AppError> {
    let summary = notification_state.update_unread_summary(request);
    app.emit(NOTIFICATION_UNREAD_CHANGED_EVENT, summary.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "notification.unread.emitFailed",
                "无法同步未读状态。",
                "当前窗口已更新；请重新打开通知预览或重试。",
                Some(error.to_string()),
            )
        })?;

    Ok(NotificationUnreadUpdateResult { summary })
}
