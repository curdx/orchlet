use std::{collections::HashSet, path::Path};

use rusqlite::{params, Connection, OpenFlags};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, ChatMessageProfile, ChatMessageStatus, ClearConversationRequest,
        ClearConversationResult, ConversationKind, ConversationMemberSummary,
        ConversationParticipantKind, ConversationProfile, ConversationReadPositionProfile,
        CreateGroupConversationRequest, CreateGroupConversationResult, DeleteConversationRequest,
        DeleteConversationResult, ListConversationsRequest, ListConversationsResult,
        ListMessagesRequest, ListMessagesResult, MemberProfile, MemberRole, SendMessageRequest,
        SendMessageResult, StartPrivateConversationRequest, StartPrivateConversationResult,
        UpdateConversationSettingsRequest, UpdateConversationSettingsResult,
        UpdateGroupConversationMembersRequest, UpdateGroupConversationMembersResult,
        UpdateReadPositionRequest, UpdateReadPositionResult,
    },
    domain::{
        chat::{
            message_preview, normalize_conversation_title, normalize_message_body,
            normalize_message_page_limit, validate_conversation_id, validate_message_id,
        },
        contact::validate_contact_id,
        member::{validate_member_id, validate_workspace_id},
    },
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms,
        sqlite::{
            contact_repository::contact_by_id,
            member_repository::initialize_member_store,
            workspace_database::{open_workspace_database, sqlite_error, workspace_database_path},
        },
    },
};

const PRIVATE_CONVERSATION_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605121210__private_conversations.sql");
const CONVERSATION_LIST_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605121300__conversation_list_groups.sql");
const MESSAGES_READ_POSITIONS_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605121430__messages_read_positions.sql");
const CONVERSATION_MANAGEMENT_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605121600__conversation_management.sql");
const MESSAGE_MENTIONS_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605121700__message_mentions.sql");
const DEFAULT_CHANNEL_TITLE: &str = "默认频道";

pub fn list_conversations(
    app_data_dir: &Path,
    request: ListConversationsRequest,
) -> Result<ListConversationsResult, AppError> {
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    list_conversations_from_connection(&connection, &request.workspace_id)
}

pub fn send_message(
    app_data_dir: &Path,
    request: SendMessageRequest,
) -> Result<SendMessageResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    let body = normalize_message_body(&request.body)?;
    let mentioned_member_ids = normalize_mentioned_member_ids(
        app_data_dir,
        &request.workspace_id,
        request.mentioned_member_ids,
    )?;
    let owner_member_id = local_owner_member_id(app_data_dir, &request.workspace_id)?;
    let mut connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;

    let timestamp = now_ms();
    let message = ChatMessageProfile {
        message_id: Ulid::new().to_string(),
        workspace_id: request.workspace_id.clone(),
        conversation_id: request.conversation_id.clone(),
        author_member_id: owner_member_id,
        body,
        mentioned_member_ids,
        status: ChatMessageStatus::Sent,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    let transaction = connection
        .transaction()
        .map_err(sqlite_error("message.transaction.beginFailed"))?;
    insert_message(&transaction, &message)?;
    insert_message_mentions(&transaction, &message)?;
    touch_conversation_after_message(&transaction, &message)?;
    upsert_read_position(
        &transaction,
        &message.workspace_id,
        &message.conversation_id,
        &message.message_id,
        message.created_at_ms,
        timestamp,
    )?;
    recalculate_unread_count_after(
        &transaction,
        &message.workspace_id,
        &message.conversation_id,
        message.created_at_ms,
        &message.message_id,
    )?;

    let conversation = conversation_by_id_from_connection(
        &transaction,
        &message.workspace_id,
        &message.conversation_id,
    )?;
    let read_position = read_position_from_connection(
        &transaction,
        &message.workspace_id,
        &message.conversation_id,
    )?
    .expect("send_message upserts read position");
    transaction
        .commit()
        .map_err(sqlite_error("message.transaction.commitFailed"))?;

    Ok(SendMessageResult {
        message,
        conversation,
        read_position,
    })
}

pub fn list_messages(
    app_data_dir: &Path,
    request: ListMessagesRequest,
) -> Result<ListMessagesResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    let limit = normalize_message_page_limit(request.limit)?;
    if let Some(message_id) = request.before_message_id.as_deref() {
        validate_message_id(message_id)?;
    }

    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let cursor = match request.before_message_id.as_deref() {
        Some(message_id) => Some(message_by_id_from_connection(
            &connection,
            &request.workspace_id,
            &request.conversation_id,
            message_id,
            "message.cursor.notFound",
        )?),
        None => None,
    };
    let (messages, has_more, next_before_message_id) = page_messages_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
        cursor.as_ref(),
        limit,
    )?;
    let read_position = read_position_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;

    Ok(ListMessagesResult {
        messages,
        has_more,
        next_before_message_id,
        read_position,
        conversation,
    })
}

pub fn message_by_id(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
) -> Result<ChatMessageProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_conversation_id(conversation_id)?;
    validate_message_id(message_id)?;

    let connection = open_conversation_connection(app_data_dir, workspace_id)?;
    ensure_default_channel(&connection, workspace_id)?;
    conversation_by_id_from_connection(&connection, workspace_id, conversation_id)?;
    let mut message = message_by_id_from_connection(
        &connection,
        workspace_id,
        conversation_id,
        message_id,
        "message.dispatch.notFound",
    )?;
    hydrate_message_mentions(&connection, std::slice::from_mut(&mut message))?;

    Ok(message)
}

pub fn conversation_by_id(
    app_data_dir: &Path,
    workspace_id: &str,
    conversation_id: &str,
) -> Result<ConversationProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    validate_conversation_id(conversation_id)?;

    let connection = open_conversation_connection(app_data_dir, workspace_id)?;
    ensure_default_channel(&connection, workspace_id)?;
    conversation_by_id_from_connection(&connection, workspace_id, conversation_id)
}

