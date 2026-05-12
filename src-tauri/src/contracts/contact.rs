use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::member::MemberProfile;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub enum ContactKind {
    Contact,
    Administrator,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub enum ContactInviteSource {
    AdminContactInvite,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct ContactProfile {
    pub contact_id: String,
    pub display_name: String,
    pub contact_kind: ContactKind,
    pub invite_source: ContactInviteSource,
    pub notes: Option<String>,
    pub source_label: Option<String>,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct ListContactsRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct ListContactsResult {
    pub contacts: Vec<ContactProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct CreateContactRequest {
    pub display_name: String,
    pub contact_kind: ContactKind,
    pub notes: Option<String>,
    pub source_label: Option<String>,
    pub workspace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct CreateContactResult {
    pub contact: ContactProfile,
    pub contacts: Vec<ContactProfile>,
    pub admin_member: Option<MemberProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct UpdateContactRequest {
    pub contact_id: String,
    pub display_name: String,
    pub contact_kind: ContactKind,
    pub notes: Option<String>,
    pub source_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct UpdateContactResult {
    pub contact: ContactProfile,
    pub contacts: Vec<ContactProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct DeleteContactRequest {
    pub contact_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "contact.ts")]
pub struct DeleteContactResult {
    pub deleted_contact_id: String,
    pub contacts: Vec<ContactProfile>,
}
