use ulid::Ulid;

use crate::contracts::{AppError, MemberRuntimeKind, MemberRuntimeProfile};

pub const MEMBER_SCHEMA_VERSION: u32 = 1;
pub const MEMBER_OWNER_DISPLAY_NAME: &str = "Owner";
pub const MEMBER_MIN_INSTANCE_COUNT: u32 = 1;
pub const MEMBER_MAX_INSTANCE_COUNT: u32 = 20;

pub fn validate_workspace_id(workspace_id: &str) -> Result<(), AppError> {
    if workspace_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "member.workspace.invalidId",
            "工作区标识无效，无法加载成员。",
            "请重新打开工作区；如果问题持续，请运行数据验证。",
            Some(format!(
                "workspaceId must be a ULID string: {}",
                workspace_id
            )),
        ));
    }

    Ok(())
}

pub fn validate_member_id(member_id: &str) -> Result<(), AppError> {
    if member_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "member.invalidId",
            "成员标识无效。",
            "请刷新成员列表后重试。",
            Some(format!("memberId must be a ULID string: {}", member_id)),
        ));
    }

    Ok(())
}

pub fn validate_instance_count(instance_count: u32) -> Result<u32, AppError> {
    if !(MEMBER_MIN_INSTANCE_COUNT..=MEMBER_MAX_INSTANCE_COUNT).contains(&instance_count) {
        return Err(AppError::recoverable_error(
            "member.instanceCount.outOfRange",
            "成员实例数量超出范围。",
            "请将实例数量设置为 1 到 20 后重试。",
            Some(format!(
                "instanceCount={} min={} max={}",
                instance_count, MEMBER_MIN_INSTANCE_COUNT, MEMBER_MAX_INSTANCE_COUNT
            )),
        ));
    }

    Ok(instance_count)
}

pub fn normalize_member_display_name(display_name: &str) -> Result<String, AppError> {
    let normalized = display_name.trim().to_owned();

    if normalized.is_empty() {
        return Err(AppError::recoverable_error(
            "member.displayName.empty",
            "成员显示名称不能为空。",
            "请输入成员名称后重试。",
            None,
        ));
    }

    if normalized.chars().count() > 80 {
        return Err(AppError::recoverable_error(
            "member.displayName.tooLong",
            "成员显示名称过长。",
            "请将成员名称控制在 80 个字符以内。",
            Some(format!("length={}", normalized.chars().count())),
        ));
    }

    Ok(normalized)
}

pub fn validate_runtime_profile(runtime: &MemberRuntimeProfile) -> Result<(), AppError> {
    match runtime.kind {
        MemberRuntimeKind::None => Ok(()),
        MemberRuntimeKind::BuiltInAiCli
        | MemberRuntimeKind::CustomCli
        | MemberRuntimeKind::Shell => {
            if runtime
                .label
                .as_deref()
                .map(str::trim)
                .unwrap_or_default()
                .is_empty()
            {
                return Err(AppError::recoverable_error(
                    "member.runtime.labelMissing",
                    "成员运行时缺少显示名称。",
                    "请选择运行时或填写自定义运行时名称后重试。",
                    None,
                ));
            }

            if runtime
                .command
                .as_deref()
                .map(str::trim)
                .unwrap_or_default()
                .is_empty()
            {
                return Err(AppError::recoverable_error(
                    "member.runtime.commandMissing",
                    "成员运行时缺少命令。",
                    "请选择内置 CLI、shell 或填写自定义命令后重试。",
                    None,
                ));
            }

            Ok(())
        }
    }
}