pub fn update_read_position(
    app_data_dir: &Path,
    request: UpdateReadPositionRequest,
) -> Result<UpdateReadPositionResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    validate_message_id(&request.message_id)?;

    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let message = message_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
        "readPosition.message.notFound",
    )?;
    let timestamp = now_ms();
    upsert_read_position(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
        &request.message_id,
        message.created_at_ms,
        timestamp,
    )?;
    recalculate_unread_count_after(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
        message.created_at_ms,
        &request.message_id,
    )?;

    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let read_position = read_position_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?
    .expect("update_read_position upserts read position");

    Ok(UpdateReadPositionResult {
        read_position,
        conversation,
    })
}

pub fn create_group_conversation(
    app_data_dir: &Path,
    request: CreateGroupConversationRequest,
) -> Result<CreateGroupConversationResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let title = normalize_conversation_title(&request.title)?;
    let member_ids = normalize_group_member_ids(request.member_ids)?;
    let members = validate_group_members(app_data_dir, &request.workspace_id, &member_ids)?;
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    let timestamp = now_ms();
    let conversation = ConversationProfile {
        conversation_id: Ulid::new().to_string(),
        workspace_id: request.workspace_id.clone(),
        kind: ConversationKind::Group,
        title,
        is_default: false,
        is_pinned: false,
        unread_count: 0,
        last_message_preview: None,
        is_muted: false,
        participant_kind: None,
        participant_id: None,
        members: members.into_iter().map(member_summary).collect(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
        last_activity_at_ms: timestamp,
    };

    insert_conversation(
        &connection,
        &conversation,
        "group",
        "group",
        &conversation.conversation_id,
    )?;
    replace_group_members(
        &connection,
        &conversation.workspace_id,
        &conversation.conversation_id,
        &member_ids,
        timestamp,
    )?;

    let conversation = conversation_by_id_from_connection(
        &connection,
        &conversation.workspace_id,
        &conversation.conversation_id,
    )?;
    let conversations =
        list_conversations_from_connection(&connection, &conversation.workspace_id)?.conversations;

    Ok(CreateGroupConversationResult {
        conversation,
        conversations,
    })
}

pub fn update_conversation_settings(
    app_data_dir: &Path,
    request: UpdateConversationSettingsRequest,
) -> Result<UpdateConversationSettingsResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    let title = request
        .title
        .as_deref()
        .map(normalize_conversation_title)
        .transpose()?;
    let pinned = request.is_pinned.map(bool_to_sql);
    let muted = request.is_muted.map(bool_to_sql);
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;

    let timestamp = now_ms();
    connection
        .execute(
            "UPDATE conversations
             SET title = COALESCE(?1, title),
                 is_pinned = COALESCE(?2, is_pinned),
                 is_muted = COALESCE(?3, is_muted),
                 updated_at_ms = ?4
             WHERE workspace_id = ?5 AND id = ?6 AND deleted_at_ms IS NULL",
            params![
                title,
                pinned,
                muted,
                timestamp as i64,
                request.workspace_id,
                request.conversation_id,
            ],
        )
        .map_err(sqlite_error("conversation.settings.updateFailed"))?;

    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let conversations =
        list_conversations_from_connection(&connection, &request.workspace_id)?.conversations;

    Ok(UpdateConversationSettingsResult {
        conversation,
        conversations,
    })
}

pub fn clear_conversation(
    app_data_dir: &Path,
    request: ClearConversationRequest,
) -> Result<ClearConversationResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;

    connection
        .execute(
            "DELETE FROM message_mentions WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.clear.mentionsFailed"))?;
    let cleared_message_count = connection
        .execute(
            "DELETE FROM messages WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.clear.messagesFailed"))?
        as u32;
    connection
        .execute(
            "DELETE FROM conversation_read_positions
             WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.clear.readPositionFailed"))?;

    let timestamp = now_ms();
    connection
        .execute(
            "UPDATE conversations
             SET unread_count = 0,
                 last_message_preview = NULL,
                 updated_at_ms = ?1,
                 last_activity_at_ms = ?1
             WHERE workspace_id = ?2 AND id = ?3 AND deleted_at_ms IS NULL",
            params![
                timestamp as i64,
                request.workspace_id,
                request.conversation_id
            ],
        )
        .map_err(sqlite_error("conversation.clear.touchFailed"))?;

    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let conversations =
        list_conversations_from_connection(&connection, &request.workspace_id)?.conversations;

    Ok(ClearConversationResult {
        conversation,
        cleared_message_count,
        conversations,
    })
}

pub fn delete_conversation(
    app_data_dir: &Path,
    request: DeleteConversationRequest,
) -> Result<DeleteConversationResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;

    if conversation.is_default {
        return Err(AppError::recoverable_error(
            "conversation.delete.defaultForbidden",
            "默认频道不能删除。",
            "可以清空默认频道消息，或选择其他会话删除。",
            Some(format!("conversationId={}", request.conversation_id)),
        ));
    }

    connection
        .execute(
            "DELETE FROM message_mentions WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.delete.mentionsFailed"))?;
    connection
        .execute(
            "DELETE FROM messages WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.delete.messagesFailed"))?;
    connection
        .execute(
            "DELETE FROM conversation_read_positions
             WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.delete.readPositionFailed"))?;
    connection
        .execute(
            "DELETE FROM conversation_members WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.delete.membersFailed"))?;
    let deleted = connection
        .execute(
            "DELETE FROM conversations
             WHERE workspace_id = ?1 AND id = ?2 AND is_default = 0",
            params![request.workspace_id, request.conversation_id],
        )
        .map_err(sqlite_error("conversation.delete.recordFailed"))?;

    if deleted == 0 {
        return Err(AppError::recoverable_error(
            "conversation.delete.notFound",
            "未找到可删除的会话。",
            "请刷新会话列表后重试。",
            Some(format!("conversationId={}", request.conversation_id)),
        ));
    }

    let conversations =
        list_conversations_from_connection(&connection, &request.workspace_id)?.conversations;

    Ok(DeleteConversationResult {
        deleted_conversation_id: request.conversation_id,
        conversations,
    })
}

