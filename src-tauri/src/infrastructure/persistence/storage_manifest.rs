use crate::{
    contracts::{
        StorageCategory, StorageFormat, StorageManifestEntry, StorageOwner, StoragePathPolicy,
        StoragePrivacyClass,
    },
    domain::workspace::{
        WORKSPACE_DIR_NAME, WORKSPACE_METADATA_FILE_NAME, WORKSPACE_SCHEMA_VERSION,
    },
    infrastructure::persistence::json_store::{
        workspace_fallback_store::{
            WORKSPACE_FALLBACK_FILE_NAME, WORKSPACE_FALLBACK_SCHEMA_VERSION,
        },
        workspace_registry_store::{
            WORKSPACE_REGISTRY_FILE_NAME, WORKSPACE_REGISTRY_SCHEMA_VERSION,
        },
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
            notes: "Contains conversation list records only: default channel, group/private entries, pin/unread display fields and last activity metadata. Messages, read positions, notifications and dispatch are not stored here."
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
            notes: "Contains plain text local chat messages and sending/sent/failed status only; dispatch, terminal output, attachments, mentions and reactions are future domains."
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
    ]
}
