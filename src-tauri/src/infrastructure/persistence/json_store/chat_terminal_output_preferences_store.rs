use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    contracts::{AppError, ChatTerminalOutputDisplayMode, ChatTerminalOutputPreferencesSnapshot},
    domain::settings::{
        validate_chat_terminal_output_preferences, CHAT_TERMINAL_OUTPUT_PREFERENCES_FILE_NAME,
        CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION, PROFILE_SETTINGS_DIR_NAME,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const CHAT_TERMINAL_OUTPUT_PREFERENCES_STORE_SCHEMA_VERSION: u32 = 1;

pub fn chat_terminal_output_preferences_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn chat_terminal_output_preferences_path(app_data_dir: &Path) -> PathBuf {
    chat_terminal_output_preferences_dir(app_data_dir)
        .join(CHAT_TERMINAL_OUTPUT_PREFERENCES_FILE_NAME)
}

pub fn default_chat_terminal_output_preferences() -> ChatTerminalOutputPreferencesSnapshot {
    let timestamp = now_ms();

    ChatTerminalOutputPreferencesSnapshot {
        schema_version: CHAT_TERMINAL_OUTPUT_PREFERENCES_SCHEMA_VERSION,
        display_mode: ChatTerminalOutputDisplayMode::Stream,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn load_chat_terminal_output_preferences(
    app_data_dir: &Path,
) -> Result<ChatTerminalOutputPreferencesSnapshot, AppError> {
    let path = chat_terminal_output_preferences_path(app_data_dir);

    if !path.exists() {
        if let Some(preferences) =
            crate::infrastructure::persistence::json_store::legacy_global_settings_store::load_legacy_chat_terminal_output_preferences(app_data_dir)?
        {
            return Ok(preferences);
        }
        return Ok(default_chat_terminal_output_preferences());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.chatTerminalOutput.readFailed",
            "无法读取聊天终端输出展示偏好。",
            "聊天终端输出展示偏好未更新；请检查 settings/chat-terminal-output.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.chatTerminalOutput.invalidJson",
            "聊天终端输出展示偏好不是有效 JSON。",
            "当前聊天终端输出展示偏好保持不变；请先备份或修复 settings/chat-terminal-output.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let preferences: ChatTerminalOutputPreferencesSnapshot =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "settings.chatTerminalOutput.invalidFields",
                format!("聊天终端输出展示偏好字段无效：{}。", error),
                "当前聊天终端输出展示偏好保持不变；请先备份或修复 settings/chat-terminal-output.json 后重试。",
                Some(format!("{}: {}", path.display(), error)),
            )
        })?;

    validate_chat_terminal_output_preferences(&preferences)?;

    Ok(preferences)
}

pub fn save_chat_terminal_output_preferences(
    app_data_dir: &Path,
    preferences: &ChatTerminalOutputPreferencesSnapshot,
) -> Result<(), AppError> {
    validate_chat_terminal_output_preferences(preferences)?;

    let path = chat_terminal_output_preferences_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.chatTerminalOutput.invalidPath",
            "无法定位聊天终端输出展示偏好目录。",
            "聊天终端输出展示偏好未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.chatTerminalOutput.createDirFailed",
            "无法创建聊天终端输出展示偏好目录。",
            "聊天终端输出展示偏好未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_chat_terminal_output_preferences_atomic(&path, preferences)
}

pub fn validate_chat_terminal_output_preferences_store(
    app_data_dir: &Path,
) -> Result<(), AppError> {
    load_chat_terminal_output_preferences(app_data_dir).map(|_| ())
}

fn write_chat_terminal_output_preferences_atomic(
    path: &Path,
    preferences: &ChatTerminalOutputPreferencesSnapshot,
) -> Result<(), AppError> {
    let temp_path = path.with_extension("json.tmp");
    let body = serde_json::to_string_pretty(preferences).map_err(|error| {
        AppError::recoverable_error(
            "settings.chatTerminalOutput.serializeFailed",
            "无法序列化聊天终端输出展示偏好。",
            "聊天终端输出展示偏好未更新；请重试。",
            Some(error.to_string()),
        )
    })?;

    fs::write(&temp_path, body).map_err(|error| {
        AppError::recoverable_error(
            "settings.chatTerminalOutput.writeFailed",
            "无法写入聊天终端输出展示偏好。",
            "聊天终端输出展示偏好未更新；请检查 settings/chat-terminal-output.json 权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;
    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "settings.chatTerminalOutput.renameFailed",
            "无法保存聊天终端输出展示偏好。",
            "聊天终端输出展示偏好未更新；当前已生效偏好保持不变，请检查 settings/chat-terminal-output.json 权限后重试。",
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
        chat_terminal_output_preferences_path, default_chat_terminal_output_preferences,
        load_chat_terminal_output_preferences, save_chat_terminal_output_preferences,
    };
    use crate::contracts::ChatTerminalOutputDisplayMode;

    #[test]
    fn persists_and_restores_chat_terminal_output_preferences() {
        let app_data = tempdir().expect("app data");
        let mut preferences = default_chat_terminal_output_preferences();
        preferences.display_mode = ChatTerminalOutputDisplayMode::FinalOnly;
        preferences.updated_at_ms = preferences.created_at_ms + 1;

        save_chat_terminal_output_preferences(app_data.path(), &preferences).expect("saved");
        let restored = load_chat_terminal_output_preferences(app_data.path()).expect("restored");

        assert_eq!(
            restored.display_mode,
            ChatTerminalOutputDisplayMode::FinalOnly
        );
    }

    #[test]
    fn invalid_chat_terminal_output_preferences_json_is_recoverable() {
        let app_data = tempdir().expect("app data");
        let path = chat_terminal_output_preferences_path(app_data.path());
        fs::create_dir_all(path.parent().expect("settings dir")).expect("settings dir");
        fs::write(&path, "{not-json").expect("invalid json");

        let error =
            load_chat_terminal_output_preferences(app_data.path()).expect_err("invalid json");

        assert_eq!(error.code, "settings.chatTerminalOutput.invalidJson");
        assert!(error.recoverable);
    }

    #[test]
    fn zero_created_at_chat_terminal_output_preferences_is_recoverable() {
        let app_data = tempdir().expect("app data");
        let path = chat_terminal_output_preferences_path(app_data.path());
        fs::create_dir_all(path.parent().expect("settings dir")).expect("settings dir");
        fs::write(
            &path,
            serde_json::json!({
                "schemaVersion": 1,
                "displayMode": "stream",
                "createdAtMs": 0,
                "updatedAtMs": 1760000090000_u64,
            })
            .to_string(),
        )
        .expect("invalid timestamp fixture");

        let error =
            load_chat_terminal_output_preferences(app_data.path()).expect_err("invalid timestamp");

        assert_eq!(error.code, "settings.chatTerminalOutput.invalidTimestamp");
        assert!(error.recoverable);
    }
}