pub fn update_group_conversation_members(
    app_data_dir: &Path,
    request: UpdateGroupConversationMembersRequest,
) -> Result<UpdateGroupConversationMembersResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_conversation_id(&request.conversation_id)?;
    let member_ids = normalize_group_member_ids(request.member_ids)?;
    validate_group_members(app_data_dir, &request.workspace_id, &member_ids)?;
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;

    if conversation.kind != ConversationKind::Group || conversation.is_default {
        return Err(AppError::recoverable_error(
            "conversation.group.updateMembers.invalidKind",
            "该会话不能更新群聊成员。",
            "请选择群聊后重试。",
            Some(format!(
                "conversationId={} kind={:?} isDefault={}",
                request.conversation_id, conversation.kind, conversation.is_default
            )),
        ));
    }

    let timestamp = now_ms();
    replace_group_members(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
        &member_ids,
        timestamp,
    )?;
    connection
        .execute(
            "UPDATE conversations
        SET updated_at_ms = ?1, last_activity_at_ms = ?1
             WHERE workspace_id = ?2 AND id = ?3 AND deleted_at_ms IS NULL",
            params![
                timestamp as i64,
                request.workspace_id,
                request.conversation_id
            ],
        )
        .map_err(sqlite_error("conversation.group.updateMembers.touchFailed"))?;

    let conversation = conversation_by_id_from_connection(
        &connection,
        &request.workspace_id,
        &request.conversation_id,
    )?;
    let conversations =
        list_conversations_from_connection(&connection, &request.workspace_id)?.conversations;

    Ok(UpdateGroupConversationMembersResult {
        conversation,
        conversations,
    })
}

pub fn start_private_conversation(
    app_data_dir: &Path,
    request: StartPrivateConversationRequest,
) -> Result<StartPrivateConversationResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let participant = load_participant(app_data_dir, &request)?;
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;

    if let Some(conversation) = find_private_conversation(
        &connection,
        &request.workspace_id,
        &request.participant_kind,
        &request.participant_id,
    )? {
        return Ok(StartPrivateConversationResult {
            conversation,
            created: false,
        });
    }

    let timestamp = now_ms();
    let conversation = ConversationProfile {
        conversation_id: Ulid::new().to_string(),
        workspace_id: request.workspace_id,
        kind: ConversationKind::Private,
        title: participant.title,
        is_default: false,
        is_pinned: false,
        is_muted: false,
        unread_count: 0,
        last_message_preview: None,
        participant_kind: Some(request.participant_kind),
        participant_id: Some(request.participant_id),
        members: Vec::new(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
        last_activity_at_ms: timestamp,
    };
    let participant_kind = participant_kind_to_str(
        conversation
            .participant_kind
            .as_ref()
            .expect("private conversation has participant kind"),
    );
    let participant_id = conversation
        .participant_id
        .as_deref()
        .expect("private conversation has participant id");

    insert_conversation(
        &connection,
        &conversation,
        "private",
        participant_kind,
        participant_id,
    )?;

    Ok(StartPrivateConversationResult {
        conversation,
        created: true,
    })
}

pub fn validate_conversation_record_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "conversation.database.readOnlyOpenFailed",
                "无法读取工作区会话数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    if !table_exists(&connection, "conversations")? {
        return Ok(());
    }

    list_conversations_from_connection(&connection, workspace_id).map(|_| ())
}

pub fn validate_conversation_member_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "conversation.database.readOnlyOpenFailed",
                "无法读取工作区会话数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    if !table_exists(&connection, "conversation_members")? {
        if table_exists(&connection, "conversations")? && has_group_conversations(&connection)? {
            return Err(AppError::recoverable_error(
                "conversation.members.tableMissing",
                "群聊成员关系表缺失。",
                "请重新打开工作区以运行会话迁移；如果问题持续，请备份并修复工作区数据库。",
                Some(format!("workspaceId={}", workspace_id)),
            ));
        }

        return Ok(());
    }

    connection
        .prepare(
            "SELECT conversation_id, workspace_id, member_id, created_at_ms
             FROM conversation_members
             WHERE workspace_id = ?1
             LIMIT 1",
        )
        .and_then(|mut statement| statement.exists(params![workspace_id]))
        .map(|_| ())
        .map_err(sqlite_error("conversation.members.validateFailed"))
}

pub fn validate_message_store(app_data_dir: &Path, workspace_id: &str) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "message.database.readOnlyOpenFailed",
                "无法读取工作区消息数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    if !table_exists(&connection, "messages")? {
        if !table_exists(&connection, "conversations")? {
            return Ok(());
        }

        return Err(AppError::recoverable_error(
            "message.tableMissing",
            "消息表缺失。",
            "请重新打开工作区以运行消息迁移；如果问题持续，请备份并修复工作区数据库。",
            Some(format!("workspaceId={}", workspace_id)),
        ));
    }

    connection
        .prepare(
            "SELECT id, workspace_id, conversation_id, author_member_id, body,
                    send_status, created_at_ms, updated_at_ms
             FROM messages
             WHERE workspace_id = ?1
             LIMIT 1",
        )
        .and_then(|mut statement| statement.exists(params![workspace_id]))
        .map(|_| ())
        .map_err(sqlite_error("message.validateFailed"))
}

