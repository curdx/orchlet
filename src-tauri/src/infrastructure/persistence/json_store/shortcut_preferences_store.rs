use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    contracts::{AppError, ShortcutKeymapProfile, ShortcutPreferencesSnapshot},
    domain::settings::{
        default_shortcut_bindings, normalize_shortcut_preferences, validate_shortcut_preferences,
        PROFILE_SETTINGS_DIR_NAME, SHORTCUT_PREFERENCES_FILE_NAME,
        SHORTCUT_PREFERENCES_SCHEMA_VERSION,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const SHORTCUT_PREFERENCES_STORE_SCHEMA_VERSION: u32 = 1;

pub fn shortcut_preferences_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn shortcut_preferences_path(app_data_dir: &Path) -> PathBuf {
    shortcut_preferences_dir(app_data_dir).join(SHORTCUT_PREFERENCES_FILE_NAME)
}

pub fn default_shortcut_preferences() -> ShortcutPreferencesSnapshot {
    default_shortcut_preferences_for_profile(ShortcutKeymapProfile::Default)
}

pub fn default_shortcut_preferences_for_profile(
    profile: ShortcutKeymapProfile,
) -> ShortcutPreferencesSnapshot {
    let timestamp = now_ms();
    let disabled_action_ids = Vec::new();

    ShortcutPreferencesSnapshot {
        schema_version: SHORTCUT_PREFERENCES_SCHEMA_VERSION,
        bindings: default_shortcut_bindings(&profile, &disabled_action_ids),
        profile,
        shortcuts_enabled: true,
        shortcut_hints_enabled: true,
        disabled_action_ids,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn load_shortcut_preferences(
    app_data_dir: &Path,
) -> Result<ShortcutPreferencesSnapshot, AppError> {
    let path = shortcut_preferences_path(app_data_dir);

    if !path.exists() {
        return Ok(default_shortcut_preferences());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.shortcuts.readFailed",
            "无法读取快捷键设置。",
            "快捷键设置未更新；请检查 settings/shortcuts.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.shortcuts.invalidJson",
            "快捷键设置不是有效 JSON。",
            "请先备份或修复 settings/shortcuts.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let mut preferences: ShortcutPreferencesSnapshot =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "settings.shortcuts.invalidFields",
                format!("快捷键设置字段无效：{}。", error),
                "请先备份或修复 settings/shortcuts.json 后重试。",
                Some(format!("{}: {}", path.display(), error)),
            )
        })?;

    normalize_shortcut_preferences(&mut preferences)?;

    Ok(preferences)
}

pub fn save_shortcut_preferences(
    app_data_dir: &Path,
    preferences: &ShortcutPreferencesSnapshot,
) -> Result<(), AppError> {
    validate_shortcut_preferences(preferences)?;

    let path = shortcut_preferences_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.shortcuts.invalidPath",
            "无法定位快捷键设置目录。",
            "快捷键设置未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.shortcuts.createDirFailed",
            "无法创建快捷键设置目录。",
            "快捷键设置未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_shortcut_preferences_atomic(&path, preferences)
}

pub fn validate_shortcut_preferences_store(app_data_dir: &Path) -> Result<(), AppError> {
    load_shortcut_preferences(app_data_dir).map(|_| ())
}

fn write_shortcut_preferences_atomic(
    path: &Path,
    preferences: &ShortcutPreferencesSnapshot,
) -> Result<(), AppError> {
    let temp_path = path.with_extension("json.tmp");
    let body = serde_json::to_string_pretty(preferences).map_err(|error| {
        AppError::recoverable_error(
            "settings.shortcuts.serializeFailed",
            "无法序列化快捷键设置。",
            "快捷键设置未更新；请重试。",
            Some(error.to_string()),
        )
    })?;

    fs::write(&temp_path, body).map_err(|error| {
        AppError::recoverable_error(
            "settings.shortcuts.writeFailed",
            "无法写入快捷键设置。",
            "快捷键设置未更新；请检查 settings/shortcuts.json 权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;
    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "settings.shortcuts.renameFailed",
            "无法保存快捷键设置。",
            "快捷键设置未更新；请检查 settings/shortcuts.json 权限后重试。",
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
        default_shortcut_preferences, load_shortcut_preferences, save_shortcut_preferences,
        shortcut_preferences_path,
    };
    use crate::contracts::ShortcutKeymapProfile;

    #[test]
    fn persists_and_restores_shortcut_preferences() {
        let app_data = tempdir().expect("app data");
        let mut preferences = default_shortcut_preferences();
        preferences.profile = ShortcutKeymapProfile::Vscode;
        preferences.shortcuts_enabled = false;
        preferences.shortcut_hints_enabled = false;
        preferences.disabled_action_ids = vec!["chat.send".to_owned()];
        preferences.updated_at_ms = preferences.created_at_ms + 1;
        crate::domain::settings::normalize_shortcut_preferences(&mut preferences)
            .expect("normalized");

        save_shortcut_preferences(app_data.path(), &preferences).expect("saved");
        let restored = load_shortcut_preferences(app_data.path()).expect("restored");

        assert_eq!(restored.profile, ShortcutKeymapProfile::Vscode);
        assert!(!restored.shortcuts_enabled);
        assert!(!restored.shortcut_hints_enabled);
        assert_eq!(restored.disabled_action_ids, vec!["chat.send"]);
        assert!(restored.bindings.iter().any(|binding| {
            binding.action_id == "chat.send" && binding.keys.contains(&"Ctrl+Enter".to_owned())
        }));
    }

    #[test]
    fn invalid_shortcut_preferences_json_is_recoverable() {
        let app_data = tempdir().expect("app data");
        let path = shortcut_preferences_path(app_data.path());
        fs::create_dir_all(path.parent().expect("settings dir")).expect("settings dir");
        fs::write(&path, "{").expect("invalid json");

        let error = load_shortcut_preferences(app_data.path()).expect_err("invalid json");

        assert_eq!(error.code, "settings.shortcuts.invalidJson");
        assert!(error.recoverable);
    }
}
