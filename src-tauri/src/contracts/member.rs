use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub enum MemberRole {
    Owner,
    Admin,
    Assistant,
    Member,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub enum InvitedMemberType {
    Assistant,
    Member,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub enum MemberStatus {
    Online,
    Offline,
    Working,
    DoNotDisturb,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub enum MemberRuntimeKind {
    None,
    BuiltInAiCli,
    CustomCli,
    Shell,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct MemberRuntimeProfile {
    pub kind: MemberRuntimeKind,
    pub runtime_id: Option<String>,
    pub label: Option<String>,
    pub command: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct MemberPermissions {
    pub can_mention: bool,
    pub can_remove: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct MemberIsolation {
    pub sandboxed: bool,
    pub unlimited_access: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct MemberProfile {
    pub member_id: String,
    pub workspace_id: String,
    pub role: MemberRole,
    pub display_name: String,
    pub instance_index: u32,
    pub instance_label: String,
    pub status: MemberStatus,
    pub runtime: MemberRuntimeProfile,
    pub permissions: MemberPermissions,
    pub isolation: MemberIsolation,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct ListMembersRequest {
    pub workspace_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct ListMembersResult {
    pub members: Vec<MemberProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct InviteMemberRequest {
    pub workspace_id: String,
    pub member_type: InvitedMemberType,
    pub display_name: String,
    pub runtime: MemberRuntimeProfile,
    pub instance_count: Option<u32>,
    pub permissions: Option<MemberPermissions>,
    pub isolation: Option<MemberIsolation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct InviteMemberResult {
    pub member: MemberProfile,
    pub invited_members: Vec<MemberProfile>,
    pub members: Vec<MemberProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct RemoveMemberRequest {
    pub workspace_id: String,
    pub member_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct RemoveMemberResult {
    pub removed_member_id: String,
    pub members: Vec<MemberProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct UpdateMemberStatusRequest {
    pub workspace_id: String,
    pub member_id: String,
    pub status: MemberStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "member.ts")]
pub struct UpdateMemberStatusResult {
    pub member: MemberProfile,
    pub members: Vec<MemberProfile>,
}
