use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use serde_json::Value;

use crate::{
    contracts::{
        AppError, AppLanguage, AppPreferencesSettingsSnapshot, AppTheme,
        ChatTerminalOutputDisplayMode, ChatTerminalOutputPreferencesSnapshot,
        NotificationPreferencesSnapshot, ProfileSettingsSnapshot, ShortcutKeymapProfile,
        ShortcutPreferencesSnapshot, TerminalConfigurationSnapshot, TerminalCustomCliEntry,
        TerminalCustomTerminalEntry,
    },
    domain::settings::{
        avatar_content_type_for_extension, default_built_in_cli_entries, default_profile_timezone,
        default_shortcut_bindings, normalize_profile_display_name, normalize_profile_status,
        normalize_profile_status_message, normalize_profile_timezone,
        normalize_shortcut_preferences, normalize_terminal_configuration,
        placeholder_avatar_snapshot, preset_avatar_snapshot, uploaded_avatar_snapshot,
        validate_profile_avatar_source_path, APP_PREFERENCES_SCHEMA_VERSION,
        AVATAR_LIBRARY_DIR_NAME, CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION,
        PROFILE_SETTINGS_SCHEMA_VERSION, SHORTCUT_PREFERENCES_SCHEMA_VERSION,
        TERMINAL_CONFIGURATION_SCHEMA_VERSION,
    },
    infrastructure::persistence::json_store::{
        notification_preferences_store::unavailable_permission_snapshot,
        workspace_registry_store::now_ms,
    },
};

pub const LEGACY_GLOBAL_SETTINGS_FILE_NAME: &str = "global-settings.json";

pub fn legacy_global_settings_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(LEGACY_GLOBAL_SETTINGS_FILE_NAME)
}

pub fn load_legacy_app_preferences(
    app_data_dir: &Path,
) -> Result<Option<AppPreferencesSettingsSnapshot>, AppError> {
    let Some(settings) = read_legacy_global_settings(app_data_dir)? else {
        return Ok(None);
    };
    let timestamp = now_ms();

    Ok(Some(AppPreferencesSettingsSnapshot {
        schema_version: APP_PREFERENCES_SCHEMA_VERSION,
        theme: legacy_theme(&settings).unwrap_or(AppTheme::Dark),
        language: legacy_language(&settings).unwrap_or(AppLanguage::EnUs),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }))
}

pub fn load_legacy_profile_settings(
    app_data_dir: &Path,
) -> Result<Option<ProfileSettingsSnapshot>, AppError> {
    let Some(settings) = read_legacy_global_settings(app_data_dir)? else {
        return Ok(None);
    };
    let timestamp = now_ms();
    let display_name = string_at(&settings, &["account", "displayName"])
        .and_then(|value| normalize_profile_display_name(value).ok())
        .unwrap_or_else(|| "Owner".to_owned());
    let timezone = string_at(&settings, &["account", "timezone"])
        .and_then(legacy_timezone)
        .unwrap_or_else(default_profile_timezone);
    let status = string_at(&settings, &["account", "status"])
        .and_then(legacy_profile_status)
        .unwrap_or_else(|| normalize_profile_status("online").expect("default status"));
    let status_message = string_at(&settings, &["account", "statusMessage"])
        .and_then(|value| normalize_profile_status_message(value).ok())
        .flatten();
    let avatar = legacy_profile_avatar(app_data_dir, &settings, timestamp);

    Ok(Some(ProfileSettingsSnapshot {
        schema_version: PROFILE_SETTINGS_SCHEMA_VERSION,
        display_name,
        timezone,
        status,
        status_message,
        avatar: Some(avatar),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }))
}

