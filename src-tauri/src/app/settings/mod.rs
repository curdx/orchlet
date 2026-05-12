use std::path::{Path, PathBuf};

use crate::{
    contracts::{
        AppError, DeleteUploadedProfileAvatarRequest, DeleteUploadedProfileAvatarResult,
        GetProfileSettingsRequest, GetProfileSettingsResult, ProfileSettingsSnapshot,
        ResetProfileAvatarRequest, ResetProfileAvatarResult, SelectProfileAvatarPresetRequest,
        SelectProfileAvatarPresetResult, UpdateProfileSettingsRequest, UpdateProfileSettingsResult,
        UploadProfileAvatarRequest, UploadProfileAvatarResult,
    },
    domain::settings::{
        normalize_profile_display_name, normalize_profile_status, normalize_profile_status_message,
        normalize_profile_timezone, placeholder_avatar_snapshot, preset_avatar_snapshot,
        uploaded_avatar_snapshot,
    },
    infrastructure::persistence::json_store::{
        profile_settings_store::{
            copy_uploaded_profile_avatar, delete_current_uploaded_profile_avatar,
            load_profile_settings, save_profile_settings, validate_avatar_library_store,
            validate_profile_settings_store,
        },
        workspace_registry_store::now_ms,
    },
};

pub fn get_profile_settings(
    app_data_dir: impl AsRef<Path>,
    _request: GetProfileSettingsRequest,
) -> Result<GetProfileSettingsResult, AppError> {
    Ok(GetProfileSettingsResult {
        profile: load_profile_settings(app_data_dir.as_ref())?,
    })
}

pub fn update_profile_settings(
    app_data_dir: impl AsRef<Path>,
    request: UpdateProfileSettingsRequest,
) -> Result<UpdateProfileSettingsResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;

    apply_profile_update(&mut profile, request)?;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(UpdateProfileSettingsResult { profile })
}

pub fn validate_profile_settings(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_profile_settings_store(app_data_dir.as_ref())
}

pub fn validate_profile_avatar_library(app_data_dir: impl AsRef<Path>) -> Result<(), AppError> {
    validate_avatar_library_store(app_data_dir.as_ref())
}

pub fn upload_profile_avatar(
    app_data_dir: impl AsRef<Path>,
    request: UploadProfileAvatarRequest,
) -> Result<UploadProfileAvatarResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;
    let source_path = PathBuf::from(request.source_path);
    let (upload_id, source_file_name, content_type, size_bytes, library_relative_path, preview) =
        copy_uploaded_profile_avatar(app_data_dir, &source_path)?;
    let timestamp = next_profile_timestamp(&profile);

    profile.avatar = Some(uploaded_avatar_snapshot(
        upload_id,
        source_file_name,
        content_type,
        size_bytes,
        library_relative_path,
        preview,
        timestamp,
    ));
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(UploadProfileAvatarResult { profile })
}

pub fn select_profile_avatar_preset(
    app_data_dir: impl AsRef<Path>,
    request: SelectProfileAvatarPresetRequest,
) -> Result<SelectProfileAvatarPresetResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;
    let timestamp = next_profile_timestamp(&profile);

    profile.avatar = Some(preset_avatar_snapshot(request.preset_id, timestamp)?);
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(SelectProfileAvatarPresetResult { profile })
}

pub fn reset_profile_avatar(
    app_data_dir: impl AsRef<Path>,
    _request: ResetProfileAvatarRequest,
) -> Result<ResetProfileAvatarResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;
    let timestamp = next_profile_timestamp(&profile);

    profile.avatar = Some(placeholder_avatar_snapshot(timestamp));
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(ResetProfileAvatarResult { profile })
}

pub fn delete_uploaded_profile_avatar(
    app_data_dir: impl AsRef<Path>,
    _request: DeleteUploadedProfileAvatarRequest,
) -> Result<DeleteUploadedProfileAvatarResult, AppError> {
    let app_data_dir = app_data_dir.as_ref();
    let mut profile = load_profile_settings(app_data_dir)?;

    delete_current_uploaded_profile_avatar(app_data_dir, &profile)?;

    let timestamp = next_profile_timestamp(&profile);
    profile.avatar = Some(placeholder_avatar_snapshot(timestamp));
    profile.updated_at_ms = timestamp;
    save_profile_settings(app_data_dir, &profile)?;

    Ok(DeleteUploadedProfileAvatarResult { profile })
}

