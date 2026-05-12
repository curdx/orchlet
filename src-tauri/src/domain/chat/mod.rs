use ulid::Ulid;

use crate::contracts::AppError;

pub const PRIVATE_CONVERSATION_SCHEMA_VERSION: u32 = 1;

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
