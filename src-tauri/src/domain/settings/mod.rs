use std::path::Path;

use crate::contracts::{
    AppError, AppPreferencesSettingsSnapshot, ChatTerminalOutputPreferencesSnapshot,
    ProfileAvatarKind, ProfileAvatarSnapshot, ProfileSettingsSnapshot, ProfileStatus,
    ShortcutBindingSnapshot, ShortcutKeymapProfile, ShortcutPreferencesSnapshot,
    TerminalBuiltInCliEntry, TerminalConfigurationSnapshot, TerminalCustomCliEntry,
    TerminalCustomTerminalEntry,
};

pub const APP_PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const APP_PREFERENCES_FILE_NAME: &str = "preferences.json";
pub const SHORTCUT_PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const SHORTCUT_PREFERENCES_FILE_NAME: &str = "shortcuts.json";
pub const CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const CHAT_TERMINAL_OUTPUT_PREFERENCES_FILE_NAME: &str = "chat-terminal-output.json";
pub const TERMINAL_CONFIGURATION_SCHEMA_VERSION: u32 = 1;
pub const TERMINAL_CONFIGURATION_FILE_NAME: &str = "terminal-config.json";
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
pub const BUILT_IN_CLI_CODEX: &str = "codex";
pub const BUILT_IN_CLI_CLAUDE_CODE: &str = "claude-code";
pub const BUILT_IN_CLI_GEMINI: &str = "gemini-cli";
pub const BUILT_IN_CLI_OPENCODE: &str = "opencode";
pub const BUILT_IN_CLI_QWEN: &str = "qwen-code";
pub const SUPPORTED_BUILT_IN_CLI_IDS: &[&str] = &[
    BUILT_IN_CLI_CODEX,
    BUILT_IN_CLI_CLAUDE_CODE,
    BUILT_IN_CLI_GEMINI,
    BUILT_IN_CLI_OPENCODE,
    BUILT_IN_CLI_QWEN,
];

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

pub fn default_built_in_cli_entries() -> Vec<TerminalBuiltInCliEntry> {
    vec![
        TerminalBuiltInCliEntry {
            runtime_id: BUILT_IN_CLI_CODEX.to_owned(),
            label: "Codex CLI".to_owned(),
            command: "codex".to_owned(),
        },
        TerminalBuiltInCliEntry {
            runtime_id: BUILT_IN_CLI_CLAUDE_CODE.to_owned(),
            label: "Claude Code".to_owned(),
            command: "claude".to_owned(),
        },
        TerminalBuiltInCliEntry {
            runtime_id: BUILT_IN_CLI_GEMINI.to_owned(),
            label: "Gemini CLI".to_owned(),
            command: "gemini".to_owned(),
        },
        TerminalBuiltInCliEntry {
            runtime_id: BUILT_IN_CLI_OPENCODE.to_owned(),
            label: "OpenCode".to_owned(),
            command: "opencode".to_owned(),
        },
        TerminalBuiltInCliEntry {
            runtime_id: BUILT_IN_CLI_QWEN.to_owned(),
            label: "Qwen Code".to_owned(),
            command: "qwen".to_owned(),
        },
    ]
}

pub fn normalize_terminal_configuration(
    configuration: &mut TerminalConfigurationSnapshot,
) -> Result<(), AppError> {
    for entry in &mut configuration.built_in_cli_entries {
        entry.runtime_id = entry.runtime_id.trim().to_owned();
        entry.label = entry.label.trim().to_owned();
        entry.command = entry.command.trim().to_owned();
    }
    for entry in &mut configuration.custom_cli_entries {
        entry.cli_id = entry.cli_id.trim().to_owned();
        entry.label = entry.label.trim().to_owned();
        entry.command = entry.command.trim().to_owned();
    }
    for entry in &mut configuration.custom_terminal_entries {
        entry.terminal_id = entry.terminal_id.trim().to_owned();
        entry.label = entry.label.trim().to_owned();
        entry.command = entry.command.trim().to_owned();
    }
    if let Some(default_terminal_id) = configuration.default_terminal_id.as_mut() {
        let normalized = default_terminal_id.trim().to_owned();
        if normalized.is_empty() {
            configuration.default_terminal_id = None;
        } else {
            *default_terminal_id = normalized;
        }
    }

    configuration
        .built_in_cli_entries
        .sort_by(|left, right| left.runtime_id.cmp(&right.runtime_id));
    configuration
        .custom_cli_entries
        .sort_by(|left, right| left.cli_id.cmp(&right.cli_id));
    configuration
        .custom_terminal_entries
        .sort_by(|left, right| left.terminal_id.cmp(&right.terminal_id));
    validate_terminal_configuration(configuration)
}

