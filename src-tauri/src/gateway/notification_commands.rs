use crate::{
    app::notification::{
        get_notification_preferences, update_notification_preferences, NotificationRuntimeState,
        NOTIFICATION_NAVIGATION_CHANGED_EVENT, NOTIFICATION_PREFERENCES_CHANGED_EVENT,
        NOTIFICATION_UNREAD_CHANGED_EVENT,
    },
    contracts::{
        AppError, NotificationIgnoreAllRequest, NotificationIgnoreAllResult,
        NotificationNavigationPendingRequest, NotificationNavigationPendingResult,
        NotificationNavigationRequest, NotificationNavigationResult,
        NotificationPreferencesGetRequest, NotificationPreferencesGetResult,
        NotificationPreferencesUpdateRequest, NotificationPreferencesUpdateResult,
        NotificationUnreadSummaryRequest, NotificationUnreadSummaryResult,
        NotificationUnreadUpdateRequest, NotificationUnreadUpdateResult,
    },
};
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub fn notification_preferences_get(
    app: AppHandle,
    _request: NotificationPreferencesGetRequest,
) -> Result<NotificationPreferencesGetResult, AppError> {
    get_notification_preferences(app_data_dir(&app)?)
}

#[tauri::command]
pub fn notification_preferences_update(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    request: NotificationPreferencesUpdateRequest,
) -> Result<NotificationPreferencesUpdateResult, AppError> {
    let result = update_notification_preferences(app_data_dir(&app)?, request)?;
    let summary = notification_state.apply_preferences(&result.preferences);

    app.emit(
        NOTIFICATION_PREFERENCES_CHANGED_EVENT,
        result.preferences.clone(),
    )
    .map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.emitFailed",
            "无法同步通知偏好设置。",
            "当前窗口已保存；请重新打开其他窗口或重试。",
            Some(error.to_string()),
        )
    })?;
    app.emit(NOTIFICATION_UNREAD_CHANGED_EVENT, summary)
        .map_err(|error| {
            AppError::recoverable_error(
                "notification.unread.emitFailed",
                "无法同步未读状态。",
                "通知偏好已保存；请重新打开通知预览或重试。",
                Some(error.to_string()),
            )
        })?;
    #[cfg(desktop)]
    notification_state.apply_native_tray_state(&app);

    Ok(result)
}

#[tauri::command]
pub fn notification_unread_summary_get(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    _request: NotificationUnreadSummaryRequest,
) -> Result<NotificationUnreadSummaryResult, AppError> {
    let preferences = get_notification_preferences(app_data_dir(&app)?)?.preferences;

    Ok(NotificationUnreadSummaryResult {
        summary: notification_state.unread_summary_with_preferences(&preferences),
    })
}

#[tauri::command]
pub fn notification_unread_summary_update(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    request: NotificationUnreadUpdateRequest,
) -> Result<NotificationUnreadUpdateResult, AppError> {
    let preferences = get_notification_preferences(app_data_dir(&app)?)?.preferences;
    let summary = notification_state.update_unread_summary_with_preferences(request, &preferences);
    app.emit(NOTIFICATION_UNREAD_CHANGED_EVENT, summary.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "notification.unread.emitFailed",
                "无法同步未读状态。",
                "当前窗口已更新；请重新打开通知预览或重试。",
                Some(error.to_string()),
            )
        })?;
    #[cfg(desktop)]
    notification_state.apply_native_tray_state(&app);

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
    let preferences = get_notification_preferences(app_data_dir(&app)?)?.preferences;
    let result = notification_state.ignore_all_unread_with_preferences(request, &preferences);
    app.emit(NOTIFICATION_UNREAD_CHANGED_EVENT, result.summary.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "notification.ignoreAll.emitFailed",
                "无法忽略全部未读通知。",
                "通知仍保持未读；请稍后重试。",
                Some(error.to_string()),
            )
        })?;
    #[cfg(desktop)]
    notification_state.apply_native_tray_state(&app);

    Ok(result)
}

#[tauri::command]
pub fn notification_preview_hover(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
    hovered: bool,
) {
    #[cfg(desktop)]
    notification_state.set_preview_hovered(&app, hovered);
}

#[tauri::command]
pub fn notification_preview_hide(
    app: AppHandle,
    notification_state: State<'_, NotificationRuntimeState>,
) {
    #[cfg(desktop)]
    notification_state.force_hide_preview(&app);
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.appDataDirFailed",
            "无法定位应用数据目录。",
            "通知偏好未更新；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
