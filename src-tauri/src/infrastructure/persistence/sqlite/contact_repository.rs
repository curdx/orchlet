use std::{collections::HashSet, fs, path::Path};

use rusqlite::{params, Connection};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, ContactInviteSource, ContactKind, ContactProfile, CreateContactRequest,
        CreateContactResult, DeleteContactRequest, DeleteContactResult, ListContactsResult,
        MemberProfile, MemberStatus, UpdateContactRequest, UpdateContactResult,
    },
    domain::contact::{
        normalize_contact_display_name, normalize_optional_contact_text, validate_contact_id,
    },
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms,
        sqlite::{
            global_database::{
                global_database_path, open_global_database, open_global_database_read_only,
            },
            member_repository::create_local_admin_member_with_id,
            workspace_database::sqlite_error,
        },
    },
};

const CONTACT_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/global/202605121200__contacts.sql");
const DEFAULT_CONTACT_AVATAR: &str = "css:orbit";

pub fn list_contacts(app_data_dir: &Path) -> Result<ListContactsResult, AppError> {
    let connection = open_global_database(app_data_dir)?;
    let had_current_contacts_table = table_exists(&connection, "contacts")?;
    apply_contact_migration(&connection)?;
    if !had_current_contacts_table {
        import_legacy_golutra_contacts_if_present(app_data_dir, &connection)?;
    }
    list_contacts_from_connection(&connection)
}

