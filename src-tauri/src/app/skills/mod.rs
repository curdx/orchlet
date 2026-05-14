use std::{
    fs,
    path::{Path, PathBuf},
};

use ulid::Ulid;

use crate::{
    contracts::{
        AppError, DeleteSkillRequest, DeleteSkillResult, ImportLocalSkillFolderRequest,
        ImportLocalSkillFolderResult, LinkWorkspaceSkillRequest, LinkWorkspaceSkillResult,
        ListWorkspaceSkillLinksRequest, ListWorkspaceSkillLinksResult, OpenSkillFolderRequest,
        OpenSkillFolderResult, SkillImportStatus, SkillLibraryEntry, SkillLibraryListResult,
        SkillSource, UnlinkWorkspaceSkillRequest, UnlinkWorkspaceSkillResult,
        WorkspaceSkillLinkEntry, WorkspaceSkillLinkMode, WorkspaceSkillLinkStatus,
    },
    domain::skill::{
        parse_local_skill_metadata, skill_name_from_path, workspace_skill_link_name,
        SKILL_MANIFEST_FILE_NAME, SKILL_RECORD_SCHEMA_VERSION, WORKSPACE_SKILL_LINK_SCHEMA_VERSION,
    },
    infrastructure::{
        filesystem::canonicalize_existing_directory,
        persistence::{
            json_store::skill_library_store::{load_skill_library, save_skill_library},
            json_store::workspace_registry_store::now_ms,
            json_store::workspace_skill_link_store::{
                load_workspace_skill_links, save_workspace_skill_links, workspace_skill_links_dir,
            },
        },
    },
};

pub fn list_skill_library(
    app_data_dir: impl AsRef<Path>,
) -> Result<SkillLibraryListResult, AppError> {
    let library = load_skill_library(app_data_dir.as_ref())?;

    Ok(SkillLibraryListResult {
        skills: sorted_skills(library.skills),
    })
}

pub fn import_local_skill_folder(
    app_data_dir: impl AsRef<Path>,
    request: ImportLocalSkillFolderRequest,
) -> Result<ImportLocalSkillFolderResult, AppError> {
    let folder = canonicalize_existing_skill_directory(&request.path)?;
    let manifest_path = folder.join(SKILL_MANIFEST_FILE_NAME);

    if !manifest_path.exists() {
        return Err(AppError::recoverable_error(
            "skill.manifest.missing",
            "技能文件夹缺少 SKILL.md。",
            "请选择包含 SKILL.md 的技能文件夹后重试。",
            Some(manifest_path.display().to_string()),
        ));
    }

    let manifest_metadata = manifest_path.metadata().map_err(|error| {
        AppError::recoverable_error(
            "skill.manifest.metadataFailed",
            "无法读取技能清单信息。",
            "请检查 SKILL.md 权限后重试。",
            Some(format!("{}: {}", manifest_path.display(), error)),
        )
    })?;

    if !manifest_metadata.is_file() {
        return Err(AppError::recoverable_error(
            "skill.manifest.notFile",
            "技能清单不是文件。",
            "请确保技能文件夹根目录包含可读取的 SKILL.md 文件。",
            Some(manifest_path.display().to_string()),
        ));
    }

    let manifest_content = fs::read_to_string(&manifest_path).map_err(|error| {
        AppError::recoverable_error(
            "skill.manifest.readFailed",
            "无法读取技能清单。",
            "请检查 SKILL.md 权限后重试。",
            Some(format!("{}: {}", manifest_path.display(), error)),
        )
    })?;
    let folder_name = skill_name_from_path(&folder);
    let metadata = parse_local_skill_metadata(&manifest_content, &folder_name)?;
    let source_path = folder.to_string_lossy().into_owned();
    let manifest_path_string = manifest_path.to_string_lossy().into_owned();
    let mut library = load_skill_library(app_data_dir.as_ref())?;
    let timestamp = now_ms();
    let mut status = SkillImportStatus::Imported;
    let skill = if let Some(existing) = library
        .skills
        .iter_mut()
        .find(|skill| skill.source_path == source_path)
    {
        existing.name = metadata.name;
        existing.description = metadata.description;
        existing.manifest_path = manifest_path_string;
        existing.updated_at_ms = timestamp.max(existing.updated_at_ms + 1);
        existing.last_validated_at_ms = existing.updated_at_ms;
        status = SkillImportStatus::UpdatedExisting;
        existing.clone()
    } else {
        let skill = SkillLibraryEntry {
            schema_version: SKILL_RECORD_SCHEMA_VERSION,
            skill_id: Ulid::new().to_string(),
            name: metadata.name,
            description: metadata.description,
            source: SkillSource::LocalFolder,
            source_path,
            manifest_path: manifest_path_string,
            imported_at_ms: timestamp,
            updated_at_ms: timestamp,
            last_validated_at_ms: timestamp,
        };
        library.skills.push(skill.clone());
        skill
    };

    save_skill_library(app_data_dir.as_ref(), &library)?;

    Ok(ImportLocalSkillFolderResult {
        skill,
        skills: sorted_skills(library.skills),
        status,
    })
}

