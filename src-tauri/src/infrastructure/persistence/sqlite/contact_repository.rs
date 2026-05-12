use std::path::Path;

use rusqlite::{params, Connection};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, ContactInviteSource, ContactKind, ContactProfile, CreateContactRequest,
        CreateContactResult, DeleteContactRequest, DeleteContactResult, ListContactsResult,
        MemberProfile, UpdateContactRequest, UpdateContactResult,
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
            member_repository::create_local_admin_member,
            workspace_database::sqlite_error,
        },
    },
};

const CONTACT_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/global/202605121200__contacts.sql");

pub fn list_contacts(app_data_dir: &Path) -> Result<ListContactsResult, AppError> {
    let connection = open_global_database(app_data_dir)?;
    apply_contact_migration(&connection)?;
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
    contact.notes = notes;
    contact.source_label = source_label;
    contact.updated_at_ms = now_ms();

    connection
        .execute(
            "UPDATE contacts
             SET display_name = ?1, contact_kind = ?2, invite_source = ?3, notes = ?4,
                 source_label = ?5, updated_at_ms = ?6
             WHERE id = ?7",
            params![
                contact.display_name,
                contact_kind_to_str(&contact.contact_kind),
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
        return Ok(());
    };

    if !table_exists(&connection, "contacts")? {
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
        .map_err(sqlite_error("contact.migration.failed"))
}

fn list_contacts_from_connection(connection: &Connection) -> Result<ListContactsResult, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, display_name, contact_kind, invite_source, notes, source_label,
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
            "SELECT id, display_name, contact_kind, invite_source, notes, source_label,
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
                id, display_name, contact_kind, invite_source, notes, source_label,
                created_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                contact.contact_id,
                contact.display_name,
                contact_kind_to_str(&contact.contact_kind),
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

    match create_local_admin_member(app_data_dir, &workspace_id, &contact.display_name) {
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
        invite_source: invite_source_from_str(row.get::<_, String>(3)?.as_str()),
        notes: row.get(4)?,
        source_label: row.get(5)?,
        created_at_ms: row.get::<_, i64>(6)? as u64,
        updated_at_ms: row.get::<_, i64>(7)? as u64,
    })
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

fn invite_source_to_str(source: &ContactInviteSource) -> &'static str {
    match source {
        ContactInviteSource::AdminContactInvite => "adminContactInvite",
    }
}

fn invite_source_from_str(_value: &str) -> ContactInviteSource {
    ContactInviteSource::AdminContactInvite
}