pub fn create_contact(
    app_data_dir: &Path,
    request: CreateContactRequest,
) -> Result<CreateContactResult, AppError> {
    let display_name = normalize_contact_display_name(&request.display_name)?;
    let notes = normalize_optional_contact_text(request.notes, "notes")?;
    let source_label = normalize_optional_contact_text(request.source_label, "sourceLabel")?;
    let contact_kind = request.contact_kind;
    let workspace_id = request.workspace_id;
    let connection = open_global_database(app_data_dir)?;
    apply_contact_migration(&connection)?;
    let timestamp = now_ms();
    let contact = ContactProfile {
        contact_id: Ulid::new().to_string(),
        display_name,
        contact_kind,
        avatar: DEFAULT_CONTACT_AVATAR.to_owned(),
        status: MemberStatus::Offline,
        invite_source: ContactInviteSource::AdminContactInvite,
        notes,
        source_label,
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    insert_contact(&connection, &contact)?;
    let admin_member =
        create_admin_member_for_contact(app_data_dir, &connection, &contact, workspace_id)?;
    let contacts = list_contacts_from_connection(&connection)?.contacts;

    Ok(CreateContactResult {
        contact,
        contacts,
        admin_member,
    })
}

pub fn update_contact(
    app_data_dir: &Path,
    request: UpdateContactRequest,
) -> Result<UpdateContactResult, AppError> {
    validate_contact_id(&request.contact_id)?;
    let display_name = normalize_contact_display_name(&request.display_name)?;
    let notes = normalize_optional_contact_text(request.notes, "notes")?;
    let source_label = normalize_optional_contact_text(request.source_label, "sourceLabel")?;
    let connection = open_global_database(app_data_dir)?;
    apply_contact_migration(&connection)?;
    let mut contact = contact_by_id_from_connection(&connection, &request.contact_id)?;

    contact.display_name = display_name;
    contact.contact_kind = request.contact_kind;
    if let Some(status) = request.status {
        contact.status = status;
    }
    contact.notes = notes;
    contact.source_label = source_label;
    contact.updated_at_ms = now_ms();

    connection
        .execute(
            "UPDATE contacts
             SET display_name = ?1, contact_kind = ?2, avatar = ?3, status = ?4,
                 invite_source = ?5, notes = ?6, source_label = ?7, updated_at_ms = ?8
             WHERE id = ?9",
            params![
                contact.display_name,
                contact_kind_to_str(&contact.contact_kind),
                contact.avatar,
                contact_status_to_str(&contact.status),
                invite_source_to_str(&contact.invite_source),
                contact.notes,
                contact.source_label,
                contact.updated_at_ms as i64,
                contact.contact_id
            ],
        )
        .map_err(sqlite_error("contact.update.failed"))?;

    let contacts = list_contacts_from_connection(&connection)?.contacts;

    Ok(UpdateContactResult { contact, contacts })
}

pub fn delete_contact(
    app_data_dir: &Path,
    request: DeleteContactRequest,
) -> Result<DeleteContactResult, AppError> {
    validate_contact_id(&request.contact_id)?;
    let connection = open_global_database(app_data_dir)?;
    apply_contact_migration(&connection)?;

    let deleted = connection
        .execute(
            "DELETE FROM contacts WHERE id = ?1",
            params![request.contact_id],
        )
        .map_err(sqlite_error("contact.delete.failed"))?;

    if deleted == 0 {
        return Err(AppError::recoverable_error(
            "contact.delete.notFound",
            "未找到联系人。",
            "请刷新联系人列表后重试。",
            Some(format!("contactId={}", request.contact_id)),
        ));
    }

    let contacts = list_contacts_from_connection(&connection)?.contacts;

    Ok(DeleteContactResult {
        deleted_contact_id: request.contact_id,
        contacts,
    })
}

pub fn contact_by_id(app_data_dir: &Path, contact_id: &str) -> Result<ContactProfile, AppError> {
    validate_contact_id(contact_id)?;
    let connection = open_global_database(app_data_dir)?;
    apply_contact_migration(&connection)?;
    contact_by_id_from_connection(&connection, contact_id)
}

pub fn validate_contact_store(app_data_dir: &Path) -> Result<(), AppError> {
    let Some(connection) = open_global_database_read_only(app_data_dir)? else {
        load_legacy_golutra_contacts(app_data_dir)?;
        return Ok(());
    };

    if !table_exists(&connection, "contacts")? {
        load_legacy_golutra_contacts(app_data_dir)?;
        return Ok(());
    }

    list_contacts_from_connection(&connection).map(|_| ())
}

pub fn contact_database_path(app_data_dir: &Path) -> std::path::PathBuf {
    global_database_path(app_data_dir)
}

fn apply_contact_migration(connection: &Connection) -> Result<(), AppError> {
    connection
        .execute_batch(CONTACT_MIGRATION_SQL)
        .map_err(sqlite_error("contact.migration.failed"))?;
    ensure_contact_parity_columns(connection)
}

fn import_legacy_golutra_contacts_if_present(
    app_data_dir: &Path,
    connection: &Connection,
) -> Result<(), AppError> {
    let contacts = load_legacy_golutra_contacts(app_data_dir)?;

    for contact in contacts {
        insert_contact(connection, &contact)?;
    }

    Ok(())
}

fn legacy_golutra_contacts_path(app_data_dir: &Path) -> std::path::PathBuf {
    app_data_dir.join("contacts.json")
}

fn load_legacy_golutra_contacts(app_data_dir: &Path) -> Result<Vec<ContactProfile>, AppError> {
    let path = legacy_golutra_contacts_path(app_data_dir);

    if !path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "contact.legacyContacts.readFailed",
            "无法读取旧版联系人数据。",
            "联系人列表未更新；请检查 contacts.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "contact.legacyContacts.invalidJson",
            "旧版联系人数据不是有效 JSON。",
            "请先备份或修复 contacts.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let Some(items) = value.as_array() else {
        return Ok(Vec::new());
    };
    let mut seen_ids = HashSet::new();
    let mut contacts = Vec::new();

    for item in items {
        let Some(contact) = legacy_golutra_contact_from_value(item) else {
            continue;
        };

        if !seen_ids.insert(contact.contact_id.clone()) {
            continue;
        }

        contacts.push(contact);
    }

    Ok(contacts)
}

