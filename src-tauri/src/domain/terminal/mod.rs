use ulid::Ulid;

use crate::contracts::{AppError, MemberProfile, MemberRuntimeKind, MemberRuntimeProfile};

pub const TERMINAL_SCHEMA_VERSION: u32 = 1;
pub const TERMINAL_OUTPUT_EVENT: &str = "terminal-output";

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