pub fn validate_terminal_configuration(
    configuration: &TerminalConfigurationSnapshot,
) -> Result<(), AppError> {
    if configuration.schema_version != TERMINAL_CONFIGURATION_SCHEMA_VERSION {
        return Err(terminal_configuration_field_error(
            "settings.terminalConfig.invalidRecordVersion",
            "CLI 与终端配置版本不受支持。",
            "请使用兼容版本的 orchlet，或先备份 terminal-config.json。",
            Some(format!(
                "schemaVersion={} expected={}",
                configuration.schema_version, TERMINAL_CONFIGURATION_SCHEMA_VERSION
            )),
        ));
    }

    let mut built_in_ids = Vec::new();
    for entry in &configuration.built_in_cli_entries {
        validate_built_in_cli_entry(entry)?;
        if built_in_ids.iter().any(|id| id == &entry.runtime_id) {
            return Err(terminal_configuration_field_error(
                "settings.terminalConfig.duplicateBuiltInCli",
                "内置 CLI 配置存在重复项。",
                "请保留每个内置 CLI 的唯一配置后重试。",
                Some(format!("runtimeId={}", entry.runtime_id)),
            ));
        }
        built_in_ids.push(entry.runtime_id.clone());
    }

    for supported_id in SUPPORTED_BUILT_IN_CLI_IDS {
        if !built_in_ids.iter().any(|id| id == supported_id) {
            return Err(terminal_configuration_field_error(
                "settings.terminalConfig.missingBuiltInCli",
                "内置 CLI 配置不完整。",
                "请恢复默认 CLI 配置后重试。",
                Some(format!("runtimeId={}", supported_id)),
            ));
        }
    }

    let mut custom_cli_ids = Vec::new();
    for entry in &configuration.custom_cli_entries {
        validate_custom_cli_entry(entry)?;
        if custom_cli_ids.iter().any(|id| id == &entry.cli_id) {
            return Err(terminal_configuration_field_error(
                "settings.terminalConfig.duplicateCustomCli",
                "自定义 CLI 配置存在重复项。",
                "请保留每个自定义 CLI 的唯一配置后重试。",
                Some(format!("cliId={}", entry.cli_id)),
            ));
        }
        custom_cli_ids.push(entry.cli_id.clone());
    }

    let mut custom_terminal_ids = Vec::new();
    for entry in &configuration.custom_terminal_entries {
        validate_custom_terminal_entry(entry)?;
        if custom_terminal_ids
            .iter()
            .any(|id| id == &entry.terminal_id)
        {
            return Err(terminal_configuration_field_error(
                "settings.terminalConfig.duplicateCustomTerminal",
                "自定义终端配置存在重复项。",
                "请保留每个自定义终端的唯一配置后重试。",
                Some(format!("terminalId={}", entry.terminal_id)),
            ));
        }
        custom_terminal_ids.push(entry.terminal_id.clone());
    }

    if let Some(default_terminal_id) = configuration.default_terminal_id.as_deref() {
        if !custom_terminal_ids
            .iter()
            .any(|terminal_id| terminal_id == default_terminal_id)
        {
            return Err(terminal_configuration_field_error(
                "settings.terminalConfig.invalidDefaultTerminal",
                "默认终端配置不存在。",
                "请选择系统默认终端或一个已保存的自定义终端后重试。",
                Some(format!("defaultTerminalId={}", default_terminal_id)),
            ));
        }
    }

    if configuration.created_at_ms == 0 || configuration.updated_at_ms < configuration.created_at_ms
    {
        return Err(terminal_configuration_field_error(
            "settings.terminalConfig.invalidTimestamp",
            "CLI 与终端配置时间戳无效。",
            "请修复 terminal-config.json 中的时间戳后重试。",
            Some(format!(
                "createdAtMs={} updatedAtMs={}",
                configuration.created_at_ms, configuration.updated_at_ms
            )),
        ));
    }

    Ok(())
}

