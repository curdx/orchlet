use crate::infrastructure::persistence::json_store::app_preferences_store::to_runtime_preferences;
use crate::{
    app::diagnostics::{best_effort_event, record_workspace_diagnostics_event_best_effort},
    app::members::initialize_members,
    app::settings::{get_app_preferences, update_app_preferences},
    app::window_context::{
        WindowContextRuntimeState, APP_PREFERENCES_CHANGED_EVENT, WINDOW_CONTEXT_CHANGED_EVENT,
    },
    app::workspace::{
        list_recent_workspaces, open_workspace, open_workspace_in_file_manager,
        WorkspaceRuntimeState,
    },
    contracts::{
        AppError, DiagnosticsCorrelationIds, DiagnosticsEventScope, DiagnosticsEventSeverity,
        DiagnosticsMetadataEntry, OpenWindowModeRequest, OpenWindowModeResult,
        OpenWorkspaceInFileManagerRequest, OpenWorkspaceInFileManagerResult, OpenWorkspaceRequest,
        OpenWorkspaceResult, RecentWorkspaceEntry, RegisterWindowRequest, RegisteredWindow,
        UpdateAppPreferencesRequest, WindowContextSnapshot, WindowMode, WorkspaceOpenStatus,
        WorkspaceSelectionStatus,
    },
};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn workspace_selection_status(app: AppHandle) -> WorkspaceSelectionStatus {
    let recent_workspace_count = app_data_dir(&app)
        .and_then(|app_data_dir| list_recent_workspaces(app_data_dir).map(|entries| entries.len()))
        .unwrap_or(0) as u32;

    WorkspaceSelectionStatus {
        window_mode: WindowMode::WorkspaceSelection,
        can_open_workspace: true,
        recent_workspace_count,
    }
}

#[tauri::command]
pub fn workspace_recent_list(app: AppHandle) -> Result<Vec<RecentWorkspaceEntry>, AppError> {
    list_recent_workspaces(app_data_dir(&app)?)
}

