use std::path::Path;

use crate::contracts::AppError;

pub const SKILL_RECORD_SCHEMA_VERSION: u32 = 1;
pub const SKILL_MANIFEST_FILE_NAME: &str = "SKILL.md";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalSkillMetadata {
    pub name: String,
    pub description: Option<String>,
}

pub fn validate_skill_name(name: impl AsRef<str>) -> Result<String, AppError> {
    let name = name.as_ref().trim();

    if name.is_empty() {
        return Err(AppError::recoverable_error(
            "skill.metadata.invalidName",
            "技能名称无效。",
            "请在 SKILL.md frontmatter 中提供非空 name，或使用非空文件夹名称。",
            Some("name must not be empty".to_owned()),
        ));
    }

    Ok(name.to_owned())
}

pub fn skill_name_from_path(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("local-skill")
        .to_owned()
}

pub fn parse_local_skill_metadata(
    manifest_content: &str,
    folder_name: &str,
) -> Result<LocalSkillMetadata, AppError> {
    let frontmatter = frontmatter_block(manifest_content);
    let parsed_name = frontmatter
        .as_ref()
        .and_then(|block| frontmatter_value(block, "name"));
    let parsed_description = frontmatter
        .as_ref()
        .and_then(|block| frontmatter_value(block, "description"));
    let name = validate_skill_name(parsed_name.unwrap_or_else(|| folder_name.to_owned()))?;

    Ok(LocalSkillMetadata {
        name,
        description: parsed_description.and_then(non_empty_trimmed),
    })
}

fn frontmatter_block(content: &str) -> Option<String> {
    let normalized = content
        .strip_prefix("---\r\n")
        .or_else(|| content.strip_prefix("---\n"))?;
    let end = normalized
        .find("\n---\n")
        .or_else(|| normalized.find("\n---\r\n"))
        .or_else(|| normalized.find("\r\n---\r\n"))?;

    Some(normalized[..end].to_owned())
}

fn frontmatter_value(block: &str, key: &str) -> Option<String> {
    block.lines().find_map(|line| {
        let (left, right) = line.split_once(':')?;
        if left.trim() != key {
            return None;
        }

        non_empty_trimmed(strip_quotes(right.trim()).to_owned())
    })
}

fn strip_quotes(value: &str) -> &str {
    value
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
        .or_else(|| {
            value
                .strip_prefix('\'')
                .and_then(|value| value.strip_suffix('\''))
        })
        .unwrap_or(value)
}

fn non_empty_trimmed(value: String) -> Option<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_local_skill_metadata, skill_name_from_path};
    use std::path::Path;

    #[test]
    fn parses_frontmatter_name_and_description() {
        let metadata = parse_local_skill_metadata(
            "---\nname: Code Review\ndescription: Local review workflow\n---\n# Body",
            "fallback",
        )
        .expect("metadata");

        assert_eq!(metadata.name, "Code Review");
        assert_eq!(
            metadata.description.as_deref(),
            Some("Local review workflow")
        );
    }

    #[test]
    fn falls_back_to_folder_name_without_frontmatter() {
        let metadata = parse_local_skill_metadata("# Skill", "folder-skill").expect("metadata");

        assert_eq!(metadata.name, "folder-skill");
        assert_eq!(metadata.description, None);
    }

    #[test]
    fn derives_folder_name_from_path() {
        assert_eq!(skill_name_from_path(Path::new("/tmp/my-skill")), "my-skill");
    }
}