pub fn validate_skill_library_store(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    load_skill_library(app_data_dir.as_ref()).map(|_| ())
}

pub fn open_skill_folder<F>(
    app_data_dir: impl AsRef<Path>,
    request: OpenSkillFolderRequest,
    open_path: F,
) -> Result<OpenSkillFolderResult, AppError>
where
    F: FnOnce(&Path) -> Result<(), String>,
{
    let library = load_skill_library(app_data_dir.as_ref())?;
    let skill = find_library_skill(&library.skills, &request.skill_id)?.clone();
    let source_path = canonicalize_existing_skill_directory(&skill.source_path)?;

    open_path(&source_path).map_err(|error| {
        AppError::recoverable_error(
            "skill.folder.openFailed",
            "无法打开技能文件夹。",
            "技能仍保留在库中；请检查系统文件管理器是否可用，或手动打开该路径。",
            Some(format!("{}: {}", source_path.display(), error)),
        )
    })?;

    Ok(OpenSkillFolderResult {
        skill_id: skill.skill_id,
        path: source_path.to_string_lossy().into_owned(),
        opened: true,
    })
}

pub fn delete_skill(
    app_data_dir: impl AsRef<Path>,
    request: DeleteSkillRequest,
) -> Result<DeleteSkillResult, AppError> {
    let mut library = load_skill_library(app_data_dir.as_ref())?;
    let index = library
        .skills
        .iter()
        .position(|skill| skill.skill_id == request.skill_id)
        .ok_or_else(|| skill_not_found_error(&request.skill_id))?;
    let removed = library.skills.remove(index);
    let workspace_skills = if let Some(workspace_root) = request.workspace_root {
        let workspace_root = canonicalize_existing_directory(workspace_root)?;
        remove_workspace_link_if_present(&workspace_root, &removed.skill_id)?
    } else {
        Vec::new()
    };

    save_skill_library(app_data_dir.as_ref(), &library)?;

    Ok(DeleteSkillResult {
        removed_skill_id: removed.skill_id,
        skills: sorted_skills(library.skills),
        workspace_skills,
    })
}

pub fn list_workspace_skill_links(
    request: ListWorkspaceSkillLinksRequest,
) -> Result<ListWorkspaceSkillLinksResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let links = load_workspace_skill_links(&workspace_root)?;

    Ok(ListWorkspaceSkillLinksResult {
        skills: sorted_workspace_links(links.skills),
    })
}

