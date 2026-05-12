use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub enum SkillSource {
    LocalFolder,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub enum SkillImportStatus {
    Imported,
    UpdatedExisting,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub enum WorkspaceSkillLinkMode {
    Symlink,
    Manifest,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub enum WorkspaceSkillLinkStatus {
    Linked,
    UpdatedExisting,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct SkillLibraryEntry {
    pub schema_version: u32,
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub source: SkillSource,
    pub source_path: String,
    pub manifest_path: String,
    #[ts(type = "number")]
    pub imported_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
    #[ts(type = "number")]
    pub last_validated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct SkillLibraryListRequest {}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct SkillLibraryListResult {
    pub skills: Vec<SkillLibraryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct ImportLocalSkillFolderRequest {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct ImportLocalSkillFolderResult {
    pub skill: SkillLibraryEntry,
    pub skills: Vec<SkillLibraryEntry>,
    pub status: SkillImportStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct WorkspaceSkillLinkEntry {
    pub schema_version: u32,
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub source_path: String,
    pub manifest_path: String,
    pub link_path: String,
    pub link_mode: WorkspaceSkillLinkMode,
    pub unavailable_reason: Option<String>,
    #[ts(type = "number")]
    pub linked_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct ListWorkspaceSkillLinksRequest {
    pub workspace_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct ListWorkspaceSkillLinksResult {
    pub skills: Vec<WorkspaceSkillLinkEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct LinkWorkspaceSkillRequest {
    pub workspace_root: String,
    pub skill_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct LinkWorkspaceSkillResult {
    pub skill: WorkspaceSkillLinkEntry,
    pub skills: Vec<WorkspaceSkillLinkEntry>,
    pub status: WorkspaceSkillLinkStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct UnlinkWorkspaceSkillRequest {
    pub workspace_root: String,
    pub skill_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "skill.ts")]
pub struct UnlinkWorkspaceSkillResult {
    pub removed_skill_id: String,
    pub skills: Vec<WorkspaceSkillLinkEntry>,
}