fn legacy_golutra_contact_from_value(value: &serde_json::Value) -> Option<ContactProfile> {
    let object = value.as_object()?;
    let id = object.get("id")?.as_str()?.trim();
    if id.parse::<Ulid>().is_err() {
        return None;
    }
    let name = object.get("name")?.as_str()?.trim();
    let display_name = normalize_contact_display_name(name).ok()?;
    let avatar = object
        .get("avatar")
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_CONTACT_AVATAR)
        .to_owned();
    let created_at_ms = object
        .get("createdAt")
        .and_then(|value| value.as_u64())
        .filter(|value| *value > 0)
        .unwrap_or_else(now_ms);

    Some(ContactProfile {
        contact_id: id.to_owned(),
        display_name,
        contact_kind: legacy_contact_kind(
            object
                .get("roleType")
                .and_then(|value| value.as_str())
                .unwrap_or_default(),
        ),
        avatar,
        status: legacy_contact_status(
            object
                .get("status")
                .and_then(|value| value.as_str())
                .unwrap_or_default(),
        ),
        invite_source: ContactInviteSource::AdminContactInvite,
        notes: None,
        source_label: Some("Legacy Golutra contacts.json".to_owned()),
        created_at_ms,
        updated_at_ms: created_at_ms,
    })
}

fn legacy_contact_kind(role_type: &str) -> ContactKind {
    if role_type == "admin" {
        ContactKind::Administrator
    } else {
        ContactKind::Contact
    }
}

fn legacy_contact_status(status: &str) -> MemberStatus {
    match status {
        "online" => MemberStatus::Online,
        "working" => MemberStatus::Working,
        "dnd" | "doNotDisturb" => MemberStatus::DoNotDisturb,
        _ => MemberStatus::Offline,
    }
}

fn list_contacts_from_connection(connection: &Connection) -> Result<ListContactsResult, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, display_name, contact_kind, avatar, status, invite_source, notes, source_label,
                    created_at_ms, updated_at_ms
             FROM contacts
             ORDER BY CASE contact_kind WHEN 'administrator' THEN 0 ELSE 1 END,
                      display_name, created_at_ms",
        )
        .map_err(sqlite_error("contact.list.prepareFailed"))?;
    let contacts = statement
        .query_map([], contact_from_row)
        .map_err(sqlite_error("contact.list.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("contact.list.decodeFailed"))?;

    Ok(ListContactsResult { contacts })
}

fn contact_by_id_from_connection(
    connection: &Connection,
    contact_id: &str,
) -> Result<ContactProfile, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, display_name, contact_kind, avatar, status, invite_source, notes, source_label,
                    created_at_ms, updated_at_ms
             FROM contacts
             WHERE id = ?1",
        )
        .map_err(sqlite_error("contact.get.prepareFailed"))?;

    statement
        .query_row(params![contact_id], contact_from_row)
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::recoverable_error(
                "contact.get.notFound",
                "未找到联系人。",
                "请刷新联系人列表后重试。",
                Some(format!("contactId={}", contact_id)),
            ),
            _ => sqlite_error("contact.get.queryFailed")(error),
        })
}

fn insert_contact(connection: &Connection, contact: &ContactProfile) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO contacts (
                id, display_name, contact_kind, avatar, status, invite_source, notes, source_label,
                created_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                contact.contact_id,
                contact.display_name,
                contact_kind_to_str(&contact.contact_kind),
                contact.avatar,
                contact_status_to_str(&contact.status),
                invite_source_to_str(&contact.invite_source),
                contact.notes,
                contact.source_label,
                contact.created_at_ms as i64,
                contact.updated_at_ms as i64
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("contact.insert.failed"))
}

fn create_admin_member_for_contact(
    app_data_dir: &Path,
    connection: &Connection,
    contact: &ContactProfile,
    workspace_id: Option<String>,
) -> Result<Option<MemberProfile>, AppError> {
    if contact.contact_kind != ContactKind::Administrator {
        return Ok(None);
    }

    let Some(workspace_id) = workspace_id else {
        return Ok(None);
    };

    match create_local_admin_member_with_id(
        app_data_dir,
        &workspace_id,
        &contact.contact_id,
        &contact.display_name,
    ) {
        Ok(member) => Ok(Some(member)),
        Err(error) => {
            let _ = connection.execute(
                "DELETE FROM contacts WHERE id = ?1",
                params![contact.contact_id],
            );
            Err(error)
        }
    }
}

