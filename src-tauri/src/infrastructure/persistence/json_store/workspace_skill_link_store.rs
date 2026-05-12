use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::{AppError, WorkspaceSkillLinkEntry},
    domain::{
        skill::{
            validate_workspace_skill_link, WORKSPACE_SKILLS_DIR_NAME,
            WORKSPACE_SKILL_LINKS_FILE_NAME, WORKSPACE_SKILL_LINK_SCHEMA_VERSION,
        },
        workspace::WORKSPACE_DIR_NAME,
    },
};

pub const WORKSPACE_SKILL_LINKS_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSkillLinksDocument {
    pub schema_version: u32,
    pub skills: Vec<WorkspaceSkillLinkEntry>,
}

impl Default for WorkspaceSkillLinksDocument {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_SKILL_LINKS_SCHEMA_VERSION,
            skills: Vec::new(),
        }
    }
}

pub fn workspace_skill_links_dir(workspace_root: &Path) -> PathBuf {
    workspace_root
        .join(WORKSPACE_DIR_NAME)
        .join(WORKSPACE_SKILLS_DIR_NAME)
}

pub fn workspace_skill_links_path(workspace_root: &Path) -> PathBuf {
    workspace_skill_links_dir(workspace_root).join(WORKSPACE_SKILL_LINKS_FILE_NAME)
}

pub fn load_workspace_skill_links(
    workspace_root: &Path,
) -> Result<WorkspaceSkillLinksDocument, AppError> {
    let links_path = workspace_skill_links_path(workspace_root);

    if !links_path.exists() {
        return Ok(WorkspaceSkillLinksDocument::default());
    }

    let raw = fs::read_to_string(&links_path).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLinks.readFailed",
            "无法读取工作区技能链接。",
            "工作区技能列表未更新；请检查 .orchlet/skills/skill-links.json 权限后重试。",
            Some(format!("{}: {}", links_path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLinks.invalidJson",
            "工作区技能链接不是有效 JSON。",
            "请先备份或修复 .orchlet/skills/skill-links.json 后重试。",
            Some(format!("{}: {}", links_path.display(), error)),
        )
    })?;
    let document: WorkspaceSkillLinksDocument = serde_json::from_value(value).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLinks.invalidFields",
            format!("工作区技能链接字段无效：{}。", error),
            "请先备份或修复 .orchlet/skills/skill-links.json 后重试。",
            Some(format!("{}: {}", links_path.display(), error)),
        )
    })?;

    validate_workspace_skill_links(&document)?;

    Ok(document)
}

pub fn save_workspace_skill_links(
    workspace_root: &Path,
    document: &WorkspaceSkillLinksDocument,
) -> Result<(), AppError> {
    validate_workspace_skill_links(document)?;

    let links_path = workspace_skill_links_path(workspace_root);
    let links_dir = links_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "skill.workspaceLinks.invalidPath",
            "无法定位工作区技能链接目录。",
            "工作区技能列表未更新；请检查工作区路径后重试。",
            Some(links_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(links_dir).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLinks.createDirFailed",
            "无法创建工作区技能链接目录。",
            "工作区技能列表未更新；请检查工作区权限后重试。",
            Some(format!("{}: {}", links_dir.display(), error)),
        )
    })?;

    write_workspace_skill_links_atomic(&links_path, document)
}

pub fn validate_workspace_skill_links(
    document: &WorkspaceSkillLinksDocument,
) -> Result<(), AppError> {
    if document.schema_version != WORKSPACE_SKILL_LINKS_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "skill.workspaceLinks.unsupportedSchemaVersion",
            "工作区技能链接数据版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份该工作区技能链接文件。",
            Some(format!(
                "schemaVersion={} expected={}",
                document.schema_version, WORKSPACE_SKILL_LINKS_SCHEMA_VERSION
            )),
        ));
    }

    let mut skill_ids = HashSet::new();
    let mut link_paths = HashSet::new();

    for link in &document.skills {
        validate_workspace_skill_link(link)?;

        if link.schema_version != WORKSPACE_SKILL_LINK_SCHEMA_VERSION {
            return Err(AppError::recoverable_error(
                "skill.workspaceLinks.invalidRecordVersion",
                "工作区技能链接记录版本暂不支持。",
                "请使用兼容版本的 orchlet，或先备份该工作区技能链接文件。",
                Some(format!("skillId={}", link.skill_id)),
            ));
        }

        if !skill_ids.insert(link.skill_id.clone()) {
            return Err(AppError::recoverable_error(
                "skill.workspaceLinks.duplicateSkillId",
                "工作区存在重复技能链接。",
                "请修复重复 skillId 后重试。",
                Some(link.skill_id.clone()),
            ));
        }

        if !link_paths.insert(link.link_path.clone()) {
            return Err(AppError::recoverable_error(
                "skill.workspaceLinks.duplicateLinkPath",
                "工作区存在重复技能链接路径。",
                "请修复重复 linkPath 后重试。",
                Some(link.link_path.clone()),
            ));
        }
    }

    Ok(())
}

fn write_workspace_skill_links_atomic(
    path: &Path,
    document: &WorkspaceSkillLinksDocument,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(document).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLinks.serializeFailed",
            "无法序列化工作区技能链接。",
            "工作区技能列表未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        WORKSPACE_SKILL_LINKS_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLinks.writeFailed",
            "无法写入工作区技能链接。",
            "工作区技能列表未更新；请检查工作区权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "skill.workspaceLinks.renameFailed",
            "无法完成工作区技能链接写入。",
            "工作区技能列表未更新；请检查工作区权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}