pub fn validate_chat_terminal_output_preferences(
    preferences: &ChatTerminalOutputPreferencesSnapshot,
) -> Result<(), AppError> {
    if preferences.schema_version != CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION {
        return Err(chat_terminal_output_preferences_error(
            "settings.chatTerminalOutput.invalidRecordVersion",
            "聊天终端输出展示偏好版本不受支持。",
            "聊天终端输出展示偏好未更新；请使用兼容版本的 orchlet，或先备份 chat-terminal-output.json。",
            Some(format!(
                "schemaVersion={} expected={}",
                preferences.schema_version, CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION
            )),
        ));
    }

    if preferences.created_at_ms == 0 || preferences.updated_at_ms < preferences.created_at_ms {
        return Err(chat_terminal_output_preferences_error(
            "settings.chatTerminalOutput.invalidTimestamp",
            "聊天终端输出展示偏好时间戳无效。",
            "聊天终端输出展示偏好未更新；请恢复默认偏好后重试。",
            Some(format!(
                "createdAtMs={} updatedAtMs={}",
                preferences.created_at_ms, preferences.updated_at_ms
            )),
        ));
    }

    Ok(())
}

pub fn validate_built_in_cli_id(runtime_id: &str) -> Result<(), AppError> {
    if SUPPORTED_BUILT_IN_CLI_IDS
        .iter()
        .any(|supported_id| supported_id == &runtime_id)
    {
        return Ok(());
    }

    Err(terminal_configuration_field_error(
        "settings.terminalConfig.unsupportedBuiltInCli",
        "内置 CLI 标识不受支持。",
        "请选择支持的内置 CLI 后重试。",
        Some(format!("runtimeId={}", runtime_id)),
    ))
}

fn validate_built_in_cli_entry(entry: &TerminalBuiltInCliEntry) -> Result<(), AppError> {
    validate_built_in_cli_id(&entry.runtime_id)?;
    validate_terminal_config_label(&entry.label, "builtInCliEntries.label")?;
    validate_terminal_config_command(&entry.command, "builtInCliEntries.command")
}

fn validate_custom_cli_entry(entry: &TerminalCustomCliEntry) -> Result<(), AppError> {
    validate_terminal_config_id(&entry.cli_id, "customCliEntries.cliId")?;
    validate_terminal_config_label(&entry.label, "customCliEntries.label")?;
    validate_terminal_config_command(&entry.command, "customCliEntries.command")
}

fn validate_custom_terminal_entry(entry: &TerminalCustomTerminalEntry) -> Result<(), AppError> {
    validate_terminal_config_id(&entry.terminal_id, "customTerminalEntries.terminalId")?;
    validate_terminal_config_label(&entry.label, "customTerminalEntries.label")?;
    validate_terminal_config_command(&entry.command, "customTerminalEntries.command")
}

fn validate_terminal_config_id(value: &str, field: &str) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.chars().count() > 80
        || !trimmed
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.')
    {
        return Err(terminal_configuration_field_error(
            "settings.terminalConfig.invalidId",
            "CLI 或终端配置标识无效。",
            "请使用字母、数字、点、短横线或下划线作为配置标识。",
            Some(format!("field={} value={}", field, value)),
        ));
    }

    Ok(())
}