pub fn validate_message_mention_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "messageMention.database.readOnlyOpenFailed",
                "无法读取工作区消息提及数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    if !table_exists(&connection, "message_mentions")? {
        if !table_exists(&connection, "messages")? {
            return Ok(());
        }

        return Err(AppError::recoverable_error(
            "messageMention.tableMissing",
            "消息提及表缺失。",
            "请重新打开工作区以运行消息提及迁移；如果问题持续，请备份并修复工作区数据库。",
            Some(format!("workspaceId={}", workspace_id)),
        ));
    }

    connection
        .prepare(
            "SELECT workspace_id, conversation_id, message_id, member_id, created_at_ms
             FROM message_mentions
             WHERE workspace_id = ?1
             LIMIT 1",
        )
        .and_then(|mut statement| statement.exists(params![workspace_id]))
        .map(|_| ())
        .map_err(sqlite_error("messageMention.validateFailed"))
}

pub fn validate_read_position_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Ok(());
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "readPosition.database.readOnlyOpenFailed",
                "无法读取工作区已读位置数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;

    if !table_exists(&connection, "conversation_read_positions")? {
        if !table_exists(&connection, "conversations")? {
            return Ok(());
        }

        return Err(AppError::recoverable_error(
            "readPosition.tableMissing",
            "会话已读位置表缺失。",
            "请重新打开工作区以运行消息迁移；如果问题持续，请备份并修复工作区数据库。",
            Some(format!("workspaceId={}", workspace_id)),
        ));
    }

    connection
        .prepare(
            "SELECT workspace_id, conversation_id, last_read_message_id,
                    last_read_at_ms, updated_at_ms
             FROM conversation_read_positions
             WHERE workspace_id = ?1
             LIMIT 1",
        )
        .and_then(|mut statement| statement.exists(params![workspace_id]))
        .map(|_| ())
        .map_err(sqlite_error("readPosition.validateFailed"))
}

pub fn validate_private_conversation_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<(), AppError> {
    validate_conversation_record_store(app_data_dir, workspace_id)
}

fn open_conversation_connection(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<Connection, AppError> {
    initialize_member_store(app_data_dir, workspace_id)?;
    let connection = open_workspace_database(app_data_dir, workspace_id)?;
    apply_conversation_migrations(&connection)?;

    Ok(connection)
}

fn apply_conversation_migrations(connection: &Connection) -> Result<(), AppError> {
    connection
        .execute_batch(PRIVATE_CONVERSATION_MIGRATION_SQL)
        .map_err(sqlite_error("conversation.migration.failed"))?;
    apply_conversation_list_migration(connection)?;
    apply_messages_read_positions_migration(connection)?;
    apply_conversation_management_migration(connection)?;
    apply_message_mentions_migration(connection)
}

fn apply_conversation_list_migration(connection: &Connection) -> Result<(), AppError> {
    if !conversation_column_exists(connection, "is_default")? {
        connection
            .execute_batch(CONVERSATION_LIST_MIGRATION_SQL)
            .map_err(sqlite_error("conversation.listMigration.failed"))?;
    } else {
        record_migration(connection, "202605121300__conversation_list_groups")?;
    }

    Ok(())
}

fn apply_messages_read_positions_migration(connection: &Connection) -> Result<(), AppError> {
    if !table_exists(connection, "messages")? {
        connection
            .execute_batch(MESSAGES_READ_POSITIONS_MIGRATION_SQL)
            .map_err(sqlite_error("message.migration.failed"))?;
    } else {
        record_migration(connection, "202605121430__messages_read_positions")?;
    }

    Ok(())
}

fn apply_conversation_management_migration(connection: &Connection) -> Result<(), AppError> {
    let has_is_muted = conversation_column_exists(connection, "is_muted")?;
    let has_deleted_at_ms = conversation_column_exists(connection, "deleted_at_ms")?;

    if !has_is_muted && !has_deleted_at_ms {
        connection
            .execute_batch(CONVERSATION_MANAGEMENT_MIGRATION_SQL)
            .map_err(sqlite_error("conversation.managementMigration.failed"))?;
        return Ok(());
    }

    if !has_is_muted {
        connection
            .execute(
                "ALTER TABLE conversations ADD COLUMN is_muted INTEGER NOT NULL DEFAULT 0",
                [],
            )
            .map_err(sqlite_error("conversation.managementMigration.mutedFailed"))?;
    }

    if !has_deleted_at_ms {
        connection
            .execute(
                "ALTER TABLE conversations ADD COLUMN deleted_at_ms INTEGER",
                [],
            )
            .map_err(sqlite_error(
                "conversation.managementMigration.deletedFailed",
            ))?;
    }

    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_conversations__workspace_active_management
             ON conversations(workspace_id, deleted_at_ms, is_pinned DESC, unread_count DESC, last_activity_at_ms DESC)",
            [],
        )
        .map_err(sqlite_error("conversation.managementMigration.indexFailed"))?;
    record_migration(connection, "202605121600__conversation_management")
}

fn apply_message_mentions_migration(connection: &Connection) -> Result<(), AppError> {
    if !table_exists(connection, "message_mentions")? {
        connection
            .execute_batch(MESSAGE_MENTIONS_MIGRATION_SQL)
            .map_err(sqlite_error("message.mentionsMigration.failed"))?;
    } else {
        record_migration(connection, "202605121700__message_mentions")?;
    }

    Ok(())
}

