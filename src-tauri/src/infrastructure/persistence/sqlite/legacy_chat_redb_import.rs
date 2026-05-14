use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    path::Path,
};

use redb::{Database, ReadableTable, TableDefinition};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::AppError,
    domain::chat::message_preview,
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms, sqlite::workspace_database::sqlite_error,
    },
};

type UserId = u128;
type ConvId = u128;
type MsgId = u128;
type TsRev = u64;

const LEGACY_CHAT_DB_FILE_NAME: &str = "chat.redb";
const LEGACY_CONVERSATIONS: TableDefinition<ConvId, &[u8]> = TableDefinition::new("conversations");
const LEGACY_USER_CONVS: TableDefinition<(UserId, ConvId), &[u8]> =
    TableDefinition::new("user_convs");
const LEGACY_MESSAGES: TableDefinition<(ConvId, MsgId), &[u8]> = TableDefinition::new("messages");
const LEGACY_MEMBERS: TableDefinition<(ConvId, UserId), &[u8]> = TableDefinition::new("members");
const LEGACY_ATTACHMENTS_INDEX: TableDefinition<(ConvId, u8, TsRev, MsgId), &[u8]> =
    TableDefinition::new("attachments_index");

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum LegacyConversationKind {
    Channel,
    Dm,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct LegacyConversationMeta {
    kind: LegacyConversationKind,
    created_at: u64,
    custom_name: Option<String>,
    is_default: bool,
    last_message_at: Option<u64>,
    last_message_preview: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
struct LegacyUserConversationSettings {
    pinned: bool,
    muted: bool,
    last_read_message_id: Option<MsgId>,
    last_active_at: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
enum LegacyMessageStatus {
    Sent,
    Sending,
    Failed,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
enum LegacyMessageContentDb {
    Text {
        text: String,
    },
    System {
        key: String,
        args: Option<HashMap<String, String>>,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
enum LegacyMessageAttachmentDb {
    Image {
        file_path: String,
        file_name: String,
        file_size: u64,
        mime_type: String,
        width: Option<u32>,
        height: Option<u32>,
        thumbnail_path: Option<String>,
    },
    Roadmap {
        title: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct LegacyChatMessage {
    sender_id: Option<UserId>,
    content: LegacyMessageContentDb,
    created_at: u64,
    is_ai: bool,
    status: LegacyMessageStatus,
    attachment: Option<LegacyMessageAttachmentDb>,
}

#[derive(Default)]
struct LegacyChatSnapshot {
    conversations: BTreeMap<ConvId, LegacyConversationMeta>,
    settings: BTreeMap<ConvId, Vec<LegacyUserConversationSettings>>,
    members: BTreeMap<ConvId, BTreeSet<UserId>>,
    messages: BTreeMap<ConvId, Vec<(MsgId, LegacyChatMessage)>>,
    attachment_count: usize,
}

pub(super) fn import_legacy_chat_redb_if_needed(
    app_data_dir: &Path,
    workspace_id: &str,
    connection: &mut Connection,
) -> Result<(), AppError> {
    if current_chat_has_conversations(connection, workspace_id)? {
        return Ok(());
    }

    let legacy_path = app_data_dir
        .join(workspace_id)
        .join(LEGACY_CHAT_DB_FILE_NAME);
    if !legacy_path.exists() {
        return Ok(());
    }

    let legacy_db = Database::open(&legacy_path).map_err(|error| {
        AppError::recoverable_error(
            "chat.legacyRedb.openFailed",
            "无法读取旧版 Golutra 聊天库。",
            "旧聊天记录未导入；请先备份 chat.redb 后重试或运行数据验证。",
            Some(format!("{}: {}", legacy_path.display(), error)),
        )
    })?;
    let snapshot = read_legacy_snapshot(&legacy_db, &legacy_path)?;
    if snapshot.conversations.is_empty() && snapshot.messages.is_empty() {
        return Ok(());
    }

    import_snapshot(connection, workspace_id, snapshot)
}

fn current_chat_has_conversations(
    connection: &Connection,
    workspace_id: &str,
) -> Result<bool, AppError> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM conversations WHERE workspace_id = ?1",
            params![workspace_id],
            |row| row.get(0),
        )
        .map_err(sqlite_error("chat.legacyRedb.currentCheckFailed"))?;

    Ok(count > 0)
}

fn read_legacy_snapshot(db: &Database, legacy_path: &Path) -> Result<LegacyChatSnapshot, AppError> {
    let read_txn = db
        .begin_read()
        .map_err(|error| legacy_read_error(legacy_path, error))?;
    let mut snapshot = LegacyChatSnapshot::default();

    {
        let table = read_txn
            .open_table(LEGACY_CONVERSATIONS)
            .map_err(|error| legacy_table_error(legacy_path, "conversations", error))?;
        for entry in table
            .iter()
            .map_err(|error| legacy_read_error(legacy_path, error))?
        {
            let (key, value) = entry.map_err(|error| legacy_read_error(legacy_path, error))?;
            let meta = bincode::deserialize::<LegacyConversationMeta>(value.value())
                .map_err(|error| legacy_decode_error(legacy_path, "conversations", error))?;
            snapshot.conversations.insert(key.value(), meta);
        }
    }

    {
        let table = read_txn
            .open_table(LEGACY_USER_CONVS)
            .map_err(|error| legacy_table_error(legacy_path, "user_convs", error))?;
        for entry in table
            .iter()
            .map_err(|error| legacy_read_error(legacy_path, error))?
        {
            let (key, value) = entry.map_err(|error| legacy_read_error(legacy_path, error))?;
            let (_, conv_id) = key.value();
            let settings = bincode::deserialize::<LegacyUserConversationSettings>(value.value())
                .map_err(|error| legacy_decode_error(legacy_path, "user_convs", error))?;
            snapshot.settings.entry(conv_id).or_default().push(settings);
        }
    }

    {
        let table = read_txn
            .open_table(LEGACY_MEMBERS)
            .map_err(|error| legacy_table_error(legacy_path, "members", error))?;
        for entry in table
            .iter()
            .map_err(|error| legacy_read_error(legacy_path, error))?
        {
            let (key, _) = entry.map_err(|error| legacy_read_error(legacy_path, error))?;
            let (conv_id, user_id) = key.value();
            snapshot.members.entry(conv_id).or_default().insert(user_id);
        }
    }

    {
        let table = read_txn
            .open_table(LEGACY_MESSAGES)
            .map_err(|error| legacy_table_error(legacy_path, "messages", error))?;
        for entry in table
            .iter()
            .map_err(|error| legacy_read_error(legacy_path, error))?
        {
            let (key, value) = entry.map_err(|error| legacy_read_error(legacy_path, error))?;
            let (conv_id, msg_id) = key.value();
            let message = bincode::deserialize::<LegacyChatMessage>(value.value())
                .map_err(|error| legacy_decode_error(legacy_path, "messages", error))?;
            snapshot
                .messages
                .entry(conv_id)
                .or_default()
                .push((msg_id, message));
        }
    }

    if let Ok(table) = read_txn.open_table(LEGACY_ATTACHMENTS_INDEX) {
        snapshot.attachment_count = table
            .iter()
            .map_err(|error| legacy_read_error(legacy_path, error))?
            .filter_map(Result::ok)
            .count();
    }

    for messages in snapshot.messages.values_mut() {
        messages.sort_by(|(left_id, left), (right_id, right)| {
            left.created_at
                .cmp(&right.created_at)
                .then_with(|| left_id.cmp(right_id))
        });
    }

    Ok(snapshot)
}

fn import_snapshot(
    connection: &mut Connection,
    workspace_id: &str,
    snapshot: LegacyChatSnapshot,
) -> Result<(), AppError> {
    let transaction = connection
        .transaction()
        .map_err(sqlite_error("chat.legacyRedb.transactionBeginFailed"))?;
    let now = now_ms();

    for (conv_id, meta) in &snapshot.conversations {
        let conversation_id = legacy_ulid(*conv_id);
        let settings = snapshot
            .settings
            .get(conv_id)
            .map(Vec::as_slice)
            .unwrap_or(&[]);
        let messages = snapshot
            .messages
            .get(conv_id)
            .map(Vec::as_slice)
            .unwrap_or(&[]);
        let latest_message = messages.last();
        let last_message_at = meta
            .last_message_at
            .or_else(|| latest_message.map(|(_, message)| message.created_at));
        let last_message_preview = meta.last_message_preview.clone().or_else(|| {
            latest_message.map(|(_, message)| message_preview(&legacy_message_body(message)))
        });
        let created_at = meta.created_at.max(1);
        let updated_at = last_message_at.unwrap_or(created_at).max(created_at);
        let last_activity_at = settings
            .iter()
            .filter_map(|settings| settings.last_active_at)
            .max()
            .or(last_message_at)
            .unwrap_or(created_at);
        let is_pinned = meta.is_default || settings.iter().any(|settings| settings.pinned);
        let is_muted = settings.iter().any(|settings| settings.muted);
        let last_read_message_id = settings
            .iter()
            .filter_map(|settings| settings.last_read_message_id)
            .max();
        let unread_count = unread_count(messages, last_read_message_id);
        let kind = match meta.kind {
            LegacyConversationKind::Channel => "channel",
            LegacyConversationKind::Dm => "private",
        };
        let (participant_kind, participant_id) = match meta.kind {
            LegacyConversationKind::Channel => ("workspace", workspace_id.to_owned()),
            LegacyConversationKind::Dm => (
                "member",
                legacy_private_participant_id(*conv_id, &snapshot.members),
            ),
        };
        let title = legacy_conversation_title(&meta, &snapshot.members, *conv_id);

        transaction
            .execute(
                "INSERT OR IGNORE INTO conversations (
                    id, workspace_id, kind, title, participant_kind, participant_id,
                    created_at_ms, updated_at_ms, last_activity_at_ms, is_default,
                    is_pinned, is_muted, unread_count, last_message_preview
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                params![
                    conversation_id,
                    workspace_id,
                    kind,
                    title,
                    participant_kind,
                    participant_id,
                    created_at as i64,
                    updated_at as i64,
                    last_activity_at as i64,
                    bool_to_sql(meta.is_default),
                    bool_to_sql(is_pinned),
                    bool_to_sql(is_muted),
                    unread_count as i64,
                    last_message_preview,
                ],
            )
            .map_err(sqlite_error("chat.legacyRedb.conversationInsertFailed"))?;

        if let Some(last_read_message_id) = last_read_message_id {
            let last_read_at = messages
                .iter()
                .find(|(message_id, _)| *message_id == last_read_message_id)
                .map(|(_, message)| message.created_at)
                .unwrap_or(updated_at);
            transaction
                .execute(
                    "INSERT OR IGNORE INTO conversation_read_positions (
                        workspace_id, conversation_id, last_read_message_id, last_read_at_ms, updated_at_ms
                     ) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        workspace_id,
                        conversation_id,
                        legacy_ulid(last_read_message_id),
                        last_read_at as i64,
                        now as i64,
                    ],
                )
                .map_err(sqlite_error("chat.legacyRedb.readPositionInsertFailed"))?;
        }
    }

    for (conv_id, messages) in &snapshot.messages {
        if !snapshot.conversations.contains_key(conv_id) {
            continue;
        }
        let conversation_id = legacy_ulid(*conv_id);
        for (message_id, message) in messages {
            let body = legacy_message_body(message);
            transaction
                .execute(
                    "INSERT OR IGNORE INTO messages (
                        id, workspace_id, conversation_id, author_member_id, body,
                        send_status, created_at_ms, updated_at_ms
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![
                        legacy_ulid(*message_id),
                        workspace_id,
                        conversation_id,
                        message
                            .sender_id
                            .map(legacy_ulid)
                            .unwrap_or_else(|| "legacy-system".to_owned()),
                        body,
                        legacy_message_status(&message.status),
                        message.created_at.max(1) as i64,
                        message.created_at.max(1) as i64,
                    ],
                )
                .map_err(sqlite_error("chat.legacyRedb.messageInsertFailed"))?;
        }
    }

    transaction
        .commit()
        .map_err(sqlite_error("chat.legacyRedb.transactionCommitFailed"))
}

fn unread_count(
    messages: &[(MsgId, LegacyChatMessage)],
    last_read_message_id: Option<MsgId>,
) -> u32 {
    let Some(last_read_message_id) = last_read_message_id else {
        return messages.len().min(u32::MAX as usize) as u32;
    };
    messages
        .iter()
        .filter(|(message_id, _)| *message_id > last_read_message_id)
        .count()
        .min(u32::MAX as usize) as u32
}

fn legacy_conversation_title(
    meta: &LegacyConversationMeta,
    members: &BTreeMap<ConvId, BTreeSet<UserId>>,
    conv_id: ConvId,
) -> String {
    if let Some(custom_name) = meta
        .custom_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return custom_name.chars().take(80).collect();
    }

    match meta.kind {
        LegacyConversationKind::Channel if meta.is_default => "默认频道".to_owned(),
        LegacyConversationKind::Channel => "Legacy Channel".to_owned(),
        LegacyConversationKind::Dm => members
            .get(&conv_id)
            .and_then(|members| members.iter().next().copied())
            .map(|member_id| format!("Legacy DM {}", legacy_ulid(member_id)))
            .unwrap_or_else(|| "Legacy DM".to_owned())
            .chars()
            .take(80)
            .collect(),
    }
}

fn legacy_private_participant_id(
    conv_id: ConvId,
    members: &BTreeMap<ConvId, BTreeSet<UserId>>,
) -> String {
    members
        .get(&conv_id)
        .and_then(|members| members.iter().next().copied())
        .map(legacy_ulid)
        .unwrap_or_else(|| legacy_ulid(conv_id))
}

fn legacy_message_body(message: &LegacyChatMessage) -> String {
    let mut body = match &message.content {
        LegacyMessageContentDb::Text { text } => text.trim().to_owned(),
        LegacyMessageContentDb::System { key, args } => {
            let key = key.trim();
            match args {
                Some(args) if !args.is_empty() => {
                    format!(
                        "{} {}",
                        key,
                        serde_json::to_string(args).unwrap_or_default()
                    )
                }
                _ => key.to_owned(),
            }
        }
    };

    if body.is_empty() {
        body = "[legacy message]".to_owned();
    }
    if message.attachment.is_some() {
        body.push_str(" [legacy attachment skipped]");
    }

    body
}

fn legacy_message_status(status: &LegacyMessageStatus) -> &'static str {
    match status {
        LegacyMessageStatus::Sent => "sent",
        LegacyMessageStatus::Sending => "sending",
        LegacyMessageStatus::Failed => "failed",
    }
}

fn legacy_ulid(value: u128) -> String {
    Ulid(value).to_string()
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn legacy_read_error(error_path: &Path, error: impl std::fmt::Display) -> AppError {
    AppError::recoverable_error(
        "chat.legacyRedb.readFailed",
        "无法读取旧版 Golutra 聊天库。",
        "旧聊天记录未导入；请先备份 chat.redb 后重试或运行数据验证。",
        Some(format!("{}: {}", error_path.display(), error)),
    )
}

fn legacy_table_error(
    error_path: &Path,
    table_name: &'static str,
    error: impl std::fmt::Display,
) -> AppError {
    AppError::recoverable_error(
        "chat.legacyRedb.tableMissing",
        "旧版 Golutra 聊天库结构不完整。",
        "旧聊天记录未导入；请先备份 chat.redb 后重试或运行数据验证。",
        Some(format!(
            "{} table={}: {}",
            error_path.display(),
            table_name,
            error
        )),
    )
}

fn legacy_decode_error(
    error_path: &Path,
    table_name: &'static str,
    error: impl std::fmt::Display,
) -> AppError {
    AppError::recoverable_error(
        "chat.legacyRedb.decodeFailed",
        "旧版 Golutra 聊天记录无法解码。",
        "旧聊天记录未导入；请先备份 chat.redb 后重试或运行数据验证。",
        Some(format!(
            "{} table={}: {}",
            error_path.display(),
            table_name,
            error
        )),
    )
}
