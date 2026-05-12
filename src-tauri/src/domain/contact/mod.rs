use ulid::Ulid;

use crate::contracts::AppError;

pub const CONTACT_SCHEMA_VERSION: u32 = 1;
pub const CONTACT_MAX_DISPLAY_NAME_LEN: usize = 80;
pub const CONTACT_MAX_TEXT_FIELD_LEN: usize = 500;

pub fn validate_contact_id(contact_id: &str) -> Result<(), AppError> {
    if contact_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "contact.invalidId",
            "联系人标识无效。",
            "请刷新联系人列表后重试。",
            Some(format!("contactId must be a ULID string: {}", contact_id)),
        ));
    }

    Ok(())
}

pub fn normalize_contact_display_name(display_name: &str) -> Result<String, AppError> {
    let normalized = display_name.trim().to_owned();

    if normalized.is_empty() {
        return Err(AppError::recoverable_error(
            "contact.displayName.empty",
            "联系人显示名称不能为空。",
            "请输入联系人名称后重试。",
            None,
        ));
    }

    if normalized.chars().count() > CONTACT_MAX_DISPLAY_NAME_LEN {
        return Err(AppError::recoverable_error(
            "contact.displayName.tooLong",
            "联系人显示名称过长。",
            "请将联系人名称控制在 80 个字符以内。",
            Some(format!("length={}", normalized.chars().count())),
        ));
    }

    Ok(normalized)
}

pub fn normalize_optional_contact_text(
    value: Option<String>,
    field: &'static str,
) -> Result<Option<String>, AppError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let normalized = value.trim().to_owned();

    if normalized.is_empty() {
        return Ok(None);
    }

    if normalized.chars().count() > CONTACT_MAX_TEXT_FIELD_LEN {
        return Err(AppError::recoverable_error(
            format!("contact.{}.tooLong", field),
            "联系人补充信息过长。",
            "请将联系人补充信息控制在 500 个字符以内。",
            Some(format!(
                "field={} length={}",
                field,
                normalized.chars().count()
            )),
        ));
    }

    Ok(Some(normalized))
}
