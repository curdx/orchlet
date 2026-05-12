use std::path::Path;

use crate::contracts::{
    AppError, ProfileAvatarKind, ProfileAvatarSnapshot, ProfileSettingsSnapshot, ProfileStatus,
};

pub const PROFILE_SETTINGS_SCHEMA_VERSION: u32 = 1;
pub const PROFILE_SETTINGS_DIR_NAME: &str = "settings";
pub const PROFILE_SETTINGS_FILE_NAME: &str = "profile.json";
pub const AVATAR_LIBRARY_DIR_NAME: &str = "avatars";
pub const AVATAR_UPLOADS_DIR_NAME: &str = "uploads";
pub const PROFILE_DISPLAY_NAME_MAX_CHARS: usize = 64;
pub const PROFILE_STATUS_MESSAGE_MAX_CHARS: usize = 160;
pub const PROFILE_AVATAR_MAX_BYTES: u64 = 2 * 1024 * 1024;
pub const DEFAULT_PROFILE_DISPLAY_NAME: &str = "Owner";
pub const DEFAULT_PROFILE_TIMEZONE: &str = "UTC";

pub const PROFILE_AVATAR_PRESETS: &[&str] = &["orchid", "lagoon", "sunrise", "forest"];

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

pub fn placeholder_avatar_snapshot(timestamp: u64) -> ProfileAvatarSnapshot {
    ProfileAvatarSnapshot {
        kind: ProfileAvatarKind::Placeholder,
        preset_id: None,
        upload_id: None,
        source_file_name: None,
        content_type: None,
        size_bytes: None,
        library_relative_path: None,
        preview_data_url: None,
        updated_at_ms: timestamp,
    }
}

pub fn preset_avatar_snapshot(
    preset_id: impl AsRef<str>,
    timestamp: u64,
) -> Result<ProfileAvatarSnapshot, AppError> {
    let preset_id = normalize_profile_avatar_preset_id(preset_id)?;

    Ok(ProfileAvatarSnapshot {
        kind: ProfileAvatarKind::Preset,
        preset_id: Some(preset_id),
        upload_id: None,
        source_file_name: None,
        content_type: None,
        size_bytes: None,
        library_relative_path: None,
        preview_data_url: None,
        updated_at_ms: timestamp,
    })
}

pub fn uploaded_avatar_snapshot(
    upload_id: String,
    source_file_name: String,
    content_type: String,
    size_bytes: u64,
    library_relative_path: String,
    preview_data_url: Option<String>,
    timestamp: u64,
) -> ProfileAvatarSnapshot {
    ProfileAvatarSnapshot {
        kind: ProfileAvatarKind::Uploaded,
        preset_id: None,
        upload_id: Some(upload_id),
        source_file_name: Some(source_file_name),
        content_type: Some(content_type),
        size_bytes: Some(size_bytes),
        library_relative_path: Some(library_relative_path),
        preview_data_url,
        updated_at_ms: timestamp,
    }
}

pub fn normalize_profile_avatar_preset_id(preset_id: impl AsRef<str>) -> Result<String, AppError> {
    let preset_id = preset_id.as_ref().trim();

    if PROFILE_AVATAR_PRESETS.contains(&preset_id) {
        return Ok(preset_id.to_owned());
    }

    Err(profile_field_error(
        "settings.avatar.unsupportedPreset",
        "头像预设暂不支持。",
        "请选择设置中提供的头像预设后重试。",
        "avatar",
    ))
}

pub fn avatar_content_type_for_extension(extension: impl AsRef<str>) -> Result<String, AppError> {
    let extension = extension.as_ref().trim().to_ascii_lowercase();

    match extension.as_str() {
        "png" => Ok("image/png".to_owned()),
        "jpg" | "jpeg" => Ok("image/jpeg".to_owned()),
        "webp" => Ok("image/webp".to_owned()),
        "gif" => Ok("image/gif".to_owned()),
        _ => Err(profile_field_error(
            "settings.avatar.unsupportedFileType",
            "头像图片格式暂不支持。",
            "请选择 PNG、JPG、WEBP 或 GIF 图片后重试。",
            "avatar",
        )),
    }
}

