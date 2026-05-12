use crate::{
    contracts::{
        StorageCategory, StorageFormat, StorageManifestEntry, StorageOwner, StoragePathPolicy,
        StoragePrivacyClass,
    },
    domain::{
        notification::NOTIFICATION_PREFERENCES_FILE_NAME,
        settings::{
            APP_PREFERENCES_FILE_NAME, AVATAR_LIBRARY_DIR_NAME, PROFILE_SETTINGS_FILE_NAME,
        },
        workspace::{WORKSPACE_DIR_NAME, WORKSPACE_METADATA_FILE_NAME, WORKSPACE_SCHEMA_VERSION},
    },
    infrastructure::persistence::json_store::{
        app_preferences_store::APP_PREFERENCES_STORE_SCHEMA_VERSION,
        notification_preferences_store::NOTIFICATION_PREFERENCES_STORE_SCHEMA_VERSION,
        profile_settings_store::PROFILE_SETTINGS_STORE_SCHEMA_VERSION,
        skill_library_store::{SKILL_LIBRARY_FILE_NAME, SKILL_LIBRARY_SCHEMA_VERSION},
        workspace_fallback_store::{
            WORKSPACE_FALLBACK_FILE_NAME, WORKSPACE_FALLBACK_SCHEMA_VERSION,
        },
        workspace_registry_store::{
            WORKSPACE_REGISTRY_FILE_NAME, WORKSPACE_REGISTRY_SCHEMA_VERSION,
        },
        workspace_roadmap_store::{
            WORKSPACE_ROADMAP_GOALS_SCHEMA_VERSION, WORKSPACE_ROADMAP_TASKS_SCHEMA_VERSION,
        },
        workspace_skill_link_store::WORKSPACE_SKILL_LINKS_SCHEMA_VERSION,
    },
    infrastructure::persistence::sqlite::global_database::{
        GLOBAL_SQLITE_FILE_NAME, GLOBAL_SQLITE_RELATIVE_PATH, GLOBAL_SQLITE_SCHEMA_VERSION,
    },
    infrastructure::persistence::sqlite::workspace_database::{
        WORKSPACE_SQLITE_FILE_NAME, WORKSPACE_SQLITE_RELATIVE_PATH, WORKSPACE_SQLITE_SCHEMA_VERSION,
    },
};