#[tauri::command]
pub fn workspace_open(
    app: AppHandle,
    runtime_state: State<'_, WorkspaceRuntimeState>,
    window_context_state: State<'_, WindowContextRuntimeState>,
    request: OpenWorkspaceRequest,
) -> Result<OpenWorkspaceResult, AppError> {
    let mut result = open_workspace(request, app_data_dir(&app)?, &runtime_state, "main")?;

    if result.status == WorkspaceOpenStatus::FocusedExisting && !surface_main_window(&app) {
        if let Some(workspace) = &result.workspace {
            runtime_state.mark_open(workspace.metadata.project_id.clone(), "main");
            result.status = WorkspaceOpenStatus::Opened;
        }
    }

    if let Some(workspace) = result.workspace.clone() {
        initialize_members(app_data_dir(&app)?, &workspace.metadata.project_id)?;
        let snapshot = window_context_state.set_active_workspace(workspace, "main");
        emit_context_snapshot(&app, &snapshot)?;
        if let Some(active_workspace) = snapshot.active_workspace.as_ref() {
            if let Ok(app_data_dir) = app_data_dir(&app) {
                record_workspace_diagnostics_event_best_effort(
                    app_data_dir,
                    best_effort_event(
                        &active_workspace.metadata.project_id,
                        DiagnosticsEventScope::Window,
                        "workspace.opened",
                        DiagnosticsEventSeverity::Info,
                        DiagnosticsCorrelationIds {
                            workspace_id: Some(active_workspace.metadata.project_id.clone()),
                            window_label: Some(snapshot.current_window.label.clone()),
                            ..DiagnosticsCorrelationIds::default()
                        },
                        vec![DiagnosticsMetadataEntry {
                            key: "status".to_owned(),
                            value: format!("{:?}", result.status),
                        }],
                    ),
                );
            }
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn workspace_open_in_file_manager(
    app: AppHandle,
    request: OpenWorkspaceInFileManagerRequest,
) -> Result<OpenWorkspaceInFileManagerResult, AppError> {
    open_workspace_in_file_manager(request, |path| {
        app.opener()
            .open_path(path.to_string_lossy().into_owned(), None::<&str>)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn window_context_get(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    request: RegisterWindowRequest,
) -> Result<WindowContextSnapshot, AppError> {
    hydrate_preferences(&app, &window_context_state)?;
    Ok(window_context_state.snapshot_for(RegisteredWindow {
        label: request.label,
        mode: request.mode,
    }))
}

#[tauri::command]
pub fn window_context_register(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    request: RegisterWindowRequest,
) -> Result<WindowContextSnapshot, AppError> {
    hydrate_preferences(&app, &window_context_state)?;
    let snapshot = window_context_state.register_window(RegisteredWindow {
        label: request.label,
        mode: request.mode,
    });
    emit_context_snapshot(&app, &snapshot)?;
    if let Some(active_workspace) = snapshot.active_workspace.as_ref() {
        if let Ok(app_data_dir) = app_data_dir(&app) {
            record_workspace_diagnostics_event_best_effort(
                app_data_dir,
                best_effort_event(
                    &active_workspace.metadata.project_id,
                    DiagnosticsEventScope::Window,
                    "window.registered",
                    DiagnosticsEventSeverity::Info,
                    DiagnosticsCorrelationIds {
                        workspace_id: Some(active_workspace.metadata.project_id.clone()),
                        window_label: Some(snapshot.current_window.label.clone()),
                        ..DiagnosticsCorrelationIds::default()
                    },
                    vec![DiagnosticsMetadataEntry {
                        key: "mode".to_owned(),
                        value: format!("{:?}", snapshot.current_window.mode),
                    }],
                ),
            );
        }
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn app_preferences_update(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    request: UpdateAppPreferencesRequest,
) -> Result<WindowContextSnapshot, AppError> {
    let source_window_label = request.source_window_label.clone();
    let preferences = update_app_preferences(app_data_dir(&app)?, request)?;
    let snapshot = window_context_state.update_preferences(
        Some(preferences.theme),
        Some(preferences.language),
        source_window_label,
    );

    app.emit(APP_PREFERENCES_CHANGED_EVENT, snapshot.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "windowContext.preferencesEmitFailed",
                "无法同步主题或语言设置。",
                "当前窗口已更新；请重新打开其他窗口或重试该操作。",
                Some(error.to_string()),
            )
        })?;
    emit_context_snapshot(&app, &snapshot)?;

    Ok(snapshot)
}

#[tauri::command]
pub async fn window_open_mode(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    request: OpenWindowModeRequest,
) -> Result<OpenWindowModeResult, AppError> {
    open_or_focus_window_mode(&app, &window_context_state, request.mode).await
}

pub async fn open_or_focus_window_mode(
    app: &AppHandle,
    window_context_state: &WindowContextRuntimeState,
    mode: WindowMode,
) -> Result<OpenWindowModeResult, AppError> {
    let window = registered_window_for_mode(mode);
    let opened = if let Some(existing_window) = app.get_webview_window(&window.label) {
        let show_result = existing_window.show();
        let focus_result = existing_window.set_focus();

        show_result.is_ok() && focus_result.is_ok()
    } else {
        WebviewWindowBuilder::new(app, &window.label, WebviewUrl::App("index.html".into()))
            .title(window_title(&window.mode))
            .inner_size(900.0, 640.0)
            .build()
            .map_err(|error| {
                AppError::recoverable_error(
                    "windowContext.openWindowFailed",
                    "无法打开目标窗口。",
                    "当前窗口仍可继续使用；请重试或检查桌面窗口权限。",
                    Some(format!("{}: {}", window.label, error)),
                )
            })?;
        true
    };

    let snapshot = window_context_state.register_window(window.clone());
    emit_context_snapshot(app, &snapshot)?;

    Ok(OpenWindowModeResult { window, opened })
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "workspace.registry.appDataDirFailed",
            "无法定位应用数据目录。",
            "最近工作区未更新；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}

fn surface_main_window(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .map(|window| {
            let show_result = window.show();
            let focus_result = window.set_focus();
            show_result.is_ok() && focus_result.is_ok()
        })
        .unwrap_or(false)
}

fn emit_context_snapshot(
    app: &AppHandle,
    snapshot: &WindowContextSnapshot,
) -> Result<(), AppError> {
    app.emit(WINDOW_CONTEXT_CHANGED_EVENT, snapshot.clone())
        .map_err(|error| {
            AppError::recoverable_error(
                "windowContext.emitFailed",
                "无法同步窗口上下文。",
                "当前操作已完成；请重新打开其他窗口或重试同步操作。",
                Some(error.to_string()),
            )
        })
}

fn hydrate_preferences(
    app: &AppHandle,
    window_context_state: &WindowContextRuntimeState,
) -> Result<(), AppError> {
    let preferences = get_app_preferences(app_data_dir(app)?)?;
    window_context_state.replace_preferences(to_runtime_preferences(&preferences), None);
    Ok(())
}

fn registered_window_for_mode(mode: WindowMode) -> RegisteredWindow {
    RegisteredWindow {
        label: window_label(&mode).to_owned(),
        mode,
    }
}

fn window_label(mode: &WindowMode) -> &'static str {
    match mode {
        WindowMode::Main => "main",
        WindowMode::WorkspaceSelection => "workspace-selection",
        WindowMode::Terminal => "terminal",
        WindowMode::NotificationPreview => "notification-preview",
    }
}

fn window_title(mode: &WindowMode) -> &'static str {
    match mode {
        WindowMode::Main => "orchlet",
        WindowMode::WorkspaceSelection => "orchlet - workspace",
        WindowMode::Terminal => "orchlet - terminal",
        WindowMode::NotificationPreview => "orchlet - notifications",
    }
}