pub fn validate_profile_avatar_source_path(path: &Path, size_bytes: u64) -> Result<(), AppError> {
    if size_bytes == 0 {
        return Err(profile_field_error(
            "settings.avatar.emptyFile",
            "头像图片为空。",
            "请选择有效的头像图片后重试。",
            "avatar",
        ));
    }

    if size_bytes > PROFILE_AVATAR_MAX_BYTES {
        return Err(profile_field_error(
            "settings.avatar.fileTooLarge",
            "头像图片过大。",
            "请选择 2 MB 以内的头像图片后重试。",
            "avatar",
        ));
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or_else(|| {
            profile_field_error(
                "settings.avatar.missingExtension",
                "头像图片缺少文件扩展名。",
                "请选择 PNG、JPG、WEBP 或 GIF 图片后重试。",
                "avatar",
            )
        })?;
    avatar_content_type_for_extension(extension)?;

    Ok(())
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
    if let Some(avatar) = &profile.avatar {
        validate_profile_avatar(avatar)?;
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

pub fn validate_profile_avatar(avatar: &ProfileAvatarSnapshot) -> Result<(), AppError> {
    match avatar.kind {
        ProfileAvatarKind::Placeholder => {
            if avatar.preset_id.is_some()
                || avatar.upload_id.is_some()
                || avatar.library_relative_path.is_some()
            {
                return Err(profile_field_error(
                    "settings.avatar.invalidPlaceholder",
                    "默认头像记录包含不应存在的资产字段。",
                    "请修复 profile.json 中的头像字段后重试。",
                    "avatar",
                ));
            }
        }
        ProfileAvatarKind::Preset => {
            let preset_id = avatar.preset_id.as_deref().ok_or_else(|| {
                profile_field_error(
                    "settings.avatar.missingPreset",
                    "头像预设缺少标识。",
                    "请选择头像预设后重试。",
                    "avatar",
                )
            })?;
            normalize_profile_avatar_preset_id(preset_id)?;

            if avatar.upload_id.is_some() || avatar.library_relative_path.is_some() {
                return Err(profile_field_error(
                    "settings.avatar.invalidPreset",
                    "头像预设记录包含上传资产字段。",
                    "请修复 profile.json 中的头像字段后重试。",
                    "avatar",
                ));
            }
        }
        ProfileAvatarKind::Uploaded => {
            if avatar
                .upload_id
                .as_deref()
                .unwrap_or_default()
                .trim()
                .is_empty()
                || avatar
                    .library_relative_path
                    .as_deref()
                    .unwrap_or_default()
                    .trim()
                    .is_empty()
                || avatar
                    .content_type
                    .as_deref()
                    .unwrap_or_default()
                    .trim()
                    .is_empty()
            {
                return Err(profile_field_error(
                    "settings.avatar.invalidUpload",
                    "上传头像记录缺少必要字段。",
                    "请重新上传头像后重试。",
                    "avatar",
                ));
            }

            if avatar.size_bytes.unwrap_or_default() == 0
                || avatar.size_bytes.unwrap_or_default() > PROFILE_AVATAR_MAX_BYTES
            {
                return Err(profile_field_error(
                    "settings.avatar.invalidUploadSize",
                    "上传头像大小无效。",
                    "请重新上传 2 MB 以内的头像图片。",
                    "avatar",
                ));
            }
        }
    }

    if avatar.updated_at_ms == 0 {
        return Err(profile_field_error(
            "settings.avatar.invalidTimestamp",
            "头像更新时间戳无效。",
            "请修复 profile.json 中的头像字段后重试。",
            "avatar",
        ));
    }

    Ok(())
}

fn profile_field_error(code: &str, message: &str, user_action: &str, field: &str) -> AppError {
    AppError::recoverable_error(code, message, user_action, Some(format!("field={}", field)))
}
