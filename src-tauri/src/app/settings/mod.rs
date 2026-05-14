use std::path::{Path, PathBuf};

use crate::{
    contracts::{
        AppError, AppPreferencesSettingsSnapshot, ChatTerminalOutputPreferencesSnapshot,
        DeleteUploadedProfileAvatarRequest, DeleteUploadedProfileAvatarResult,
        GetChatTerminalOutputPreferencesRequest, GetChatTerminalOutputPreferencesResult,
        GetProfileSettingsRequest, GetProfileSettingsResult, GetShortcutPreferencesRequest,
        GetShortcutPreferencesResult, GetTerminalConfigurationRequest,
        GetTerminalConfigurationResult, ProfileSettingsSnapshot,
        ResetChatTerminalOutputPreferencesRequest, ResetChatTerminalOutputPreferencesResult,
        ResetProfileAvatarRequest, ResetProfileAvatarResult, ResetShortcutPreferencesRequest,
        ResetShortcutPreferencesResult, ResetTerminalConfigurationRequest,
        ResetTerminalConfigurationResult, SelectProfileAvatarPresetRequest,
        SelectProfileAvatarPresetResult, ShortcutPreferencesSnapshot,
        TerminalConfigurationSnapshot, UpdateAppPreferencesRequest,
        UpdateChatTerminalOutputPreferencesRequest, UpdateChatTerminalOutputPreferencesResult,
        UpdateProfileSettingsRequest, UpdateProfileSettingsResult,
        UpdateShortcutPreferencesRequest, UpdateShortcutPreferencesResult,
        UpdateTerminalConfigurationRequest, UpdateTerminalConfigurationResult,
        UploadProfileAvatarRequest, UploadProfileAvatarResult,
    },
    domain::settings::{
        default_shortcut_bindings, normalize_profile_display_name, normalize_profile_status,
        normalize_profile_status_message, normalize_profile_timezone,
        normalize_shortcut_preferences, placeholder_avatar_snapshot, preset_avatar_snapshot,
        uploaded_avatar_snapshot, validate_chat_terminal_output_preferences,
    },
    infrastructure::persistence::json_store::{
        app_preferences_store::{
            load_app_preferences, save_app_preferences, validate_app_preferences_store,
        },
        chat_terminal_output_preferences_store::{
            default_chat_terminal_output_preferences, load_chat_terminal_output_preferences,
            save_chat_terminal_output_preferences, validate_chat_terminal_output_preferences_store,
        },
        profile_settings_store::{
            copy_uploaded_profile_avatar, delete_current_uploaded_profile_avatar,
            load_profile_settings, save_profile_settings, validate_avatar_library_store,
            validate_profile_settings_store,
        },
        shortcut_preferences_store::{
            default_shortcut_preferences_for_profile, load_shortcut_preferences,
            save_shortcut_preferences, validate_shortcut_preferences_store,
        },
        terminal_configuration_store::{
            default_terminal_configuration, load_terminal_configuration,
            save_terminal_configuration, validate_terminal_configuration_store,
        },
        workspace_registry_store::now_ms,
    },
};

pub fn get_app_preferences(
    app_data_dir: impl AsRef<Path>,
) -> Result<AppPreferencesSettingsSnapshot, AppError> {
    load_app_preferences(app_data_dir.as_ref())
}

pub fn update_app_preferences(
    app_data_dir: impl AsRef<Path>,
    request: UpdateAppPreferencesRequest,
) -> Result<AppPreferencesSettingsSnapshot, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut preferences = load_app_preferences(app_data_dir)?;
    let mut changed = false;

    if let Some(theme) = request.theme {
        if preferences.theme != theme {
            preferences.theme = theme;
            changed = true;
        }
    }

    if let Some(language) = request.language {
        if preferences.language != language {
            preferences.language = language;
            changed = true;
        }
    }

    if changed {
        preferences.updated_at_ms = next_preferences_timestamp(&preferences);
    }

    save_app_preferences(app_data_dir, &preferences)?;

    Ok(preferences)
}

pub fn validate_app_preferences(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_app_preferences_store(app_data_dir.as_ref())
}

pub fn get_shortcut_preferences(
    app_data_dir: impl AsRef<Path>,
    _request: GetShortcutPreferencesRequest,
) -> Result<GetShortcutPreferencesResult, AppError> {
    Ok(GetShortcutPreferencesResult {
        preferences: load_shortcut_preferences(app_data_dir.as_ref())?,
    })
}

pub fn update_shortcut_preferences(
    app_data_dir: impl AsRef<Path>,
    request: UpdateShortcutPreferencesRequest,
) -> Result<UpdateShortcutPreferencesResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut preferences = load_shortcut_preferences(app_data_dir)?;

    apply_shortcut_update(&mut preferences, request)?;
    save_shortcut_preferences(app_data_dir, &preferences)?;

    Ok(UpdateShortcutPreferencesResult { preferences })
}

