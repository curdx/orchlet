use crate::{
    app::settings::{get_profile_settings, update_profile_settings},
    contracts::{
        AppError, GetProfileSettingsRequest, GetProfileSettingsResult,
        UpdateProfileSettingsRequest, UpdateProfileSettingsResult,
    },
};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn profile_settings_get(
    app: AppHandle,
    request: GetProfileSettingsRequest,
) -> Result<GetProfileSettingsResult, AppError> {
    get_profile_settings(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn profile_settings_update(
    app: AppHandle,
    request: UpdateProfileSettingsRequest,
) -> Result<UpdateProfileSettingsResult, AppError> {
    update_profile_settings(app_data_dir(&app)?, request)
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.appDataDirFailed",
            "无法定位应用数据目录。",
            "个人资料未更新；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