fn contact_from_row(row: &rusqlite::Row<'_>) -> Result<ContactProfile, rusqlite::Error> {
    Ok(ContactProfile {
        contact_id: row.get(0)?,
        display_name: row.get(1)?,
        contact_kind: contact_kind_from_str(row.get::<_, String>(2)?.as_str()),
        avatar: row.get(3)?,
        status: contact_status_from_str(row.get::<_, String>(4)?.as_str()),
        invite_source: invite_source_from_str(row.get::<_, String>(5)?.as_str()),
        notes: row.get(6)?,
        source_label: row.get(7)?,
        created_at_ms: row.get::<_, i64>(8)? as u64,
        updated_at_ms: row.get::<_, i64>(9)? as u64,
    })
}

fn ensure_contact_parity_columns(connection: &Connection) -> Result<(), AppError> {
    let columns = contact_columns(connection)?;

    if !columns.iter().any(|column| column == "avatar") {
        connection
            .execute(
                "ALTER TABLE contacts ADD COLUMN avatar TEXT NOT NULL DEFAULT 'css:orbit'",
                [],
            )
            .map_err(sqlite_error("contact.migration.avatarFailed"))?;
    }

    if !columns.iter().any(|column| column == "status") {
        connection
            .execute(
                "ALTER TABLE contacts ADD COLUMN status TEXT NOT NULL DEFAULT 'offline'",
                [],
            )
            .map_err(sqlite_error("contact.migration.statusFailed"))?;
    }

    connection
        .execute(
            "UPDATE contacts SET status = 'doNotDisturb' WHERE status = 'dnd'",
            [],
        )
        .map_err(sqlite_error("contact.migration.statusAliasFailed"))?;

    connection
        .execute(
            "UPDATE contacts
             SET status = 'offline'
             WHERE status NOT IN ('online', 'working', 'doNotDisturb', 'offline')",
            [],
        )
        .map_err(sqlite_error("contact.migration.statusNormalizeFailed"))?;

    Ok(())
}

fn contact_columns(connection: &Connection) -> Result<Vec<String>, AppError> {
    let mut statement = connection
        .prepare("PRAGMA table_info(contacts)")
        .map_err(sqlite_error("contact.migration.tableInfoPrepareFailed"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(sqlite_error("contact.migration.tableInfoQueryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("contact.migration.tableInfoDecodeFailed"))?;
    Ok(columns)
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1")
        .map_err(sqlite_error("contact.tableExists.prepareFailed"))?;
    let exists = statement
        .exists(params![table_name])
        .map_err(sqlite_error("contact.tableExists.queryFailed"))?;

    Ok(exists)
}

fn contact_kind_to_str(kind: &ContactKind) -> &'static str {
    match kind {
        ContactKind::Contact => "contact",
        ContactKind::Administrator => "administrator",
    }
}

fn contact_kind_from_str(value: &str) -> ContactKind {
    match value {
        "administrator" => ContactKind::Administrator,
        _ => ContactKind::Contact,
    }
}

fn contact_status_to_str(status: &MemberStatus) -> &'static str {
    match status {
        MemberStatus::Online => "online",
        MemberStatus::Working => "working",
        MemberStatus::DoNotDisturb => "doNotDisturb",
        MemberStatus::Offline => "offline",
    }
}

fn contact_status_from_str(value: &str) -> MemberStatus {
    match value {
        "online" => MemberStatus::Online,
        "working" => MemberStatus::Working,
        "doNotDisturb" | "dnd" => MemberStatus::DoNotDisturb,
        _ => MemberStatus::Offline,
    }
}

fn invite_source_to_str(source: &ContactInviteSource) -> &'static str {
    match source {
        ContactInviteSource::AdminContactInvite => "adminContactInvite",
    }
}

fn invite_source_from_str(_value: &str) -> ContactInviteSource {
    ContactInviteSource::AdminContactInvite
}