pub fn load_legacy_notification_preferences(
    app_data_dir: &Path,
) -> Result<Option<NotificationPreferencesSnapshot>, AppError> {
    let Some(settings) = read_legacy_global_settings(app_data_dir)? else {
        return Ok(None);
    };
    let timestamp = now_ms();
    let dnd_start = string_at(&settings, &["notifications", "quietHoursStart"])
        .and_then(parse_time_minutes)
        .unwrap_or(22 * 60);
    let mut dnd_end = string_at(&settings, &["notifications", "quietHoursEnd"])
        .and_then(parse_time_minutes)
        .unwrap_or(7 * 60);
    let dnd_enabled = bool_at(&settings, &["notifications", "quietHoursEnabled"], false);
    if dnd_enabled && dnd_start == dnd_end {
        dnd_end = (dnd_start + 60) % (24 * 60);
    }

    Ok(Some(NotificationPreferencesSnapshot {
        schema_version: crate::domain::notification::NOTIFICATION_PREFERENCES_SCHEMA_VERSION,
        desktop_notifications_enabled: bool_at(&settings, &["notifications", "desktop"], true),
        sound_enabled: bool_at(&settings, &["notifications", "sound"], false),
        mentions_only: bool_at(&settings, &["notifications", "mentionsOnly"], false),
        message_preview_enabled: bool_at(&settings, &["notifications", "previews"], true),
        dnd_enabled,
        dnd_start_minutes: dnd_start,
        dnd_end_minutes: dnd_end,
        permission: unavailable_permission_snapshot(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }))
}

pub fn load_legacy_shortcut_preferences(
    app_data_dir: &Path,
) -> Result<Option<ShortcutPreferencesSnapshot>, AppError> {
    let Some(settings) = read_legacy_global_settings(app_data_dir)? else {
        return Ok(None);
    };
    let timestamp = now_ms();
    let profile = string_at(&settings, &["keybinds", "profile"])
        .and_then(legacy_shortcut_profile)
        .unwrap_or(ShortcutKeymapProfile::Default);
    let disabled_action_ids = string_array_at(&settings, &["keybinds", "disabledActionIds"]);
    let mut preferences = ShortcutPreferencesSnapshot {
        schema_version: SHORTCUT_PREFERENCES_SCHEMA_VERSION,
        bindings: default_shortcut_bindings(&profile, &disabled_action_ids),
        profile,
        shortcuts_enabled: bool_at(&settings, &["keybinds", "enabled"], true),
        shortcut_hints_enabled: bool_at(&settings, &["keybinds", "showHints"], true),
        disabled_action_ids,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    normalize_shortcut_preferences(&mut preferences)?;
    Ok(Some(preferences))
}

pub fn load_legacy_chat_terminal_output_preferences(
    app_data_dir: &Path,
) -> Result<Option<ChatTerminalOutputPreferencesSnapshot>, AppError> {
    let Some(settings) = read_legacy_global_settings(app_data_dir)? else {
        return Ok(None);
    };
    let timestamp = now_ms();
    let display_mode = if bool_at(&settings, &["chat", "streamOutput"], true) {
        ChatTerminalOutputDisplayMode::Stream
    } else {
        ChatTerminalOutputDisplayMode::FinalOnly
    };

    Ok(Some(ChatTerminalOutputPreferencesSnapshot {
        schema_version: CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION,
        display_mode,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }))
}

pub fn load_legacy_terminal_configuration(
    app_data_dir: &Path,
) -> Result<Option<TerminalConfigurationSnapshot>, AppError> {
    let Some(settings) = read_legacy_global_settings(app_data_dir)? else {
        return Ok(None);
    };
    let timestamp = now_ms();
    let mut built_in_cli_entries = default_built_in_cli_entries();
    let mut custom_cli_entries = legacy_custom_cli_entries(&settings);
    let mut custom_terminal_entries = legacy_custom_terminal_entries(&settings);
    let default_terminal_id = legacy_default_terminal(&settings, &mut custom_terminal_entries);

    if let Some(paths) =
        value_at(&settings, &["members", "terminalPaths"]).and_then(Value::as_object)
    {
        for entry in &mut built_in_cli_entries {
            if let Some(command) = legacy_built_in_command(paths, &entry.runtime_id) {
                entry.command = command;
            }
        }
    }

    dedupe_custom_cli_entries(&mut custom_cli_entries);
    dedupe_custom_terminal_entries(&mut custom_terminal_entries);

    let mut configuration = TerminalConfigurationSnapshot {
        schema_version: TERMINAL_CONFIGURATION_SCHEMA_VERSION,
        built_in_cli_entries,
        custom_cli_entries,
        custom_terminal_entries,
        default_terminal_id,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    normalize_terminal_configuration(&mut configuration)?;
    Ok(Some(configuration))
}

fn read_legacy_global_settings(app_data_dir: &Path) -> Result<Option<Value>, AppError> {
    let path = legacy_global_settings_path(app_data_dir);

    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.legacyGlobal.readFailed",
            "无法读取 Golutra 全局设置。",
            "旧设置未导入；请检查 global-settings.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.legacyGlobal.invalidJson",
            "Golutra 全局设置不是有效 JSON。",
            "旧设置未导入；请先备份或修复 global-settings.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    if !value.is_object() {
        return Err(AppError::recoverable_error(
            "settings.legacyGlobal.invalidFields",
            "Golutra 全局设置字段无效。",
            "旧设置未导入；请先备份或修复 global-settings.json 后重试。",
            Some(format!(
                "{}: settings must be a JSON object",
                path.display()
            )),
        ));
    }

    Ok(Some(value))
}

fn legacy_theme(settings: &Value) -> Option<AppTheme> {
    string_at(settings, &["appearance", "theme"])
        .or_else(|| string_at(settings, &["theme"]))
        .and_then(|value| match value.trim().to_ascii_lowercase().as_str() {
            "dark" => Some(AppTheme::Dark),
            "light" => Some(AppTheme::Light),
            "system" => Some(AppTheme::System),
            _ => None,
        })
}

fn legacy_language(settings: &Value) -> Option<AppLanguage> {
    string_at(settings, &["locale"])
        .or_else(|| string_at(settings, &["general", "language"]))
        .or_else(|| string_at(settings, &["language"]))
        .and_then(|value| match value.trim().to_ascii_lowercase().as_str() {
            "zh" | "zh-cn" | "zh_cn" | "cn" => Some(AppLanguage::ZhCn),
            "en" | "en-us" | "en_us" => Some(AppLanguage::EnUs),
            _ => None,
        })
}

fn legacy_timezone(value: &str) -> Option<String> {
    let normalized = if value.eq_ignore_ascii_case("utc") {
        "UTC".to_owned()
    } else {
        value.trim().to_owned()
    };
    normalize_profile_timezone(normalized).ok()
}

fn legacy_profile_status(value: &str) -> Option<crate::contracts::ProfileStatus> {
    let normalized = match value.trim() {
        "dnd" => "doNotDisturb",
        other => other,
    };
    normalize_profile_status(normalized).ok()
}

fn legacy_profile_avatar(
    app_data_dir: &Path,
    settings: &Value,
    timestamp: u64,
) -> crate::contracts::ProfileAvatarSnapshot {
    let Some(avatar) = string_at(settings, &["account", "avatar"]) else {
        return placeholder_avatar_snapshot(timestamp);
    };
    let avatar = avatar.trim();

    if let Some(upload_id) = avatar.strip_prefix("local:").map(str::trim) {
        return legacy_local_avatar_snapshot(app_data_dir, upload_id, timestamp)
            .unwrap_or_else(|| placeholder_avatar_snapshot(timestamp));
    }

    let preset_id = avatar.strip_prefix("css:").unwrap_or(avatar).trim();

    preset_avatar_snapshot(preset_id, timestamp)
        .unwrap_or_else(|_| placeholder_avatar_snapshot(timestamp))
}

fn legacy_local_avatar_snapshot(
    app_data_dir: &Path,
    upload_id: &str,
    timestamp: u64,
) -> Option<crate::contracts::ProfileAvatarSnapshot> {
    if upload_id.is_empty() {
        return None;
    }

    let library = read_legacy_avatar_library(app_data_dir).ok()?;
    let asset = library
        .as_array()?
        .iter()
        .filter_map(|value| value.as_object())
        .find(|entry| entry.get("id").and_then(|value| value.as_str()) == Some(upload_id))?;
    let filename = asset.get("filename")?.as_str()?.trim();
    let file_path = legacy_avatar_file_path(app_data_dir, filename)?;
    let metadata = fs::metadata(&file_path).ok()?;

    if !metadata.is_file() {
        return None;
    }

    validate_profile_avatar_source_path(&file_path, metadata.len()).ok()?;
    let extension = file_path.extension()?.to_str()?.to_ascii_lowercase();
    let normalized_extension = if extension == "jpeg" {
        "jpg".to_owned()
    } else {
        extension
    };
    let content_type = avatar_content_type_for_extension(normalized_extension).ok()?;
    let updated_at_ms = asset
        .get("createdAt")
        .and_then(|value| value.as_u64())
        .filter(|value| *value > 0)
        .unwrap_or(timestamp);
    let library_relative_path = format!("{}/{}", AVATAR_LIBRARY_DIR_NAME, filename);

    Some(uploaded_avatar_snapshot(
        upload_id.to_owned(),
        filename.to_owned(),
        content_type,
        metadata.len(),
        library_relative_path,
        None,
        updated_at_ms,
    ))
}

fn read_legacy_avatar_library(app_data_dir: &Path) -> Result<Value, AppError> {
    let path = app_data_dir.join("avatar-library.json");
    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.legacyAvatarLibrary.readFailed",
            "无法读取旧版头像库。",
            "个人资料将使用默认头像；请检查 avatar-library.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.legacyAvatarLibrary.invalidJson",
            "旧版头像库不是有效 JSON。",
            "个人资料将使用默认头像；请先备份或修复 avatar-library.json。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })
}

fn legacy_avatar_file_path(app_data_dir: &Path, filename: &str) -> Option<PathBuf> {
    let path = Path::new(filename);
    let mut components = path.components();
    let component = components.next()?;

    if components.next().is_some() {
        return None;
    }

    let std::path::Component::Normal(file_name) = component else {
        return None;
    };

    Some(app_data_dir.join(AVATAR_LIBRARY_DIR_NAME).join(file_name))
}

fn legacy_shortcut_profile(value: &str) -> Option<ShortcutKeymapProfile> {
    match value.trim().to_ascii_lowercase().as_str() {
        "default" => Some(ShortcutKeymapProfile::Default),
        "vscode" | "vs-code" | "visual-studio-code" => Some(ShortcutKeymapProfile::Vscode),
        "slack" => Some(ShortcutKeymapProfile::Slack),
        _ => None,
    }
}

fn legacy_custom_cli_entries(settings: &Value) -> Vec<TerminalCustomCliEntry> {
    value_at(settings, &["members", "customMembers"])
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .enumerate()
        .filter_map(|(index, entry)| {
            let command = value_at(entry, &["command"])
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())?;
            let label = value_at(entry, &["name"])
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or(command);
            let id_seed = value_at(entry, &["id"])
                .and_then(Value::as_str)
                .unwrap_or(label);

            Some(TerminalCustomCliEntry {
                cli_id: legacy_id("legacy-cli", id_seed, index + 1),
                label: label.chars().take(80).collect(),
                command: command.chars().take(500).collect(),
            })
        })
        .collect()
}

fn legacy_custom_terminal_entries(settings: &Value) -> Vec<TerminalCustomTerminalEntry> {
    value_at(settings, &["members", "customTerminals"])
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .enumerate()
        .filter_map(|(index, entry)| {
            let command = value_at(entry, &["path"])
                .or_else(|| value_at(entry, &["command"]))
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())?;
            let label = value_at(entry, &["name"])
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or(command);

            Some(TerminalCustomTerminalEntry {
                terminal_id: legacy_id("legacy-terminal", label, index + 1),
                label: label.chars().take(80).collect(),
                command: command.chars().take(500).collect(),
            })
        })
        .collect()
}

