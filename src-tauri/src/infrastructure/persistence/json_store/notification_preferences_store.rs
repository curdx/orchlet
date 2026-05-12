use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    contracts::{
        AppError, NotificationPermissionSnapshot, NotificationPermissionState,
        NotificationPreferencesSnapshot,
    },
    domain::{
        notification::{
            validate_notification_preferences, NOTIFICATION_PREFERENCES_FILE_NAME,
            NOTIFICATION_PREFERENCES_SCHEMA_VERSION,
        },
        settings::PROFILE_SETTINGS_DIR_NAME,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const NOTIFICATION_PREFERENCES_STORE_SCHEMA_VERSION: u32 = 1;

pub fn notification_preferences_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn notification_preferences_path(app_data_dir: &Path) -> PathBuf {
    notification_preferences_dir(app_data_dir).join(NOTIFICATION_PREFERENCES_FILE_NAME)
}

pub fn default_notification_preferences() -> NotificationPreferencesSnapshot {
    let timestamp = now_ms();

    NotificationPreferencesSnapshot {
        schema_version: NOTIFICATION_PREFERENCES_SCHEMA_VERSION,
        desktop_notifications_enabled: true,
        sound_enabled: true,
        mentions_only: false,
        message_preview_enabled: true,
        dnd_enabled: false,
        dnd_start_minutes: 22 * 60,
        dnd_end_minutes: 8 * 60,
        permission: unavailable_permission_snapshot(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn unavailable_permission_snapshot() -> NotificationPermissionSnapshot {
    NotificationPermissionSnapshot {
        state: NotificationPermissionState::Unavailable,
        message: "系统通知权限适配器当前不可用。".to_owned(),
        user_action: "当前版本仍会保存本地通知偏好；启用系统通知需要后续平台适配。".to_owned(),
    }
}

pub fn load_notification_preferences(
    app_data_dir: &Path,
) -> Result<NotificationPreferencesSnapshot, AppError> {
    let path = notification_preferences_path(app_data_dir);

    if !path.exists() {
        return Ok(default_notification_preferences());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.readFailed",
            "无法读取通知偏好设置。",
            "通知偏好未更新；请检查 settings/notifications.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.invalidJson",
            "通知偏好设置不是有效 JSON。",
            "请先备份或修复 settings/notifications.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let mut preferences: NotificationPreferencesSnapshot =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "notification.preferences.invalidFields",
                format!("通知偏好设置字段无效：{}。", error),
                "请先备份或修复 settings/notifications.json 后重试。",
                Some(format!("{}: {}", path.display(), error)),
            )
        })?;

    preferences.permission = unavailable_permission_snapshot();
    validate_notification_preferences(&preferences)?;

    Ok(preferences)
}

pub fn save_notification_preferences(
    app_data_dir: &Path,
    preferences: &NotificationPreferencesSnapshot,
) -> Result<(), AppError> {
    validate_notification_preferences(preferences)?;

    let path = notification_preferences_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "notification.preferences.invalidPath",
            "无法定位通知偏好设置目录。",
            "通知偏好未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.createDirFailed",
            "无法创建通知偏好设置目录。",
            "通知偏好未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_notification_preferences_atomic(&path, preferences)
}

pub fn validate_notification_preferences_store(app_data_dir: &Path) -> Result<(), AppError> {
    load_notification_preferences(app_data_dir).map(|_| ())
}

fn write_notification_preferences_atomic(
    path: &Path,
    preferences: &NotificationPreferencesSnapshot,
) -> Result<(), AppError> {
    let temp_path = path.with_extension("json.tmp");
    let body = serde_json::to_string_pretty(preferences).map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.serializeFailed",
            "无法序列化通知偏好设置。",
            "通知偏好未更新；请重试。",
            Some(error.to_string()),
        )
    })?;

    fs::write(&temp_path, body).map_err(|error| {
        AppError::recoverable_error(
            "notification.preferences.writeFailed",
            "无法写入通知偏好设置。",
            "通知偏好未更新；请检查 settings/notifications.json 权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;
    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "notification.preferences.renameFailed",
            "无法保存通知偏好设置。",
            "通知偏好未更新；请检查 settings/notifications.json 权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        default_notification_preferences, load_notification_preferences,
        notification_preferences_path, save_notification_preferences,
    };

    #[test]
    fn persists_and_restores_notification_preferences() {
        let app_data = tempdir().expect("app data");
        let mut preferences = default_notification_preferences();
        preferences.desktop_notifications_enabled = false;
        preferences.sound_enabled = false;
        preferences.mentions_only = true;
        preferences.message_preview_enabled = false;
        preferences.dnd_enabled = true;
        preferences.dnd_start_minutes = 21 * 60;
        preferences.dnd_end_minutes = 7 * 60;
        preferences.updated_at_ms = preferences.created_at_ms + 1;

        save_notification_preferences(app_data.path(), &preferences).expect("saved");
        let restored = load_notification_preferences(app_data.path()).expect("restored");

        assert!(!restored.desktop_notifications_enabled);
        assert!(!restored.sound_enabled);
        assert!(restored.mentions_only);
        assert!(!restored.message_preview_enabled);
        assert!(restored.dnd_enabled);
        assert_eq!(restored.dnd_start_minutes, 21 * 60);
        assert_eq!(restored.dnd_end_minutes, 7 * 60);
    }

    #[test]
    fn invalid_notification_preferences_json_is_recoverable() {
        let app_data = tempdir().expect("app data");
        let path = notification_preferences_path(app_data.path());
        fs::create_dir_all(path.parent().expect("settings dir")).expect("settings dir");
        fs::write(&path, "{").expect("invalid json");

        let error = load_notification_preferences(app_data.path()).expect_err("invalid json");

        assert_eq!(error.code, "notification.preferences.invalidJson");
        assert!(error.recoverable);
    }
}