fn ensure_default_channel(connection: &Connection, workspace_id: &str) -> Result<(), AppError> {
    let exists = connection
        .prepare(
            "SELECT id FROM conversations
             WHERE workspace_id = ?1 AND kind = 'channel' AND is_default = 1
               AND deleted_at_ms IS NULL
             LIMIT 1",
        )
        .map_err(sqlite_error("conversation.default.prepareFailed"))?
        .exists(params![workspace_id])
        .map_err(sqlite_error("conversation.default.queryFailed"))?;

    if exists {
        return Ok(());
    }

    let timestamp = now_ms();
    let conversation = ConversationProfile {
        conversation_id: Ulid::new().to_string(),
        workspace_id: workspace_id.to_owned(),
        kind: ConversationKind::Channel,
        title: DEFAULT_CHANNEL_TITLE.to_owned(),
        is_default: true,
        is_pinned: true,
        is_muted: false,
        unread_count: 0,
        last_message_preview: None,
        participant_kind: None,
        participant_id: None,
        members: Vec::new(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
        last_activity_at_ms: timestamp,
    };

    insert_conversation(
        &connection,
        &conversation,
        "channel",
        "workspace",
        workspace_id,
    )
}

fn list_conversations_from_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<ListConversationsResult, AppError> {
    validate_workspace_id(workspace_id)?;
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, kind, title, participant_kind, participant_id,
                    is_default, is_pinned, is_muted, unread_count, last_message_preview,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1 AND deleted_at_ms IS NULL
             ORDER BY is_pinned DESC,
                      CASE WHEN unread_count > 0 THEN 1 ELSE 0 END DESC,
                      last_activity_at_ms DESC,
                      updated_at_ms DESC,
                      title COLLATE NOCASE ASC,
                      id ASC",
        )
        .map_err(sqlite_error("conversation.list.prepareFailed"))?;
    let mut conversations = statement
        .query_map(params![workspace_id], conversation_from_row)
        .map_err(sqlite_error("conversation.list.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("conversation.list.decodeFailed"))?;

    for conversation in &mut conversations {
        if conversation.kind == ConversationKind::Group {
            conversation.members =
                group_member_summaries(connection, workspace_id, &conversation.conversation_id)?;
        }
    }

    Ok(ListConversationsResult { conversations })
}

fn conversation_by_id_from_connection(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
) -> Result<ConversationProfile, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, kind, title, participant_kind, participant_id,
                    is_default, is_pinned, is_muted, unread_count, last_message_preview,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1 AND id = ?2 AND deleted_at_ms IS NULL",
        )
        .map_err(sqlite_error("conversation.getById.prepareFailed"))?;
    let mut conversation = statement
        .query_row(
            params![workspace_id, conversation_id],
            conversation_from_row,
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::recoverable_error(
                "conversation.getById.notFound",
                "未找到会话。",
                "请刷新会话列表后重试。",
                Some(format!(
                    "workspaceId={} conversationId={}",
                    workspace_id, conversation_id
                )),
            ),
            _ => sqlite_error("conversation.getById.queryFailed")(error),
        })?;

    if conversation.kind == ConversationKind::Group {
        conversation.members = group_member_summaries(connection, workspace_id, conversation_id)?;
    }

    Ok(conversation)
}

fn find_private_conversation(
    connection: &Connection,
    workspace_id: &str,
    participant_kind: &ConversationParticipantKind,
    participant_id: &str,
) -> Result<Option<ConversationProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, kind, title, participant_kind, participant_id,
                    is_default, is_pinned, is_muted, unread_count, last_message_preview,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1 AND kind = 'private'
               AND participant_kind = ?2 AND participant_id = ?3
               AND deleted_at_ms IS NULL",
        )
        .map_err(sqlite_error("conversation.get.prepareFailed"))?;
    let result = statement.query_row(
        params![
            workspace_id,
            participant_kind_to_str(participant_kind),
            participant_id
        ],
        conversation_from_row,
    );

    match result {
        Ok(conversation) => Ok(Some(conversation)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(sqlite_error("conversation.get.queryFailed")(error)),
    }
}

fn insert_conversation(
    connection: &Connection,
    conversation: &ConversationProfile,
    kind: &str,
    participant_kind: &str,
    participant_id: &str,
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO conversations (
                id, workspace_id, kind, title, participant_kind, participant_id,
                created_at_ms, updated_at_ms, last_activity_at_ms, is_default,
                is_pinned, is_muted, unread_count, last_message_preview
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                conversation.conversation_id,
                conversation.workspace_id,
                kind,
                conversation.title,
                participant_kind,
                participant_id,
                conversation.created_at_ms as i64,
                conversation.updated_at_ms as i64,
                conversation.last_activity_at_ms as i64,
                bool_to_sql(conversation.is_default),
                bool_to_sql(conversation.is_pinned),
                bool_to_sql(conversation.is_muted),
                conversation.unread_count as i64,
                conversation.last_message_preview
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("conversation.insert.failed"))
}

fn insert_message(connection: &Connection, message: &ChatMessageProfile) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO messages (
                id, workspace_id, conversation_id, author_member_id, body,
                send_status, created_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                message.message_id,
                message.workspace_id,
                message.conversation_id,
                message.author_member_id,
                message.body,
                message_status_to_str(&message.status),
                message.created_at_ms as i64,
                message.updated_at_ms as i64,
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("message.insert.failed"))
}

fn insert_message_mentions(
    connection: &Connection,
    message: &ChatMessageProfile,
) -> Result<(), AppError> {
    for member_id in &message.mentioned_member_ids {
        connection
            .execute(
                "INSERT INTO message_mentions (
                    workspace_id, conversation_id, message_id, member_id, created_at_ms
                 ) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    message.workspace_id,
                    message.conversation_id,
                    message.message_id,
                    member_id,
                    message.created_at_ms as i64,
                ],
            )
            .map_err(sqlite_error("message.mentions.insertFailed"))?;
    }

    Ok(())
}

