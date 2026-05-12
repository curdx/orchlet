use std::{
    ffi::OsStr,
    fs,
    path::{Component, Path, PathBuf},
};

use ulid::Ulid;

use crate::{
    contracts::{AppError, ProfileAvatarKind, ProfileSettingsSnapshot, ProfileStatus},
    domain::settings::{
        avatar_content_type_for_extension, default_profile_timezone, placeholder_avatar_snapshot,
        validate_profile_avatar_source_path, validate_profile_settings, AVATAR_LIBRARY_DIR_NAME,
        AVATAR_UPLOADS_DIR_NAME, DEFAULT_PROFILE_DISPLAY_NAME, PROFILE_SETTINGS_DIR_NAME,
        PROFILE_SETTINGS_FILE_NAME, PROFILE_SETTINGS_SCHEMA_VERSION,
    },
    infrastructure::persistence::json_store::workspace_registry_store::now_ms,
};

pub const PROFILE_SETTINGS_STORE_SCHEMA_VERSION: u32 = 1;

pub fn profile_settings_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PROFILE_SETTINGS_DIR_NAME)
}

pub fn profile_settings_path(app_data_dir: &Path) -> PathBuf {
    profile_settings_dir(app_data_dir).join(PROFILE_SETTINGS_FILE_NAME)
}

pub fn avatar_library_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(AVATAR_LIBRARY_DIR_NAME)
}

pub fn avatar_uploads_dir(app_data_dir: &Path) -> PathBuf {
    avatar_library_dir(app_data_dir).join(AVATAR_UPLOADS_DIR_NAME)
}

pub fn default_profile_settings() -> ProfileSettingsSnapshot {
    let timestamp = now_ms();

    ProfileSettingsSnapshot {
        schema_version: PROFILE_SETTINGS_SCHEMA_VERSION,
        display_name: DEFAULT_PROFILE_DISPLAY_NAME.to_owned(),
        timezone: default_profile_timezone(),
        status: ProfileStatus::Online,
        status_message: None,
        avatar: Some(placeholder_avatar_snapshot(timestamp)),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    }
}

pub fn load_profile_settings(app_data_dir: &Path) -> Result<ProfileSettingsSnapshot, AppError> {
    let path = profile_settings_path(app_data_dir);

    if !path.exists() {
        return Ok(default_profile_settings());
    }

    let raw = fs::read_to_string(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.readFailed",
            "无法读取个人资料设置。",
            "个人资料未更新；请检查 settings/profile.json 权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.invalidJson",
            "个人资料设置不是有效 JSON。",
            "请先备份或修复 settings/profile.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;
    let mut profile: ProfileSettingsSnapshot = serde_json::from_value(value).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.invalidFields",
            format!("个人资料设置字段无效：{}。", error),
            "请先备份或修复 settings/profile.json 后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )
    })?;

    hydrate_profile_avatar_default(&mut profile);
    validate_profile_settings(&profile)?;
    hydrate_profile_avatar_preview(app_data_dir, &mut profile)?;

    Ok(profile)
}

pub fn save_profile_settings(
    app_data_dir: &Path,
    profile: &ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    validate_profile_settings(profile)?;
    validate_uploaded_profile_avatar_asset(app_data_dir, profile)?;

    let path = profile_settings_path(app_data_dir);
    let dir = path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.profile.invalidPath",
            "无法定位个人资料设置目录。",
            "个人资料未更新；请检查应用数据目录后重试。",
            Some(path.display().to_string()),
        )
    })?;

    fs::create_dir_all(dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.createDirFailed",
            "无法创建个人资料设置目录。",
            "个人资料未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", dir.display(), error)),
        )
    })?;

    write_profile_settings_atomic(&path, profile)
}

pub fn validate_profile_settings_store(app_data_dir: &Path) -> Result<(), AppError> {
    load_profile_settings(app_data_dir).map(|_| ())
}

