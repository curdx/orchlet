use ulid::Ulid;

use crate::contracts::{AppError, MemberProfile, MemberRuntimeKind, MemberRuntimeProfile};

pub const TERMINAL_SCHEMA_VERSION: u32 = 1;
pub const TERMINAL_OUTPUT_EVENT: &str = "terminal-output";
pub const TERMINAL_STATUS_CHANGE_EVENT: &str = "terminal-status-change";
pub const TERMINAL_DEFAULT_COLS: u16 = 120;
pub const TERMINAL_DEFAULT_ROWS: u16 = 30;
pub const TERMINAL_MAX_COLS: u16 = 500;
pub const TERMINAL_MAX_ROWS: u16 = 200;
pub const TERMINAL_TAB_LABEL_MAX_CHARS: usize = 80;

pub fn validate_terminal_member_id(member_id: &str) -> Result<(), AppError> {
    if member_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "terminal.member.invalidId",
            "成员标识无效，无法打开终端。",
            "请刷新成员列表后重试。",
            Some(format!("memberId must be a ULID string: {}", member_id)),
        ));
    }

    Ok(())
}

pub fn validate_terminal_session_id(terminal_session_id: &str) -> Result<(), AppError> {
    if terminal_session_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "terminal.session.invalidId",
            "终端会话标识无效。",
            "请刷新终端窗口后重试。",
            Some(format!(
                "terminalSessionId must be a ULID string: {}",
                terminal_session_id
            )),
        ));
    }

    Ok(())
}

pub fn validate_terminal_tab_id(tab_id: &str) -> Result<(), AppError> {
    if tab_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "terminal.tab.invalidId",
            "终端标签标识无效。",
            "请刷新终端窗口后重试。",
            Some(format!("tabId must be a ULID string: {}", tab_id)),
        ));
    }

    Ok(())
}

pub fn normalize_terminal_tab_label(
    label: Option<String>,
    fallback: &str,
) -> Result<String, AppError> {
    let label = label
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .trim();

    if label.is_empty() {
        return Err(AppError::recoverable_error(
            "terminal.tab.label.empty",
            "终端标签名称不能为空。",
            "请输入标签名称后重试。",
            None,
        ));
    }

    if label.chars().count() > TERMINAL_TAB_LABEL_MAX_CHARS {
        return Err(AppError::recoverable_error(
            "terminal.tab.label.tooLong",
            "终端标签名称过长。",
            "请缩短标签名称后重试。",
            Some(format!(
                "maxChars={} actualChars={}",
                TERMINAL_TAB_LABEL_MAX_CHARS,
                label.chars().count()
            )),
        ));
    }

    Ok(label.to_owned())
}

pub fn validate_terminal_size(cols: u16, rows: u16) -> Result<(), AppError> {
    if cols == 0 || rows == 0 || cols > TERMINAL_MAX_COLS || rows > TERMINAL_MAX_ROWS {
        return Err(AppError::recoverable_error(
            "terminal.resize.invalidSize",
            "终端尺寸无效。",
            "请调整终端窗口大小后重试。",
            Some(format!(
                "cols={} rows={} maxCols={} maxRows={}",
                cols, rows, TERMINAL_MAX_COLS, TERMINAL_MAX_ROWS
            )),
        ));
    }

    Ok(())
}

pub fn ensure_terminal_capable_member(member: &MemberProfile) -> Result<(), AppError> {
    if is_terminal_capable_runtime(&member.runtime) {
        return Ok(());
    }

    Err(AppError::recoverable_error(
        "terminal.member.runtimeNotTerminalCapable",
        "该成员没有可打开的终端运行时。",
        "请为该成员选择内置 CLI、自定义 CLI 或 shell 命令后重试。",
        Some(format!(
            "memberId={} runtimeKind={:?} commandPresent={}",
            member.member_id,
            member.runtime.kind,
            member
                .runtime
                .command
                .as_deref()
                .map(str::trim)
                .map(|value| !value.is_empty())
                .unwrap_or(false)
        )),
    ))
}

pub fn is_terminal_capable_runtime(runtime: &MemberRuntimeProfile) -> bool {
    if runtime.kind == MemberRuntimeKind::None {
        return false;
    }

    runtime
        .command
        .as_deref()
        .map(str::trim)
        .map(|value| !value.is_empty())
        .unwrap_or(false)
}