pub fn link_workspace_skill(
    app_data_dir: impl AsRef<Path>,
    request: LinkWorkspaceSkillRequest,
) -> Result<LinkWorkspaceSkillResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let library = load_skill_library(app_data_dir.as_ref())?;
    let library_skill = find_library_skill(&library.skills, &request.skill_id)?.clone();

    let canonical_skill_path = canonicalize_existing_skill_directory(&library_skill.source_path)?;
    let mut links = load_workspace_skill_links(&workspace_root)?;
    let timestamp = now_ms();
    let artifact = ensure_workspace_link_artifact(&workspace_root, &library_skill)?;
    let mut status = WorkspaceSkillLinkStatus::Linked;
    let link = if let Some(existing) = links
        .skills
        .iter_mut()
        .find(|link| link.skill_id == library_skill.skill_id)
    {
        existing.name = library_skill.name.clone();
        existing.description = library_skill.description.clone();
        existing.source_path = canonical_skill_path.to_string_lossy().into_owned();
        existing.manifest_path = library_skill.manifest_path.clone();
        existing.link_path = artifact.path.to_string_lossy().into_owned();
        existing.link_mode = artifact.mode;
        existing.unavailable_reason = artifact.unavailable_reason;
        existing.updated_at_ms = timestamp.max(existing.updated_at_ms + 1);
        status = WorkspaceSkillLinkStatus::UpdatedExisting;
        existing.clone()
    } else {
        let link = WorkspaceSkillLinkEntry {
            schema_version: WORKSPACE_SKILL_LINK_SCHEMA_VERSION,
            skill_id: library_skill.skill_id.clone(),
            name: library_skill.name.clone(),
            description: library_skill.description.clone(),
            source_path: canonical_skill_path.to_string_lossy().into_owned(),
            manifest_path: library_skill.manifest_path.clone(),
            link_path: artifact.path.to_string_lossy().into_owned(),
            link_mode: artifact.mode,
            unavailable_reason: artifact.unavailable_reason,
            linked_at_ms: timestamp,
            updated_at_ms: timestamp,
        };
        links.skills.push(link.clone());
        link
    };

    save_workspace_skill_links(&workspace_root, &links)?;

    Ok(LinkWorkspaceSkillResult {
        skill: link,
        skills: sorted_workspace_links(links.skills),
        status,
    })
}

pub fn unlink_workspace_skill(
    request: UnlinkWorkspaceSkillRequest,
) -> Result<UnlinkWorkspaceSkillResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let (removed_skill_id, skills) =
        remove_workspace_link_required(&workspace_root, &request.skill_id)?;

    Ok(UnlinkWorkspaceSkillResult {
        removed_skill_id,
        skills,
    })
}

pub fn validate_workspace_skill_link_store(
    workspace_root: impl AsRef<Path>,
) -> Result<(), AppError> {
    load_workspace_skill_links(workspace_root.as_ref()).map(|_| ())
}