pub fn reset_shortcut_preferences(
    app_data_dir: impl AsRef<Path>,
    request: ResetShortcutPreferencesRequest,
) -> Result<ResetShortcutPreferencesResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let current = load_shortcut_preferences(app_data_dir)?;
    let profile = request.profile.unwrap_or_else(|| current.profile.clone());
    let mut preferences = default_shortcut_preferences_for_profile(profile);
    preferences.created_at_ms = current.created_at_ms;
    preferences.updated_at_ms = next_shortcut_timestamp(&current);
    save_shortcut_preferences(app_data_dir, &preferences)?;

    Ok(ResetShortcutPreferencesResult { preferences })
}

pub fn validate_shortcut_preferences(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_shortcut_preferences_store(app_data_dir.as_ref())
}

pub fn get_chat_terminal_output_preferences(
    app_data_dir: impl AsRef<Path>,
    _request: GetChatTerminalOutputPreferencesRequest,
) -> Result<GetChatTerminalOutputPreferencesResult, AppError> {
    Ok(GetChatTerminalOutputPreferencesResult {
        preferences: load_chat_terminal_output_preferences(app_data_dir.as_ref())?,
    })
}

pub fn update_chat_terminal_output_preferences(
    app_data_dir: impl AsRef<Path>,
    request: UpdateChatTerminalOutputPreferencesRequest,
) -> Result<UpdateChatTerminalOutputPreferencesResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let current = load_chat_terminal_output_preferences(app_data_dir)?;
    let preferences = ChatTerminalOutputPreferencesSnapshot {
        schema_version: current.schema_version,
        display_mode: request.display_mode,
        created_at_ms: current.created_at_ms,
        updated_at_ms: next_chat_terminal_output_preferences_timestamp(&current),
    };

    validate_chat_terminal_output_preferences(&preferences)?;
    save_chat_terminal_output_preferences(app_data_dir, &preferences)?;

    Ok(UpdateChatTerminalOutputPreferencesResult { preferences })
}

pub fn reset_chat_terminal_output_preferences(
    app_data_dir: impl AsRef<Path>,
    _request: ResetChatTerminalOutputPreferencesRequest,
) -> Result<ResetChatTerminalOutputPreferencesResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let current = load_chat_terminal_output_preferences(app_data_dir)?;
    let mut preferences = default_chat_terminal_output_preferences();
    preferences.created_at_ms = current.created_at_ms;
    preferences.updated_at_ms = next_chat_terminal_output_preferences_timestamp(&current);
    save_chat_terminal_output_preferences(app_data_dir, &preferences)?;

    Ok(ResetChatTerminalOutputPreferencesResult { preferences })
}

pub fn validate_chat_terminal_output_preferences_for_app_data(
    app_data_dir: impl AsRef<Path>,
) -> Result<(), AppError> {
    validate_chat_terminal_output_preferences_store(app_data_dir.as_ref())
}

pub fn get_terminal_configuration(
    app_data_dir: impl AsRef<Path>,
    _request: GetTerminalConfigurationRequest,
) -> Result<GetTerminalConfigurationResult, AppError> {
    Ok(GetTerminalConfigurationResult {
        configuration: load_terminal_configuration(app_data_dir.as_ref())?,
    })
}

pub fn update_terminal_configuration(
    app_data_dir: impl AsRef<Path>,
    request: UpdateTerminalConfigurationRequest,
) -> Result<UpdateTerminalConfigurationResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let current = load_terminal_configuration(app_data_dir)?;
    let mut configuration = TerminalConfigurationSnapshot {
        schema_version: current.schema_version,
        built_in_cli_entries: request.built_in_cli_entries,
        custom_cli_entries: request.custom_cli_entries,
        custom_terminal_entries: request.custom_terminal_entries,
        default_terminal_id: request.default_terminal_id,
        created_at_ms: current.created_at_ms,
        updated_at_ms: next_terminal_configuration_timestamp(&current),
    };

    crate::domain::settings::normalize_terminal_configuration(&mut configuration)?;
    save_terminal_configuration(app_data_dir, &configuration)?;

    Ok(UpdateTerminalConfigurationResult { configuration })
}

pub fn reset_terminal_configuration(
    app_data_dir: impl AsRef<Path>,
    _request: ResetTerminalConfigurationRequest,
) -> Result<ResetTerminalConfigurationResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let current = load_terminal_configuration(app_data_dir)?;
    let mut configuration = default_terminal_configuration();
    configuration.created_at_ms = current.created_at_ms;
    configuration.updated_at_ms = next_terminal_configuration_timestamp(&current);
    save_terminal_configuration(app_data_dir, &configuration)?;

    Ok(ResetTerminalConfigurationResult { configuration })
}

pub fn validate_terminal_configuration(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_terminal_configuration_store(app_data_dir.as_ref())
}

pub fn get_profile_settings(
    app_data_dir: impl AsRef<Path>,
    _request: GetProfileSettingsRequest,
) -> Result<GetProfileSettingsResult, AppError> {
    Ok(GetProfileSettingsResult {
        profile: load_profile_settings(app_data_dir.as_ref())?,
    })
}

