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
