use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::{AppError, SkillLibraryEntry},
    domain::skill::{validate_skill_name, SKILL_RECORD_SCHEMA_VERSION},
};

pub const SKILL_LIBRARY_SCHEMA_VERSION: u32 = 1;
pub const SKILL_LIBRARY_DIR_NAME: &str = "skills";
pub const SKILL_LIBRARY_FILE_NAME: &str = "skill-library.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillLibraryDocument {
    pub schema_version: u32,
    pub skills: Vec<SkillLibraryEntry>,
}

impl Default for SkillLibraryDocument {
    fn default() -> Self {
        Self {
            schema_version: SKILL_LIBRARY_SCHEMA_VERSION,
            skills: Vec::new(),
        }
    }
}

pub fn skill_library_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir
        .join(SKILL_LIBRARY_DIR_NAME)
        .join(SKILL_LIBRARY_FILE_NAME)
}

pub fn load_skill_library(app_data_dir: &Path) -> Result<SkillLibraryDocument, AppError> {
    let library_path = skill_library_path(app_data_dir);

    if !library_path.exists() {
        return Ok(SkillLibraryDocument::default());
    }

    let raw = fs::read_to_string(&library_path).map_err(|error| {
        AppError::recoverable_error(
            "skill.library.readFailed",
            "无法读取技能库数据。",
            "技能库未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", library_path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "skill.library.invalidJson",
            "技能库数据不是有效 JSON。",
            "请先备份或修复应用数据中的 skills/skill-library.json 后重试。",
            Some(format!("{}: {}", library_path.display(), error)),
        )
    })?;
    let document: SkillLibraryDocument = serde_json::from_value(value).map_err(|error| {
        AppError::recoverable_error(
            "skill.library.invalidFields",
            format!("技能库数据字段无效：{}。", error),
            "请先备份或修复应用数据中的 skills/skill-library.json 后重试。",
            Some(format!("{}: {}", library_path.display(), error)),
        )
    })?;

    validate_skill_library(&document)?;

    Ok(document)
}

pub fn save_skill_library(
    app_data_dir: &Path,
    document: &SkillLibraryDocument,
) -> Result<(), AppError> {
    validate_skill_library(document)?;

    let library_path = skill_library_path(app_data_dir);
    let library_dir = library_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "skill.library.invalidPath",
            "无法定位技能库目录。",
            "技能库未更新；请检查应用数据目录权限后重试。",
            Some(library_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(library_dir).map_err(|error| {
        AppError::recoverable_error(
            "skill.library.createDirFailed",
            "无法创建技能库目录。",
            "技能库未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", library_dir.display(), error)),
        )
    })?;

    write_skill_library_atomic(&library_path, document)
}

pub fn validate_skill_library(document: &SkillLibraryDocument) -> Result<(), AppError> {
    if document.schema_version != SKILL_LIBRARY_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "skill.library.unsupportedSchemaVersion",
            "技能库数据版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份该技能库文件。",
            Some(format!(
                "schemaVersion={} expected={}",
                document.schema_version, SKILL_LIBRARY_SCHEMA_VERSION
            )),
        ));
    }

    let mut skill_ids = HashSet::new();
    let mut source_paths = HashSet::new();

    for skill in &document.skills {
        if skill.schema_version != SKILL_RECORD_SCHEMA_VERSION {
            return Err(AppError::recoverable_error(
                "skill.library.invalidRecordVersion",
                "技能库记录版本暂不支持。",
                "请使用兼容版本的 orchlet，或先备份该技能库文件。",
                Some(format!(
                    "skillId={} schemaVersion={} expected={}",
                    skill.skill_id, skill.schema_version, SKILL_RECORD_SCHEMA_VERSION
                )),
            ));
        }

        if skill.skill_id.parse::<Ulid>().is_err() {
            return Err(AppError::recoverable_error(
                "skill.library.invalidSkillId",
                "技能库记录标识无效。",
                "请修复技能库中的 skillId 后重试。",
                Some(format!("skillId must be a ULID string: {}", skill.skill_id)),
            ));
        }

        if !skill_ids.insert(skill.skill_id.clone()) {
            return Err(AppError::recoverable_error(
                "skill.library.duplicateSkillId",
                "技能库存在重复技能标识。",
                "请修复重复 skillId 后重试。",
                Some(skill.skill_id.clone()),
            ));
        }

        validate_skill_name(&skill.name)?;

        if skill.source_path.trim().is_empty() {
            return Err(AppError::recoverable_error(
                "skill.library.invalidSourcePath",
                "技能库记录路径无效。",
                "请修复技能库中的 sourcePath 后重试。",
                Some(format!("skillId={}", skill.skill_id)),
            ));
        }

        if !source_paths.insert(skill.source_path.clone()) {
            return Err(AppError::recoverable_error(
                "skill.library.duplicateSourcePath",
                "技能库存在重复本地路径。",
                "请重新导入该技能或修复重复 sourcePath。",
                Some(skill.source_path.clone()),
            ));
        }

        if skill.manifest_path.trim().is_empty() {
            return Err(AppError::recoverable_error(
                "skill.library.invalidManifestPath",
                "技能库记录缺少 SKILL.md 路径。",
                "请重新导入该技能文件夹。",
                Some(format!("skillId={}", skill.skill_id)),
            ));
        }

        if skill.imported_at_ms == 0
            || skill.updated_at_ms < skill.imported_at_ms
            || skill.last_validated_at_ms < skill.imported_at_ms
        {
            return Err(AppError::recoverable_error(
                "skill.library.invalidTimestamp",
                "技能库记录时间戳无效。",
                "请修复技能库中的时间戳后重试。",
                Some(format!("skillId={}", skill.skill_id)),
            ));
        }
    }

    Ok(())
}

fn write_skill_library_atomic(
    path: &Path,
    document: &SkillLibraryDocument,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(document).map_err(|error| {
        AppError::recoverable_error(
            "skill.library.serializeFailed",
            "无法序列化技能库数据。",
            "技能库未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!("{}.tmp-{}", SKILL_LIBRARY_FILE_NAME, Ulid::new()));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "skill.library.writeFailed",
            "无法写入技能库数据。",
            "技能库未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "skill.library.renameFailed",
            "无法完成技能库数据写入。",
            "技能库未更新；请检查应用数据目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}
