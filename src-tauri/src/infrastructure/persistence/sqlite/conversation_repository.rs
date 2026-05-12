use std::path::Path;

use rusqlite::{params, Connection, OpenFlags};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, ConversationKind, ConversationParticipantKind, ConversationProfile,
        StartPrivateConversationRequest, StartPrivateConversationResult,
    },
    domain::{contact::validate_contact_id, member::validate_workspace_id},
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

pub fn start_private_conversation(
    app_data_dir: &Path,
    request: StartPrivateConversationRequest,
) -> Result<StartPrivateConversationResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let participant = load_participant(app_data_dir, &request)?;
    initialize_member_store(app_data_dir, &request.workspace_id)?;
    let connection = open_workspace_database(app_data_dir, &request.workspace_id)?;
    apply_private_conversation_migration(&connection)?;

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
        participant_kind: request.participant_kind,
        participant_id: request.participant_id,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
        last_activity_at_ms: timestamp,
    };

    insert_conversation(&connection, &conversation)?;

    Ok(StartPrivateConversationResult {
        conversation,
        created: true,
    })
}

pub fn validate_private_conversation_store(
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

    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, kind, title, participant_kind, participant_id,
                    created_at_ms, updated_at_ms, last_activity_at_ms
             FROM conversations
             WHERE workspace_id = ?1",
        )
        .map_err(sqlite_error("conversation.validate.prepareFailed"))?;
    let _conversations = statement
        .query_map(params![workspace_id], conversation_from_row)
        .map_err(sqlite_error("conversation.validate.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("conversation.validate.decodeFailed"))?;

    Ok(())
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

fn apply_private_conversation_migration(connection: &Connection) -> Result<(), AppError> {
    connection
        .execute_batch(PRIVATE_CONVERSATION_MIGRATION_SQL)
        .map_err(sqlite_error("conversation.migration.failed"))
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
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO conversations (
                id, workspace_id, kind, title, participant_kind, participant_id,
                created_at_ms, updated_at_ms, last_activity_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                conversation.conversation_id,
                conversation.workspace_id,
                conversation_kind_to_str(&conversation.kind),
                conversation.title,
                participant_kind_to_str(&conversation.participant_kind),
                conversation.participant_id,
                conversation.created_at_ms as i64,
                conversation.updated_at_ms as i64,
                conversation.last_activity_at_ms as i64
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("conversation.insert.failed"))
}

fn conversation_from_row(row: &rusqlite::Row<'_>) -> Result<ConversationProfile, rusqlite::Error> {
    Ok(ConversationProfile {
        conversation_id: row.get(0)?,
        workspace_id: row.get(1)?,
        kind: conversation_kind_from_str(row.get::<_, String>(2)?.as_str()),
        title: row.get(3)?,
        participant_kind: participant_kind_from_str(row.get::<_, String>(4)?.as_str()),
        participant_id: row.get(5)?,
        created_at_ms: row.get::<_, i64>(6)? as u64,
        updated_at_ms: row.get::<_, i64>(7)? as u64,
        last_activity_at_ms: row.get::<_, i64>(8)? as u64,
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

fn conversation_kind_to_str(kind: &ConversationKind) -> &'static str {
    match kind {
        ConversationKind::Private => "private",
    }
}

fn conversation_kind_from_str(_value: &str) -> ConversationKind {
    ConversationKind::Private
}

fn participant_kind_to_str(kind: &ConversationParticipantKind) -> &'static str {
    match kind {
        ConversationParticipantKind::Member => "member",
        ConversationParticipantKind::Contact => "contact",
    }
}

fn participant_kind_from_str(value: &str) -> ConversationParticipantKind {
    match value {
        "contact" => ConversationParticipantKind::Contact,
        _ => ConversationParticipantKind::Member,
    }
}

struct PrivateParticipant {
    title: String,
}
