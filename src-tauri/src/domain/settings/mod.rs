use crate::contracts::{AppError, ProfileSettingsSnapshot, ProfileStatus};

pub const PROFILE_SETTINGS_SCHEMA_VERSION: u32 = 1;
pub const PROFILE_SETTINGS_DIR_NAME: &str = "settings";
pub const PROFILE_SETTINGS_FILE_NAME: &str = "profile.json";
pub const PROFILE_DISPLAY_NAME_MAX_CHARS: usize = 64;
pub const PROFILE_STATUS_MESSAGE_MAX_CHARS: usize = 160;
pub const DEFAULT_PROFILE_DISPLAY_NAME: &str = "Owner";
pub const DEFAULT_PROFILE_TIMEZONE: &str = "UTC";

pub const SUPPORTED_PROFILE_TIMEZONES: &[&str] = &[
    "UTC",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Australia/Sydney",
];

pub fn default_profile_timezone() -> String {
    std::env::var("TZ")
        .ok()
        .and_then(|timezone| normalize_profile_timezone(timezone).ok())
        .unwrap_or_else(|| DEFAULT_PROFILE_TIMEZONE.to_owned())
}

pub fn normalize_profile_display_name(display_name: impl AsRef<str>) -> Result<String, AppError> {
    let display_name = display_name.as_ref().trim();

    if display_name.is_empty() {
        return Err(profile_field_error(
            "settings.profile.invalidDisplayName",
            "显示名称不能为空。",
            "请输入显示名称后重试。",
            "displayName",
        ));
    }

    if display_name.chars().count() > PROFILE_DISPLAY_NAME_MAX_CHARS {
        return Err(profile_field_error(
            "settings.profile.displayNameTooLong",
            "显示名称过长。",
            "请将显示名称缩短到 64 个字符以内。",
            "displayName",
        ));
    }

    Ok(display_name.to_owned())
}

pub fn normalize_profile_timezone(timezone: impl AsRef<str>) -> Result<String, AppError> {
    let timezone = timezone.as_ref().trim();

    if SUPPORTED_PROFILE_TIMEZONES.contains(&timezone) {
        return Ok(timezone.to_owned());
    }

    Err(profile_field_error(
        "settings.profile.unsupportedTimezone",
        "时区暂不支持。",
        "请选择设置中提供的时区后重试。",
        "timezone",
    ))
}

pub fn normalize_profile_status(status: impl AsRef<str>) -> Result<ProfileStatus, AppError> {
    match status.as_ref().trim() {
        "online" => Ok(ProfileStatus::Online),
        "offline" => Ok(ProfileStatus::Offline),
        "working" => Ok(ProfileStatus::Working),
        "doNotDisturb" => Ok(ProfileStatus::DoNotDisturb),
        _ => Err(profile_field_error(
            "settings.profile.unsupportedStatus",
            "状态暂不支持。",
            "请选择在线、工作中、请勿打扰或离线后重试。",
            "status",
        )),
    }
}

pub fn normalize_profile_status_message(
    status_message: impl AsRef<str>,
) -> Result<Option<String>, AppError> {
    let status_message = status_message.as_ref().trim();

    if status_message.is_empty() {
        return Ok(None);
    }

    if status_message.chars().count() > PROFILE_STATUS_MESSAGE_MAX_CHARS {
        return Err(profile_field_error(
            "settings.profile.statusMessageTooLong",
            "状态消息过长。",
            "请将状态消息缩短到 160 个字符以内。",
            "statusMessage",
        ));
    }

    Ok(Some(status_message.to_owned()))
}

pub fn validate_profile_settings(profile: &ProfileSettingsSnapshot) -> Result<(), AppError> {
    if profile.schema_version != PROFILE_SETTINGS_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "settings.profile.invalidRecordVersion",
            "个人资料设置版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份 profile.json。",
            Some(format!(
                "schemaVersion={} expected={}",
                profile.schema_version, PROFILE_SETTINGS_SCHEMA_VERSION
            )),
        ));
    }

    normalize_profile_display_name(&profile.display_name)?;
    normalize_profile_timezone(&profile.timezone)?;
    if let Some(status_message) = &profile.status_message {
        normalize_profile_status_message(status_message)?;
    }

    if profile.created_at_ms == 0 || profile.updated_at_ms < profile.created_at_ms {
        return Err(AppError::recoverable_error(
            "settings.profile.invalidTimestamp",
            "个人资料设置时间戳无效。",
            "请修复 profile.json 中的时间戳后重试。",
            Some(format!(
                "createdAtMs={} updatedAtMs={}",
                profile.created_at_ms, profile.updated_at_ms
            )),
        ));
    }

    Ok(())
}

fn profile_field_error(code: &str, message: &str, user_action: &str, field: &str) -> AppError {
    AppError::recoverable_error(code, message, user_action, Some(format!("field={}", field)))
}