fn touch_conversation_after_message(
    connection: &Connection,
    message: &ChatMessageProfile,
) -> Result<(), AppError> {
    connection
        .execute(
            "UPDATE conversations
             SET last_message_preview = ?1,
                 last_activity_at_ms = ?2,
                 updated_at_ms = ?2
             WHERE workspace_id = ?3 AND id = ?4 AND deleted_at_ms IS NULL",
            params![
                message_preview(&message.body),
                message.created_at_ms as i64,
                message.workspace_id,
                message.conversation_id,
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("message.conversation.touchFailed"))
}

fn page_messages_from_connection(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    cursor: Option<&ChatMessageProfile>,
    limit: u32,
) -> Result<(Vec<ChatMessageProfile>, bool, Option<String>), AppError> {
    let fetch_limit = limit as i64 + 1;
    let mut messages = match cursor {
        Some(cursor) => {
            let mut statement = connection
                .prepare(
                    "SELECT id, workspace_id, conversation_id, author_member_id, body,
                            send_status, created_at_ms, updated_at_ms
                     FROM messages
                     WHERE workspace_id = ?1
                       AND conversation_id = ?2
                       AND (
                         created_at_ms < ?3
                         OR (created_at_ms = ?3 AND id < ?4)
                       )
                     ORDER BY created_at_ms DESC, id DESC
                     LIMIT ?5",
                )
                .map_err(sqlite_error("message.page.prepareFailed"))?;
            let rows = statement
                .query_map(
                    params![
                        workspace_id,
                        conversation_id,
                        cursor.created_at_ms as i64,
                        cursor.message_id,
                        fetch_limit,
                    ],
                    message_from_row,
                )
                .map_err(sqlite_error("message.page.queryFailed"))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(sqlite_error("message.page.decodeFailed"))?;
            rows
        }
        None => {
            let mut statement = connection
                .prepare(
                    "SELECT id, workspace_id, conversation_id, author_member_id, body,
                            send_status, created_at_ms, updated_at_ms
                     FROM messages
                     WHERE workspace_id = ?1 AND conversation_id = ?2
                     ORDER BY created_at_ms DESC, id DESC
                     LIMIT ?3",
                )
                .map_err(sqlite_error("message.page.prepareFailed"))?;
            let rows = statement
                .query_map(
                    params![workspace_id, conversation_id, fetch_limit],
                    message_from_row,
                )
                .map_err(sqlite_error("message.page.queryFailed"))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(sqlite_error("message.page.decodeFailed"))?;
            rows
        }
    };

    let has_more = messages.len() > limit as usize;
    if has_more {
        messages.truncate(limit as usize);
    }
    let next_before_message_id = if has_more {
        messages.last().map(|message| message.message_id.clone())
    } else {
        None
    };
    messages.reverse();
    hydrate_message_mentions(connection, &mut messages)?;

    Ok((messages, has_more, next_before_message_id))
}

fn message_by_id_from_connection(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
    not_found_code: &str,
) -> Result<ChatMessageProfile, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, conversation_id, author_member_id, body,
                    send_status, created_at_ms, updated_at_ms
             FROM messages
             WHERE workspace_id = ?1 AND conversation_id = ?2 AND id = ?3",
        )
        .map_err(sqlite_error("message.getById.prepareFailed"))?;

    statement
        .query_row(
            params![workspace_id, conversation_id, message_id],
            message_from_row,
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::recoverable_error(
                not_found_code,
                "未找到消息。",
                "请刷新消息列表后重试。",
                Some(format!(
                    "workspaceId={} conversationId={} messageId={}",
                    workspace_id, conversation_id, message_id
                )),
            ),
            _ => sqlite_error("message.getById.queryFailed")(error),
        })
}

