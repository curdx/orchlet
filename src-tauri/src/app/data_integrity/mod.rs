use std::{
    collections::HashSet,
    path::{Path, PathBuf},
};

use ulid::Ulid;

use crate::{
    app::{
        notification::validate_notification_preferences_store_for_app_data,
        roadmap::{validate_workspace_roadmap_goal_store, validate_workspace_roadmap_task_store},
        settings::{
            validate_app_preferences, validate_chat_terminal_output_preferences_for_app_data,
            validate_profile_avatar_library, validate_profile_settings,
            validate_shortcut_preferences, validate_terminal_configuration,
        },
        skills::{validate_skill_library_store, validate_workspace_skill_link_store},
    },
    contracts::{
        AppError, AppErrorSeverity, DataIntegrityCheckResult, DataIntegrityReport,
        DataIntegritySeverity, DataIntegrityStatus, OpenedWorkspace, StorageCategory,
        StorageManifestEntry, WorkspaceAccessMode,
    },
    domain::workspace::{WORKSPACE_DIR_NAME, WORKSPACE_METADATA_FILE_NAME},
    infrastructure::persistence::{
        json_store::{
            app_preferences_store::app_preferences_path,
            chat_terminal_output_preferences_store::chat_terminal_output_preferences_path,
            notification_preferences_store::notification_preferences_path,
            profile_settings_store::avatar_library_dir,
            profile_settings_store::profile_settings_path,
            shortcut_preferences_store::shortcut_preferences_path,
            skill_library_store::skill_library_path,
            terminal_configuration_store::terminal_configuration_path,
            workspace_fallback_store::{load_workspace_fallbacks, workspace_fallback_path},
            workspace_metadata_store::read_workspace_metadata,
            workspace_registry_store::{load_workspace_registry, now_ms, workspace_registry_path},
            workspace_roadmap_store::{workspace_roadmap_goals_path, workspace_roadmap_tasks_path},
            workspace_skill_link_store::workspace_skill_links_path,
        },
        sqlite::{
            contact_repository::{contact_database_path, validate_contact_store},
            conversation_repository::{
                validate_conversation_member_store, validate_conversation_record_store,
                validate_message_mention_store, validate_message_store,
                validate_read_position_store,
            },
            diagnostics_repository::validate_diagnostics_store,
            member_repository::validate_member_store,
            terminal_tab_repository::validate_terminal_tab_store,
            workspace_database::workspace_database_path,
        },
        storage_manifest::storage_manifest_entries,
    },
};

pub const DATA_INTEGRITY_REPORT_SCHEMA_VERSION: u32 = 1;