pub fn copy_uploaded_profile_avatar(
    app_data_dir: &Path,
    source_path: &Path,
) -> Result<(String, String, String, u64, String, Option<String>), AppError> {
    let metadata = fs::metadata(source_path).map_err(|error| {
        AppError::recoverable_error(
            "settings.avatar.readMetadataFailed",
            "无法读取头像图片。",
            "头像未更新；请检查图片文件权限后重试。",
            Some(format!("{}: {}", source_path.display(), error)),
        )
    })?;

    if !metadata.is_file() {
        return Err(AppError::recoverable_error(
            "settings.avatar.notAFile",
            "头像来源不是文件。",
            "请选择 PNG、JPG、WEBP 或 GIF 图片文件后重试。",
            Some(format!("field=avatar; path={}", source_path.display())),
        ));
    }

    validate_profile_avatar_source_path(source_path, metadata.len())?;

    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let normalized_extension = if extension == "jpeg" {
        "jpg"
    } else {
        &extension
    };
    let content_type = avatar_content_type_for_extension(normalized_extension)?;
    let upload_id = Ulid::new().to_string();
    let file_name = format!("{}.{}", upload_id, normalized_extension);
    let uploads_dir = avatar_uploads_dir(app_data_dir);
    let target_path = uploads_dir.join(&file_name);

    fs::create_dir_all(&uploads_dir).map_err(|error| {
        AppError::recoverable_error(
            "settings.avatar.createDirFailed",
            "无法创建头像库目录。",
            "头像未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", uploads_dir.display(), error)),
        )
    })?;
    fs::copy(source_path, &target_path).map_err(|error| {
        AppError::recoverable_error(
            "settings.avatar.copyFailed",
            "无法复制头像图片。",
            "头像未更新；请检查图片和应用数据目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                source_path.display(),
                target_path.display(),
                error
            )),
        )
    })?;

    let bytes = fs::read(&target_path).map_err(|error| {
        AppError::recoverable_error(
            "settings.avatar.previewReadFailed",
            "头像已保存但无法生成预览。",
            "请重试；如果问题持续，请重新选择头像图片。",
            Some(format!("{}: {}", target_path.display(), error)),
        )
    })?;
    let preview_data_url = Some(data_url(&content_type, &bytes));
    let source_file_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("avatar")
        .to_owned();
    let library_relative_path = format!(
        "{}/{}/{}",
        AVATAR_LIBRARY_DIR_NAME, AVATAR_UPLOADS_DIR_NAME, file_name
    );

    Ok((
        upload_id,
        source_file_name,
        content_type,
        metadata.len(),
        library_relative_path,
        preview_data_url,
    ))
}

pub fn delete_current_uploaded_profile_avatar(
    app_data_dir: &Path,
    profile: &ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    let Some(avatar) = &profile.avatar else {
        return Ok(());
    };

    if avatar.kind != ProfileAvatarKind::Uploaded {
        return Ok(());
    }

    let Some(relative_path) = avatar.library_relative_path.as_deref() else {
        return Ok(());
    };
    let path = uploaded_avatar_absolute_path(app_data_dir, relative_path)?;

    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(AppError::recoverable_error(
            "settings.avatar.deleteFailed",
            "无法删除上传头像。",
            "头像已保留；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", path.display(), error)),
        )),
    }
}

pub fn validate_avatar_library_store(app_data_dir: &Path) -> Result<(), AppError> {
    let profile = load_profile_settings(app_data_dir)?;
    validate_uploaded_profile_avatar_asset(app_data_dir, &profile)
}