fn hydrate_message_mentions(
    connection: &Connection,
    messages: &mut [ChatMessageProfile],
) -> Result<(), AppError> {
    for message in messages {
        let mut statement = connection
            .prepare(
                "SELECT member_id
                 FROM message_mentions
                 WHERE workspace_id = ?1 AND conversation_id = ?2 AND message_id = ?3
                 ORDER BY member_id ASC",
            )
            .map_err(sqlite_error("message.mentions.prepareFailed"))?;
        message.mentioned_member_ids = statement
            .query_map(
                params![
                    message.workspace_id,
                    message.conversation_id,
                    message.message_id
                ],
                |row| row.get(0),
            )
            .map_err(sqlite_error("message.mentions.queryFailed"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(sqlite_error("message.mentions.decodeFailed"))?;
    }

    Ok(())
}

fn upsert_read_position(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    message_id: &str,
    last_read_at_ms: u64,
    updated_at_ms: u64,
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO conversation_read_positions (
                workspace_id, conversation_id, last_read_message_id, last_read_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(workspace_id, conversation_id) DO UPDATE SET
                last_read_message_id = excluded.last_read_message_id,
                last_read_at_ms = excluded.last_read_at_ms,
                updated_at_ms = excluded.updated_at_ms",
            params![
                workspace_id,
                conversation_id,
                message_id,
                last_read_at_ms as i64,
                updated_at_ms as i64,
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("readPosition.upsertFailed"))
}

fn read_position_from_connection(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
) -> Result<Option<ConversationReadPositionProfile>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT workspace_id, conversation_id, last_read_message_id,
                    last_read_at_ms, updated_at_ms
             FROM conversation_read_positions
             WHERE workspace_id = ?1 AND conversation_id = ?2",
        )
        .map_err(sqlite_error("readPosition.get.prepareFailed"))?;
    let result = statement.query_row(params![workspace_id, conversation_id], |row| {
        Ok(ConversationReadPositionProfile {
            workspace_id: row.get(0)?,
            conversation_id: row.get(1)?,
            last_read_message_id: row.get(2)?,
            last_read_at_ms: row.get::<_, i64>(3)? as u64,
            updated_at_ms: row.get::<_, i64>(4)? as u64,
        })
    });

    match result {
        Ok(read_position) => Ok(Some(read_position)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(sqlite_error("readPosition.get.queryFailed")(error)),
    }
}

fn recalculate_unread_count_after(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    last_read_at_ms: u64,
    last_read_message_id: &str,
) -> Result<(), AppError> {
    let unread_count: i64 = connection
        .query_row(
            "SELECT COUNT(*)
             FROM messages
             WHERE workspace_id = ?1
               AND conversation_id = ?2
               AND (
                 created_at_ms > ?3
                 OR (created_at_ms = ?3 AND id > ?4)
               )",
            params![
                workspace_id,
                conversation_id,
                last_read_at_ms as i64,
                last_read_message_id,
            ],
            |row| row.get(0),
        )
        .map_err(sqlite_error("readPosition.unreadCount.queryFailed"))?;

    connection
        .execute(
            "UPDATE conversations
             SET unread_count = ?1, updated_at_ms = ?2
             WHERE workspace_id = ?3 AND id = ?4 AND deleted_at_ms IS NULL",
            params![unread_count, now_ms() as i64, workspace_id, conversation_id],
        )
        .map(|_| ())
        .map_err(sqlite_error("readPosition.unreadCount.updateFailed"))
}

fn replace_group_members(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
    member_ids: &[String],
    timestamp: u64,
) -> Result<(), AppError> {
    connection
        .execute(
            "DELETE FROM conversation_members WHERE workspace_id = ?1 AND conversation_id = ?2",
            params![workspace_id, conversation_id],
        )
        .map_err(sqlite_error("conversation.members.deleteFailed"))?;

    for member_id in member_ids {
        connection
            .execute(
                "INSERT INTO conversation_members (
                    conversation_id, workspace_id, member_id, created_at_ms
                 ) VALUES (?1, ?2, ?3, ?4)",
                params![conversation_id, workspace_id, member_id, timestamp as i64],
            )
            .map_err(sqlite_error("conversation.members.insertFailed"))?;
    }

    Ok(())
}

fn group_member_summaries(
    connection: &Connection,
    workspace_id: &str,
    conversation_id: &str,
) -> Result<Vec<ConversationMemberSummary>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT members.id, members.display_name, members.instance_label
             FROM conversation_members
             INNER JOIN members
               ON members.workspace_id = conversation_members.workspace_id
              AND members.id = conversation_members.member_id
             WHERE conversation_members.workspace_id = ?1
               AND conversation_members.conversation_id = ?2
             ORDER BY members.instance_label COLLATE NOCASE ASC, members.id ASC",
        )
        .map_err(sqlite_error("conversation.members.prepareFailed"))?;

    let summaries = statement
        .query_map(params![workspace_id, conversation_id], |row| {
            Ok(ConversationMemberSummary {
                member_id: row.get(0)?,
                display_name: row.get(1)?,
                instance_label: row.get(2)?,
            })
        })
        .map_err(sqlite_error("conversation.members.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("conversation.members.decodeFailed"))?;

    Ok(summaries)
}

fn validate_group_members(
    app_data_dir: &Path,
    workspace_id: &str,
    member_ids: &[String],
) -> Result<Vec<MemberProfile>, AppError> {
    if member_ids.is_empty() {
        return Err(AppError::recoverable_error(
            "conversation.group.members.empty",
            "群聊至少需要一个成员。",
            "请选择成员后重试。",
            None,
        ));
    }

    let members = initialize_member_store(app_data_dir, workspace_id)?.members;
    let mut selected = Vec::new();

    for member_id in member_ids {
        validate_member_id(member_id)?;
        let Some(member) = members.iter().find(|member| member.member_id == *member_id) else {
            return Err(AppError::recoverable_error(
                "conversation.group.memberNotFound",
                "群聊成员不存在。",
                "请刷新成员列表后重试。",
                Some(format!(
                    "workspaceId={} memberId={}",
                    workspace_id, member_id
                )),
            ));
        };
        selected.push(member.clone());
    }

    Ok(selected)
}

fn normalize_group_member_ids(member_ids: Vec<String>) -> Result<Vec<String>, AppError> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();

    for member_id in member_ids {
        validate_member_id(&member_id)?;
        if seen.insert(member_id.clone()) {
            normalized.push(member_id);
        }
    }

    Ok(normalized)
}

fn normalize_mentioned_member_ids(
    app_data_dir: &Path,
    workspace_id: &str,
    member_ids: Vec<String>,
) -> Result<Vec<String>, AppError> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();

    for member_id in member_ids {
        validate_member_id(&member_id)?;
        if seen.insert(member_id.clone()) {
            normalized.push(member_id);
        }
    }

    if normalized.is_empty() {
        return Ok(normalized);
    }

    let members = initialize_member_store(app_data_dir, workspace_id)?.members;

    for member_id in &normalized {
        let Some(member) = members.iter().find(|member| member.member_id == *member_id) else {
            return Err(AppError::recoverable_error(
                "message.mention.memberNotFound",
                "提及的成员不存在。",
                "请刷新成员列表后重新选择提及对象。",
                Some(format!(
                    "workspaceId={} memberId={}",
                    workspace_id, member_id
                )),
            ));
        };

        if !member.permissions.can_mention {
            return Err(AppError::recoverable_error(
                "message.mention.memberNotAllowed",
                "该成员当前不能被提及。",
                "请选择允许提及的成员后重试。",
                Some(format!(
                    "workspaceId={} memberId={}",
                    workspace_id, member_id
                )),
            ));
        }
    }

    Ok(normalized)
}

fn local_owner_member_id(app_data_dir: &Path, workspace_id: &str) -> Result<String, AppError> {
    initialize_member_store(app_data_dir, workspace_id)?
        .members
        .into_iter()
        .find(|member| member.role == MemberRole::Owner)
        .map(|member| member.member_id)
        .ok_or_else(|| {
            AppError::recoverable_error(
                "message.owner.missing",
                "未找到本地 owner 成员。",
                "请重新打开工作区以初始化 owner 后重试。",
                Some(format!("workspaceId={}", workspace_id)),
            )
        })
}

