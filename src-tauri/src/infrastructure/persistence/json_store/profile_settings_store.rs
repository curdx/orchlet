use std::{
    fs,
    path::{Path, PathBuf},
};

use ulid::Ulid;

use crate::{
    contracts::{AppError, ProfileSettingsSnapshot, ProfileStatus},
    domain::settings::{
        default_profile_timezone, validate_profile_settings, DEFAULT_PROFILE_DISPLAY_NAME,
        PROFILE_SETTINGS_DIR_NAME, PROFILE_SETTINGS_FILE_NAME, PROFILE_SETTINGS_SCHEMA_VERSION,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const PROFILE_SETTINGS_STORE_SCHEMA_VERSION: u32 = 1;

pub fn profile_settings_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn profile_settings_path(app_data_dir: &Path) -> PathBuf {
    profile_settings_dir(app_data_dir).join(PROFILE_SETTINGS_FILE_NAME)
}

pub fn default_profile_settings() -> ProfileSettingsSnapshot {
    let timestamp = now_ms();

    ProfileSettingsSnapshot {
        schema_version: PROFILE_SETTINGS_SCHEMA_VERSION,
        display_name: DEFAULT_PROFILE_DISPLAY_NAME.to_owned(),
        timezone: default_profile_timezone(),
        status: ProfileStatus::Online,
        status_message: None,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn load_profile_settings(app_data_dir: &Path) -> Result<ProfileSettingsSnapshot, AppError> {
    let path = profile_settings_path(app_data_dir);

    if !path.exists() {
        return Ok(default_profile_settings());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.readFailed",
            "无法读取个人资料设置。",
            "个人资料未更新；请检查 settings/profile.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.invalidJson",
            "个人资料设置不是有效 JSON。",
            "请先备份或修复 settings/profile.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let profile: ProfileSettingsSnapshot = serde_json::from_value(value).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.invalidFields",
            format!("个人资料设置字段无效：{}。", error),
            "请先备份或修复 settings/profile.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    validate_profile_settings(&profile)?;

    Ok(profile)
}

pub fn save_profile_settings(
    app_data_dir: &Path,
    profile: &ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    validate_profile_settings(profile)?;

    let path = profile_settings_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.profile.invalidPath",
            "无法定位个人资料设置目录。",
            "个人资料未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.createDirFailed",
            "无法创建个人资料设置目录。",
            "个人资料未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_profile_settings_atomic(&path, profile)
}

pub fn validate_profile_settings_store(app_data_dir: &Path) -> Result<(), AppError> {
    load_profile_settings(app_data_dir).map(|_| ())
}

fn write_profile_settings_atomic(
    path: &Path,
    profile: &ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(profile).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.serializeFailed",
            "无法序列化个人资料设置。",
            "个人资料未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        PROFILE_SETTINGS_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.writeFailed",
            "无法写入个人资料设置。",
            "个人资料未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "settings.profile.renameFailed",
            "无法完成个人资料设置写入。",
            "个人资料未更新；请检查应用数据目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}