fn legacy_default_terminal(
    settings: &Value,
    custom_terminal_entries: &mut Vec<TerminalCustomTerminalEntry>,
) -> Option<String> {
    let command = string_at(settings, &["members", "defaultTerminalPath"])?
        .trim()
        .to_owned();
    if command.is_empty() {
        return None;
    }
    if let Some(existing) = custom_terminal_entries
        .iter()
        .find(|entry| entry.command == command)
    {
        return Some(existing.terminal_id.clone());
    }

    let label = string_at(settings, &["members", "defaultTerminalName"])
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("Default Terminal")
        .chars()
        .take(80)
        .collect::<String>();
    let terminal_id = legacy_id("legacy-terminal", &label, custom_terminal_entries.len() + 1);
    custom_terminal_entries.push(TerminalCustomTerminalEntry {
        terminal_id: terminal_id.clone(),
        label,
        command: command.chars().take(500).collect(),
    });

    Some(terminal_id)
}

fn legacy_built_in_command(
    paths: &serde_json::Map<String, Value>,
    runtime_id: &str,
) -> Option<String> {
    let legacy_key = match runtime_id {
        "codex" => "codex",
        "claude-code" => "claude",
        "gemini-cli" => "gemini",
        "opencode" => "opencode",
        "qwen-code" => "qwen",
        _ => return None,
    };

    paths
        .get(legacy_key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.chars().take(500).collect())
}

