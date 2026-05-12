use std::{collections::HashSet, path::Path};

use rusqlite::{params, Connection, OpenFlags};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, ConversationKind, ConversationMemberSummary, ConversationParticipantKind,
        ConversationProfile, CreateGroupConversationRequest, CreateGroupConversationResult,
        ListConversationsRequest, ListConversationsResult, MemberProfile,
        StartPrivateConversationRequest, StartPrivateConversationResult,
        UpdateGroupConversationMembersRequest, UpdateGroupConversationMembersResult,
    },
    domain::{
        chat::{normalize_conversation_title, validate_conversation_id},
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
const DEFAULT_CHANNEL_TITLE: &str = "默认频道";

pub fn list_conversations(
    app_data_dir: &Path,
    request: ListConversationsRequest,
) -> Result<ListConversationsResult, AppError> {
    let connection = open_conversation_connection(app_data_dir, &request.workspace_id)?;
    ensure_default_channel(&connection, &request.workspace_id)?;
    list_conversations_from_connection(&connection, &request.workspace_id)
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
             WHERE workspace_id = ?2 AND id = ?3",
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
    apply_conversation_list_migration(connection)
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

fn ensure_default_channel(connection: &Connection, workspace_id: &str) -> Result<(), AppError> {
    let exists = connection
        .prepare(
            "SELECT id FROM conversations
             WHERE workspace_id = ?1 AND kind = 'channel' AND is_default = 1
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
                    is_default, is_pinned, unread_count, last_message_preview,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1
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
                    is_default, is_pinned, unread_count, last_message_preview,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1 AND id = ?2",
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
                    is_default, is_pinned, unread_count, last_message_preview,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1 AND kind = 'private'
               AND participant_kind = ?2 AND participant_id = ?3",
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
                is_pinned, unread_count, last_message_preview
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
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
                conversation.unread_count as i64,
                conversation.last_message_preview
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("conversation.insert.failed"))
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
        unread_count: row.get::<_, i64>(8)? as u32,
        last_message_preview: row.get(9)?,
        participant_kind,
        participant_id,
        members: Vec::new(),
        created_at_ms: row.get::<_, i64>(10)? as u64,
        updated_at_ms: row.get::<_, i64>(11)? as u64,
        last_activity_at_ms: row.get::<_, i64>(12)? as u64,
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
