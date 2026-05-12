use crate::{
    app::notification::{
        NotificationRuntimeState, NOTIFICATION_NAVIGATION_CHANGED_EVENT,
        NOTIFICATION_UNREAD_CHANGED_EVENT,
    },
    contracts::{
        AppError, NotificationIgnoreAllRequest, NotificationIgnoreAllResult,
        NotificationNavigationPendingRequest, NotificationNavigationPendingResult,
        NotificationNavigationRequest, NotificationNavigationResult,
        NotificationUnreadSummaryRequest, NotificationUnreadSummaryResult,
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

#[tauri::command]
pub fn notification_navigation_pending_get(
    notification_state: State<'_, NotificationRuntimeState>,
    _request: NotificationNavigationPendingRequest,
) -> NotificationNavigationPendingResult {
    NotificationNavigationPendingResult {
        action: notification_state.pending_navigation_action(),
    }
}

#[tauri::command]
pub fn notification_navigation_dispatch(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    request: NotificationNavigationRequest,
) -> Result<NotificationNavigationResult, AppError> {
    let action = notification_state.dispatch_navigation(request)?;
    app.emit(NOTIFICATION_NAVIGATION_CHANGED_EVENT, action.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "notification.navigation.emitFailed",
                "无法同步通知跳转。",
                "目标窗口可能未及时收到跳转；请重试或从主窗口手动打开。",
                Some(error.to_string()),
            )
        })?;

    Ok(NotificationNavigationResult { action })
}

#[tauri::command]
pub fn notification_ignore_all_unread(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    request: NotificationIgnoreAllRequest,
) -> Result<NotificationIgnoreAllResult, AppError> {
    let result = notification_state.ignore_all_unread(request);
    app.emit(NOTIFICATION_UNREAD_CHANGED_EVENT, result.summary.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "notification.ignoreAll.emitFailed",
                "无法忽略全部未读通知。",
                "通知仍保持未读；请稍后重试。",
                Some(error.to_string()),
            )
        })?;

    Ok(result)
}
