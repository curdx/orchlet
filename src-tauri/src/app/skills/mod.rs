use std::{fs, path::Path};

use ulid::Ulid;

use crate::{
    contracts::{
        AppError, ImportLocalSkillFolderRequest, ImportLocalSkillFolderResult, SkillImportStatus,
        SkillLibraryEntry, SkillLibraryListResult, SkillSource,
    },
    domain::skill::{
        parse_local_skill_metadata, skill_name_from_path, SKILL_MANIFEST_FILE_NAME,
        SKILL_RECORD_SCHEMA_VERSION,
    },
    infrastructure::persistence::{
        json_store::skill_library_store::{load_skill_library, save_skill_library},
        json_store::workspace_registry_store::now_ms,
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

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{import_local_skill_folder, list_skill_library};
    use crate::contracts::{ImportLocalSkillFolderRequest, SkillImportStatus};
    use crate::infrastructure::persistence::json_store::skill_library_store::SkillLibraryDocument;

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
}