fn canonicalize_existing_skill_directory(
    path: impl AsRef<Path>,
) -> Result<std::path::PathBuf, AppError> {
    let path = path.as_ref();

    if !path.exists() {
        return Err(AppError::recoverable_error(
            "skill.path.notFound",
            "选择的技能文件夹不存在。",
            "请选择一个存在的本地技能文件夹后重试。",
            Some(path.display().to_string()),
        ));
    }

    let metadata = path.metadata().map_err(|error| {
        AppError::recoverable_error(
            "skill.path.metadataFailed",
            "无法读取技能文件夹信息。",
            "请检查目录权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    if !metadata.is_dir() {
        return Err(AppError::recoverable_error(
            "skill.path.notDirectory",
            "选择的技能路径不是文件夹。",
            "请选择一个本地技能文件夹。",
            Some(path.display().to_string()),
        ));
    }

    fs::read_dir(path).map_err(|error| {
        AppError::recoverable_error(
            "skill.path.unreadable",
            "无法读取技能文件夹内容。",
            "请检查目录权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    path.canonicalize().map_err(|error| {
        AppError::recoverable_error(
            "skill.path.canonicalizeFailed",
            "无法解析技能文件夹真实路径。",
            "请检查目录权限或符号链接目标后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })
}

fn find_library_skill<'a>(
    skills: &'a [SkillLibraryEntry],
    skill_id: &str,
) -> Result<&'a SkillLibraryEntry, AppError> {
    skills
        .iter()
        .find(|skill| skill.skill_id == skill_id)
        .ok_or_else(|| skill_not_found_error(skill_id))
}

fn skill_not_found_error(skill_id: &str) -> AppError {
    AppError::recoverable_error(
        "skill.library.notFound",
        "技能库中找不到该技能。",
        "请刷新技能库后重新选择技能。",
        Some(skill_id.to_owned()),
    )
}

fn remove_workspace_link_required(
    workspace_root: &Path,
    skill_id: &str,
) -> Result<(String, Vec<WorkspaceSkillLinkEntry>), AppError> {
    let mut links = load_workspace_skill_links(workspace_root)?;
    let index = links
        .skills
        .iter()
        .position(|link| link.skill_id == skill_id)
        .ok_or_else(|| {
            AppError::recoverable_error(
                "skill.workspaceLink.notFound",
                "当前工作区未关联该技能。",
                "请刷新当前工作区技能列表后重试。",
                Some(skill_id.to_owned()),
            )
        })?;
    let removed = links.skills.remove(index);

    remove_workspace_link_artifact(&removed)?;
    save_workspace_skill_links(workspace_root, &links)?;

    Ok((removed.skill_id, sorted_workspace_links(links.skills)))
}

fn remove_workspace_link_if_present(
    workspace_root: &Path,
    skill_id: &str,
) -> Result<Vec<WorkspaceSkillLinkEntry>, AppError> {
    let mut links = load_workspace_skill_links(workspace_root)?;
    let Some(index) = links
        .skills
        .iter()
        .position(|link| link.skill_id == skill_id)
    else {
        return Ok(sorted_workspace_links(links.skills));
    };
    let removed = links.skills.remove(index);

    remove_workspace_link_artifact(&removed)?;
    save_workspace_skill_links(workspace_root, &links)?;

    Ok(sorted_workspace_links(links.skills))
}

struct WorkspaceLinkArtifact {
    path: PathBuf,
    mode: WorkspaceSkillLinkMode,
    unavailable_reason: Option<String>,
}

fn ensure_workspace_link_artifact(
    workspace_root: &Path,
    skill: &SkillLibraryEntry,
) -> Result<WorkspaceLinkArtifact, AppError> {
    let links_dir = workspace_skill_links_dir(workspace_root);
    fs::create_dir_all(&links_dir).map_err(|error| {
        AppError::recoverable_error(
            "skill.workspaceLink.createDirFailed",
            "无法创建工作区技能目录。",
            "技能未关联；请检查工作区权限后重试。",
            Some(format!("{}: {}", links_dir.display(), error)),
        )
    })?;

    let link_path = links_dir.join(workspace_skill_link_name(&skill.skill_id, &skill.name));
    let source_path = PathBuf::from(&skill.source_path);

    if let Ok(metadata) = fs::symlink_metadata(&link_path) {
        if metadata.file_type().is_symlink() {
            fs::remove_file(&link_path).map_err(|error| {
                AppError::recoverable_error(
                    "skill.workspaceLink.replaceSymlinkFailed",
                    "无法更新已有技能链接。",
                    "技能未关联；请检查 .orchlet/skills 中的链接权限后重试。",
                    Some(format!("{}: {}", link_path.display(), error)),
                )
            })?;
        } else {
            let reason = format!("目标链接路径已存在且不是 symlink：{}", link_path.display());
            return Ok(manifest_artifact(link_path, reason));
        }
    }

    match create_directory_symlink(&source_path, &link_path) {
        Ok(()) => Ok(WorkspaceLinkArtifact {
            path: link_path,
            mode: WorkspaceSkillLinkMode::Symlink,
            unavailable_reason: None,
        }),
        Err(error) => Ok(manifest_artifact(link_path, error)),
    }
}

fn manifest_artifact(link_path: PathBuf, reason: String) -> WorkspaceLinkArtifact {
    WorkspaceLinkArtifact {
        path: link_path,
        mode: WorkspaceSkillLinkMode::Manifest,
        unavailable_reason: Some(reason),
    }
}

fn remove_workspace_link_artifact(link: &WorkspaceSkillLinkEntry) -> Result<(), AppError> {
    let link_path = PathBuf::from(&link.link_path);
    match fs::symlink_metadata(&link_path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            fs::remove_file(&link_path).map_err(|error| {
                AppError::recoverable_error(
                    "skill.workspaceLink.removeSymlinkFailed",
                    "无法移除工作区技能链接。",
                    "技能链接未移除；请检查 .orchlet/skills 中的链接权限后重试。",
                    Some(format!("{}: {}", link_path.display(), error)),
                )
            })
        }
        Ok(_) if link.link_mode != WorkspaceSkillLinkMode::Symlink => Ok(()),
        Ok(_) => Err(AppError::recoverable_error(
            "skill.workspaceLink.removeUnsafePath",
            "技能链接路径不是 symlink，已拒绝删除。",
            "请手动检查 .orchlet/skills 后重试，避免误删真实文件夹。",
            Some(link_path.display().to_string()),
        )),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(AppError::recoverable_error(
            "skill.workspaceLink.inspectSymlinkFailed",
            "无法检查工作区技能链接。",
            "技能链接未移除；请检查 .orchlet/skills 权限后重试。",
            Some(format!("{}: {}", link_path.display(), error)),
        )),
    }
}

#[cfg(unix)]
fn create_directory_symlink(source_path: &Path, link_path: &Path) -> Result<(), String> {
    std::os::unix::fs::symlink(source_path, link_path).map_err(|error| {
        format!(
            "无法创建 symlink：{} -> {}: {}",
            link_path.display(),
            source_path.display(),
            error
        )
    })
}

#[cfg(windows)]
fn create_directory_symlink(source_path: &Path, link_path: &Path) -> Result<(), String> {
    std::os::windows::fs::symlink_dir(source_path, link_path).map_err(|error| {
        format!(
            "无法创建目录 symlink：{} -> {}: {}",
            link_path.display(),
            source_path.display(),
            error
        )
    })
}

fn sorted_skills(mut skills: Vec<SkillLibraryEntry>) -> Vec<SkillLibraryEntry> {
    skills.sort_by(|left, right| {
        right
            .updated_at_ms
            .cmp(&left.updated_at_ms)
            .then_with(|| left.name.cmp(&right.name))
            .then_with(|| left.source_path.cmp(&right.source_path))
    });
    skills
}

fn sorted_workspace_links(
    mut skills: Vec<WorkspaceSkillLinkEntry>,
) -> Vec<WorkspaceSkillLinkEntry> {
    skills.sort_by(|left, right| {
        right
            .updated_at_ms
            .cmp(&left.updated_at_ms)
            .then_with(|| left.name.cmp(&right.name))
            .then_with(|| left.skill_id.cmp(&right.skill_id))
    });
    skills
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        delete_skill, import_local_skill_folder, link_workspace_skill, list_skill_library,
        list_workspace_skill_links, open_skill_folder, unlink_workspace_skill,
    };
    use crate::contracts::{
        DeleteSkillRequest, ImportLocalSkillFolderRequest, LinkWorkspaceSkillRequest,
        ListWorkspaceSkillLinksRequest, OpenSkillFolderRequest, SkillImportStatus,
        UnlinkWorkspaceSkillRequest, WorkspaceSkillLinkMode, WorkspaceSkillLinkStatus,
    };
    use crate::domain::skill::workspace_skill_link_name;
    use crate::infrastructure::persistence::json_store::skill_library_store::SkillLibraryDocument;
    use crate::infrastructure::persistence::json_store::workspace_skill_link_store::{
        save_workspace_skill_links, WorkspaceSkillLinksDocument,
    };

    #[test]
    fn imports_valid_local_skill_folder() {
        let app_data = tempdir().expect("app data");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Local Review\ndescription: Review helper\n---\n# Local Review",
        )
        .expect("skill manifest");

        let result = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import result");

        assert_eq!(result.status, SkillImportStatus::Imported);
        assert_eq!(result.skill.name, "Local Review");
        assert_eq!(result.skills.len(), 1);
        assert!(result.skill.manifest_path.ends_with("SKILL.md"));
    }

    #[test]
    fn rejects_invalid_folder_without_creating_record() {
        let app_data = tempdir().expect("app data");
        let skill = tempdir().expect("skill");

        let error = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect_err("missing manifest should fail");

        assert_eq!(error.code, "skill.manifest.missing");
        assert!(list_skill_library(app_data.path())
            .expect("library")
            .skills
            .is_empty());
    }

    #[test]
    fn duplicate_import_updates_existing_skill_record() {
        let app_data = tempdir().expect("app data");
        let skill = tempdir().expect("skill");
        let manifest = skill.path().join("SKILL.md");
        fs::write(&manifest, "---\nname: First Name\n---\n# First").expect("manifest");

        let first = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("first import");
        fs::write(&manifest, "---\nname: Updated Name\n---\n# Updated").expect("manifest update");

        let second = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("second import");

        assert_eq!(second.status, SkillImportStatus::UpdatedExisting);
        assert_eq!(second.skill.skill_id, first.skill.skill_id);
        assert_eq!(second.skill.name, "Updated Name");
        assert_eq!(second.skills.len(), 1);
        assert!(second.skill.updated_at_ms > first.skill.updated_at_ms);
    }

    #[test]
    fn persisted_library_lists_imported_skills() {
        let app_data = tempdir().expect("app data");
        let skill = tempdir().expect("skill");
        fs::write(skill.path().join("SKILL.md"), "# Skill").expect("manifest");

        import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import");

        let listed = list_skill_library(app_data.path()).expect("list");
        assert_eq!(listed.skills.len(), 1);
        assert_eq!(
            listed.skills[0].name,
            skill
                .path()
                .file_name()
                .unwrap()
                .to_string_lossy()
                .to_string()
        );
    }

    #[test]
    fn validates_persisted_skill_library_document() {
        let app_data = tempdir().expect("app data");
        let document = SkillLibraryDocument::default();

        crate::infrastructure::persistence::json_store::skill_library_store::save_skill_library(
            app_data.path(),
            &document,
        )
        .expect("save");

        assert!(list_skill_library(app_data.path())
            .expect("list")
            .skills
            .is_empty());
    }

    #[test]
    fn links_and_unlinks_workspace_skill_without_removing_library_record() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Linkable Skill\n---\n# Skill",
        )
        .expect("manifest");
        let imported = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import");

        let linked = link_workspace_skill(
            app_data.path(),
            LinkWorkspaceSkillRequest {
                workspace_root: workspace.path().to_string_lossy().into_owned(),
                skill_id: imported.skill.skill_id.clone(),
            },
        )
        .expect("link");

        assert_eq!(linked.status, WorkspaceSkillLinkStatus::Linked);
        assert_eq!(linked.skills.len(), 1);
        assert_eq!(linked.skill.name, "Linkable Skill");
        assert!(matches!(
            linked.skill.link_mode,
            WorkspaceSkillLinkMode::Symlink | WorkspaceSkillLinkMode::Manifest
        ));

        let listed = list_workspace_skill_links(ListWorkspaceSkillLinksRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("list links");
        assert_eq!(listed.skills.len(), 1);

        let unlinked = unlink_workspace_skill(UnlinkWorkspaceSkillRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            skill_id: imported.skill.skill_id.clone(),
        })
        .expect("unlink");

        assert_eq!(unlinked.removed_skill_id, imported.skill.skill_id);
        assert!(unlinked.skills.is_empty());
        assert_eq!(
            list_skill_library(app_data.path())
                .expect("library")
                .skills
                .len(),
            1
        );
    }

    #[test]
    fn link_falls_back_to_manifest_when_symlink_path_is_unavailable() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Fallback Skill\n---\n# Skill",
        )
        .expect("manifest");
        let imported = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import");
        let links_dir = workspace.path().join(".orchlet/skills");
        fs::create_dir_all(&links_dir).expect("links dir");
        fs::create_dir(links_dir.join(workspace_skill_link_name(
            &imported.skill.skill_id,
            &imported.skill.name,
        )))
        .expect("conflicting non-symlink path");

        let linked = link_workspace_skill(
            app_data.path(),
            LinkWorkspaceSkillRequest {
                workspace_root: workspace.path().to_string_lossy().into_owned(),
                skill_id: imported.skill.skill_id,
            },
        )
        .expect("link fallback");

        assert_eq!(linked.skill.link_mode, WorkspaceSkillLinkMode::Manifest);
        assert!(linked.skill.unavailable_reason.is_some());
    }

    #[test]
    fn duplicate_workspace_link_updates_existing_record() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: First Link\n---\n# Skill",
        )
        .expect("manifest");
        let imported = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import");

        let first = link_workspace_skill(
            app_data.path(),
            LinkWorkspaceSkillRequest {
                workspace_root: workspace.path().to_string_lossy().into_owned(),
                skill_id: imported.skill.skill_id.clone(),
            },
        )
        .expect("first link");
        let second = link_workspace_skill(
            app_data.path(),
            LinkWorkspaceSkillRequest {
                workspace_root: workspace.path().to_string_lossy().into_owned(),
                skill_id: imported.skill.skill_id,
            },
        )
        .expect("second link");

        assert_eq!(second.status, WorkspaceSkillLinkStatus::UpdatedExisting);
        assert_eq!(second.skills.len(), 1);
        assert_eq!(second.skill.skill_id, first.skill.skill_id);
        assert!(second.skill.updated_at_ms > first.skill.updated_at_ms);
    }

    #[test]
    fn workspace_link_store_rejects_duplicate_records() {
        let workspace = tempdir().expect("workspace");
        let link = crate::contracts::WorkspaceSkillLinkEntry {
            schema_version: crate::domain::skill::WORKSPACE_SKILL_LINK_SCHEMA_VERSION,
            skill_id: "01K00000000000000000000000".to_owned(),
            name: "Duplicate Skill".to_owned(),
            description: None,
            source_path: "/fixtures/skills/duplicate".to_owned(),
            manifest_path: "/fixtures/skills/duplicate/SKILL.md".to_owned(),
            link_path: "/fixtures/workspaces/alpha/.orchlet/skills/duplicate".to_owned(),
            link_mode: WorkspaceSkillLinkMode::Manifest,
            unavailable_reason: Some("fixture fallback".to_owned()),
            linked_at_ms: 1_760_000_020_000,
            updated_at_ms: 1_760_000_020_000,
        };
        let document = WorkspaceSkillLinksDocument {
            schema_version: 1,
            skills: vec![link.clone(), link],
        };

        let error =
            save_workspace_skill_links(workspace.path(), &document).expect_err("duplicate link");

        assert_eq!(error.code, "skill.workspaceLinks.duplicateSkillId");
    }

    #[test]
    fn opens_skill_folder_with_adapter() {
        let app_data = tempdir().expect("app data");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Openable Skill\n---\n# Skill",
        )
        .expect("manifest");
        let imported = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import");

        let result = open_skill_folder(
            app_data.path(),
            OpenSkillFolderRequest {
                skill_id: imported.skill.skill_id.clone(),
            },
            |path| {
                assert_eq!(
                    path,
                    skill.path().canonicalize().expect("canonical").as_path()
                );
                Ok(())
            },
        )
        .expect("open");

        assert_eq!(result.skill_id, imported.skill.skill_id);
        assert!(result.opened);
    }

    #[test]
    fn deleting_skill_preserves_source_folder_and_removes_current_workspace_link() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        let manifest_path = skill.path().join("SKILL.md");
        fs::write(&manifest_path, "---\nname: Delete Me\n---\n# Skill").expect("manifest");
        let imported = import_local_skill_folder(
            app_data.path(),
            ImportLocalSkillFolderRequest {
                path: skill.path().to_string_lossy().into_owned(),
            },
        )
        .expect("import");
        link_workspace_skill(
            app_data.path(),
            LinkWorkspaceSkillRequest {
                workspace_root: workspace.path().to_string_lossy().into_owned(),
                skill_id: imported.skill.skill_id.clone(),
            },
        )
        .expect("link");

        let result = delete_skill(
            app_data.path(),
            DeleteSkillRequest {
                skill_id: imported.skill.skill_id.clone(),
                workspace_root: Some(workspace.path().to_string_lossy().into_owned()),
            },
        )
        .expect("delete");

        assert_eq!(result.removed_skill_id, imported.skill.skill_id);
        assert!(result.skills.is_empty());
        assert!(result.workspace_skills.is_empty());
        assert!(manifest_path.exists());
        assert!(list_skill_library(app_data.path())
            .expect("library")
            .skills
            .is_empty());
        assert!(list_workspace_skill_links(ListWorkspaceSkillLinksRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("links")
        .skills
        .is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn unlinking_legacy_golutra_workspace_skill_removes_symlink_and_writes_current_store() {
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Legacy Review\n---\n# Legacy Review",
        )
        .expect("manifest");
        let legacy_dir = workspace.path().join(".golutra/skills");
        fs::create_dir_all(&legacy_dir).expect("legacy skills dir");
        let legacy_link = legacy_dir.join("legacy-review");
        std::os::unix::fs::symlink(skill.path(), &legacy_link).expect("legacy symlink");

        let listed = list_workspace_skill_links(ListWorkspaceSkillLinksRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("legacy links");
        assert_eq!(listed.skills.len(), 1);
        assert_eq!(listed.skills[0].name, "legacy-review");
        assert!(legacy_link.exists());

        let unlinked = unlink_workspace_skill(UnlinkWorkspaceSkillRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            skill_id: listed.skills[0].skill_id.clone(),
        })
        .expect("unlink legacy");

        assert_eq!(unlinked.removed_skill_id, listed.skills[0].skill_id);
        assert!(unlinked.skills.is_empty());
        assert!(!legacy_link.exists());
        assert!(workspace
            .path()
            .join(".orchlet/skills/skill-links.json")
            .exists());
    }

    #[cfg(unix)]
    #[test]
    fn unlinking_broken_legacy_golutra_workspace_skill_removes_stale_symlink() {
        let workspace = tempdir().expect("workspace");
        let legacy_dir = workspace.path().join(".golutra/skills");
        fs::create_dir_all(&legacy_dir).expect("legacy skills dir");
        let missing_target = workspace.path().join("missing-skill");
        let legacy_link = legacy_dir.join("missing-review");
        std::os::unix::fs::symlink(&missing_target, &legacy_link).expect("legacy symlink");

        let listed = list_workspace_skill_links(ListWorkspaceSkillLinksRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("legacy links");
        assert_eq!(listed.skills.len(), 1);
        assert_eq!(listed.skills[0].link_mode, WorkspaceSkillLinkMode::Manifest);
        assert!(fs::symlink_metadata(&legacy_link).is_ok());

        unlink_workspace_skill(UnlinkWorkspaceSkillRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            skill_id: listed.skills[0].skill_id.clone(),
        })
        .expect("unlink broken legacy");

        assert!(fs::symlink_metadata(&legacy_link).is_err());
        assert!(workspace
            .path()
            .join(".orchlet/skills/skill-links.json")
            .exists());
    }
}