pub fn update_profile_settings(
    app_data_dir: impl AsRef<Path>,
    request: UpdateProfileSettingsRequest,
) -> Result<UpdateProfileSettingsResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;

    apply_profile_update(&mut profile, request)?;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(UpdateProfileSettingsResult { profile })
}

pub fn validate_profile_settings(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_profile_settings_store(app_data_dir.as_ref())
}

pub fn validate_profile_avatar_library(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_avatar_library_store(app_data_dir.as_ref())
}

pub fn upload_profile_avatar(
    app_data_dir: impl AsRef<Path>,
    request: UploadProfileAvatarRequest,
) -> Result<UploadProfileAvatarResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;
    let source_path = PathBuf::from(request.source_path);
    let (upload_id, source_file_name, content_type, size_bytes, library_relative_path, preview) =
        copy_uploaded_profile_avatar(app_data_dir, &source_path)?;
    let timestamp = next_profile_timestamp(&profile);

    profile.avatar = Some(uploaded_avatar_snapshot(
        upload_id,
        source_file_name,
        content_type,
        size_bytes,
        library_relative_path,
        preview,
        timestamp,
    ));
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(UploadProfileAvatarResult { profile })
}

pub fn select_profile_avatar_preset(
    app_data_dir: impl AsRef<Path>,
    request: SelectProfileAvatarPresetRequest,
) -> Result<SelectProfileAvatarPresetResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;
    let timestamp = next_profile_timestamp(&profile);

    profile.avatar = Some(preset_avatar_snapshot(request.preset_id, timestamp)?);
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(SelectProfileAvatarPresetResult { profile })
}

pub fn reset_profile_avatar(
    app_data_dir: impl AsRef<Path>,
    _request: ResetProfileAvatarRequest,
) -> Result<ResetProfileAvatarResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;
    let timestamp = next_profile_timestamp(&profile);

    profile.avatar = Some(placeholder_avatar_snapshot(timestamp));
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(ResetProfileAvatarResult { profile })
}

pub fn delete_uploaded_profile_avatar(
    app_data_dir: impl AsRef<Path>,
    _request: DeleteUploadedProfileAvatarRequest,
) -> Result<DeleteUploadedProfileAvatarResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;

    delete_current_uploaded_profile_avatar(app_data_dir, &profile)?;

    let timestamp = next_profile_timestamp(&profile);
    profile.avatar = Some(placeholder_avatar_snapshot(timestamp));
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(DeleteUploadedProfileAvatarResult { profile })
}

fn apply_profile_update(
    profile: &mut ProfileSettingsSnapshot,
    request: UpdateProfileSettingsRequest,
) -> Result<(), AppError> {
    if let Some(display_name) = request.display_name {
        profile.display_name = normalize_profile_display_name(display_name)?;
    }

    if let Some(timezone) = request.timezone {
        profile.timezone = normalize_profile_timezone(timezone)?;
    }

    if let Some(status) = request.status {
        profile.status = normalize_profile_status(status)?;
    }

    if let Some(status_message) = request.status_message {
        profile.status_message = normalize_profile_status_message(status_message)?;
    }

    profile.updated_at_ms = next_profile_timestamp(profile);

    Ok(())
}

fn apply_shortcut_update(
    preferences: &mut ShortcutPreferencesSnapshot,
    request: UpdateShortcutPreferencesRequest,
) -> Result<(), AppError> {
    if let Some(profile) = request.profile {
        preferences.profile = profile;
    }

    if let Some(shortcuts_enabled) = request.shortcuts_enabled {
        preferences.shortcuts_enabled = shortcuts_enabled;
    }

    if let Some(shortcut_hints_enabled) = request.shortcut_hints_enabled {
        preferences.shortcut_hints_enabled = shortcut_hints_enabled;
    }

    if let Some(disabled_action_ids) = request.disabled_action_ids {
        preferences.disabled_action_ids = disabled_action_ids;
    }

    preferences.disabled_action_ids.sort();
    preferences.disabled_action_ids.dedup();
    preferences.bindings =
        default_shortcut_bindings(&preferences.profile, &preferences.disabled_action_ids);
    preferences.updated_at_ms = next_shortcut_timestamp(preferences);
    normalize_shortcut_preferences(preferences)?;

    Ok(())
}

fn next_profile_timestamp(profile: &ProfileSettingsSnapshot) -> u64 {
    now_ms().max(profile.updated_at_ms + 1)
}

fn next_shortcut_timestamp(preferences: &ShortcutPreferencesSnapshot) -> u64 {
    now_ms().max(preferences.updated_at_ms + 1)
}

fn next_terminal_configuration_timestamp(configuration: &TerminalConfigurationSnapshot) -> u64 {
    now_ms().max(configuration.updated_at_ms + 1)
}

fn next_chat_terminal_output_preferences_timestamp(
    preferences: &ChatTerminalOutputPreferencesSnapshot,
) -> u64 {
    now_ms().max(preferences.updated_at_ms + 1)
}