fn dedupe_custom_cli_entries(entries: &mut Vec<TerminalCustomCliEntry>) {
    let mut seen = HashSet::new();
    entries.retain(|entry| seen.insert(entry.cli_id.clone()));
}

fn dedupe_custom_terminal_entries(entries: &mut Vec<TerminalCustomTerminalEntry>) {
    let mut seen = HashSet::new();
    entries.retain(|entry| seen.insert(entry.terminal_id.clone()));
}

fn legacy_id(prefix: &str, seed: &str, index: usize) -> String {
    let mut normalized = seed
        .trim()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();

    while normalized.contains("--") {
        normalized = normalized.replace("--", "-");
    }
    normalized = normalized.trim_matches('-').chars().take(56).collect();
    if normalized.is_empty() {
        return format!("{prefix}-{index}");
    }

    format!("{prefix}-{normalized}")
        .trim_matches('-')
        .chars()
        .take(80)
        .collect()
}

fn bool_at(settings: &Value, path: &[&str], fallback: bool) -> bool {
    value_at(settings, path)
        .and_then(Value::as_bool)
        .unwrap_or(fallback)
}

fn string_at<'a>(settings: &'a Value, path: &[&str]) -> Option<&'a str> {
    value_at(settings, path).and_then(Value::as_str)
}

