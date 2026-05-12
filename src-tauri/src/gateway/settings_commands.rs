use crate::{
    app::settings::{
        delete_uploaded_profile_avatar, get_profile_settings, get_shortcut_preferences,
        reset_profile_avatar, reset_shortcut_preferences, select_profile_avatar_preset,
        update_profile_settings, update_shortcut_preferences, upload_profile_avatar,
    },
    contracts::{
        AppError, DeleteUploadedProfileAvatarRequest, DeleteUploadedProfileAvatarResult,
        GetProfileSettingsRequest, GetProfileSettingsResult, GetShortcutPreferencesRequest,
        GetShortcutPreferencesResult, ResetProfileAvatarRequest, ResetProfileAvatarResult,
        ResetShortcutPreferencesRequest, ResetShortcutPreferencesResult,
        SelectProfileAvatarPresetRequest, SelectProfileAvatarPresetResult,
        UpdateProfileSettingsRequest, UpdateProfileSettingsResult,
        UpdateShortcutPreferencesRequest, UpdateShortcutPreferencesResult,
        UploadProfileAvatarRequest, UploadProfileAvatarResult,
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

#[tauri::command]
pub fn profile_avatar_upload(
    app: AppHandle,
    request: UploadProfileAvatarRequest,
) -> Result<UploadProfileAvatarResult, AppError> {
    upload_profile_avatar(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn profile_avatar_preset_select(
    app: AppHandle,
    request: SelectProfileAvatarPresetRequest,
) -> Result<SelectProfileAvatarPresetResult, AppError> {
    select_profile_avatar_preset(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn profile_avatar_reset(
    app: AppHandle,
    request: ResetProfileAvatarRequest,
) -> Result<ResetProfileAvatarResult, AppError> {
    reset_profile_avatar(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn profile_avatar_delete_uploaded(
    app: AppHandle,
    request: DeleteUploadedProfileAvatarRequest,
) -> Result<DeleteUploadedProfileAvatarResult, AppError> {
    delete_uploaded_profile_avatar(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn shortcut_preferences_get(
    app: AppHandle,
    request: GetShortcutPreferencesRequest,
) -> Result<GetShortcutPreferencesResult, AppError> {
    get_shortcut_preferences(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn shortcut_preferences_update(
    app: AppHandle,
    request: UpdateShortcutPreferencesRequest,
) -> Result<UpdateShortcutPreferencesResult, AppError> {
    update_shortcut_preferences(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn shortcut_preferences_reset(
    app: AppHandle,
    request: ResetShortcutPreferencesRequest,
) -> Result<ResetShortcutPreferencesResult, AppError> {
    reset_shortcut_preferences(app_data_dir(&app)?, request)
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