pub fn storage_manifest_entries() -> Vec<StorageManifestEntry> {
    vec![
        StorageManifestEntry {
            id: "workspace.metadata".to_owned(),
            owner: StorageOwner::Workspace,
            category: StorageCategory::WorkspaceMetadata,
            description: "Workspace-local orchlet identity metadata.".to_owned(),
            path_policy: StoragePathPolicy::WorkspaceLocalRelative,
            relative_path: Some(format!(
                "{}/{}",
                WORKSPACE_DIR_NAME, WORKSPACE_METADATA_FILE_NAME
            )),
            file_name: None,
            format: StorageFormat::Json,
            schema_version: WORKSPACE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::LocalPath,
            fixture_required: true,
            validation_check_id: "workspace.metadata.read_validate".to_owned(),
            notes: "Missing file is valid only when no workspace is active or the active workspace is in read-only fallback."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "workspace.registry".to_owned(),
            owner: StorageOwner::Workspace,
            category: StorageCategory::WorkspaceRegistry,
            description: "App-data workspace registry and recent workspace source.".to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: None,
            file_name: Some(WORKSPACE_REGISTRY_FILE_NAME.to_owned()),
            format: StorageFormat::Json,
            schema_version: WORKSPACE_REGISTRY_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "workspace.registry.load_validate".to_owned(),
            notes: "Recent workspaces are derived from this file; there is no separate recent-workspaces store."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "workspace.fallbacks".to_owned(),
            owner: StorageOwner::Workspace,
            category: StorageCategory::WorkspaceFallbacks,
            description: "App-data fallback identities for read-only workspace-local metadata."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: None,
            file_name: Some(WORKSPACE_FALLBACK_FILE_NAME.to_owned()),
            format: StorageFormat::Json,
            schema_version: WORKSPACE_FALLBACK_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_fallback_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_fallback_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "workspace.fallbacks.load_validate".to_owned(),
            notes: "This store preserves stable project ids when workspace-local metadata cannot be written."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "settings.preferences".to_owned(),
            owner: StorageOwner::Settings,
            category: StorageCategory::AppPreferences,
            description: "App-data theme and language preferences shared across windows."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: Some(format!("settings/{}", APP_PREFERENCES_FILE_NAME)),
            file_name: Some(APP_PREFERENCES_FILE_NAME.to_owned()),
            format: StorageFormat::Json,
            schema_version: APP_PREFERENCES_STORE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/app_preferences_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/app_preferences_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "settings.preferences.load_validate".to_owned(),
            notes: "Theme and language are local app preferences; frontend localStorage is only a browser preview cache."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "settings.notifications".to_owned(),
            owner: StorageOwner::Settings,
            category: StorageCategory::NotificationPreferences,
            description: "App-data local notification, sound, preview and do-not-disturb preferences."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: Some(format!("settings/{}", NOTIFICATION_PREFERENCES_FILE_NAME)),
            file_name: Some(NOTIFICATION_PREFERENCES_FILE_NAME.to_owned()),
            format: StorageFormat::Json,
            schema_version: NOTIFICATION_PREFERENCES_STORE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/notification_preferences_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/notification_preferences_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "settings.notifications.load_validate".to_owned(),
            notes: "Notification preferences are local app settings; OS notification permission is represented but no platform adapter is stored."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "settings.profile".to_owned(),
            owner: StorageOwner::Settings,
            category: StorageCategory::ProfileSettings,
            description: "App-data local profile display identity, timezone, status and status message."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: Some(format!("settings/{}", PROFILE_SETTINGS_FILE_NAME)),
            file_name: Some(PROFILE_SETTINGS_FILE_NAME.to_owned()),
            format: StorageFormat::Json,
            schema_version: PROFILE_SETTINGS_STORE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "settings.profile.load_validate".to_owned(),
            notes: "Local-only profile settings; no remote account, email, team membership or authentication fields are stored."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "settings.avatarLibrary".to_owned(),
            owner: StorageOwner::Settings,
            category: StorageCategory::AvatarLibrary,
            description: "App-data local avatar library for uploaded profile images.".to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: Some(AVATAR_LIBRARY_DIR_NAME.to_owned()),
            file_name: None,
            format: StorageFormat::Binary,
            schema_version: 1,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "settings.avatarLibrary.load_validate".to_owned(),
            notes: "Uploaded avatar images live in app data and are referenced by local profile settings; presets are saved by id and are not copied into workspaces."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "member.profiles".to_owned(),
            owner: StorageOwner::Member,
            category: StorageCategory::MemberProfiles,
            description: "Workspace member profiles, default owner, invite runtime selections, permissions and isolation flags."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs".to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs".to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "member.profiles.schema_validate".to_owned(),
            notes: "Contains member identity, runtime selection, permissions and isolation flags only; terminal sessions are not started or persisted by member invite stories."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "terminal.tabs".to_owned(),
            owner: StorageOwner::Terminal,
            category: StorageCategory::TerminalTabs,
            description: "Workspace terminal tab metadata, ordering, pin state and latest attached session id."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/terminal_tab_repository.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/terminal_tab_repository.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "terminal.tabs.schema_validate".to_owned(),
            notes: "Contains terminal tab labels, pin/order state, closed timestamp and latest terminalSessionId only; PTY handles, output, scrollback and snapshots are not persisted here."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "contact.profiles".to_owned(),
            owner: StorageOwner::Contact,
            category: StorageCategory::ContactProfiles,
            description: "Global app-data contacts created from administrator/contact invite flows."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: Some(GLOBAL_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(GLOBAL_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: GLOBAL_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/contact_repository.rs".to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/contact_repository.rs".to_owned(),
            ],
            privacy_class: StoragePrivacyClass::AppState,
            fixture_required: true,
            validation_check_id: "contact.profiles.schema_validate".to_owned(),
            notes: "Contains global local contacts only; no remote accounts, invite links, billing or server permissions."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "conversation.records".to_owned(),
            owner: StorageOwner::Chat,
            category: StorageCategory::ConversationRecords,
            description: "Workspace channel, group and private conversation list metadata."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "conversation.records.schema_validate".to_owned(),
            notes: "Contains conversation list records only: default channel, group/private entries, pin/mute/delete state, unread display fields and last activity metadata. Messages, read positions, notifications and dispatch are not stored here."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "conversation.members".to_owned(),
            owner: StorageOwner::Chat,
            category: StorageCategory::ConversationMembers,
            description: "Workspace group conversation membership records.".to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "conversation.members.schema_validate".to_owned(),
            notes: "Contains group conversation member ids only; member removal is not cascaded by this story."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "message.records".to_owned(),
            owner: StorageOwner::Chat,
            category: StorageCategory::MessageRecords,
            description: "Workspace-local chat message records and local send status."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "message.records.schema_validate".to_owned(),
            notes: "Contains plain text local chat messages and sending/sent/failed status only; dispatch, terminal output, attachments and reactions are future domains."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "message.mentions".to_owned(),
            owner: StorageOwner::Chat,
            category: StorageCategory::MessageMentions,
            description: "Workspace-local structured member mentions attached to chat messages."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "message.mentions.schema_validate".to_owned(),
            notes: "Contains explicit member ids mentioned in persisted messages only; @all fan-out and dispatch routing are future domains."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "conversation.read_positions".to_owned(),
            owner: StorageOwner::Chat,
            category: StorageCategory::ConversationReadPositions,
            description: "Workspace-local conversation read position records.".to_owned(),
            path_policy: StoragePathPolicy::AppDataWorkspaceFile,
            relative_path: Some(WORKSPACE_SQLITE_RELATIVE_PATH.to_owned()),
            file_name: Some(WORKSPACE_SQLITE_FILE_NAME.to_owned()),
            format: StorageFormat::Sqlite,
            schema_version: WORKSPACE_SQLITE_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "conversation.read_positions.schema_validate".to_owned(),
            notes: "Contains local read cursor per conversation only; multi-member read receipts and notifications are future domains."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "skill.library".to_owned(),
            owner: StorageOwner::Skill,
            category: StorageCategory::SkillLibrary,
            description: "App-data local skill library records imported from user-selected folders."
                .to_owned(),
            path_policy: StoragePathPolicy::AppDataFile,
            relative_path: Some(format!("skills/{}", SKILL_LIBRARY_FILE_NAME)),
            file_name: Some(SKILL_LIBRARY_FILE_NAME.to_owned()),
            format: StorageFormat::Json,
            schema_version: SKILL_LIBRARY_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/skill_library_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/skill_library_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::LocalPath,
            fixture_required: true,
            validation_check_id: "skill.library.load_validate".to_owned(),
            notes: "Contains local skill folder paths and metadata only; skill contents are not copied, uploaded or executed by Story 6.1."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "skill.workspace_links".to_owned(),
            owner: StorageOwner::Skill,
            category: StorageCategory::WorkspaceSkillLinks,
            description: "Workspace-local links from the current project to app-data skill library records."
                .to_owned(),
            path_policy: StoragePathPolicy::WorkspaceLocalRelative,
            relative_path: Some(format!("{}/skills/skill-links.json", WORKSPACE_DIR_NAME)),
            file_name: Some("skill-links.json".to_owned()),
            format: StorageFormat::Json,
            schema_version: WORKSPACE_SKILL_LINKS_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_skill_link_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_skill_link_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::LocalPath,
            fixture_required: true,
            validation_check_id: "skill.workspace_links.load_validate".to_owned(),
            notes: "Contains workspace link metadata and symlink fallback status only; unlink removes workspace association without deleting app library records or user source folders."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "roadmap.tasks".to_owned(),
            owner: StorageOwner::Roadmap,
            category: StorageCategory::RoadmapTasks,
            description: "Workspace-local roadmap task records, status and ordering metadata."
                .to_owned(),
            path_policy: StoragePathPolicy::WorkspaceLocalRelative,
            relative_path: Some(format!("{}/roadmap/tasks.json", WORKSPACE_DIR_NAME)),
            file_name: Some("tasks.json".to_owned()),
            format: StorageFormat::Json,
            schema_version: WORKSPACE_ROADMAP_TASKS_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_roadmap_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_roadmap_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "roadmap.tasks.load_validate".to_owned(),
            notes: "Contains task title, detail, status and ordering metadata only; progress is derived at runtime."
                .to_owned(),
        },
        StorageManifestEntry {
            id: "roadmap.goals".to_owned(),
            owner: StorageOwner::Roadmap,
            category: StorageCategory::RoadmapGoals,
            description: "Workspace-local roadmap goals and task relationship metadata."
                .to_owned(),
            path_policy: StoragePathPolicy::WorkspaceLocalRelative,
            relative_path: Some(format!("{}/roadmap/goals.json", WORKSPACE_DIR_NAME)),
            file_name: Some("goals.json".to_owned()),
            format: StorageFormat::Json,
            schema_version: WORKSPACE_ROADMAP_GOALS_SCHEMA_VERSION,
            readers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_roadmap_store.rs"
                    .to_owned(),
            ],
            writers: vec![
                "src-tauri/src/infrastructure/persistence/json_store/workspace_roadmap_store.rs"
                    .to_owned(),
            ],
            privacy_class: StoragePrivacyClass::WorkspaceData,
            fixture_required: true,
            validation_check_id: "roadmap.goals.load_validate".to_owned(),
            notes: "Contains goal title, related roadmap task IDs and ordering metadata only; progress is derived from task status at runtime."
                .to_owned(),
        },
    ]
}
