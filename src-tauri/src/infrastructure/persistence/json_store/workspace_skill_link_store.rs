use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::{AppError, WorkspaceSkillLinkEntry, WorkspaceSkillLinkMode},
    domain::{
        skill::{
            parse_local_skill_metadata, validate_workspace_skill_link, SKILL_MANIFEST_FILE_NAME,
            WORKSPACE_SKILLS_DIR_NAME, WORKSPACE_SKILL_LINKS_FILE_NAME,
            WORKSPACE_SKILL_LINK_SCHEMA_VERSION,
        },
        workspace::{LEGACY_GOLUTRA_WORKSPACE_DIR_NAME, WORKSPACE_DIR_NAME},
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

pub fn legacy_golutra_workspace_skill_links_dir(workspace_root: &Path) -> PathBuf {
    workspace_root
        .join(LEGACY_GOLUTRA_WORKSPACE_DIR_NAME)
        .join(WORKSPACE_SKILLS_DIR_NAME)
}

pub fn load_workspace_skill_links(
    workspace_root: &Path,
) -> Result<WorkspaceSkillLinksDocument, AppError> {
    let links_path = workspace_skill_links_path(workspace_root);

    if !links_path.exists() {
        return load_legacy_golutra_workspace_skill_links(workspace_root);
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

fn load_legacy_golutra_workspace_skill_links(
    workspace_root: &Path,
) -> Result<WorkspaceSkillLinksDocument, AppError> {
    let legacy_links_dir = legacy_golutra_workspace_skill_links_dir(workspace_root);

    if !legacy_links_dir.exists() {
        return Ok(WorkspaceSkillLinksDocument::default());
    }

    let entries = fs::read_dir(&legacy_links_dir).map_err(|error| {
        AppError::recoverable_error(
            "skill.legacyWorkspaceLinks.readDirFailed",
            "无法读取旧版工作区技能目录。",
            "工作区技能列表未更新；请检查 .golutra/skills 权限后重试。",
            Some(format!("{}: {}", legacy_links_dir.display(), error)),
        )
    })?;
    let mut skills = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|error| {
            AppError::recoverable_error(
                "skill.legacyWorkspaceLinks.readEntryFailed",
                "无法读取旧版工作区技能条目。",
                "工作区技能列表未更新；请检查 .golutra/skills 权限后重试。",
                Some(format!("{}: {}", legacy_links_dir.display(), error)),
            )
        })?;
        let link_path = entry.path();
        let metadata = fs::symlink_metadata(&link_path).map_err(|error| {
            AppError::recoverable_error(
                "skill.legacyWorkspaceLinks.metadataFailed",
                "无法读取旧版工作区技能链接信息。",
                "工作区技能列表未更新；请检查 .golutra/skills 权限后重试。",
                Some(format!("{}: {}", link_path.display(), error)),
            )
        })?;

        if !metadata.file_type().is_symlink() {
            continue;
        }

        skills.push(legacy_workspace_skill_link_entry(
            &legacy_links_dir,
            &link_path,
            &metadata,
        )?);
    }

    let document = WorkspaceSkillLinksDocument {
        schema_version: WORKSPACE_SKILL_LINKS_SCHEMA_VERSION,
        skills,
    };
    validate_workspace_skill_links(&document)?;

    Ok(document)
}

fn legacy_workspace_skill_link_entry(
    legacy_links_dir: &Path,
    link_path: &Path,
    metadata: &fs::Metadata,
) -> Result<WorkspaceSkillLinkEntry, AppError> {
    let name = link_path
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.to_owned())
        .unwrap_or_else(|| "legacy-skill".to_owned());
    let target = fs::read_link(link_path).map_err(|error| {
        AppError::recoverable_error(
            "skill.legacyWorkspaceLinks.readLinkFailed",
            "无法读取旧版工作区技能链接目标。",
            "工作区技能列表未更新；请检查 .golutra/skills 中的 symlink 后重试。",
            Some(format!("{}: {}", link_path.display(), error)),
        )
    })?;
    let resolved_target = if target.is_absolute() {
        target
    } else {
        link_path.parent().unwrap_or(legacy_links_dir).join(target)
    };
    let source_path = resolved_target
        .canonicalize()
        .unwrap_or_else(|_| resolved_target.clone());
    let manifest_path = source_path.join(SKILL_MANIFEST_FILE_NAME);
    let description = fs::read_to_string(&manifest_path)
        .ok()
        .and_then(|content| parse_local_skill_metadata(&content, &name).ok())
        .and_then(|metadata| metadata.description);
    let linked_at_ms = metadata
        .modified()
        .ok()
        .and_then(|modified| {
            modified
                .duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|duration| duration.as_millis() as u64)
        })
        .unwrap_or(1);
    let availability = legacy_workspace_skill_link_availability(&source_path, &manifest_path);

    Ok(WorkspaceSkillLinkEntry {
        schema_version: WORKSPACE_SKILL_LINK_SCHEMA_VERSION,
        skill_id: stable_legacy_workspace_skill_id(&name, link_path, &source_path),
        name,
        description,
        source_path: source_path.to_string_lossy().into_owned(),
        manifest_path: manifest_path.to_string_lossy().into_owned(),
        link_path: link_path.to_string_lossy().into_owned(),
        link_mode: availability.mode,
        unavailable_reason: availability.unavailable_reason,
        linked_at_ms,
        updated_at_ms: linked_at_ms,
    })
}