fn write_profile_settings_atomic(
    path: &Path,
    profile: &ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(profile).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.serializeFailed",
            "无法序列化个人资料设置。",
            "个人资料未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        PROFILE_SETTINGS_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "settings.profile.writeFailed",
            "无法写入个人资料设置。",
            "个人资料未更新；请检查应用数据目录权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "settings.profile.renameFailed",
            "无法完成个人资料设置写入。",
            "个人资料未更新；请检查应用数据目录权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}

fn hydrate_profile_avatar_default(profile: &mut ProfileSettingsSnapshot) {
    if profile.avatar.is_none() {
        profile.avatar = Some(placeholder_avatar_snapshot(profile.updated_at_ms));
    }
}

fn hydrate_profile_avatar_preview(
    app_data_dir: &Path,
    profile: &mut ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    let Some(avatar) = &mut profile.avatar else {
        return Ok(());
    };

    if avatar.kind != ProfileAvatarKind::Uploaded {
        avatar.preview_data_url = None;
        return Ok(());
    }

    let relative_path = avatar.library_relative_path.as_deref().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.avatar.missingPath",
            "上传头像缺少资产路径。",
            "请重新上传头像后重试。",
            Some("field=avatar".to_owned()),
        )
    })?;
    let path = uploaded_avatar_absolute_path(app_data_dir, relative_path)?;
    let bytes = fs::read(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.avatar.assetMissing",
            "无法读取已保存的上传头像。",
            "请重新上传头像，或重置为默认头像。",
            Some(format!("field=avatar; {}: {}", path.display(), error)),
        )
    })?;
    let content_type = avatar
        .content_type
        .as_deref()
        .unwrap_or("application/octet-stream");

    avatar.preview_data_url = Some(data_url(content_type, &bytes));

    Ok(())
}

fn validate_uploaded_profile_avatar_asset(
    app_data_dir: &Path,
    profile: &ProfileSettingsSnapshot,
) -> Result<(), AppError> {
    let Some(avatar) = &profile.avatar else {
        return Ok(());
    };

    if avatar.kind != ProfileAvatarKind::Uploaded {
        return Ok(());
    }

    let relative_path = avatar.library_relative_path.as_deref().ok_or_else(|| {
        AppError::recoverable_error(
            "settings.avatar.missingPath",
            "上传头像缺少资产路径。",
            "请重新上传头像后重试。",
            Some("field=avatar".to_owned()),
        )
    })?;
    let path = uploaded_avatar_absolute_path(app_data_dir, relative_path)?;
    let metadata = fs::metadata(&path).map_err(|error| {
        AppError::recoverable_error(
            "settings.avatar.assetMissing",
            "上传头像资产不存在。",
            "请重新上传头像，或重置为默认头像。",
            Some(format!("field=avatar; {}: {}", path.display(), error)),
        )
    })?;

    validate_profile_avatar_source_path(&path, metadata.len())
}

fn uploaded_avatar_absolute_path(
    app_data_dir: &Path,
    relative_path: &str,
) -> Result<PathBuf, AppError> {
    let path = Path::new(relative_path);
    let mut components = path.components();

    if components.next() != Some(Component::Normal(OsStr::new(AVATAR_LIBRARY_DIR_NAME)))
        || components.next() != Some(Component::Normal(OsStr::new(AVATAR_UPLOADS_DIR_NAME)))
        || components.next().is_none()
        || components.any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(AppError::recoverable_error(
            "settings.avatar.invalidPath",
            "上传头像资产路径无效。",
            "请重新上传头像后重试。",
            Some(format!("field=avatar; path={}", relative_path)),
        ));
    }

    Ok(app_data_dir.join(path))
}

fn data_url(content_type: &str, bytes: &[u8]) -> String {
    format!("data:{};base64,{}", content_type, base64_encode(bytes))
}

fn base64_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let first = chunk[0];
        let second = *chunk.get(1).unwrap_or(&0);
        let third = *chunk.get(2).unwrap_or(&0);
        let triple = ((first as u32) << 16) | ((second as u32) << 8) | third as u32;

        encoded.push(TABLE[((triple >> 18) & 0x3f) as usize] as char);
        encoded.push(TABLE[((triple >> 12) & 0x3f) as usize] as char);

        if chunk.len() > 1 {
            encoded.push(TABLE[((triple >> 6) & 0x3f) as usize] as char);
        } else {
            encoded.push('=');
        }

        if chunk.len() > 2 {
            encoded.push(TABLE[(triple & 0x3f) as usize] as char);
        } else {
            encoded.push('=');
        }
    }

    encoded
}