fn next_preferences_timestamp(preferences: &AppPreferencesSettingsSnapshot) -> u64 {
    now_ms().max(preferences.updated_at_ms + 1)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        delete_uploaded_profile_avatar, get_app_preferences, get_chat_terminal_output_preferences,
        get_profile_settings, get_shortcut_preferences, get_terminal_configuration,
        reset_chat_terminal_output_preferences, reset_profile_avatar, reset_shortcut_preferences,
        select_profile_avatar_preset, update_app_preferences,
        update_chat_terminal_output_preferences, update_profile_settings,
        update_shortcut_preferences, upload_profile_avatar,
    };
    use crate::contracts::{
        AppLanguage, AppTheme, ChatTerminalOutputDisplayMode, DeleteUploadedProfileAvatarRequest,
        GetChatTerminalOutputPreferencesRequest, GetProfileSettingsRequest,
        GetShortcutPreferencesRequest, GetTerminalConfigurationRequest, ProfileAvatarKind,
        ProfileStatus, ResetChatTerminalOutputPreferencesRequest, ResetProfileAvatarRequest,
        ResetShortcutPreferencesRequest, SelectProfileAvatarPresetRequest, ShortcutKeymapProfile,
        UpdateAppPreferencesRequest, UpdateChatTerminalOutputPreferencesRequest,
        UpdateProfileSettingsRequest, UpdateShortcutPreferencesRequest, UploadProfileAvatarRequest,
    };
    use crate::domain::settings::PROFILE_AVATAR_MAX_BYTES;
    use crate::infrastructure::persistence::json_store::{
        legacy_global_settings_store::legacy_global_settings_path,
        notification_preferences_store::{
            default_notification_preferences, load_notification_preferences,
            save_notification_preferences,
        },
        terminal_configuration_store::{
            default_terminal_configuration, save_terminal_configuration,
        },
    };

    #[test]
    fn app_preferences_update_persists_and_restores_from_disk() {
        let app_data = tempdir().expect("app data dir");

        let updated = update_app_preferences(
            app_data.path(),
            UpdateAppPreferencesRequest {
                theme: Some(AppTheme::Dark),
                language: Some(AppLanguage::EnUs),
                source_window_label: Some("workspace-selection".to_owned()),
            },
        )
        .expect("preferences updated");

        assert_eq!(updated.theme, AppTheme::Dark);
        assert_eq!(updated.language, AppLanguage::EnUs);

        let restored = get_app_preferences(app_data.path()).expect("restored");

        assert_eq!(restored, updated);
    }

    #[test]
    fn app_preferences_reject_invalid_json() {
        let app_data = tempdir().expect("app data dir");
        let preferences_dir = app_data.path().join("settings");
        fs::create_dir_all(&preferences_dir).expect("preferences dir");
        fs::write(preferences_dir.join("preferences.json"), "{not json")
            .expect("invalid preferences fixture");

        let error = get_app_preferences(app_data.path()).expect_err("invalid json rejected");

        assert_eq!(error.code, "settings.preferences.invalidJson");
        assert!(error.recoverable);
    }

    #[test]
    fn legacy_global_settings_hydrate_missing_current_settings_surfaces() {
        let app_data = tempdir().expect("app data dir");
        write_legacy_global_settings(app_data.path());

        let preferences = get_app_preferences(app_data.path()).expect("preferences");
        let profile =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("profile");
        let notifications = load_notification_preferences(app_data.path()).expect("notifications");
        let shortcuts = get_shortcut_preferences(app_data.path(), GetShortcutPreferencesRequest {})
            .expect("shortcuts");
        let chat_output = get_chat_terminal_output_preferences(
            app_data.path(),
            GetChatTerminalOutputPreferencesRequest {},
        )
        .expect("chat output");
        let terminal =
            get_terminal_configuration(app_data.path(), GetTerminalConfigurationRequest {})
                .expect("terminal");

        assert_eq!(preferences.theme, AppTheme::Light);
        assert_eq!(preferences.language, AppLanguage::ZhCn);
        assert_eq!(profile.profile.display_name, "Legacy Dana");
        assert_eq!(profile.profile.timezone, "UTC");
        assert_eq!(profile.profile.status, ProfileStatus::DoNotDisturb);
        assert_eq!(
            profile.profile.status_message.as_deref(),
            Some("legacy focus")
        );
        assert!(!notifications.desktop_notifications_enabled);
        assert!(notifications.mentions_only);
        assert_eq!(shortcuts.preferences.profile, ShortcutKeymapProfile::Vscode);
        assert!(!shortcuts.preferences.shortcuts_enabled);
        assert_eq!(
            chat_output.preferences.display_mode,
            ChatTerminalOutputDisplayMode::FinalOnly
        );
        assert!(terminal
            .configuration
            .custom_cli_entries
            .iter()
            .any(|entry| entry.command == "legacy-reviewer --stdio"));
        assert_eq!(
            terminal.configuration.default_terminal_id.as_deref(),
            Some("legacy-terminal-ghostty")
        );
    }

    #[test]
    fn current_settings_files_take_precedence_over_legacy_global_settings() {
        let app_data = tempdir().expect("app data dir");
        write_legacy_global_settings(app_data.path());

        update_app_preferences(
            app_data.path(),
            UpdateAppPreferencesRequest {
                theme: Some(AppTheme::Dark),
                language: Some(AppLanguage::EnUs),
                source_window_label: None,
            },
        )
        .expect("current preferences");
        update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Current Dana".to_owned()),
                timezone: Some("Asia/Shanghai".to_owned()),
                status: Some("working".to_owned()),
                status_message: Some("current".to_owned()),
            },
        )
        .expect("current profile");
        let mut notifications = default_notification_preferences();
        notifications.desktop_notifications_enabled = true;
        notifications.mentions_only = false;
        save_notification_preferences(app_data.path(), &notifications)
            .expect("current notifications");
        update_shortcut_preferences(
            app_data.path(),
            UpdateShortcutPreferencesRequest {
                profile: Some(ShortcutKeymapProfile::Slack),
                shortcuts_enabled: Some(true),
                shortcut_hints_enabled: Some(true),
                disabled_action_ids: Some(Vec::new()),
            },
        )
        .expect("current shortcuts");
        update_chat_terminal_output_preferences(
            app_data.path(),
            UpdateChatTerminalOutputPreferencesRequest {
                display_mode: ChatTerminalOutputDisplayMode::Stream,
            },
        )
        .expect("current chat output");
        let mut terminal = default_terminal_configuration();
        terminal.default_terminal_id = None;
        save_terminal_configuration(app_data.path(), &terminal).expect("current terminal");

        assert_eq!(
            get_app_preferences(app_data.path())
                .expect("preferences")
                .theme,
            AppTheme::Dark
        );
        assert_eq!(
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {})
                .expect("profile")
                .profile
                .display_name,
            "Current Dana"
        );
        assert!(
            load_notification_preferences(app_data.path())
                .expect("notifications")
                .desktop_notifications_enabled
        );
        assert_eq!(
            get_shortcut_preferences(app_data.path(), GetShortcutPreferencesRequest {})
                .expect("shortcuts")
                .preferences
                .profile,
            ShortcutKeymapProfile::Slack
        );
        assert_eq!(
            get_chat_terminal_output_preferences(
                app_data.path(),
                GetChatTerminalOutputPreferencesRequest {},
            )
            .expect("chat output")
            .preferences
            .display_mode,
            ChatTerminalOutputDisplayMode::Stream
        );
        assert!(
            get_terminal_configuration(app_data.path(), GetTerminalConfigurationRequest {},)
                .expect("terminal")
                .configuration
                .custom_cli_entries
                .is_empty()
        );
    }

    #[test]
    fn shortcut_preferences_update_persists_and_restores_from_disk() {
        let app_data = tempdir().expect("app data dir");

        let updated = update_shortcut_preferences(
            app_data.path(),
            UpdateShortcutPreferencesRequest {
                profile: Some(ShortcutKeymapProfile::Vscode),
                shortcuts_enabled: Some(false),
                shortcut_hints_enabled: Some(false),
                disabled_action_ids: Some(vec!["chat.send".to_owned()]),
            },
        )
        .expect("shortcut preferences updated");

        assert_eq!(updated.preferences.profile, ShortcutKeymapProfile::Vscode);
        assert!(!updated.preferences.shortcuts_enabled);
        assert!(!updated.preferences.shortcut_hints_enabled);
        assert_eq!(updated.preferences.disabled_action_ids, vec!["chat.send"]);
        assert!(updated.preferences.bindings.iter().any(|binding| {
            binding.action_id == "chat.send"
                && !binding.enabled
                && binding.keys.contains(&"Ctrl+Enter".to_owned())
        }));

        let restored = get_shortcut_preferences(app_data.path(), GetShortcutPreferencesRequest {})
            .expect("restored");

        assert_eq!(restored.preferences, updated.preferences);
    }

    #[test]
    fn shortcut_preferences_reset_restores_profile_defaults() {
        let app_data = tempdir().expect("app data dir");
        update_shortcut_preferences(
            app_data.path(),
            UpdateShortcutPreferencesRequest {
                profile: Some(ShortcutKeymapProfile::Slack),
                shortcuts_enabled: Some(false),
                shortcut_hints_enabled: Some(false),
                disabled_action_ids: Some(vec!["chat.send".to_owned()]),
            },
        )
        .expect("shortcut preferences seeded");

        let reset = reset_shortcut_preferences(
            app_data.path(),
            ResetShortcutPreferencesRequest {
                profile: Some(ShortcutKeymapProfile::Vscode),
            },
        )
        .expect("shortcut preferences reset");

        assert_eq!(reset.preferences.profile, ShortcutKeymapProfile::Vscode);
        assert!(reset.preferences.shortcuts_enabled);
        assert!(reset.preferences.shortcut_hints_enabled);
        assert!(reset.preferences.disabled_action_ids.is_empty());
        assert!(reset.preferences.bindings.iter().any(|binding| {
            binding.action_id == "chat.send" && binding.keys.contains(&"Ctrl+Enter".to_owned())
        }));
    }

    #[test]
    fn shortcut_preferences_reject_unknown_disabled_action() {
        let app_data = tempdir().expect("app data dir");

        let error = update_shortcut_preferences(
            app_data.path(),
            UpdateShortcutPreferencesRequest {
                profile: None,
                shortcuts_enabled: None,
                shortcut_hints_enabled: None,
                disabled_action_ids: Some(vec!["unknown.action".to_owned()]),
            },
        )
        .expect_err("unknown shortcut action rejected");

        assert_eq!(error.code, "settings.shortcuts.unknownAction");
        assert!(error.recoverable);
    }

    #[test]
    fn chat_terminal_output_preferences_update_persists_and_restores_from_disk() {
        let app_data = tempdir().expect("app data dir");

        let updated = update_chat_terminal_output_preferences(
            app_data.path(),
            UpdateChatTerminalOutputPreferencesRequest {
                display_mode: ChatTerminalOutputDisplayMode::FinalOnly,
            },
        )
        .expect("chat terminal output preferences updated");

        assert_eq!(
            updated.preferences.display_mode,
            ChatTerminalOutputDisplayMode::FinalOnly
        );

        let restored = get_chat_terminal_output_preferences(
            app_data.path(),
            GetChatTerminalOutputPreferencesRequest {},
        )
        .expect("restored");

        assert_eq!(restored.preferences, updated.preferences);
    }

    #[test]
    fn chat_terminal_output_preferences_reset_restores_stream_default() {
        let app_data = tempdir().expect("app data dir");
        update_chat_terminal_output_preferences(
            app_data.path(),
            UpdateChatTerminalOutputPreferencesRequest {
                display_mode: ChatTerminalOutputDisplayMode::FinalOnly,
            },
        )
        .expect("chat terminal output preferences seeded");

        let reset = reset_chat_terminal_output_preferences(
            app_data.path(),
            ResetChatTerminalOutputPreferencesRequest {},
        )
        .expect("chat terminal output preferences reset");

        assert_eq!(
            reset.preferences.display_mode,
            ChatTerminalOutputDisplayMode::Stream
        );
    }

    #[test]
    fn chat_terminal_output_preferences_reject_invalid_json_without_overwriting_saved_mode() {
        let app_data = tempdir().expect("app data dir");
        update_chat_terminal_output_preferences(
            app_data.path(),
            UpdateChatTerminalOutputPreferencesRequest {
                display_mode: ChatTerminalOutputDisplayMode::FinalOnly,
            },
        )
        .expect("chat terminal output preferences seeded");

        let preferences_path = app_data
            .path()
            .join("settings")
            .join("chat-terminal-output.json");
        fs::write(&preferences_path, "{not json").expect("invalid preference fixture");

        let error = get_chat_terminal_output_preferences(
            app_data.path(),
            GetChatTerminalOutputPreferencesRequest {},
        )
        .expect_err("invalid json rejected");

        assert_eq!(error.code, "settings.chatTerminalOutput.invalidJson");
        assert!(error.recoverable);
    }

    #[test]
    fn legacy_local_profile_avatar_loads_uploaded_snapshot_with_preview() {
        let app_data = tempdir().expect("app data dir");
        write_legacy_global_settings_with_avatar(app_data.path(), Some("local:avatar1"));
        write_legacy_avatar_library(app_data.path(), "avatar1", "avatar1.png");
        write_legacy_avatar_file(app_data.path(), "avatar1.png", b"legacy png");

        let profile =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("profile");
        let avatar = profile.profile.avatar.as_ref().expect("avatar");

        assert_eq!(avatar.kind, ProfileAvatarKind::Uploaded);
        assert_eq!(avatar.upload_id.as_deref(), Some("avatar1"));
        assert_eq!(avatar.source_file_name.as_deref(), Some("avatar1.png"));
        assert_eq!(avatar.content_type.as_deref(), Some("image/png"));
        assert_eq!(avatar.size_bytes, Some(10));
        assert_eq!(
            avatar.library_relative_path.as_deref(),
            Some("avatars/avatar1.png")
        );
        assert!(avatar
            .preview_data_url
            .as_deref()
            .unwrap_or_default()
            .starts_with("data:image/png;base64,"));
        assert!(!app_data.path().join("settings/profile.json").exists());
    }

    #[test]
    fn current_profile_avatar_takes_precedence_over_legacy_local_avatar() {
        let app_data = tempdir().expect("app data dir");
        select_profile_avatar_preset(
            app_data.path(),
            SelectProfileAvatarPresetRequest {
                preset_id: "forest".to_owned(),
            },
        )
        .expect("current preset selected");
        write_legacy_global_settings_with_avatar(app_data.path(), Some("local:avatar1"));
        write_legacy_avatar_library(app_data.path(), "avatar1", "avatar1.png");
        write_legacy_avatar_file(app_data.path(), "avatar1.png", b"legacy png");

        let profile =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("profile");
        let avatar = profile.profile.avatar.as_ref().expect("avatar");

        assert_eq!(avatar.kind, ProfileAvatarKind::Preset);
        assert_eq!(avatar.preset_id.as_deref(), Some("forest"));
        assert!(avatar.upload_id.is_none());
        assert!(avatar.preview_data_url.is_none());
    }

    #[test]
    fn unsafe_or_missing_legacy_local_profile_avatar_falls_back_to_placeholder() {
        assert_legacy_local_avatar_falls_back("missing-entry.png", None, false);
        assert_legacy_local_avatar_falls_back("../escape.png", None, true);
        assert_legacy_local_avatar_falls_back("missing.png", None, true);
        assert_legacy_local_avatar_falls_back("avatar.txt", Some(b"not image"), true);
        assert_legacy_local_avatar_falls_back("empty.png", Some(b""), true);

        let too_large = vec![0_u8; (PROFILE_AVATAR_MAX_BYTES + 1) as usize];
        assert_legacy_local_avatar_falls_back("too-large.png", Some(&too_large), true);
    }

    #[test]
    fn profile_settings_update_persists_and_restores_from_disk() {
        let app_data = tempdir().expect("app data dir");

        let updated = update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Dana".to_owned()),
                timezone: Some("Asia/Shanghai".to_owned()),
                status: Some("working".to_owned()),
                status_message: Some("Reviewing Story 7.1".to_owned()),
            },
        )
        .expect("profile updated");

        assert_eq!(updated.profile.display_name, "Dana");
        assert_eq!(updated.profile.timezone, "Asia/Shanghai");
        assert_eq!(updated.profile.status, ProfileStatus::Working);
        assert_eq!(
            updated.profile.status_message.as_deref(),
            Some("Reviewing Story 7.1")
        );

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");

        assert_eq!(restored.profile, updated.profile);
    }

    #[test]
    fn profile_avatar_upload_persists_asset_and_restores_preview() {
        let app_data = tempdir().expect("app data dir");
        let source_dir = tempdir().expect("source dir");
        let source_path = source_dir.path().join("avatar.png");
        fs::write(&source_path, b"png").expect("avatar fixture");

        let updated = upload_profile_avatar(
            app_data.path(),
            UploadProfileAvatarRequest {
                source_path: source_path.display().to_string(),
            },
        )
        .expect("avatar uploaded");
        let avatar = updated.profile.avatar.as_ref().expect("avatar snapshot");

        assert_eq!(avatar.kind, ProfileAvatarKind::Uploaded);
        assert_eq!(avatar.content_type.as_deref(), Some("image/png"));
        assert!(avatar
            .preview_data_url
            .as_deref()
            .unwrap_or_default()
            .starts_with("data:image/png;base64,"));
        assert!(app_data
            .path()
            .join(
                avatar
                    .library_relative_path
                    .as_deref()
                    .expect("library path")
            )
            .exists());

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");
        assert_eq!(
            restored.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Uploaded
        );
        assert!(restored
            .profile
            .avatar
            .as_ref()
            .and_then(|avatar| avatar.preview_data_url.as_deref())
            .unwrap_or_default()
            .starts_with("data:image/png;base64,"));
    }

    #[test]
    fn profile_avatar_rejects_invalid_upload_without_overwriting_current_avatar() {
        let app_data = tempdir().expect("app data dir");
        select_profile_avatar_preset(
            app_data.path(),
            SelectProfileAvatarPresetRequest {
                preset_id: "lagoon".to_owned(),
            },
        )
        .expect("preset selected");
        let source_path = app_data.path().join("avatar.txt");
        fs::write(&source_path, b"not image").expect("invalid fixture");

        let error = upload_profile_avatar(
            app_data.path(),
            UploadProfileAvatarRequest {
                source_path: source_path.display().to_string(),
            },
        )
        .expect_err("invalid upload rejected");

        assert_eq!(error.code, "settings.avatar.unsupportedFileType");

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");
        let avatar = restored.profile.avatar.as_ref().expect("avatar");
        assert_eq!(avatar.kind, ProfileAvatarKind::Preset);
        assert_eq!(avatar.preset_id.as_deref(), Some("lagoon"));
    }

    #[test]
    fn profile_avatar_selects_preset_and_reset_uses_placeholder_without_workspace_copy() {
        let app_data = tempdir().expect("app data dir");
        let selected = select_profile_avatar_preset(
            app_data.path(),
            SelectProfileAvatarPresetRequest {
                preset_id: "forest".to_owned(),
            },
        )
        .expect("preset selected");

        let avatar = selected.profile.avatar.as_ref().expect("avatar");
        assert_eq!(avatar.kind, ProfileAvatarKind::Preset);
        assert_eq!(avatar.preset_id.as_deref(), Some("forest"));
        assert!(avatar.library_relative_path.is_none());

        let reset = reset_profile_avatar(app_data.path(), ResetProfileAvatarRequest {})
            .expect("avatar reset");
        assert_eq!(
            reset.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Placeholder
        );
        assert!(!app_data.path().join(".orchlet").exists());
    }

    #[test]
    fn profile_avatar_delete_removes_current_uploaded_asset_and_falls_back() {
        let app_data = tempdir().expect("app data dir");
        let source_dir = tempdir().expect("source dir");
        let source_path = source_dir.path().join("avatar.webp");
        fs::write(&source_path, b"webp").expect("avatar fixture");
        let uploaded = upload_profile_avatar(
            app_data.path(),
            UploadProfileAvatarRequest {
                source_path: source_path.display().to_string(),
            },
        )
        .expect("avatar uploaded");
        let asset_path = app_data.path().join(
            uploaded
                .profile
                .avatar
                .as_ref()
                .and_then(|avatar| avatar.library_relative_path.as_deref())
                .expect("asset path"),
        );
        assert!(asset_path.exists());

        let deleted =
            delete_uploaded_profile_avatar(app_data.path(), DeleteUploadedProfileAvatarRequest {})
                .expect("avatar deleted");

        assert!(!asset_path.exists());
        assert_eq!(
            deleted.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Placeholder
        );
    }

    #[test]
    fn profile_settings_rejects_invalid_fields_without_overwriting_existing_profile() {
        let app_data = tempdir().expect("app data dir");
        update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Dana".to_owned()),
                timezone: Some("UTC".to_owned()),
                status: Some("online".to_owned()),
                status_message: Some("Available".to_owned()),
            },
        )
        .expect("profile seeded");

        let error = update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("   ".to_owned()),
                timezone: None,
                status: Some("busy".to_owned()),
                status_message: None,
            },
        )
        .expect_err("invalid profile rejected");

        assert_eq!(error.code, "settings.profile.invalidDisplayName");
        assert!(error
            .details
            .as_deref()
            .unwrap_or_default()
            .contains("displayName"));

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");
        assert_eq!(restored.profile.display_name, "Dana");
        assert_eq!(restored.profile.status, ProfileStatus::Online);
    }

    #[test]
    fn profile_settings_rejects_unsupported_status_with_field_details() {
        let app_data = tempdir().expect("app data dir");
        let error = update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Dana".to_owned()),
                timezone: Some("UTC".to_owned()),
                status: Some("away".to_owned()),
                status_message: None,
            },
        )
        .expect_err("invalid status rejected");

        assert_eq!(error.code, "settings.profile.unsupportedStatus");
        assert!(error
            .details
            .as_deref()
            .unwrap_or_default()
            .contains("status"));
    }

    fn write_legacy_global_settings(app_data_dir: &std::path::Path) {
        write_legacy_global_settings_with_avatar(app_data_dir, None);
    }

    fn write_legacy_global_settings_with_avatar(
        app_data_dir: &std::path::Path,
        avatar: Option<&str>,
    ) {
        let mut settings = serde_json::json!({
            "appearance": { "theme": "light" },
            "locale": "zh-CN",
            "account": {
                "displayName": "Legacy Dana",
                "timezone": "utc",
                "status": "dnd",
                "statusMessage": "legacy focus"
            },
            "notifications": {
                "desktop": false,
                "sound": false,
                "mentionsOnly": true,
                "previews": false,
                "quietHoursEnabled": true,
                "quietHoursStart": "21:00",
                "quietHoursEnd": "07:00"
            },
            "keybinds": {
                "enabled": false,
                "showHints": false,
                "profile": "vscode",
                "disabledActionIds": ["chat.send"]
            },
            "chat": { "streamOutput": false },
            "members": {
                "terminalPaths": { "codex": "/opt/codex" },
                "customMembers": [
                    { "id": "legacy-reviewer", "name": "Legacy Reviewer", "command": "legacy-reviewer --stdio" }
                ],
                "defaultTerminalName": "Ghostty",
                "defaultTerminalPath": "/opt/ghostty"
            }
        });
        if let Some(avatar) = avatar {
            settings["account"]["avatar"] = serde_json::Value::String(avatar.to_owned());
        }

        fs::write(
            legacy_global_settings_path(app_data_dir),
            settings.to_string(),
        )
        .expect("legacy global settings");
    }

    fn write_legacy_avatar_library(app_data_dir: &std::path::Path, id: &str, filename: &str) {
        fs::write(
            app_data_dir.join("avatar-library.json"),
            serde_json::json!([
                {
                    "id": id,
                    "filename": filename,
                    "createdAt": 1_760_000_000_000_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy avatar library");
    }

    fn write_legacy_avatar_file(app_data_dir: &std::path::Path, filename: &str, bytes: &[u8]) {
        let avatar_dir = app_data_dir.join("avatars");
        fs::create_dir_all(&avatar_dir).expect("legacy avatar dir");
        fs::write(avatar_dir.join(filename), bytes).expect("legacy avatar file");
    }

    fn assert_legacy_local_avatar_falls_back(
        filename: &str,
        bytes: Option<&[u8]>,
        include_library_entry: bool,
    ) {
        let app_data = tempdir().expect("app data dir");
        write_legacy_global_settings_with_avatar(app_data.path(), Some("local:avatar1"));
        if include_library_entry {
            write_legacy_avatar_library(app_data.path(), "avatar1", filename);
        } else {
            fs::write(app_data.path().join("avatar-library.json"), "[]")
                .expect("empty legacy avatar library");
        }
        if let Some(bytes) = bytes {
            write_legacy_avatar_file(app_data.path(), filename, bytes);
        }

        let profile =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("profile");

        assert_eq!(
            profile.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Placeholder
        );
    }
}
