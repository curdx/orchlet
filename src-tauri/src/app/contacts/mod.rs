use std::path::Path;

use crate::{
    contracts::{
        AppError, CreateContactRequest, CreateContactResult, DeleteContactRequest,
        DeleteContactResult, ListContactsRequest, ListContactsResult, UpdateContactRequest,
        UpdateContactResult,
    },
    infrastructure::persistence::sqlite::contact_repository::{
        create_contact, delete_contact, list_contacts, update_contact,
    },
};

pub fn list_global_contacts(
    app_data_dir: impl AsRef<Path>,
    _request: ListContactsRequest,
) -> Result<ListContactsResult, AppError> {
    list_contacts(app_data_dir.as_ref())
}

pub fn create_global_contact(
    app_data_dir: impl AsRef<Path>,
    request: CreateContactRequest,
) -> Result<CreateContactResult, AppError> {
    create_contact(app_data_dir.as_ref(), request)
}

pub fn update_global_contact(
    app_data_dir: impl AsRef<Path>,
    request: UpdateContactRequest,
) -> Result<UpdateContactResult, AppError> {
    update_contact(app_data_dir.as_ref(), request)
}

pub fn delete_global_contact(
    app_data_dir: impl AsRef<Path>,
    request: DeleteContactRequest,
) -> Result<DeleteContactResult, AppError> {
    delete_contact(app_data_dir.as_ref(), request)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        create_global_contact, delete_global_contact, list_global_contacts, update_global_contact,
    };
    use crate::contracts::{
        ContactKind, CreateContactRequest, DeleteContactRequest, ListContactsRequest, MemberStatus,
        UpdateContactRequest,
    };

    #[test]
    fn contacts_can_be_created_updated_listed_and_deleted() {
        let app_data = tempdir().expect("app data");
        let created = create_global_contact(
            app_data.path(),
            CreateContactRequest {
                display_name: "  Ada  ".to_owned(),
                contact_kind: ContactKind::Administrator,
                notes: Some(" local admin ".to_owned()),
                source_label: Some(" admin modal ".to_owned()),
                workspace_id: Some("01K00000000000000000000000".to_owned()),
            },
        )
        .expect("contact created");

        assert_eq!(created.contact.display_name, "Ada");
        assert_eq!(created.contact.contact_kind, ContactKind::Administrator);
        assert_eq!(created.contact.notes.as_deref(), Some("local admin"));
        assert_eq!(
            created
                .admin_member
                .as_ref()
                .map(|member| member.role.clone()),
            Some(crate::contracts::MemberRole::Admin)
        );
        assert_eq!(
            created
                .admin_member
                .as_ref()
                .map(|member| member.member_id.as_str()),
            Some(created.contact.contact_id.as_str())
        );
        assert_eq!(created.contacts.len(), 1);

        let updated = update_global_contact(
            app_data.path(),
            UpdateContactRequest {
                contact_id: created.contact.contact_id.clone(),
                display_name: "Ada Lovelace".to_owned(),
                contact_kind: ContactKind::Contact,
                status: None,
                notes: None,
                source_label: None,
            },
        )
        .expect("contact updated");

        assert_eq!(updated.contact.display_name, "Ada Lovelace");
        assert_eq!(updated.contact.contact_kind, ContactKind::Contact);
        assert!(updated.contact.notes.is_none());

        let listed =
            list_global_contacts(app_data.path(), ListContactsRequest {}).expect("contacts listed");
        assert_eq!(listed.contacts.len(), 1);

        let deleted = delete_global_contact(
            app_data.path(),
            DeleteContactRequest {
                contact_id: created.contact.contact_id,
            },
        )
        .expect("contact deleted");
        assert_eq!(deleted.contacts.len(), 0);
    }

    #[test]
    fn legacy_golutra_contacts_json_imports_when_current_table_is_absent() {
        let app_data = tempdir().expect("app data");
        let admin_id = "01K00000000000000000000040";
        let contact_id = "01K00000000000000000000041";
        fs::write(
            app_data.path().join("contacts.json"),
            serde_json::json!([
                {
                    "id": contact_id,
                    "name": "Legacy Member",
                    "avatar": "",
                    "roleType": "member",
                    "status": "working",
                    "createdAt": 1760000000300_u64
                },
                {
                    "id": admin_id,
                    "name": "Legacy Admin",
                    "avatar": "css:storm",
                    "roleType": "admin",
                    "status": "dnd",
                    "createdAt": 1760000000200_u64
                },
                {
                    "id": admin_id,
                    "name": "Duplicate Admin",
                    "roleType": "admin",
                    "status": "online",
                    "createdAt": 1760000000400_u64
                },
                {
                    "id": "not-a-ulid",
                    "name": "Invalid Id",
                    "roleType": "admin"
                },
                {
                    "id": "01K00000000000000000000042",
                    "name": "   "
                }
            ])
            .to_string(),
        )
        .expect("legacy contacts");

        let listed =
            list_global_contacts(app_data.path(), ListContactsRequest {}).expect("contacts listed");

        assert_eq!(listed.contacts.len(), 2);
        assert_eq!(listed.contacts[0].contact_id, admin_id);
        assert_eq!(listed.contacts[0].display_name, "Legacy Admin");
        assert_eq!(listed.contacts[0].contact_kind, ContactKind::Administrator);
        assert_eq!(listed.contacts[0].avatar, "css:storm");
        assert_eq!(listed.contacts[0].status, MemberStatus::DoNotDisturb);
        assert_eq!(
            listed.contacts[0].source_label.as_deref(),
            Some("Legacy Golutra contacts.json")
        );
        assert_eq!(listed.contacts[1].contact_id, contact_id);
        assert_eq!(listed.contacts[1].contact_kind, ContactKind::Contact);
        assert_eq!(listed.contacts[1].avatar, "css:orbit");
        assert_eq!(listed.contacts[1].status, MemberStatus::Working);
    }

    #[test]
    fn current_sqlite_contacts_table_stays_authoritative_over_legacy_contacts_json() {
        let app_data = tempdir().expect("app data");
        let created = create_global_contact(
            app_data.path(),
            CreateContactRequest {
                display_name: "Current Admin".to_owned(),
                contact_kind: ContactKind::Administrator,
                notes: None,
                source_label: None,
                workspace_id: None,
            },
        )
        .expect("contact created");
        delete_global_contact(
            app_data.path(),
            DeleteContactRequest {
                contact_id: created.contact.contact_id,
            },
        )
        .expect("contact deleted");
        fs::write(
            app_data.path().join("contacts.json"),
            serde_json::json!([
                {
                    "id": "01K00000000000000000000043",
                    "name": "Legacy Admin",
                    "roleType": "admin",
                    "status": "online",
                    "createdAt": 1760000000500_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy contacts");

        let listed =
            list_global_contacts(app_data.path(), ListContactsRequest {}).expect("contacts listed");

        assert!(listed.contacts.is_empty());
    }
}
