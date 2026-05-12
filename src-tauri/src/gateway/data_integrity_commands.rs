use std::path::PathBuf;

use crate::{
    app::{data_integrity::validate_data_integrity, window_context::WindowContextRuntimeState},
    contracts::{AppError, DataIntegrityValidateRequest, DataIntegrityValidateResult},
};
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn data_integrity_validate(
    app: AppHandle,
    window_context_state: State<'_, WindowContextRuntimeState>,
    request: DataIntegrityValidateRequest,
) -> Result<DataIntegrityValidateResult, AppError> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "dataIntegrity.appDataDirFailed",
            "无法定位应用数据目录。",
            "数据验证未运行；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })?;
    let requested_workspace_root = request.workspace_root.map(PathBuf::from);
    let active_workspace = window_context_state.active_workspace();
    let report = validate_data_integrity(app_data_dir, active_workspace, requested_workspace_root);

    Ok(DataIntegrityValidateResult { report })
}