pub fn validate_data_integrity(
    app_data_dir: impl AsRef<Path>,
    active_workspace: Option<OpenedWorkspace>,
    requested_workspace_root: Option<PathBuf>,
) -> DataIntegrityReport {
    let app_data_dir = app_data_dir.as_ref();
    let manifest = storage_manifest_entries();
    let has_requested_workspace_root = requested_workspace_root.is_some();
    let requested_workspace_id = requested_workspace_root
        .as_deref()
        .and_then(workspace_id_from_root);
    let requested_matches_active_workspace = active_workspace
        .as_ref()
        .zip(requested_workspace_root.as_ref())
        .is_some_and(|(workspace, requested_root)| {
            Path::new(&workspace.root_path) == requested_root.as_path()
        });
    let active_workspace_id = active_workspace
        .as_ref()
        .map(|workspace| workspace.metadata.project_id.clone());
    let active_workspace_root = active_workspace
        .as_ref()
        .map(|workspace| PathBuf::from(&workspace.root_path));
    let workspace_root = requested_workspace_root.or_else(|| active_workspace_root.clone());
    let workspace_id = if has_requested_workspace_root {
        requested_workspace_id.or_else(|| {
            requested_matches_active_workspace
                .then(|| active_workspace_id.clone())
                .flatten()
        })
    } else {
        active_workspace_id.or_else(|| workspace_root.as_deref().and_then(workspace_id_from_root))
    };
    let workspace_metadata_optional = active_workspace
        .as_ref()
        .zip(workspace_root.as_ref())
        .map(|(workspace, workspace_root)| {
            Path::new(&workspace.root_path) == workspace_root.as_path()
                && workspace.access_mode == WorkspaceAccessMode::ReadOnly
                && workspace.fallback_state.is_some()
        })
        .unwrap_or(false);
    let mut checks = Vec::new();

    checks.push(validate_manifest_completeness(&manifest));
    checks.push(check_result(
        "workspace.registry.load_validate",
        StorageCategory::WorkspaceRegistry,
        vec![workspace_registry_path(app_data_dir)],
        load_workspace_registry(app_data_dir)
            .map(|_| "workspace-registry.json is readable and matches schema version.".to_owned()),
    ));
    checks.push(check_result(
        "workspace.fallbacks.load_validate",
        StorageCategory::WorkspaceFallbacks,
        vec![workspace_fallback_path(app_data_dir)],
        load_workspace_fallbacks(app_data_dir)
            .map(|_| "workspace-fallbacks.json is readable and matches schema version.".to_owned()),
    ));
    checks.push(validate_app_preferences_store(app_data_dir));
    checks.push(validate_shortcut_preferences_store(app_data_dir));
    checks.push(validate_chat_terminal_output_preferences_store(
        app_data_dir,
    ));
    checks.push(validate_terminal_configuration_store(app_data_dir));
    checks.push(validate_notification_preferences_store(app_data_dir));
    checks.push(validate_profile_settings_store(app_data_dir));
    checks.push(validate_profile_avatar_library_store(app_data_dir));
    checks.push(validate_workspace_metadata(
        workspace_root.as_deref(),
        workspace_metadata_optional,
    ));
    checks.push(validate_member_profiles(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_contact_profiles(app_data_dir));
    checks.push(validate_conversation_records(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_conversation_members(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_message_records(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_message_mentions(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_conversation_read_positions(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_terminal_tabs(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_diagnostics_runs(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_diagnostics_events(
        app_data_dir,
        workspace_id.as_deref(),
    ));
    checks.push(validate_skill_library(app_data_dir));
    checks.push(validate_workspace_skill_links(workspace_root.as_deref()));
    checks.push(validate_roadmap_tasks(workspace_root.as_deref()));
    checks.push(validate_roadmap_goals(workspace_root.as_deref()));

    report_from_checks(manifest, checks)
}

fn validate_manifest_completeness(manifest: &[StorageManifestEntry]) -> DataIntegrityCheckResult {
    let mut ids = HashSet::new();
    let mut categories = HashSet::new();
    let mut duplicate_ids = Vec::new();
    let mut duplicate_categories = Vec::new();

    for entry in manifest {
        if !ids.insert(entry.id.clone()) {
            duplicate_ids.push(entry.id.clone());
        }

        if !categories.insert(entry.category.clone()) {
            duplicate_categories.push(format!("{:?}", entry.category));
        }
    }

    let expected_categories = [
        StorageCategory::WorkspaceMetadata,
        StorageCategory::WorkspaceRegistry,
        StorageCategory::WorkspaceFallbacks,
        StorageCategory::AppPreferences,
        StorageCategory::ShortcutPreferences,
        StorageCategory::TerminalConfiguration,
        StorageCategory::NotificationPreferences,
        StorageCategory::ProfileSettings,
        StorageCategory::AvatarLibrary,
        StorageCategory::MemberProfiles,
        StorageCategory::ContactProfiles,
        StorageCategory::ConversationRecords,
        StorageCategory::ConversationMembers,
        StorageCategory::MessageRecords,
        StorageCategory::MessageMentions,
        StorageCategory::ConversationReadPositions,
        StorageCategory::TerminalTabs,
        StorageCategory::SkillLibrary,
        StorageCategory::WorkspaceSkillLinks,
        StorageCategory::RoadmapTasks,
        StorageCategory::RoadmapGoals,
        StorageCategory::DiagnosticsRuns,
        StorageCategory::DiagnosticsEvents,
    ];
    let missing_categories = expected_categories
        .iter()
        .filter(|category| !categories.contains(*category))
        .map(|category| format!("{:?}", category))
        .collect::<Vec<_>>();

    if duplicate_ids.is_empty() && duplicate_categories.is_empty() && missing_categories.is_empty()
    {
        return DataIntegrityCheckResult {
            check_id: "storage.manifest.current_entries".to_owned(),
            category: StorageCategory::StorageManifest,
            status: DataIntegrityStatus::Passed,
            severity: DataIntegritySeverity::Info,
            message: "Storage manifest covers all currently implemented stores.".to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: Some(format!("entries={}", manifest.len())),
        };
    }

    DataIntegrityCheckResult {
        check_id: "storage.manifest.current_entries".to_owned(),
        category: StorageCategory::StorageManifest,
        status: DataIntegrityStatus::Failed,
        severity: DataIntegritySeverity::Error,
        message: "Storage manifest is incomplete or ambiguous.".to_owned(),
        affected_paths: Vec::new(),
        user_action: Some(
            "Fix storage manifest entries before adding new persisted data.".to_owned(),
        ),
        details: Some(format!(
            "duplicateIds={:?}; duplicateCategories={:?}; missingCategories={:?}",
            duplicate_ids, duplicate_categories, missing_categories
        )),
    }
}

fn validate_profile_settings_store(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "settings.profile.load_validate",
        StorageCategory::ProfileSettings,
        vec![profile_settings_path(app_data_dir)],
        validate_profile_settings(app_data_dir)
            .map(|_| "Profile settings are readable when initialized.".to_owned()),
    )
}

fn validate_app_preferences_store(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "settings.preferences.load_validate",
        StorageCategory::AppPreferences,
        vec![app_preferences_path(app_data_dir)],
        validate_app_preferences(app_data_dir)
            .map(|_| "App preferences are readable when initialized.".to_owned()),
    )
}

fn validate_shortcut_preferences_store(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "settings.shortcuts.load_validate",
        StorageCategory::ShortcutPreferences,
        vec![shortcut_preferences_path(app_data_dir)],
        validate_shortcut_preferences(app_data_dir)
            .map(|_| "Shortcut preferences are readable when initialized.".to_owned()),
    )
}

fn validate_chat_terminal_output_preferences_store(
    app_data_dir: &Path,
) -> DataIntegrityCheckResult {
    check_result(
        "settings.chatTerminalOutput.load_validate",
        StorageCategory::ChatTerminalOutputPreferences,
        vec![chat_terminal_output_preferences_path(app_data_dir)],
        validate_chat_terminal_output_preferences_for_app_data(app_data_dir)
            .map(|_| "Chat terminal output preferences are readable when initialized.".to_owned()),
    )
}

fn validate_terminal_configuration_store(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "settings.terminalConfiguration.load_validate",
        StorageCategory::TerminalConfiguration,
        vec![terminal_configuration_path(app_data_dir)],
        validate_terminal_configuration(app_data_dir)
            .map(|_| "Terminal configuration is readable when initialized.".to_owned()),
    )
}

fn validate_notification_preferences_store(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "settings.notifications.load_validate",
        StorageCategory::NotificationPreferences,
        vec![notification_preferences_path(app_data_dir)],
        validate_notification_preferences_store_for_app_data(app_data_dir)
            .map(|_| "Notification preferences are readable when initialized.".to_owned()),
    )
}

fn validate_profile_avatar_library_store(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "settings.avatarLibrary.load_validate",
        StorageCategory::AvatarLibrary,
        vec![avatar_library_dir(app_data_dir)],
        validate_profile_avatar_library(app_data_dir)
            .map(|_| "Profile avatar library references are readable when initialized.".to_owned()),
    )
}

fn validate_roadmap_tasks(workspace_root: Option<&Path>) -> DataIntegrityCheckResult {
    let Some(workspace_root) = workspace_root else {
        return DataIntegrityCheckResult {
            check_id: "roadmap.tasks.load_validate".to_owned(),
            category: StorageCategory::RoadmapTasks,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace root is available for roadmap task validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    check_result(
        "roadmap.tasks.load_validate",
        StorageCategory::RoadmapTasks,
        vec![workspace_roadmap_tasks_path(workspace_root)],
        validate_workspace_roadmap_task_store(workspace_root)
            .map(|_| "Roadmap tasks are readable when initialized.".to_owned()),
    )
}

fn validate_roadmap_goals(workspace_root: Option<&Path>) -> DataIntegrityCheckResult {
    let Some(workspace_root) = workspace_root else {
        return DataIntegrityCheckResult {
            check_id: "roadmap.goals.load_validate".to_owned(),
            category: StorageCategory::RoadmapGoals,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace root is available for roadmap goal validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    check_result(
        "roadmap.goals.load_validate",
        StorageCategory::RoadmapGoals,
        vec![workspace_roadmap_goals_path(workspace_root)],
        validate_workspace_roadmap_goal_store(workspace_root)
            .map(|_| "Roadmap goals are readable when initialized.".to_owned()),
    )
}

fn validate_skill_library(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "skill.library.load_validate",
        StorageCategory::SkillLibrary,
        vec![skill_library_path(app_data_dir)],
        validate_skill_library_store(app_data_dir)
            .map(|_| "Skill library is readable when initialized.".to_owned()),
    )
}

fn validate_workspace_skill_links(workspace_root: Option<&Path>) -> DataIntegrityCheckResult {
    let Some(workspace_root) = workspace_root else {
        return DataIntegrityCheckResult {
            check_id: "skill.workspace_links.load_validate".to_owned(),
            category: StorageCategory::WorkspaceSkillLinks,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace root is available for workspace skill link validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    check_result(
        "skill.workspace_links.load_validate",
        StorageCategory::WorkspaceSkillLinks,
        vec![workspace_skill_links_path(workspace_root)],
        validate_workspace_skill_link_store(workspace_root)
            .map(|_| "Workspace skill links are readable when initialized.".to_owned()),
    )
}

fn validate_contact_profiles(app_data_dir: &Path) -> DataIntegrityCheckResult {
    check_result(
        "contact.profiles.schema_validate",
        StorageCategory::ContactProfiles,
        vec![contact_database_path(app_data_dir)],
        validate_contact_store(app_data_dir)
            .map(|_| "Global contact store is readable when initialized.".to_owned()),
    )
}

fn validate_terminal_tabs(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "terminal.tabs.schema_validate".to_owned(),
            category: StorageCategory::TerminalTabs,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for terminal tab validation.".to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "terminal.tabs.schema_validate",
        StorageCategory::TerminalTabs,
        vec![database_path],
        validate_terminal_tab_store(app_data_dir, workspace_id)
            .map(|_| "Terminal tab store is readable when initialized.".to_owned()),
    )
}

fn validate_diagnostics_runs(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "diagnostics.runs.schema_validate".to_owned(),
            category: StorageCategory::DiagnosticsRuns,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for diagnostics run validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "diagnostics.runs.schema_validate",
        StorageCategory::DiagnosticsRuns,
        vec![database_path],
        validate_diagnostics_store(app_data_dir, workspace_id)
            .map(|_| "Diagnostics run store is readable when initialized.".to_owned()),
    )
}

fn validate_diagnostics_events(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "diagnostics.events.schema_validate".to_owned(),
            category: StorageCategory::DiagnosticsEvents,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for diagnostics event validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "diagnostics.events.schema_validate",
        StorageCategory::DiagnosticsEvents,
        vec![database_path],
        validate_diagnostics_store(app_data_dir, workspace_id)
            .map(|_| "Diagnostics event store is readable when initialized.".to_owned()),
    )
}

fn validate_conversation_records(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "conversation.records.schema_validate".to_owned(),
            category: StorageCategory::ConversationRecords,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for conversation record validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "conversation.records.schema_validate",
        StorageCategory::ConversationRecords,
        vec![database_path],
        validate_conversation_record_store(app_data_dir, workspace_id)
            .map(|_| "Conversation record store is readable when initialized.".to_owned()),
    )
}

fn validate_conversation_members(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "conversation.members.schema_validate".to_owned(),
            category: StorageCategory::ConversationMembers,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for conversation membership validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "conversation.members.schema_validate",
        StorageCategory::ConversationMembers,
        vec![database_path],
        validate_conversation_member_store(app_data_dir, workspace_id)
            .map(|_| "Conversation membership store is readable when initialized.".to_owned()),
    )
}

fn validate_message_records(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "message.records.schema_validate".to_owned(),
            category: StorageCategory::MessageRecords,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for message record validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "message.records.schema_validate",
        StorageCategory::MessageRecords,
        vec![database_path],
        validate_message_store(app_data_dir, workspace_id)
            .map(|_| "Message record store is readable when initialized.".to_owned()),
    )
}

fn validate_message_mentions(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "message.mentions.schema_validate".to_owned(),
            category: StorageCategory::MessageMentions,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for message mention validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "message.mentions.schema_validate",
        StorageCategory::MessageMentions,
        vec![database_path],
        validate_message_mention_store(app_data_dir, workspace_id)
            .map(|_| "Message mention store is readable when initialized.".to_owned()),
    )
}

