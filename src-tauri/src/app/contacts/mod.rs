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
    use tempfile::tempdir;

    use super::{
        create_global_contact, delete_global_contact, list_global_contacts, update_global_contact,
    };
    use crate::contracts::{
        ContactKind, CreateContactRequest, DeleteContactRequest, ListContactsRequest,
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
        assert_eq!(created.contacts.len(), 1);

        let updated = update_global_contact(
            app_data.path(),
            UpdateContactRequest {
                contact_id: created.contact.contact_id.clone(),
                display_name: "Ada Lovelace".to_owned(),
                contact_kind: ContactKind::Contact,
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
}
