use crate::{
    contracts::AppError,
    domain::{
        chat::{validate_conversation_id, validate_message_id},
        member::{validate_member_id, validate_workspace_id},
    },
};

pub const DISPATCH_SCHEMA_VERSION: u32 = 1;

pub fn validate_dispatch_scope(
    active_workspace_id: &str,
    request_workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(request_workspace_id)?;
    validate_conversation_id(conversation_id)?;
    validate_message_id(message_id)?;

    if active_workspace_id == request_workspace_id {
        return Ok(());
    }

    Err(AppError::recoverable_error(
        "dispatch.workspace.mismatch",
        "派发请求不属于当前工作区。",
        "请刷新工作区上下文后重试。",
        Some(format!(
            "activeWorkspaceId={} requestWorkspaceId={}",
            active_workspace_id, request_workspace_id
        )),
    ))
}

pub fn resolve_explicit_dispatch_member(
    requested_member_id: Option<&str>,
    mentioned_member_ids: &[String],
) -> Result<String, AppError> {
    if let Some(member_id) = requested_member_id {
        validate_member_id(member_id)?;
        return Ok(member_id.to_owned());
    }

    if mentioned_member_ids.len() == 1 {
        let member_id = mentioned_member_ids[0].clone();
        validate_member_id(&member_id)?;
        return Ok(member_id);
    }

    Err(AppError::recoverable_error(
        "dispatch.target.required",
        "需要明确的派发成员。",
        "请选择一名成员或只提及一个成员后再派发。",
        Some(format!(
            "mentionedMemberCount={}",
            mentioned_member_ids.len()
        )),
    ))
}

pub fn normalize_dispatch_payload(body: &str) -> String {
    if body.ends_with('\n') {
        body.to_owned()
    } else {
        format!("{}\n", body)
    }
}