fn validate_conversation_read_positions(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "conversation.read_positions.schema_validate".to_owned(),
            category: StorageCategory::ConversationReadPositions,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message:
                "No active workspace id is available for conversation read-position validation."
                    .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "conversation.read_positions.schema_validate",
        StorageCategory::ConversationReadPositions,
        vec![database_path],
        validate_read_position_store(app_data_dir, workspace_id)
            .map(|_| "Conversation read-position store is readable when initialized.".to_owned()),
    )
}

fn validate_member_profiles(
    app_data_dir: &Path,
    workspace_id: Option<&str>,
) -> DataIntegrityCheckResult {
    let Some(workspace_id) = workspace_id else {
        return DataIntegrityCheckResult {
            check_id: "member.profiles.schema_validate".to_owned(),
            category: StorageCategory::MemberProfiles,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace id is available for member profile validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let database_path = workspace_database_path(app_data_dir, workspace_id);
    check_result(
        "member.profiles.schema_validate",
        StorageCategory::MemberProfiles,
        vec![database_path],
        validate_member_store(app_data_dir, workspace_id).map(|_| {
            "Member profile database is readable and has exactly one default owner.".to_owned()
        }),
    )
}

fn workspace_id_from_root(workspace_root: &Path) -> Option<String> {
    read_workspace_metadata(workspace_root)
        .ok()
        .flatten()
        .map(|metadata| metadata.project_id)
}

fn validate_workspace_metadata(
    workspace_root: Option<&Path>,
    metadata_optional: bool,
) -> DataIntegrityCheckResult {
    let Some(workspace_root) = workspace_root else {
        return DataIntegrityCheckResult {
            check_id: "workspace.metadata.read_validate".to_owned(),
            category: StorageCategory::WorkspaceMetadata,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Info,
            message: "No active workspace root is available for workspace metadata validation."
                .to_owned(),
            affected_paths: Vec::new(),
            user_action: None,
            details: None,
        };
    };

    let metadata_path = workspace_metadata_path(workspace_root);

    match read_workspace_metadata(workspace_root) {
        Ok(Some(_)) => DataIntegrityCheckResult {
            check_id: "workspace.metadata.read_validate".to_owned(),
            category: StorageCategory::WorkspaceMetadata,
            status: DataIntegrityStatus::Passed,
            severity: DataIntegritySeverity::Info,
            message: ".orchlet/workspace.json is readable and matches schema version.".to_owned(),
            affected_paths: vec![metadata_path.to_string_lossy().into_owned()],
            user_action: None,
            details: None,
        },
        Ok(None) if metadata_optional => DataIntegrityCheckResult {
            check_id: "workspace.metadata.read_validate".to_owned(),
            category: StorageCategory::WorkspaceMetadata,
            status: DataIntegrityStatus::Skipped,
            severity: DataIntegritySeverity::Warning,
            message: "Workspace-local metadata is absent because the active workspace is using read-only fallback."
                .to_owned(),
            affected_paths: vec![metadata_path.to_string_lossy().into_owned()],
            user_action: Some(
                "Grant write permission to the workspace directory and reopen it to materialize .orchlet/workspace.json."
                    .to_owned(),
            ),
            details: None,
        },
        Ok(None) => DataIntegrityCheckResult {
            check_id: "workspace.metadata.read_validate".to_owned(),
            category: StorageCategory::WorkspaceMetadata,
            status: DataIntegrityStatus::Failed,
            severity: DataIntegritySeverity::Error,
            message: ".orchlet/workspace.json is missing for the selected workspace.".to_owned(),
            affected_paths: vec![metadata_path.to_string_lossy().into_owned()],
            user_action: Some("Reopen the workspace so orchlet can create or recover metadata.".to_owned()),
            details: None,
        },
        Err(error) => failed_check(
            "workspace.metadata.read_validate",
            StorageCategory::WorkspaceMetadata,
            vec![metadata_path],
            error,
        ),
    }
}

fn check_result(
    check_id: &str,
    category: StorageCategory,
    affected_paths: Vec<PathBuf>,
    result: Result<String, AppError>,
) -> DataIntegrityCheckResult {
    match result {
        Ok(message) => DataIntegrityCheckResult {
            check_id: check_id.to_owned(),
            category,
            status: DataIntegrityStatus::Passed,
            severity: DataIntegritySeverity::Info,
            message,
            affected_paths: affected_paths
                .into_iter()
                .map(|path| path.to_string_lossy().into_owned())
                .collect(),
            user_action: None,
            details: None,
        },
        Err(error) => failed_check(check_id, category, affected_paths, error),
    }
}

fn failed_check(
    check_id: &str,
    category: StorageCategory,
    affected_paths: Vec<PathBuf>,
    error: AppError,
) -> DataIntegrityCheckResult {
    DataIntegrityCheckResult {
        check_id: check_id.to_owned(),
        category,
        status: DataIntegrityStatus::Failed,
        severity: severity_from_app_error(&error.severity),
        message: error.message,
        affected_paths: affected_paths
            .into_iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect(),
        user_action: error.user_action,
        details: error.details,
    }
}

fn severity_from_app_error(severity: &AppErrorSeverity) -> DataIntegritySeverity {
    match severity {
        AppErrorSeverity::Info => DataIntegritySeverity::Info,
        AppErrorSeverity::Warning => DataIntegritySeverity::Warning,
        AppErrorSeverity::Error => DataIntegritySeverity::Error,
    }
}

fn report_from_checks(
    manifest: Vec<StorageManifestEntry>,
    checks: Vec<DataIntegrityCheckResult>,
) -> DataIntegrityReport {
    let total_checks = checks.len() as u32;
    let passed_checks = checks
        .iter()
        .filter(|check| check.status == DataIntegrityStatus::Passed)
        .count() as u32;
    let failed_checks = checks
        .iter()
        .filter(|check| check.status == DataIntegrityStatus::Failed)
        .count() as u32;
    let skipped_checks = checks
        .iter()
        .filter(|check| check.status == DataIntegrityStatus::Skipped)
        .count() as u32;

    DataIntegrityReport {
        schema_version: DATA_INTEGRITY_REPORT_SCHEMA_VERSION,
        report_id: Ulid::new().to_string(),
        generated_at_ms: now_ms(),
        manifest,
        checks,
        total_checks,
        passed_checks,
        failed_checks,
        skipped_checks,
        has_failures: failed_checks > 0,
        batched: true,
    }
}

fn workspace_metadata_path(workspace_root: &Path) -> PathBuf {
    workspace_root
        .join(WORKSPACE_DIR_NAME)
        .join(WORKSPACE_METADATA_FILE_NAME)
}

#[cfg(test)]
mod tests {
    use std::{collections::HashMap, fs, path::Path};

    use redb::TableDefinition;
    use serde::{Deserialize, Serialize};
    use tempfile::tempdir;
    use ulid::Ulid;

    use super::validate_data_integrity;
    use crate::{
        app::{chat::list_workspace_conversations, members::initialize_members},
        contracts::{
            DataIntegritySeverity, DataIntegrityStatus, ListConversationsRequest, OpenedWorkspace,
            StorageCategory, WorkspaceAccessMode, WorkspaceFallbackState, WorkspaceMetadata,
            WorkspaceRegistryAction, WorkspaceRegistryEntry,
        },
        infrastructure::persistence::{
            json_store::{
                workspace_metadata_store::create_workspace_metadata,
                workspace_registry_store::{save_workspace_registry, WorkspaceRegistryDocument},
            },
            storage_manifest::storage_manifest_entries,
        },
    };

    type TestLegacyUserId = u128;
    type TestLegacyConvId = u128;
    type TestLegacyMsgId = u128;

    const TEST_LEGACY_CONVERSATIONS: TableDefinition<TestLegacyConvId, &[u8]> =
        TableDefinition::new("conversations");
    const TEST_LEGACY_USER_CONVS: TableDefinition<(TestLegacyUserId, TestLegacyConvId), &[u8]> =
        TableDefinition::new("user_convs");
    const TEST_LEGACY_MESSAGES: TableDefinition<(TestLegacyConvId, TestLegacyMsgId), &[u8]> =
        TableDefinition::new("messages");
    const TEST_LEGACY_MEMBERS: TableDefinition<(TestLegacyConvId, TestLegacyUserId), &[u8]> =
        TableDefinition::new("members");

    #[derive(Serialize, Deserialize, Clone, Copy)]
    enum TestLegacyConversationKind {
        Channel,
        Dm,
    }

    #[derive(Serialize, Deserialize)]
    struct TestLegacyConversationMeta {
        kind: TestLegacyConversationKind,
        created_at: u64,
        custom_name: Option<String>,
        is_default: bool,
        last_message_at: Option<u64>,
        last_message_preview: Option<String>,
    }

    #[derive(Serialize, Deserialize, Default)]
    struct TestLegacyUserConversationSettings {
        pinned: bool,
        muted: bool,
        last_read_message_id: Option<TestLegacyMsgId>,
        last_active_at: Option<u64>,
    }

    #[derive(Serialize, Deserialize, Clone)]
    enum TestLegacyMessageStatus {
        Sent,
        Sending,
        Failed,
    }

    #[derive(Serialize, Deserialize, Clone)]
    enum TestLegacyMessageContentDb {
        Text {
            text: String,
        },
        System {
            key: String,
            args: Option<HashMap<String, String>>,
        },
    }

    #[derive(Serialize, Deserialize, Clone)]
    enum TestLegacyMessageAttachmentDb {
        Roadmap { title: String },
    }

    #[derive(Serialize, Deserialize, Clone)]
    struct TestLegacyChatMessage {
        sender_id: Option<TestLegacyUserId>,
        content: TestLegacyMessageContentDb,
        created_at: u64,
        is_ai: bool,
        status: TestLegacyMessageStatus,
        attachment: Option<TestLegacyMessageAttachmentDb>,
    }

    #[test]
    fn storage_manifest_covers_current_stores() {
        let manifest = storage_manifest_entries();
        let categories = manifest
            .iter()
            .map(|entry| entry.category.clone())
            .collect::<Vec<_>>();

        assert_eq!(manifest.len(), 24);
        assert!(categories.contains(&StorageCategory::WorkspaceMetadata));
        assert!(categories.contains(&StorageCategory::WorkspaceRegistry));
        assert!(categories.contains(&StorageCategory::WorkspaceFallbacks));
        assert!(categories.contains(&StorageCategory::AppPreferences));
        assert!(categories.contains(&StorageCategory::ShortcutPreferences));
        assert!(categories.contains(&StorageCategory::ChatTerminalOutputPreferences));
        assert!(categories.contains(&StorageCategory::TerminalConfiguration));
        assert!(categories.contains(&StorageCategory::NotificationPreferences));
        assert!(categories.contains(&StorageCategory::ProfileSettings));
        assert!(categories.contains(&StorageCategory::AvatarLibrary));
        assert!(categories.contains(&StorageCategory::MemberProfiles));
        assert!(categories.contains(&StorageCategory::ContactProfiles));
        assert!(categories.contains(&StorageCategory::ConversationRecords));
        assert!(categories.contains(&StorageCategory::ConversationMembers));
        assert!(categories.contains(&StorageCategory::MessageRecords));
        assert!(categories.contains(&StorageCategory::MessageMentions));
        assert!(categories.contains(&StorageCategory::ConversationReadPositions));
        assert!(categories.contains(&StorageCategory::TerminalTabs));
        assert!(categories.contains(&StorageCategory::SkillLibrary));
        assert!(categories.contains(&StorageCategory::WorkspaceSkillLinks));
        assert!(categories.contains(&StorageCategory::RoadmapTasks));
        assert!(categories.contains(&StorageCategory::RoadmapGoals));
        assert!(categories.contains(&StorageCategory::DiagnosticsRuns));
        assert!(categories.contains(&StorageCategory::DiagnosticsEvents));
        assert!(manifest
            .iter()
            .all(|entry| entry.schema_version == 1 && entry.fixture_required));
    }

    #[test]
    fn validation_passes_empty_app_data_and_skips_workspace_without_active_root() {
        let app_data = tempdir().expect("app data");
        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.total_checks, 25);
        assert_eq!(report.failed_checks, 0);
        assert_eq!(report.skipped_checks, 13);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceMetadata
                && check.status == DataIntegrityStatus::Skipped
        }));
    }

    #[test]
    fn validation_passes_valid_workspace_metadata() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let metadata = create_workspace_metadata(workspace.path()).expect("metadata created");
        initialize_members(app_data.path(), &metadata.project_id).expect("members initialized");

        let report = validate_data_integrity(app_data.path(), None, Some(workspace.path().into()));

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceMetadata
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    #[test]
    fn validation_passes_legacy_golutra_project_id_workspace_metadata() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let legacy_project_id = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let metadata_dir = workspace.path().join(".orchlet");
        fs::create_dir_all(&metadata_dir).expect("metadata dir");
        fs::write(
            metadata_dir.join("workspace.json"),
            format!(
                r#"{{
  "schemaVersion": 1,
  "projectId": "{legacy_project_id}",
  "name": "legacy",
  "createdAtMs": 1760000000000,
  "updatedAtMs": 1760000000000
}}"#
            ),
        )
        .expect("legacy-compatible metadata written");
        initialize_members(app_data.path(), legacy_project_id).expect("members initialized");

        let report = validate_data_integrity(app_data.path(), None, Some(workspace.path().into()));

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceMetadata
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    #[test]
    fn validation_passes_legacy_golutra_global_settings_without_current_settings_files() {
        let app_data = tempdir().expect("app data");
        fs::write(
            app_data.path().join("global-settings.json"),
            serde_json::json!({
                "appearance": { "theme": "light" },
                "locale": "zh-CN",
                "account": {
                    "displayName": "Legacy Dana",
                    "timezone": "utc",
                    "status": "working",
                    "statusMessage": "legacy settings"
                },
                "notifications": {
                    "desktop": false,
                    "sound": false,
                    "mentionsOnly": true,
                    "previews": false,
                    "quietHoursEnabled": true,
                    "quietHoursStart": "21:00",
                    "quietHoursEnd": "07:00"
                },
                "keybinds": {
                    "enabled": false,
                    "showHints": false,
                    "profile": "vscode"
                },
                "chat": { "streamOutput": false },
                "members": {
                    "terminalPaths": { "codex": "/opt/codex" },
                    "customMembers": [
                        { "id": "legacy-reviewer", "name": "Legacy Reviewer", "command": "legacy-reviewer --stdio" }
                    ],
                    "defaultTerminalName": "Ghostty",
                    "defaultTerminalPath": "/opt/ghostty"
                }
            })
            .to_string(),
        )
        .expect("legacy global settings");

        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.failed_checks, 0);
        assert!(!app_data.path().join("settings/preferences.json").exists());
        for category in [
            StorageCategory::AppPreferences,
            StorageCategory::ShortcutPreferences,
            StorageCategory::ChatTerminalOutputPreferences,
            StorageCategory::TerminalConfiguration,
            StorageCategory::NotificationPreferences,
            StorageCategory::ProfileSettings,
        ] {
            assert!(report.checks.iter().any(|check| {
                check.category == category && check.status == DataIntegrityStatus::Passed
            }));
        }
    }

    #[test]
    fn validation_passes_legacy_golutra_local_avatar_library_without_current_profile() {
        let app_data = tempdir().expect("app data");
        fs::write(
            app_data.path().join("global-settings.json"),
            serde_json::json!({
                "account": {
                    "displayName": "Legacy Dana",
                    "avatar": "local:avatar1"
                }
            })
            .to_string(),
        )
        .expect("legacy global settings");
        fs::write(
            app_data.path().join("avatar-library.json"),
            serde_json::json!([
                {
                    "id": "avatar1",
                    "filename": "avatar1.png",
                    "createdAt": 1_760_000_000_000_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy avatar library");
        let avatar_dir = app_data.path().join("avatars");
        fs::create_dir_all(&avatar_dir).expect("legacy avatar dir");
        fs::write(avatar_dir.join("avatar1.png"), b"legacy png").expect("legacy avatar file");

        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.failed_checks, 0);
        for category in [
            StorageCategory::ProfileSettings,
            StorageCategory::AvatarLibrary,
        ] {
            assert!(report.checks.iter().any(|check| {
                check.category == category && check.status == DataIntegrityStatus::Passed
            }));
        }
    }

    #[test]
    fn validation_passes_imported_legacy_golutra_chat_redb() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let active_workspace =
            opened_workspace(workspace.path(), WorkspaceAccessMode::ReadWrite, false);
        let metadata_path = super::workspace_metadata_path(workspace.path());
        fs::create_dir_all(metadata_path.parent().expect("metadata parent")).expect("metadata dir");
        fs::write(
            &metadata_path,
            serde_json::to_string(&active_workspace.metadata).expect("metadata encoded"),
        )
        .expect("workspace metadata written");
        write_legacy_chat_redb(app_data.path(), &workspace_id);
        let listed = list_workspace_conversations(
            app_data.path(),
            ListConversationsRequest {
                workspace_id: workspace_id.clone(),
            },
        )
        .expect("legacy chat imported");
        assert_eq!(listed.conversations.len(), 1);

        let report = validate_data_integrity(
            app_data.path(),
            Some(active_workspace),
            Some(workspace.path().into()),
        );

        assert_eq!(report.failed_checks, 0);
        for category in [
            StorageCategory::ConversationRecords,
            StorageCategory::MessageRecords,
            StorageCategory::ConversationReadPositions,
        ] {
            assert!(report.checks.iter().any(|check| {
                check.category == category && check.status == DataIntegrityStatus::Passed
            }));
        }
    }

    #[test]
    fn validation_passes_legacy_golutra_workspace_registry_files() {
        let app_data = tempdir().expect("app data");
        let legacy_project_id = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
        fs::write(
            app_data.path().join("workspace-registry.json"),
            serde_json::json!({
                legacy_project_id: {
                    "lastKnownPath": "/tmp/legacy-workspace",
                    "lastAccessed": 1760000000400_u64
                }
            })
            .to_string(),
        )
        .expect("legacy registry");
        fs::write(
            app_data.path().join("recent-workspaces.json"),
            serde_json::json!([
                {
                    "id": legacy_project_id,
                    "name": "Legacy Workspace",
                    "path": "/tmp/legacy-workspace",
                    "lastOpenedAt": 1760000000300_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy recent");

        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceRegistry
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    #[cfg(unix)]
    #[test]
    fn validation_passes_legacy_golutra_workspace_skill_symlinks() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let skill = tempdir().expect("skill");
        let metadata = create_workspace_metadata(workspace.path()).expect("metadata created");
        initialize_members(app_data.path(), &metadata.project_id).expect("members initialized");
        fs::write(
            skill.path().join("SKILL.md"),
            "---\nname: Legacy Review\n---\n# Legacy Review",
        )
        .expect("manifest");
        let legacy_skills_dir = workspace.path().join(".golutra/skills");
        fs::create_dir_all(&legacy_skills_dir).expect("legacy skills dir");
        std::os::unix::fs::symlink(skill.path(), legacy_skills_dir.join("legacy-review"))
            .expect("legacy skill symlink");

        let report = validate_data_integrity(app_data.path(), None, Some(workspace.path().into()));

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceSkillLinks
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    #[test]
    fn validation_passes_legacy_golutra_contacts_json_without_current_contacts_table() {
        let app_data = tempdir().expect("app data");
        fs::write(
            app_data.path().join("contacts.json"),
            serde_json::json!([
                {
                    "id": "01K00000000000000000000040",
                    "name": "Legacy Admin",
                    "avatar": "css:storm",
                    "roleType": "admin",
                    "status": "dnd",
                    "createdAt": 1760000000200_u64
                }
            ])
            .to_string(),
        )
        .expect("legacy contacts");

        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::ContactProfiles
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    #[test]
    fn validation_skips_missing_workspace_metadata_for_active_read_only_fallback() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let active_workspace =
            opened_workspace(workspace.path(), WorkspaceAccessMode::ReadOnly, true);
        initialize_members(app_data.path(), &active_workspace.metadata.project_id)
            .expect("members initialized");

        let report = validate_data_integrity(app_data.path(), Some(active_workspace), None);

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceMetadata
                && check.status == DataIntegrityStatus::Skipped
                && check.severity == DataIntegritySeverity::Warning
        }));
    }

    #[test]
    fn validation_uses_active_workspace_id_for_matching_requested_read_only_root() {
        let app_data = tempdir().expect("app data");
        let workspace = tempdir().expect("workspace");
        let active_workspace =
            opened_workspace(workspace.path(), WorkspaceAccessMode::ReadOnly, true);
        initialize_members(app_data.path(), &active_workspace.metadata.project_id)
            .expect("members initialized");

        let report = validate_data_integrity(
            app_data.path(),
            Some(active_workspace),
            Some(workspace.path().into()),
        );

        assert_eq!(report.failed_checks, 0);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceMetadata
                && check.status == DataIntegrityStatus::Skipped
                && check.severity == DataIntegritySeverity::Warning
        }));
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::MemberProfiles
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    #[test]
    fn validation_does_not_apply_read_only_skip_to_unrelated_requested_root() {
        let app_data = tempdir().expect("app data");
        let active_workspace_root = tempdir().expect("active workspace");
        let requested_workspace_root = tempdir().expect("requested workspace");
        let active_workspace = opened_workspace(
            active_workspace_root.path(),
            WorkspaceAccessMode::ReadOnly,
            true,
        );
        initialize_members(app_data.path(), &active_workspace.metadata.project_id)
            .expect("members initialized");

        let report = validate_data_integrity(
            app_data.path(),
            Some(active_workspace),
            Some(requested_workspace_root.path().into()),
        );

        assert_eq!(report.failed_checks, 1);
        assert_eq!(report.skipped_checks, 9);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceMetadata
                && check.status == DataIntegrityStatus::Failed
        }));
    }

    #[test]
    fn validation_reports_invalid_registry_without_hiding_other_checks() {
        let app_data = tempdir().expect("app data");
        fs::write(
            app_data.path().join("workspace-registry.json"),
            r#"{"schemaVersion":1,"entries":[{"projectId":"bad","path":"","name":"","firstOpenedAtMs":0,"lastOpenedAtMs":0}]}"#,
        )
        .expect("invalid registry written");

        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.failed_checks, 1);
        assert!(report.has_failures);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceRegistry
                && check.status == DataIntegrityStatus::Failed
        }));
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceFallbacks
                && check.status == DataIntegrityStatus::Passed
        }));
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::SkillLibrary
                && check.status == DataIntegrityStatus::Passed
        }));
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceSkillLinks
                && check.status == DataIntegrityStatus::Skipped
        }));
    }

    #[test]
    fn validation_reports_duplicate_manifest_entries() {
        let mut manifest = storage_manifest_entries();
        manifest.push(manifest[0].clone());
        let check = super::validate_manifest_completeness(&manifest);

        assert_eq!(check.status, DataIntegrityStatus::Failed);
    }

    #[test]
    fn validation_passes_persisted_empty_registry() {
        let app_data = tempdir().expect("app data");
        save_workspace_registry(app_data.path(), &WorkspaceRegistryDocument::default())
            .expect("registry saved");

        let report = validate_data_integrity(app_data.path(), None, None);

        assert_eq!(report.failed_checks, 0);
        assert_eq!(report.skipped_checks, 13);
        assert!(report.checks.iter().any(|check| {
            check.category == StorageCategory::WorkspaceRegistry
                && check.status == DataIntegrityStatus::Passed
        }));
    }

    fn write_legacy_chat_redb(app_data_dir: &Path, workspace_id: &str) {
        let legacy_dir = app_data_dir.join(workspace_id);
        fs::create_dir_all(&legacy_dir).expect("legacy chat dir");
        let db = redb::Database::create(legacy_dir.join("chat.redb")).expect("legacy redb");
        let conv_id = Ulid::new();
        let member_id = Ulid::new();
        let message_id = Ulid::new();
        let write_txn = db.begin_write().expect("legacy write txn");

        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_CONVERSATIONS)
                .expect("legacy conversations");
            let meta = TestLegacyConversationMeta {
                kind: TestLegacyConversationKind::Channel,
                created_at: 1_760_000_000_000,
                custom_name: Some("Legacy Workspace".to_owned()),
                is_default: true,
                last_message_at: Some(1_760_000_000_100),
                last_message_preview: Some("legacy hello".to_owned()),
            };
            let payload = bincode::serialize(&meta).expect("conversation encoded");
            table
                .insert(conv_id.0, payload.as_slice())
                .expect("legacy conversation inserted");
        }
        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_USER_CONVS)
                .expect("legacy user convs");
            let settings = TestLegacyUserConversationSettings {
                pinned: true,
                muted: false,
                last_read_message_id: Some(message_id.0),
                last_active_at: Some(1_760_000_000_100),
            };
            let payload = bincode::serialize(&settings).expect("settings encoded");
            table
                .insert((member_id.0, conv_id.0), payload.as_slice())
                .expect("legacy settings inserted");
        }
        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_MEMBERS)
                .expect("legacy members");
            let payload = bincode::serialize(&()).expect("member encoded");
            table
                .insert((conv_id.0, member_id.0), payload.as_slice())
                .expect("legacy member inserted");
        }
        {
            let mut table = write_txn
                .open_table(TEST_LEGACY_MESSAGES)
                .expect("legacy messages");
            let message = TestLegacyChatMessage {
                sender_id: Some(member_id.0),
                content: TestLegacyMessageContentDb::Text {
                    text: "legacy hello".to_owned(),
                },
                created_at: 1_760_000_000_100,
                is_ai: false,
                status: TestLegacyMessageStatus::Sent,
                attachment: None,
            };
            let payload = bincode::serialize(&message).expect("message encoded");
            table
                .insert((conv_id.0, message_id.0), payload.as_slice())
                .expect("legacy message inserted");
        }

        write_txn.commit().expect("legacy committed");
    }

    fn opened_workspace(
        root: &std::path::Path,
        access_mode: WorkspaceAccessMode,
        with_fallback: bool,
    ) -> OpenedWorkspace {
        let root_path = root.to_string_lossy().into_owned();
        let metadata = WorkspaceMetadata {
            schema_version: 1,
            project_id: "01K00000000000000000000000".to_owned(),
            name: "workspace".to_owned(),
            created_at_ms: 1_760_000_000_000,
            updated_at_ms: 1_760_000_000_000,
        };

        OpenedWorkspace {
            root_path: root_path.clone(),
            metadata: metadata.clone(),
            created: true,
            access_mode,
            fallback_state: with_fallback.then(|| WorkspaceFallbackState {
                reason: "read-only".to_owned(),
                fallback_path: "/app-data/workspace-fallbacks.json".to_owned(),
                limited_actions: vec!["workspace metadata writes".to_owned()],
                user_action: "grant write permission".to_owned(),
            }),
            registry_entry: WorkspaceRegistryEntry {
                project_id: metadata.project_id,
                path: root_path,
                name: metadata.name,
                first_opened_at_ms: metadata.created_at_ms,
                last_opened_at_ms: metadata.updated_at_ms,
            },
            registry_action: WorkspaceRegistryAction::Created,
        }
    }
}
