use ulid::Ulid;

use crate::contracts::AppError;

pub const PRIVATE_CONVERSATION_SCHEMA_VERSION: u32 = 1;
pub const CONVERSATION_MAX_TITLE_LEN: usize = 80;

pub fn validate_conversation_id(conversation_id: &str) -> Result<(), AppError> {
    if conversation_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "conversation.invalidId",
            "会话标识无效。",
            "请刷新会话后重试。",
            Some(format!(
                "conversationId must be a ULID string: {}",
                conversation_id
            )),
        ));
    }

    Ok(())
}

pub fn normalize_conversation_title(title: &str) -> Result<String, AppError> {
    let normalized = title.trim().to_owned();

    if normalized.is_empty() {
        return Err(AppError::recoverable_error(
            "conversation.title.empty",
            "会话名称不能为空。",
            "请输入群聊名称后重试。",
            None,
        ));
    }

    if normalized.chars().count() > CONVERSATION_MAX_TITLE_LEN {
        return Err(AppError::recoverable_error(
            "conversation.title.tooLong",
            "会话名称过长。",
            "请将群聊名称控制在 80 个字符以内。",
            Some(format!("length={}", normalized.chars().count())),
        ));
    }

    Ok(normalized)
}
