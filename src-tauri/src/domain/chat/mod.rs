use ulid::Ulid;

use crate::contracts::AppError;

pub const PRIVATE_CONVERSATION_SCHEMA_VERSION: u32 = 1;
pub const CONVERSATION_MAX_TITLE_LEN: usize = 80;
pub const MESSAGE_MAX_BODY_LEN: usize = 4000;
pub const MESSAGE_DEFAULT_PAGE_LIMIT: u32 = 30;
pub const MESSAGE_MAX_PAGE_LIMIT: u32 = 50;

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

pub fn validate_message_id(message_id: &str) -> Result<(), AppError> {
    if message_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "message.invalidId",
            "消息标识无效。",
            "请刷新消息列表后重试。",
            Some(format!("messageId must be a ULID string: {}", message_id)),
        ));
    }

    Ok(())
}

pub fn normalize_message_body(body: &str) -> Result<String, AppError> {
    let normalized = body.trim().to_owned();

    if normalized.is_empty() {
        return Err(AppError::recoverable_error(
            "message.body.empty",
            "消息不能为空。",
            "请输入消息内容后重试。",
            None,
        ));
    }

    if normalized.chars().count() > MESSAGE_MAX_BODY_LEN {
        return Err(AppError::recoverable_error(
            "message.body.tooLong",
            "消息内容过长。",
            "请将单条消息控制在 4000 个字符以内。",
            Some(format!("length={}", normalized.chars().count())),
        ));
    }

    if contains_all_mention_token(&normalized) {
        return Err(AppError::recoverable_error(
            "message.mention.allUnsupported",
            "@all 暂未在 MVP 中启用。",
            "请选择具体成员提及；群体派发会在后续编排故事中明确实现。",
            Some("@all is explicitly unsupported in MVP chat composition".to_owned()),
        ));
    }

    Ok(normalized)
}

pub fn normalize_message_page_limit(limit: Option<u32>) -> Result<u32, AppError> {
    let limit = limit.unwrap_or(MESSAGE_DEFAULT_PAGE_LIMIT);

    if limit == 0 || limit > MESSAGE_MAX_PAGE_LIMIT {
        return Err(AppError::recoverable_error(
            "message.page.limitInvalid",
            "消息分页大小无效。",
            "请使用 1 到 50 之间的分页大小。",
            Some(format!("limit={}", limit)),
        ));
    }

    Ok(limit)
}

pub fn message_preview(body: &str) -> String {
    let compact = body.split_whitespace().collect::<Vec<_>>().join(" ");
    compact.chars().take(120).collect()
}

fn contains_all_mention_token(body: &str) -> bool {
    body.split(|character: char| {
        character.is_whitespace()
            || matches!(
                character,
                ',' | '.' | '!' | '?' | ';' | ':' | '，' | '。' | '！' | '？' | '；' | '：'
            )
    })
    .any(|token| token == "@all")
}
