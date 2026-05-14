use std::collections::HashSet;

use ulid::Ulid;

use crate::contracts::{AppError, MemberProfile};

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

    Ok(normalized)
}

pub fn has_all_mention_token(body: &str) -> bool {
    body.split(|character: char| {
        character.is_whitespace()
            || matches!(
                character,
                ',' | '.' | '!' | '?' | ';' | ':' | '，' | '。' | '！' | '？' | '；' | '：'
            )
    })
    .any(|token| token == "@all")
}

pub fn resolve_mentioned_member_ids_from_body(
    body: &str,
    selected_member_ids: Vec<String>,
    members: &[MemberProfile],
) -> Vec<String> {
    let mentionable_members = members
        .iter()
        .filter(|member| member.permissions.can_mention)
        .collect::<Vec<_>>();
    let mut display_name_counts = std::collections::HashMap::new();
    for member in &mentionable_members {
        let normalized = normalize_mention_label(&member.display_name);
        if normalized.is_empty() {
            continue;
        }
        *display_name_counts.entry(normalized).or_insert(0usize) += 1;
    }

    let mut seen = HashSet::new();
    let mut resolved = Vec::new();

    for member_id in selected_member_ids {
        if seen.insert(member_id.clone()) {
            resolved.push(member_id);
        }
    }

    let mut mentions = Vec::new();

    for member in mentionable_members {
        if let Some(index) = mention_label_index(body, &member.instance_label) {
            if seen.insert(member.member_id.clone()) {
                mentions.push((member.member_id.clone(), index));
            }
            continue;
        }

        let display_name = normalize_mention_label(&member.display_name);
        if display_name.is_empty()
            || display_name == normalize_mention_label(&member.instance_label)
            || display_name_counts.get(&display_name).copied().unwrap_or(0) != 1
        {
            continue;
        }

        if let Some(index) = mention_label_index(body, &member.display_name) {
            if seen.insert(member.member_id.clone()) {
                mentions.push((member.member_id.clone(), index));
            }
        }
    }

    mentions.sort_by(|left, right| left.1.cmp(&right.1));
    resolved.extend(mentions.into_iter().map(|(member_id, _)| member_id));
    resolved
}

fn mention_label_index(body: &str, label: &str) -> Option<usize> {
    let label = normalize_mention_label(label);
    if label.is_empty() {
        return None;
    }

    let body = body.to_lowercase();
    let token = format!("@{}", label);
    let mut offset = 0usize;
    while offset < body.len() {
        let relative_index = body[offset..].find(&token)?;
        let index = offset + relative_index;
        let after_index = index + token.len();
        let has_start_boundary = index == 0
            || body[..index]
                .chars()
                .next_back()
                .map(is_mention_boundary)
                .unwrap_or(true);
        let has_end_boundary = after_index >= body.len()
            || body[after_index..]
                .chars()
                .next()
                .map(is_mention_boundary)
                .unwrap_or(true);

        if has_start_boundary && has_end_boundary {
            return Some(index);
        }

        offset = after_index;
    }

    None
}

fn normalize_mention_label(label: &str) -> String {
    label.trim().to_lowercase()
}

fn is_mention_boundary(character: char) -> bool {
    character.is_whitespace()
        || matches!(
            character,
            ',' | '.' | '!' | '?' | ';' | ':' | '，' | '。' | '！' | '？' | '；' | '：'
        )
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
