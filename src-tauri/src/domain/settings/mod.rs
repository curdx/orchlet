use std::path::Path;

use crate::contracts::{
    AppError, AppPreferencesSettingsSnapshot, ProfileAvatarKind, ProfileAvatarSnapshot,
    ProfileSettingsSnapshot, ProfileStatus, ShortcutBindingSnapshot, ShortcutKeymapProfile,
    ShortcutPreferencesSnapshot,
};

pub const APP_PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const APP_PREFERENCES_FILE_NAME: &str = "preferences.json";
pub const SHORTCUT_PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const SHORTCUT_PREFERENCES_FILE_NAME: &str = "shortcuts.json";
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
pub const SHORTCUT_ACTION_CHAT_SEND: &str = "chat.send";
pub const SHORTCUT_ACTION_CHAT_NEWLINE: &str = "chat.newline";
pub const SHORTCUT_ACTION_CHAT_EMOJI_CLOSE: &str = "chat.emoji.close";
pub const SHORTCUT_ACTION_MENTION_INSERT: &str = "mention.insert";
pub const SHORTCUT_ACTION_CONVERSATION_FOCUS: &str = "conversation.focus";
pub const SHORTCUT_ACTION_TERMINAL_FIND_NEXT: &str = "terminal.find.next";
pub const SHORTCUT_ACTION_TERMINAL_FIND_PREVIOUS: &str = "terminal.find.previous";
pub const SHORTCUT_ACTION_TERMINAL_FIND_CLOSE: &str = "terminal.find.close";
pub const SHORTCUT_ACTION_SETTINGS_SAVE: &str = "settings.save";
pub const SHORTCUT_ACTION_NOTIFICATION_VIEW_ALL: &str = "notification.viewAll";
pub const SHORTCUT_ACTION_NOTIFICATION_IGNORE_ALL: &str = "notification.ignoreAll";
pub const SHORTCUT_ACTION_NOTIFICATION_OPEN_TERMINAL: &str = "notification.openTerminal";
pub const SHORTCUT_ACTION_APP_GLOBAL_SETTINGS: &str = "app.globalOpenSettings";

pub const SUPPORTED_SHORTCUT_ACTION_IDS: &[&str] = &[
    SHORTCUT_ACTION_CHAT_SEND,
    SHORTCUT_ACTION_CHAT_NEWLINE,
    SHORTCUT_ACTION_CHAT_EMOJI_CLOSE,
    SHORTCUT_ACTION_MENTION_INSERT,
    SHORTCUT_ACTION_CONVERSATION_FOCUS,
    SHORTCUT_ACTION_TERMINAL_FIND_NEXT,
    SHORTCUT_ACTION_TERMINAL_FIND_PREVIOUS,
    SHORTCUT_ACTION_TERMINAL_FIND_CLOSE,
    SHORTCUT_ACTION_SETTINGS_SAVE,
    SHORTCUT_ACTION_NOTIFICATION_VIEW_ALL,
    SHORTCUT_ACTION_NOTIFICATION_IGNORE_ALL,
    SHORTCUT_ACTION_NOTIFICATION_OPEN_TERMINAL,
    SHORTCUT_ACTION_APP_GLOBAL_SETTINGS,
];

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

pub fn validate_app_preferences(
    preferences: &AppPreferencesSettingsSnapshot,
) -> Result<(), AppError> {
    if preferences.schema_version != APP_PREFERENCES_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "settings.preferences.invalidRecordVersion",
            "应用偏好设置版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份 preferences.json。",
            Some(format!(
                "schemaVersion={} expected={}",
                preferences.schema_version, APP_PREFERENCES_SCHEMA_VERSION
            )),
        ));
    }

    if preferences.created_at_ms == 0 || preferences.updated_at_ms < preferences.created_at_ms {
        return Err(AppError::recoverable_error(
            "settings.preferences.invalidTimestamp",
            "应用偏好设置时间戳无效。",
            "请修复 preferences.json 中的时间戳后重试。",
            Some(format!(
                "createdAtMs={} updatedAtMs={}",
                preferences.created_at_ms, preferences.updated_at_ms
            )),
        ));
    }

    Ok(())
}

pub fn default_shortcut_bindings(
    profile: &ShortcutKeymapProfile,
    disabled_action_ids: &[String],
) -> Vec<ShortcutBindingSnapshot> {
    shortcut_binding_specs(profile)
        .into_iter()
        .map(|spec| {
            let action_id = spec.action_id.to_owned();
            let disabled = disabled_action_ids
                .iter()
                .any(|disabled_action_id| disabled_action_id == &action_id);

            ShortcutBindingSnapshot {
                action_id,
                label: spec.label.to_owned(),
                keys: spec.keys.into_iter().map(str::to_owned).collect(),
                enabled: spec.available && !disabled,
                available: spec.available,
                unavailable_reason: spec.unavailable_reason.map(str::to_owned),
            }
        })
        .collect()
}

pub fn normalize_shortcut_preferences(
    preferences: &mut ShortcutPreferencesSnapshot,
) -> Result<(), AppError> {
    validate_shortcut_disabled_action_ids(&preferences.disabled_action_ids)?;
    preferences.disabled_action_ids.sort();
    preferences.disabled_action_ids.dedup();
    preferences.bindings =
        default_shortcut_bindings(&preferences.profile, &preferences.disabled_action_ids);
    validate_shortcut_preferences(preferences)
}

