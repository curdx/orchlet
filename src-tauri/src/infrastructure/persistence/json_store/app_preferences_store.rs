use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    contracts::{
        AppError, AppLanguage, AppPreferencesSettingsSnapshot, AppPreferencesSnapshot, AppTheme,
    },
    domain::settings::{
        validate_app_preferences, APP_PREFERENCES_FILE_NAME, APP_PREFERENCES_SCHEMA_VERSION,
        PROFILE_SETTINGS_DIR_NAME,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const APP_PREFERENCES_STORE_SCHEMA_VERSION: u32 = 1;

pub fn app_preferences_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn app_preferences_path(app_data_dir: &Path) -> PathBuf {
    app_preferences_dir(app_data_dir).join(APP_PREFERENCES_FILE_NAME)
}

pub fn default_app_preferences() -> AppPreferencesSettingsSnapshot {
    let timestamp = now_ms();

    AppPreferencesSettingsSnapshot {
        schema_version: APP_PREFERENCES_SCHEMA_VERSION,
        theme: AppTheme::System,
        language: AppLanguage::ZhCn,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn load_app_preferences(
    app_data_dir: &Path,
) -> Result<AppPreferencesSettingsSnapshot, AppError> {
    let path = app_preferences_path(app_data_dir);

    if !path.exists() {
        if let Some(preferences) =
            crate::infrastructure::persistence::json_store::legacy_global_settings_store::load_legacy_app_preferences(app_data_dir)?
        {
            return Ok(preferences);
        }
        return Ok(default_app_preferences());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.preferences.readFailed",
            "无法读取应用偏好设置。",
            "主题和语言未更新；请检查 settings/preferences.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.preferences.invalidJson",
            "应用偏好设置不是有效 JSON。",
            "请先备份或修复 settings/preferences.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let preferences: AppPreferencesSettingsSnapshot =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "settings.preferences.invalidFields",
                format!("应用偏好设置字段无效：{}。", error),
                "请先备份或修复 settings/preferences.json 后重试。",
                Some(format!("{}: {}", path.display(), error)),
            )
        })?;

    validate_app_preferences(&preferences)?;

    Ok(preferences)
}

pub fn save_app_preferences(
    app_data_dir: &Path,
    preferences: &AppPreferencesSettingsSnapshot,
) -> Result<(), AppError> {
    validate_app_preferences(preferences)?;

    let path = app_preferences_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.preferences.invalidPath",
            "无法定位应用偏好设置目录。",
            "主题和语言未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.preferences.createDirFailed",
            "无法创建应用偏好设置目录。",
            "主题和语言未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_app_preferences_atomic(&path, preferences)
}

pub fn validate_app_preferences_store(app_data_dir: &Path) -> Result<(), AppError> {
    load_app_preferences(app_data_dir).map(|_| ())
}

pub fn to_runtime_preferences(
    preferences: &AppPreferencesSettingsSnapshot,
) -> AppPreferencesSnapshot {
    AppPreferencesSnapshot {
        theme: preferences.theme.clone(),
        language: preferences.language.clone(),
    }
}

fn write_app_preferences_atomic(
    path: &Path,
    preferences: &AppPreferencesSettingsSnapshot,
) -> Result<(), AppError> {
    let temp_path = path.with_extension("json.tmp");
    let body = serde_json::to_string_pretty(preferences).map_err(|error| {
        AppError::recoverable_error(
            "settings.preferences.serializeFailed",
            "无法序列化应用偏好设置。",
            "主题和语言未更新；请重试。",
            Some(error.to_string()),
        )
    })?;

    fs::write(&temp_path, body).map_err(|error| {
        AppError::recoverable_error(
            "settings.preferences.writeFailed",
            "无法写入应用偏好设置。",
            "主题和语言未更新；请检查 settings/preferences.json 权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;
    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "settings.preferences.renameFailed",
            "无法保存应用偏好设置。",
            "主题和语言未更新；请检查 settings/preferences.json 权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}