struct LegacyWorkspaceSkillLinkAvailability {
    mode: WorkspaceSkillLinkMode,
    unavailable_reason: Option<String>,
}

fn legacy_workspace_skill_link_availability(
    source_path: &Path,
    manifest_path: &Path,
) -> LegacyWorkspaceSkillLinkAvailability {
    if !source_path.exists() {
        return LegacyWorkspaceSkillLinkAvailability {
            mode: WorkspaceSkillLinkMode::Manifest,
            unavailable_reason: Some(format!(
                "旧版技能 symlink 目标不存在：{}",
                source_path.display()
            )),
        };
    }

    if !source_path.is_dir() {
        return LegacyWorkspaceSkillLinkAvailability {
            mode: WorkspaceSkillLinkMode::Manifest,
            unavailable_reason: Some(format!(
                "旧版技能 symlink 目标不是目录：{}",
                source_path.display()
            )),
        };
    }

    match manifest_path.metadata() {
        Ok(metadata) if metadata.is_file() => LegacyWorkspaceSkillLinkAvailability {
            mode: WorkspaceSkillLinkMode::Symlink,
            unavailable_reason: None,
        },
        Ok(_) => LegacyWorkspaceSkillLinkAvailability {
            mode: WorkspaceSkillLinkMode::Manifest,
            unavailable_reason: Some(format!(
                "旧版技能目标缺少可读取的 SKILL.md 文件：{}",
                manifest_path.display()
            )),
        },
        Err(error) => LegacyWorkspaceSkillLinkAvailability {
            mode: WorkspaceSkillLinkMode::Manifest,
            unavailable_reason: Some(format!(
                "旧版技能目标缺少可读取的 SKILL.md 文件：{}: {}",
                manifest_path.display(),
                error
            )),
        },
    }
}

fn stable_legacy_workspace_skill_id(name: &str, link_path: &Path, source_path: &Path) -> String {
    let mut first = Fnv1a64::new(0xcbf29ce484222325);
    first.write(b"orchlet:legacy-golutra-workspace-skill:v1");
    first.write(name.as_bytes());
    first.write(link_path.to_string_lossy().as_bytes());
    first.write(source_path.to_string_lossy().as_bytes());

    let mut second = Fnv1a64::new(0x84222325cbf29ce4);
    second.write(b"orchlet:legacy-golutra-workspace-skill:v1:secondary");
    second.write(source_path.to_string_lossy().as_bytes());
    second.write(link_path.to_string_lossy().as_bytes());
    second.write(name.as_bytes());

    Ulid::from((first.finish(), second.finish())).to_string()
}

struct Fnv1a64 {
    state: u64,
}

impl Fnv1a64 {
    fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn write(&mut self, bytes: &[u8]) {
        const FNV_PRIME: u64 = 0x00000100000001b3;

        for byte in bytes {
            self.state ^= u64::from(*byte);
            self.state = self.state.wrapping_mul(FNV_PRIME);
        }
    }

    fn finish(self) -> u64 {
        self.state
    }
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

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;
    use ulid::Ulid;