fn validate_terminal_config_label(value: &str, field: &str) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().count() > 80 {
        return Err(terminal_configuration_field_error(
            "settings.terminalConfig.invalidLabel",
            "CLI 或终端名称无效。",
            "请填写 1 到 80 个字符的显示名称后重试。",
            Some(format!(
                "field={} length={}",
                field,
                trimmed.chars().count()
            )),
        ));
    }

    Ok(())
}

fn validate_terminal_config_command(value: &str, field: &str) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().count() > 500 {
        return Err(terminal_configuration_field_error(
            "settings.terminalConfig.invalidCommand",
            "CLI 或终端命令无效。",
            "请填写 1 到 500 个字符的命令或路径后重试。",
            Some(format!(
                "field={} length={}",
                field,
                trimmed.chars().count()
            )),
        ));
    }

    Ok(())
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

fn terminal_configuration_field_error(
    code: &str,
    message: impl Into<String>,
    user_action: impl Into<String>,
    details: Option<String>,
) -> AppError {
    AppError::recoverable_error(code, message, user_action, details)
}

fn chat_terminal_output_preferences_error(
    code: &str,
    message: impl Into<String>,
    user_action: impl Into<String>,
    details: Option<String>,
) -> AppError {
    AppError::recoverable_error(code, message, user_action, details)
}

fn profile_field_error(code: &str, message: &str, user_action: &str, field: &str) -> AppError {
    AppError::recoverable_error(code, message, user_action, Some(format!("field={}", field)))
}

#[cfg(test)]
mod tests {
    use crate::contracts::{
        TerminalConfigurationSnapshot, TerminalCustomCliEntry, TerminalCustomTerminalEntry,
    };

    use super::{
        default_built_in_cli_entries, normalize_terminal_configuration,
        TERMINAL_CONFIGURATION_SCHEMA_VERSION,
    };

    fn terminal_configuration() -> TerminalConfigurationSnapshot {
        TerminalConfigurationSnapshot {
            schema_version: TERMINAL_CONFIGURATION_SCHEMA_VERSION,
            built_in_cli_entries: default_built_in_cli_entries(),
            custom_cli_entries: Vec::new(),
            custom_terminal_entries: Vec::new(),
            default_terminal_id: None,
            created_at_ms: 1,
            updated_at_ms: 1,
        }
    }

    #[test]
    fn terminal_configuration_normalization_trims_custom_ids_before_duplicate_checks() {
        let mut configuration = terminal_configuration();
        configuration.custom_cli_entries = vec![
            TerminalCustomCliEntry {
                cli_id: "local-reviewer".to_owned(),
                label: "Local Reviewer".to_owned(),
                command: "reviewer --stdio".to_owned(),
            },
            TerminalCustomCliEntry {
                cli_id: " local-reviewer ".to_owned(),
                label: "Duplicate Reviewer".to_owned(),
                command: "reviewer-2".to_owned(),
            },
        ];

        let error =
            normalize_terminal_configuration(&mut configuration).expect_err("duplicate custom CLI");

        assert_eq!(error.code, "settings.terminalConfig.duplicateCustomCli");
    }

    #[test]
    fn terminal_configuration_normalization_trims_default_terminal_references() {
        let mut configuration = terminal_configuration();
        configuration.custom_terminal_entries = vec![TerminalCustomTerminalEntry {
            terminal_id: " workspace-zsh ".to_owned(),
            label: " Workspace Zsh ".to_owned(),
            command: " /bin/zsh ".to_owned(),
        }];
        configuration.default_terminal_id = Some(" workspace-zsh ".to_owned());

        normalize_terminal_configuration(&mut configuration).expect("normalized");

        assert_eq!(
            configuration.custom_terminal_entries[0].terminal_id,
            "workspace-zsh"
        );
        assert_eq!(
            configuration.custom_terminal_entries[0].label,
            "Workspace Zsh"
        );
        assert_eq!(configuration.custom_terminal_entries[0].command, "/bin/zsh");
        assert_eq!(
            configuration.default_terminal_id.as_deref(),
            Some("workspace-zsh")
        );
    }
}
