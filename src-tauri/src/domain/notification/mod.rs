use crate::contracts::{AppError, NotificationPreferencesSnapshot};

pub const NOTIFICATION_PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const NOTIFICATION_PREFERENCES_FILE_NAME: &str = "notifications.json";
pub const DND_DAY_MINUTES: u16 = 24 * 60;

pub fn validate_notification_preferences(
    preferences: &NotificationPreferencesSnapshot,
) -> Result<(), AppError> {
    if preferences.schema_version != NOTIFICATION_PREFERENCES_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "notification.preferences.invalidRecordVersion",
            "通知偏好设置版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份 notifications.json。",
            Some(format!(
                "schemaVersion={} expected={}",
                preferences.schema_version, NOTIFICATION_PREFERENCES_SCHEMA_VERSION
            )),
        ));
    }

    validate_dnd_minutes(preferences.dnd_start_minutes, "dndStartMinutes")?;
    validate_dnd_minutes(preferences.dnd_end_minutes, "dndEndMinutes")?;

    if preferences.dnd_enabled && preferences.dnd_start_minutes == preferences.dnd_end_minutes {
        return Err(notification_field_error(
            "notification.preferences.invalidDndWindow",
            "静默时段不能覆盖整天或为空。",
            "请选择不同的开始和结束时间后重试。",
            "dnd",
        ));
    }

    if preferences.created_at_ms == 0 || preferences.updated_at_ms < preferences.created_at_ms {
        return Err(AppError::recoverable_error(
            "notification.preferences.invalidTimestamp",
            "通知偏好设置时间戳无效。",
            "请修复 notifications.json 中的时间戳后重试。",
            Some(format!(
                "createdAtMs={} updatedAtMs={}",
                preferences.created_at_ms, preferences.updated_at_ms
            )),
        ));
    }

    Ok(())
}

pub fn is_dnd_active_at_minute(
    preferences: &NotificationPreferencesSnapshot,
    minute_of_day: u16,
) -> bool {
    if !preferences.dnd_enabled || minute_of_day >= DND_DAY_MINUTES {
        return false;
    }

    let start = preferences.dnd_start_minutes;
    let end = preferences.dnd_end_minutes;

    if start < end {
        minute_of_day >= start && minute_of_day < end
    } else {
        minute_of_day >= start || minute_of_day < end
    }
}

fn validate_dnd_minutes(minutes: u16, field: &'static str) -> Result<(), AppError> {
    if minutes < DND_DAY_MINUTES {
        return Ok(());
    }

    Err(notification_field_error(
        "notification.preferences.invalidDndTime",
        "静默时段时间无效。",
        "请选择 00:00 到 23:59 之间的时间。",
        field,
    ))
}

fn notification_field_error(
    code: &'static str,
    message: impl Into<String>,
    user_action: impl Into<String>,
    field: &'static str,
) -> AppError {
    AppError::recoverable_error(code, message, user_action, Some(format!("field={}", field)))
}
