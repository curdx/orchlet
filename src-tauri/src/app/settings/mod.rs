use std::path::Path;

use crate::{
    contracts::{
        AppError, GetProfileSettingsRequest, GetProfileSettingsResult, ProfileSettingsSnapshot,
        UpdateProfileSettingsRequest, UpdateProfileSettingsResult,
    },
    domain::settings::{
        normalize_profile_display_name, normalize_profile_status, normalize_profile_status_message,
        normalize_profile_timezone,
    },
    infrastructure::persistence::json_store::{
        profile_settings_store::{
            load_profile_settings, save_profile_settings, validate_profile_settings_store,
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

    let timestamp = now_ms();
    profile.updated_at_ms = timestamp.max(profile.updated_at_ms + 1);

    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{get_profile_settings, update_profile_settings};
    use crate::contracts::{
        GetProfileSettingsRequest, ProfileStatus, UpdateProfileSettingsRequest,
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