fn load_participant(
    app_data_dir: &Path,
    request: &StartPrivateConversationRequest,
) -> Result<PrivateParticipant, AppError> {
    match request.participant_kind {
        ConversationParticipantKind::Member => {
            let members = initialize_member_store(app_data_dir, &request.workspace_id)?.members;
            let Some(member) = members
                .into_iter()
                .find(|member| member.member_id == request.participant_id)
            else {
                return Err(AppError::recoverable_error(
                    "conversation.participant.memberNotFound",
                    "未找到私聊成员。",
                    "请刷新成员列表后重试。",
                    Some(format!(
                        "workspaceId={} memberId={}",
                        request.workspace_id, request.participant_id
                    )),
                ));
            };

            Ok(PrivateParticipant {
                title: member.instance_label,
            })
        }
        ConversationParticipantKind::Contact => {
            validate_contact_id(&request.participant_id)?;
            let contact = contact_by_id(app_data_dir, &request.participant_id)?;

            Ok(PrivateParticipant {
                title: contact.display_name,
            })
        }
    }
}

fn message_from_row(row: &rusqlite::Row<'_>) -> Result<ChatMessageProfile, rusqlite::Error> {
    Ok(ChatMessageProfile {
        message_id: row.get(0)?,
        workspace_id: row.get(1)?,
        conversation_id: row.get(2)?,
        author_member_id: row.get(3)?,
        body: row.get(4)?,
        mentioned_member_ids: Vec::new(),
        status: message_status_from_str(row.get::<_, String>(5)?.as_str()),
        created_at_ms: row.get::<_, i64>(6)? as u64,
        updated_at_ms: row.get::<_, i64>(7)? as u64,
    })
}

fn conversation_from_row(row: &rusqlite::Row<'_>) -> Result<ConversationProfile, rusqlite::Error> {
    let kind = conversation_kind_from_str(row.get::<_, String>(2)?.as_str());
    let participant_kind_raw: String = row.get(4)?;
    let participant_id_raw: String = row.get(5)?;
    let (participant_kind, participant_id) = if kind == ConversationKind::Private {
        (
            participant_kind_from_str(&participant_kind_raw),
            Some(participant_id_raw),
        )
    } else {
        (None, None)
    };

    Ok(ConversationProfile {
        conversation_id: row.get(0)?,
        workspace_id: row.get(1)?,
        kind,
        title: row.get(3)?,
        is_default: sql_bool(row.get::<_, i64>(6)?),
        is_pinned: sql_bool(row.get::<_, i64>(7)?),
        is_muted: sql_bool(row.get::<_, i64>(8)?),
        unread_count: row.get::<_, i64>(9)? as u32,
        last_message_preview: row.get(10)?,
        participant_kind,
        participant_id,
        members: Vec::new(),
        created_at_ms: row.get::<_, i64>(11)? as u64,
        updated_at_ms: row.get::<_, i64>(12)? as u64,
        last_activity_at_ms: row.get::<_, i64>(13)? as u64,
    })
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1")
        .map_err(sqlite_error("conversation.tableExists.prepareFailed"))?;
    let exists = statement
        .exists(params![table_name])
        .map_err(sqlite_error("conversation.tableExists.queryFailed"))?;

    Ok(exists)
}

fn has_group_conversations(connection: &Connection) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("SELECT id FROM conversations WHERE kind = 'group' LIMIT 1")
        .map_err(sqlite_error("conversation.group.existsPrepareFailed"))?;
    statement
        .exists([])
        .map_err(sqlite_error("conversation.group.existsQueryFailed"))
}

fn conversation_column_exists(
    connection: &Connection,
    column_name: &str,
) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("PRAGMA table_info(conversations)")
        .map_err(sqlite_error(
            "conversation.migration.tableInfoPrepareFailed",
        ))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(sqlite_error("conversation.migration.tableInfoQueryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("conversation.migration.tableInfoDecodeFailed"))?;

    Ok(columns.iter().any(|column| column == column_name))
}

fn record_migration(connection: &Connection, version: &str) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms) VALUES (?1, ?2)",
            params![version, now_ms() as i64],
        )
        .map(|_| ())
        .map_err(sqlite_error("conversation.migration.recordFailed"))
}

fn conversation_kind_from_str(value: &str) -> ConversationKind {
    match value {
        "channel" => ConversationKind::Channel,
        "group" => ConversationKind::Group,
        _ => ConversationKind::Private,
    }
}

fn participant_kind_to_str(kind: &ConversationParticipantKind) -> &'static str {
    match kind {
        ConversationParticipantKind::Member => "member",
        ConversationParticipantKind::Contact => "contact",
    }
}

fn participant_kind_from_str(value: &str) -> Option<ConversationParticipantKind> {
    match value {
        "contact" => Some(ConversationParticipantKind::Contact),
        "member" => Some(ConversationParticipantKind::Member),
        _ => None,
    }
}

fn message_status_to_str(status: &ChatMessageStatus) -> &'static str {
    match status {
        ChatMessageStatus::Sending => "sending",
        ChatMessageStatus::Sent => "sent",
        ChatMessageStatus::Failed => "failed",
    }
}

fn message_status_from_str(value: &str) -> ChatMessageStatus {
    match value {
        "sending" => ChatMessageStatus::Sending,
        "failed" => ChatMessageStatus::Failed,
        _ => ChatMessageStatus::Sent,
    }
}

fn member_summary(member: MemberProfile) -> ConversationMemberSummary {
    ConversationMemberSummary {
        member_id: member.member_id,
        display_name: member.display_name,
        instance_label: member.instance_label,
    }
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn sql_bool(value: i64) -> bool {
    value != 0
}

struct PrivateParticipant {
    title: String,
}