pub fn validate_shortcut_preferences(
    preferences: &ShortcutPreferencesSnapshot,
) -> Result<(), AppError> {
    if preferences.schema_version != SHORTCUT_PREFERENCES_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "settings.shortcuts.invalidRecordVersion",
            "快捷键设置版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份 shortcuts.json。",
            Some(format!(
                "schemaVersion={} expected={}",
                preferences.schema_version, SHORTCUT_PREFERENCES_SCHEMA_VERSION
            )),
        ));
    }

    validate_shortcut_disabled_action_ids(&preferences.disabled_action_ids)?;

    if preferences.bindings.len() != SUPPORTED_SHORTCUT_ACTION_IDS.len() {
        return Err(shortcut_field_error(
            "settings.shortcuts.invalidBindings",
            "快捷键列表不完整。",
            "请恢复默认快捷键设置后重试。",
            "bindings",
        ));
    }

    let mut seen_action_ids = Vec::new();
    for binding in &preferences.bindings {
        validate_shortcut_action_id(&binding.action_id, "bindings")?;
        if seen_action_ids.contains(&binding.action_id) {
            return Err(shortcut_field_error(
                "settings.shortcuts.duplicateBinding",
                "快捷键动作重复。",
                "请恢复默认快捷键设置后重试。",
                "bindings",
            ));
        }
        seen_action_ids.push(binding.action_id.clone());

        if binding.label.trim().is_empty() || binding.keys.is_empty() {
            return Err(shortcut_field_error(
                "settings.shortcuts.invalidBindingFields",
                "快捷键动作字段无效。",
                "请恢复默认快捷键设置后重试。",
                "bindings",
            ));
        }

        if !binding.available
            && binding
                .unavailable_reason
                .as_deref()
                .unwrap_or("")
                .is_empty()
        {
            return Err(shortcut_field_error(
                "settings.shortcuts.missingUnavailableReason",
                "不可用快捷键缺少说明。",
                "请恢复默认快捷键设置后重试。",
                "bindings",
            ));
        }
    }

    if preferences.created_at_ms == 0 || preferences.updated_at_ms < preferences.created_at_ms {
        return Err(AppError::recoverable_error(
            "settings.shortcuts.invalidTimestamp",
            "快捷键设置时间戳无效。",
            "请修复 shortcuts.json 中的时间戳后重试。",
            Some(format!(
                "createdAtMs={} updatedAtMs={}",
                preferences.created_at_ms, preferences.updated_at_ms
            )),
        ));
    }

    Ok(())
}

pub fn validate_shortcut_disabled_action_ids(action_ids: &[String]) -> Result<(), AppError> {
    for action_id in action_ids {
        validate_shortcut_action_id(action_id, "disabledActionIds")?;
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

fn validate_shortcut_action_id(
    action_id: impl AsRef<str>,
    field: &'static str,
) -> Result<(), AppError> {
    let action_id = action_id.as_ref();

    if SUPPORTED_SHORTCUT_ACTION_IDS.contains(&action_id) {
        return Ok(());
    }

    Err(shortcut_field_error(
        "settings.shortcuts.unknownAction",
        "快捷键动作暂不支持。",
        "请选择设置中提供的快捷键动作后重试。",
        field,
    ))
}

struct ShortcutBindingSpec {
    action_id: &'static str,
    label: &'static str,
    keys: Vec<&'static str>,
    available: bool,
    unavailable_reason: Option<&'static str>,
}

fn shortcut_binding_specs(profile: &ShortcutKeymapProfile) -> Vec<ShortcutBindingSpec> {
    let chat_send_keys = match profile {
        ShortcutKeymapProfile::Default | ShortcutKeymapProfile::Slack => vec!["Enter"],
        ShortcutKeymapProfile::Vscode => vec!["Ctrl+Enter", "Meta+Enter"],
    };

    vec![
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_CHAT_SEND,
            label: "发送聊天消息",
            keys: chat_send_keys,
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_CHAT_NEWLINE,
            label: "聊天输入换行",
            keys: vec!["Shift+Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_CHAT_EMOJI_CLOSE,
            label: "关闭 Emoji 面板",
            keys: vec!["Esc"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_MENTION_INSERT,
            label: "插入提及建议",
            keys: vec!["Enter", "Tab"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_CONVERSATION_FOCUS,
            label: "聚焦会话列表",
            keys: vec!["Tab"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_TERMINAL_FIND_NEXT,
            label: "终端查找下一个",
            keys: vec!["Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_TERMINAL_FIND_PREVIOUS,
            label: "终端查找上一个",
            keys: vec!["Shift+Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_TERMINAL_FIND_CLOSE,
            label: "关闭终端查找",
            keys: vec!["Esc"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_SETTINGS_SAVE,
            label: "保存设置",
            keys: vec!["Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_NOTIFICATION_VIEW_ALL,
            label: "通知查看全部",
            keys: vec!["Tab", "Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_NOTIFICATION_IGNORE_ALL,
            label: "通知忽略全部",
            keys: vec!["Tab", "Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_NOTIFICATION_OPEN_TERMINAL,
            label: "通知打开终端",
            keys: vec!["Tab", "Enter"],
            available: true,
            unavailable_reason: None,
        },
        ShortcutBindingSpec {
            action_id: SHORTCUT_ACTION_APP_GLOBAL_SETTINGS,
            label: "全局打开设置",
            keys: vec!["Ctrl+,"],
            available: false,
            unavailable_reason: Some("当前版本尚未注册 OS 全局快捷键。"),
        },
    ]
}

fn shortcut_field_error(
    code: &'static str,
    message: impl Into<String>,
    user_action: impl Into<String>,
    field: &'static str,
) -> AppError {
    AppError::recoverable_error(code, message, user_action, Some(format!("field={}", field)))
}

fn profile_field_error(code: &str, message: &str, user_action: &str, field: &str) -> AppError {
    AppError::recoverable_error(code, message, user_action, Some(format!("field={}", field)))
}
