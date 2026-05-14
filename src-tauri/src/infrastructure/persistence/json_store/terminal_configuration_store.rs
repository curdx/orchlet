use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    contracts::{AppError, TerminalConfigurationSnapshot},
    domain::settings::{
        default_built_in_cli_entries, normalize_terminal_configuration,
        validate_terminal_configuration, PROFILE_SETTINGS_DIR_NAME,
        TERMINAL_CONFIGURATION_FILE_NAME, TERMINAL_CONFIGURATION_SCHEMA_VERSION,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const TERMINAL_CONFIGURATION_STORE_SCHEMA_VERSION: u32 = 1;

pub fn terminal_configuration_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn terminal_configuration_path(app_data_dir: &Path) -> PathBuf {
    terminal_configuration_dir(app_data_dir).join(TERMINAL_CONFIGURATION_FILE_NAME)
}

pub fn default_terminal_configuration() -> TerminalConfigurationSnapshot {
    let timestamp = now_ms();

    TerminalConfigurationSnapshot {
        schema_version: TERMINAL_CONFIGURATION_SCHEMA_VERSION,
        built_in_cli_entries: default_built_in_cli_entries(),
        custom_cli_entries: Vec::new(),
        custom_terminal_entries: Vec::new(),
        default_terminal_id: None,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn load_terminal_configuration(
    app_data_dir: &Path,
) -> Result<TerminalConfigurationSnapshot, AppError> {
    let path = terminal_configuration_path(app_data_dir);

    if !path.exists() {
        if let Some(configuration) =
            crate::infrastructure::persistence::json_store::legacy_global_settings_store::load_legacy_terminal_configuration(app_data_dir)?
        {
            return Ok(configuration);
        }
        return Ok(default_terminal_configuration());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.terminalConfig.readFailed",
            "无法读取 CLI 与终端配置。",
            "CLI 与终端配置未更新；请检查 settings/terminal-config.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.terminalConfig.invalidJson",
            "CLI 与终端配置不是有效 JSON。",
            "请先备份或修复 settings/terminal-config.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let mut configuration: TerminalConfigurationSnapshot =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "settings.terminalConfig.invalidFields",
                format!("CLI 与终端配置字段无效：{}。", error),
                "请先备份或修复 settings/terminal-config.json 后重试。",
                Some(format!("{}: {}", path.display(), error)),
            )
        })?;

    normalize_terminal_configuration(&mut configuration)?;

    Ok(configuration)
}

pub fn save_terminal_configuration(
    app_data_dir: &Path,
    configuration: &TerminalConfigurationSnapshot,
) -> Result<(), AppError> {
    validate_terminal_configuration(configuration)?;

    let path = terminal_configuration_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.terminalConfig.invalidPath",
            "无法定位 CLI 与终端配置目录。",
            "CLI 与终端配置未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.terminalConfig.createDirFailed",
            "无法创建 CLI 与终端配置目录。",
            "CLI 与终端配置未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_terminal_configuration_atomic(&path, configuration)
}

pub fn validate_terminal_configuration_store(app_data_dir: &Path) -> Result<(), AppError> {
    load_terminal_configuration(app_data_dir).map(|_| ())
}

fn write_terminal_configuration_atomic(
    path: &Path,
    configuration: &TerminalConfigurationSnapshot,
) -> Result<(), AppError> {
    let temp_path = path.with_extension("json.tmp");
    let body = serde_json::to_string_pretty(configuration).map_err(|error| {
        AppError::recoverable_error(
            "settings.terminalConfig.serializeFailed",
            "无法序列化 CLI 与终端配置。",
            "CLI 与终端配置未更新；请重试。",
            Some(error.to_string()),
        )
    })?;

    fs::write(&temp_path, body).map_err(|error| {
        AppError::recoverable_error(
            "settings.terminalConfig.writeFailed",
            "无法写入 CLI 与终端配置。",
            "CLI 与终端配置未更新；请检查 settings/terminal-config.json 权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;
    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "settings.terminalConfig.renameFailed",
            "无法保存 CLI 与终端配置。",
            "CLI 与终端配置未更新；请检查 settings/terminal-config.json 权限后重试。",
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
        default_terminal_configuration, load_terminal_configuration, save_terminal_configuration,
        terminal_configuration_path,
    };

    #[test]
    fn persists_and_restores_terminal_configuration() {
        let app_data = tempdir().expect("app data");
        let mut configuration = default_terminal_configuration();
        configuration
            .custom_cli_entries
            .push(crate::contracts::TerminalCustomCliEntry {
                cli_id: "local-reviewer".to_owned(),
                label: "Local Reviewer".to_owned(),
                command: "reviewer --stdio".to_owned(),
            });
        configuration
            .custom_terminal_entries
            .push(crate::contracts::TerminalCustomTerminalEntry {
                terminal_id: "wezterm".to_owned(),
                label: "WezTerm".to_owned(),
                command: "/opt/homebrew/bin/wezterm".to_owned(),
            });
        configuration.default_terminal_id = Some("wezterm".to_owned());
        configuration.updated_at_ms = configuration.created_at_ms + 1;
        crate::domain::settings::normalize_terminal_configuration(&mut configuration)
            .expect("normalized");

        save_terminal_configuration(app_data.path(), &configuration).expect("saved");
        let restored = load_terminal_configuration(app_data.path()).expect("restored");

        assert_eq!(restored.custom_cli_entries.len(), 1);
        assert_eq!(restored.custom_cli_entries[0].command, "reviewer --stdio");
        assert_eq!(restored.default_terminal_id.as_deref(), Some("wezterm"));
    }

    #[test]
    fn invalid_terminal_configuration_json_is_recoverable() {
        let app_data = tempdir().expect("app data");
        let path = terminal_configuration_path(app_data.path());
        fs::create_dir_all(path.parent().expect("settings dir")).expect("settings dir");
        fs::write(&path, "{not-json").expect("invalid json");

        let error = load_terminal_configuration(app_data.path()).expect_err("invalid json");

        assert_eq!(error.code, "settings.terminalConfig.invalidJson");
        assert!(error.recoverable);
    }
}