fn string_array_at(settings: &Value, path: &[&str]) -> Vec<String> {
    value_at(settings, path)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect()
}

fn value_at<'a>(settings: &'a Value, path: &[&str]) -> Option<&'a Value> {
    path.iter()
        .try_fold(settings, |current, segment| current.get(segment))
}

fn parse_time_minutes(value: &str) -> Option<u16> {
    let (hours, minutes) = value.split_once(':')?;
    let hours = hours.parse::<u16>().ok()?;
    let minutes = minutes.parse::<u16>().ok()?;

    if hours < 24 && minutes < 60 {
        Some(hours * 60 + minutes)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        legacy_global_settings_path, load_legacy_app_preferences,
        load_legacy_chat_terminal_output_preferences, load_legacy_notification_preferences,
        load_legacy_profile_settings, load_legacy_shortcut_preferences,
        load_legacy_terminal_configuration,
    };
    use crate::contracts::{
        AppLanguage, AppTheme, ChatTerminalOutputDisplayMode, ProfileAvatarKind, ProfileStatus,
        ShortcutKeymapProfile,
    };

    #[test]
    fn maps_legacy_global_settings_into_current_snapshots() {
        let app_data = tempdir().expect("app data");
        fs::write(
            legacy_global_settings_path(app_data.path()),
            serde_json::json!({
                "appearance": { "theme": "light" },
                "locale": "zh-CN",
                "account": {
                    "displayName": "Dana",
                    "timezone": "utc",
                    "status": "dnd",
                    "statusMessage": "deep work",
                    "avatar": "css:orbit"
                },
                "notifications": {
                    "desktop": false,
                    "sound": false,
                    "mentionsOnly": true,
                    "previews": false,
                    "quietHoursEnabled": true,
                    "quietHoursStart": "21:15",
                    "quietHoursEnd": "07:30"
                },
                "keybinds": {
                    "enabled": false,
                    "showHints": false,
                    "profile": "vscode",
                    "disabledActionIds": ["chat.send"]
                },
                "chat": { "streamOutput": false },
                "members": {
                    "terminalPaths": { "codex": "/opt/codex", "claude": "/opt/claude" },
                    "customMembers": [{ "id": "reviewer", "name": "Reviewer", "command": "reviewer --stdio" }],
                    "customTerminals": [{ "name": "WezTerm", "path": "/opt/wezterm" }],
                    "defaultTerminalName": "Ghostty",
                    "defaultTerminalPath": "/opt/ghostty"
                }
            })
            .to_string(),
        )
        .expect("legacy settings");

        let preferences = load_legacy_app_preferences(app_data.path())
            .expect("loaded")
            .expect("preferences");
        let profile = load_legacy_profile_settings(app_data.path())
            .expect("loaded")
            .expect("profile");
        let notifications = load_legacy_notification_preferences(app_data.path())
            .expect("loaded")
            .expect("notifications");
        let shortcuts = load_legacy_shortcut_preferences(app_data.path())
            .expect("loaded")
            .expect("shortcuts");
        let chat_output = load_legacy_chat_terminal_output_preferences(app_data.path())
            .expect("loaded")
            .expect("chat output");
        let terminal = load_legacy_terminal_configuration(app_data.path())
            .expect("loaded")
            .expect("terminal config");

        assert_eq!(preferences.theme, AppTheme::Light);
        assert_eq!(preferences.language, AppLanguage::ZhCn);
        assert_eq!(profile.display_name, "Dana");
        assert_eq!(profile.timezone, "UTC");
        assert_eq!(profile.status, ProfileStatus::DoNotDisturb);
        assert_eq!(profile.status_message.as_deref(), Some("deep work"));
        assert_eq!(
            profile.avatar.expect("avatar").kind,
            ProfileAvatarKind::Placeholder
        );
        assert!(!notifications.desktop_notifications_enabled);
        assert!(notifications.mentions_only);
        assert!(!notifications.message_preview_enabled);
        assert!(notifications.dnd_enabled);
        assert_eq!(notifications.dnd_start_minutes, 21 * 60 + 15);
        assert_eq!(notifications.dnd_end_minutes, 7 * 60 + 30);
        assert_eq!(shortcuts.profile, ShortcutKeymapProfile::Vscode);
        assert!(!shortcuts.shortcuts_enabled);
        assert!(!shortcuts.shortcut_hints_enabled);
        assert_eq!(shortcuts.disabled_action_ids, vec!["chat.send"]);
        assert_eq!(
            chat_output.display_mode,
            ChatTerminalOutputDisplayMode::FinalOnly
        );
        assert_eq!(
            terminal
                .built_in_cli_entries
                .iter()
                .find(|entry| entry.runtime_id == "codex")
                .expect("codex")
                .command,
            "/opt/codex"
        );
        assert!(terminal
            .custom_cli_entries
            .iter()
            .any(|entry| entry.command == "reviewer --stdio"));
        assert_eq!(
            terminal.default_terminal_id.as_deref(),
            Some("legacy-terminal-ghostty")
        );
    }

    #[test]
    fn malformed_legacy_global_settings_is_recoverable() {
        let app_data = tempdir().expect("app data");
        fs::write(legacy_global_settings_path(app_data.path()), "{").expect("legacy settings");

        let error = load_legacy_app_preferences(app_data.path()).expect_err("invalid json");

        assert_eq!(error.code, "settings.legacyGlobal.invalidJson");
        assert!(error.recoverable);
    }
}