    use super::{
        load_workspace_skill_links, save_workspace_skill_links, workspace_skill_links_path,
        WorkspaceSkillLinksDocument,
    };
    use crate::contracts::{WorkspaceSkillLinkEntry, WorkspaceSkillLinkMode};

    #[cfg(unix)]
    fn create_legacy_skill_symlink(
        workspace_root: &std::path::Path,
        link_name: &str,
        target: &std::path::Path,
    ) -> std::path::PathBuf {
        let legacy_dir = workspace_root.join(".golutra/skills");
        fs::create_dir_all(&legacy_dir).expect("legacy skills dir");
        let link_path = legacy_dir.join(link_name);
        std::os::unix::fs::symlink(target, &link_path).expect("legacy skill symlink");
        link_path
    }

    #[cfg(unix)]
    #[test]
    fn loads_legacy_golutra_workspace_skill_symlinks_when_current_store_is_missing() {
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Local Review\ndescription: Review helper\n---\n# Local Review",
        )
        .expect("manifest");
        let link_path = create_legacy_skill_symlink(workspace.path(), "local-review", skill.path());

        let document = load_workspace_skill_links(workspace.path()).expect("legacy links");

        assert_eq!(document.skills.len(), 1);
        let link = &document.skills[0];
        assert_eq!(link.name, "local-review");
        assert_eq!(link.description.as_deref(), Some("Review helper"));
        assert_eq!(link.link_path, link_path.to_string_lossy());
        assert_eq!(
            link.source_path,
            skill
                .path()
                .canonicalize()
                .expect("canonical skill")
                .to_string_lossy()
        );
        assert!(link.manifest_path.ends_with("SKILL.md"));
        assert_eq!(link.link_mode, WorkspaceSkillLinkMode::Symlink);
        assert!(link.unavailable_reason.is_none());
        assert!(link.skill_id.parse::<Ulid>().is_ok());
    }

    #[cfg(unix)]
    #[test]
    fn current_workspace_skill_link_store_stays_authoritative_over_legacy_symlinks() {
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        fs::write(skill.path().join("SKILL.md"), "# Legacy").expect("manifest");
        create_legacy_skill_symlink(workspace.path(), "legacy-review", skill.path());
        let current = WorkspaceSkillLinksDocument {
            schema_version: 1,
            skills: vec![WorkspaceSkillLinkEntry {
                schema_version: 1,
                skill_id: "01K00000000000000000000000".to_owned(),
                name: "Current Review".to_owned(),
                description: None,
                source_path: "/fixtures/skills/current-review".to_owned(),
                manifest_path: "/fixtures/skills/current-review/SKILL.md".to_owned(),
                link_path: "/fixtures/workspaces/current/.orchlet/skills/current-review".to_owned(),
                link_mode: WorkspaceSkillLinkMode::Manifest,
                unavailable_reason: Some("fixture fallback".to_owned()),
                linked_at_ms: 1_760_000_020_000,
                updated_at_ms: 1_760_000_020_000,
            }],
        };
        save_workspace_skill_links(workspace.path(), &current).expect("current saved");

        let document = load_workspace_skill_links(workspace.path()).expect("current links");

        assert_eq!(document, current);
    }

    #[cfg(unix)]
    #[test]
    fn broken_legacy_golutra_workspace_skill_symlink_becomes_manifest_fallback() {
        let workspace = tempdir().expect("workspace");
        let missing_target = workspace.path().join("missing-skill");
        create_legacy_skill_symlink(workspace.path(), "missing-review", &missing_target);

        let document = load_workspace_skill_links(workspace.path()).expect("legacy links");

        assert_eq!(document.skills.len(), 1);
        let link = &document.skills[0];
        assert_eq!(link.name, "missing-review");
        assert_eq!(link.link_mode, WorkspaceSkillLinkMode::Manifest);
        assert!(link
            .unavailable_reason
            .as_deref()
            .unwrap_or_default()
            .contains("目标不存在"));
        assert!(link.skill_id.parse::<Ulid>().is_ok());
    }

    #[test]
    fn missing_current_and_legacy_workspace_skill_links_loads_empty_document() {
        let workspace = tempdir().expect("workspace");

        let document = load_workspace_skill_links(workspace.path()).expect("empty links");

        assert_eq!(document, WorkspaceSkillLinksDocument::default());
        assert!(!workspace_skill_links_path(workspace.path()).exists());
    }
}