fn apply_profile_update(
    profile: &mut ProfileSettingsSnapshot,
    request: UpdateProfileSettingsRequest,
) -> Result<(), AppError> {
    if let Some(display_name) = request.display_name {
        profile.display_name = normalize_profile_display_name(display_name)?;
    }

    if let Some(timezone) = request.timezone {
        profile.timezone = normalize_profile_timezone(timezone)?;
    }

    if let Some(status) = request.status {
        profile.status = normalize_profile_status(status)?;
    }

    if let Some(status_message) = request.status_message {
        profile.status_message = normalize_profile_status_message(status_message)?;
    }

    profile.updated_at_ms = next_profile_timestamp(profile);

    Ok(())
}

fn next_profile_timestamp(profile: &ProfileSettingsSnapshot) -> u64 {
    now_ms().max(profile.updated_at_ms + 1)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        delete_uploaded_profile_avatar, get_profile_settings, reset_profile_avatar,
        select_profile_avatar_preset, update_profile_settings, upload_profile_avatar,
    };
    use crate::contracts::{
        DeleteUploadedProfileAvatarRequest, GetProfileSettingsRequest, ProfileAvatarKind,
        ProfileStatus, ResetProfileAvatarRequest, SelectProfileAvatarPresetRequest,
        UpdateProfileSettingsRequest, UploadProfileAvatarRequest,
    };

    #[test]
    fn profile_settings_update_persists_and_restores_from_disk() {
        let app_data = tempdir().expect("app data dir");

        let updated = update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Dana".to_owned()),
                timezone: Some("Asia/Shanghai".to_owned()),
                status: Some("working".to_owned()),
                status_message: Some("Reviewing Story 7.1".to_owned()),
            },
        )
        .expect("profile updated");

        assert_eq!(updated.profile.display_name, "Dana");
        assert_eq!(updated.profile.timezone, "Asia/Shanghai");
        assert_eq!(updated.profile.status, ProfileStatus::Working);
        assert_eq!(
            updated.profile.status_message.as_deref(),
            Some("Reviewing Story 7.1")
        );

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");

        assert_eq!(restored.profile, updated.profile);
    }

    #[test]
    fn profile_avatar_upload_persists_asset_and_restores_preview() {
        let app_data = tempdir().expect("app data dir");
        let source_dir = tempdir().expect("source dir");
        let source_path = source_dir.path().join("avatar.png");
        fs::write(&source_path, b"png").expect("avatar fixture");

        let updated = upload_profile_avatar(
            app_data.path(),
            UploadProfileAvatarRequest {
                source_path: source_path.display().to_string(),
            },
        )
        .expect("avatar uploaded");
        let avatar = updated.profile.avatar.as_ref().expect("avatar snapshot");

        assert_eq!(avatar.kind, ProfileAvatarKind::Uploaded);
        assert_eq!(avatar.content_type.as_deref(), Some("image/png"));
        assert!(avatar
            .preview_data_url
            .as_deref()
            .unwrap_or_default()
            .starts_with("data:image/png;base64,"));
        assert!(app_data
            .path()
            .join(
                avatar
                    .library_relative_path
                    .as_deref()
                    .expect("library path")
            )
            .exists());

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");
        assert_eq!(
            restored.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Uploaded
        );
        assert!(restored
            .profile
            .avatar
            .as_ref()
            .and_then(|avatar| avatar.preview_data_url.as_deref())
            .unwrap_or_default()
            .starts_with("data:image/png;base64,"));
    }

    #[test]
    fn profile_avatar_rejects_invalid_upload_without_overwriting_current_avatar() {
        let app_data = tempdir().expect("app data dir");
        select_profile_avatar_preset(
            app_data.path(),
            SelectProfileAvatarPresetRequest {
                preset_id: "lagoon".to_owned(),
            },
        )
        .expect("preset selected");
        let source_path = app_data.path().join("avatar.txt");
        fs::write(&source_path, b"not image").expect("invalid fixture");

        let error = upload_profile_avatar(
            app_data.path(),
            UploadProfileAvatarRequest {
                source_path: source_path.display().to_string(),
            },
        )
        .expect_err("invalid upload rejected");

        assert_eq!(error.code, "settings.avatar.unsupportedFileType");

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");
        let avatar = restored.profile.avatar.as_ref().expect("avatar");
        assert_eq!(avatar.kind, ProfileAvatarKind::Preset);
        assert_eq!(avatar.preset_id.as_deref(), Some("lagoon"));
    }

    #[test]
    fn profile_avatar_selects_preset_and_reset_uses_placeholder_without_workspace_copy() {
        let app_data = tempdir().expect("app data dir");
        let selected = select_profile_avatar_preset(
            app_data.path(),
            SelectProfileAvatarPresetRequest {
                preset_id: "forest".to_owned(),
            },
        )
        .expect("preset selected");

        let avatar = selected.profile.avatar.as_ref().expect("avatar");
        assert_eq!(avatar.kind, ProfileAvatarKind::Preset);
        assert_eq!(avatar.preset_id.as_deref(), Some("forest"));
        assert!(avatar.library_relative_path.is_none());

        let reset = reset_profile_avatar(app_data.path(), ResetProfileAvatarRequest {})
            .expect("avatar reset");
        assert_eq!(
            reset.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Placeholder
        );
        assert!(!app_data.path().join(".orchlet").exists());
    }

    #[test]
    fn profile_avatar_delete_removes_current_uploaded_asset_and_falls_back() {
        let app_data = tempdir().expect("app data dir");
        let source_dir = tempdir().expect("source dir");
        let source_path = source_dir.path().join("avatar.webp");
        fs::write(&source_path, b"webp").expect("avatar fixture");
        let uploaded = upload_profile_avatar(
            app_data.path(),
            UploadProfileAvatarRequest {
                source_path: source_path.display().to_string(),
            },
        )
        .expect("avatar uploaded");
        let asset_path = app_data.path().join(
            uploaded
                .profile
                .avatar
                .as_ref()
                .and_then(|avatar| avatar.library_relative_path.as_deref())
                .expect("asset path"),
        );
        assert!(asset_path.exists());

        let deleted =
            delete_uploaded_profile_avatar(app_data.path(), DeleteUploadedProfileAvatarRequest {})
                .expect("avatar deleted");

        assert!(!asset_path.exists());
        assert_eq!(
            deleted.profile.avatar.as_ref().expect("avatar").kind,
            ProfileAvatarKind::Placeholder
        );
    }

    #[test]
    fn profile_settings_rejects_invalid_fields_without_overwriting_existing_profile() {
        let app_data = tempdir().expect("app data dir");
        update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Dana".to_owned()),
                timezone: Some("UTC".to_owned()),
                status: Some("online".to_owned()),
                status_message: Some("Available".to_owned()),
            },
        )
        .expect("profile seeded");

        let error = update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("   ".to_owned()),
                timezone: None,
                status: Some("busy".to_owned()),
                status_message: None,
            },
        )
        .expect_err("invalid profile rejected");

        assert_eq!(error.code, "settings.profile.invalidDisplayName");
        assert!(error
            .details
            .as_deref()
            .unwrap_or_default()
            .contains("displayName"));

        let restored =
            get_profile_settings(app_data.path(), GetProfileSettingsRequest {}).expect("restored");
        assert_eq!(restored.profile.display_name, "Dana");
        assert_eq!(restored.profile.status, ProfileStatus::Online);
    }

    #[test]
    fn profile_settings_rejects_unsupported_status_with_field_details() {
        let app_data = tempdir().expect("app data dir");
        let error = update_profile_settings(
            app_data.path(),
            UpdateProfileSettingsRequest {
                display_name: Some("Dana".to_owned()),
                timezone: Some("UTC".to_owned()),
                status: Some("away".to_owned()),
                status_message: None,
            },
        )
        .expect_err("invalid status rejected");

        assert_eq!(error.code, "settings.profile.unsupportedStatus");
        assert!(error
            .details
            .as_deref()
            .unwrap_or_default()
            .contains("status"));
    }
}
