use std::{fs, path::Path};

use orchlet_lib::{
    app::data_integrity::validate_data_integrity,
    app::members::initialize_members,
    contracts::{
        AppLanguage, AppPreferencesSettingsSnapshot, AppTheme, ChatMessageProfile,
        ChatMessageStatus, ContactProfile, ConversationKind, ConversationProfile,
        ConversationReadPositionProfile, DataIntegrityReport, DataIntegrityStatus, MemberProfile,
        NotificationPreferencesSnapshot, ProfileAvatarKind, ProfileAvatarSnapshot,
        ProfileSettingsSnapshot, ProfileStatus, RoadmapGoalEntry, RoadmapTaskEntry,
        RoadmapTaskStatus, ShortcutKeymapProfile, ShortcutPreferencesSnapshot, SkillLibraryEntry,
        TerminalTabProfile, TerminalTabStatus, WorkspaceMetadata, WorkspaceSkillLinkEntry,
        WorkspaceSkillLinkMode,
    },
    domain::workspace::validate_workspace_metadata,
    infrastructure::persistence::json_store::{
        app_preferences_store::load_app_preferences,
        notification_preferences_store::load_notification_preferences,
        profile_settings_store::load_profile_settings,
        shortcut_preferences_store::load_shortcut_preferences,
        workspace_fallback_store::load_workspace_fallbacks,
        workspace_registry_store::load_workspace_registry,
    },
};
use serde::de::DeserializeOwned;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqliteSchemaFixture {
    schema_version: u32,
    status: String,
    database_scope: String,
    database_file: String,
    tables: Vec<serde_json::Value>,
    migration_files: Vec<String>,
    validation_paths: Vec<String>,
    owned_by_future_stories: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MemberProfilesFixture {
    schema_version: u32,
    workspace_id: String,
    members: Vec<MemberProfile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContactProfilesFixture {
    schema_version: u32,
    database_scope: String,
    database_file: String,
    contacts: Vec<ContactProfile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConversationListFixture {
    schema_version: u32,
    workspace_id: String,
    conversations: Vec<ConversationProfile>,
    conversation_members: Vec<ConversationMembershipFixture>,
    ordering_rule: String,
    excluded_future_tables: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConversationMembershipFixture {
    conversation_id: String,
    workspace_id: String,
    member_id: String,
    created_at_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageHistoryFixture {
    schema_version: u32,
    workspace_id: String,
    conversation_id: String,
    messages: Vec<ChatMessageProfile>,
    read_positions: Vec<ConversationReadPositionProfile>,
    message_mentions: Vec<MessageMentionFixture>,
    pagination_rule: String,
    excluded_future_tables: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageMentionFixture {
    workspace_id: String,
    conversation_id: String,
    message_id: String,
    member_id: String,
    created_at_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TerminalTabsFixture {
    schema_version: u32,
    workspace_id: String,
    tabs: Vec<TerminalTabProfile>,
    ordering_rule: String,
    excluded_payloads: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkillLibraryFixture {
    schema_version: u32,
    skills: Vec<SkillLibraryEntry>,
    duplicate_policy: Option<String>,
    excluded_payloads: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSkillLinksFixture {
    schema_version: u32,
    skills: Vec<WorkspaceSkillLinkEntry>,
    duplicate_policy: Option<String>,
    fallback_policy: Option<String>,
    excluded_payloads: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoadmapTasksFixture {
    schema_version: u32,
    tasks: Vec<RoadmapTaskEntry>,
    ordering_rule: String,
    excluded_future_fields: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoadmapGoalsFixture {
    schema_version: u32,
    goals: Vec<RoadmapGoalEntry>,
    ordering_rule: String,
    progress_rule: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileSettingsFixture {
    schema_version: u32,
    display_name: String,
    timezone: String,
    status: ProfileStatus,
    status_message: Option<String>,
    avatar: ProfileAvatarSnapshot,
    created_at_ms: u64,
    updated_at_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppPreferencesFixture {
    schema_version: u32,
    theme: AppTheme,
    language: AppLanguage,
    created_at_ms: u64,
    updated_at_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShortcutPreferencesFixture {
    #[serde(flatten)]
    preferences: ShortcutPreferencesSnapshot,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NotificationPreferencesFixture {
    #[serde(flatten)]
    preferences: NotificationPreferencesSnapshot,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TerminalStreamFixture {
    schema_version: u32,
    case: String,
    events: Vec<TerminalStreamEvent>,
    base_snapshot: Option<TerminalSnapshot>,
    expected_snapshot: TerminalSnapshot,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TerminalStreamEvent {
    schema_version: u32,
    session_id: String,
    seq: u64,
    chunk: String,
    kind: String,
    emitted_at_ms: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TerminalSnapshot {
    session_id: String,
    last_seq: u64,
    text: String,
}

#[test]
fn workspace_schema_fixture_matches_domain_validator() {
    let metadata: WorkspaceMetadata =
        read_fixture("../fixtures/schema/valid-workspace/.orchlet/workspace.json");

    validate_workspace_metadata(&metadata).expect("workspace metadata fixture is valid");
}

#[test]
fn current_json_store_fixtures_pass_data_integrity_validation() {
    let fixture_app_data = fixture_path("../fixtures/data-integrity/valid-json-stores/app-data");
    let fixture_workspace = fixture_path("../fixtures/data-integrity/valid-json-stores/workspace");
    let temp = tempfile::tempdir().expect("fixture temp");
    let app_data = temp.path().join("app-data");
    let workspace_root = temp.path().join("workspace");

    fs::create_dir_all(&app_data).expect("app data dir");
    fs::create_dir_all(workspace_root.join(".orchlet")).expect("workspace metadata dir");
    fs::copy(
        fixture_app_data.join("workspace-registry.json"),
        app_data.join("workspace-registry.json"),
    )
    .expect("registry copied");
    fs::copy(
        fixture_app_data.join("workspace-fallbacks.json"),
        app_data.join("workspace-fallbacks.json"),
    )
    .expect("fallbacks copied");
    fs::create_dir_all(app_data.join("settings")).expect("settings dir");
    fs::copy(
        fixture_app_data.join("settings/preferences.json"),
        app_data.join("settings/preferences.json"),
    )
    .expect("app preferences copied");
    fs::copy(
        fixture_app_data.join("settings/shortcuts.json"),
        app_data.join("settings/shortcuts.json"),
    )
    .expect("shortcut preferences copied");
    fs::copy(
        fixture_app_data.join("settings/notifications.json"),
        app_data.join("settings/notifications.json"),
    )
    .expect("notification preferences copied");
    fs::copy(
        fixture_app_data.join("settings/profile.json"),
        app_data.join("settings/profile.json"),
    )
    .expect("profile settings copied");
    fs::create_dir_all(app_data.join("avatars/uploads")).expect("avatar uploads dir");
    fs::copy(
        fixture_app_data.join("avatars/uploads/01KAVATARUPLOAD000000000001.png"),
        app_data.join("avatars/uploads/01KAVATARUPLOAD000000000001.png"),
    )
    .expect("avatar upload copied");
    fs::create_dir_all(app_data.join("skills")).expect("skills dir");
    fs::copy(
        fixture_app_data.join("skills/skill-library.json"),
        app_data.join("skills/skill-library.json"),
    )
    .expect("skill library copied");
    fs::copy(
        fixture_workspace.join(".orchlet/workspace.json"),
        workspace_root.join(".orchlet/workspace.json"),
    )
    .expect("metadata copied");
    fs::create_dir_all(workspace_root.join(".orchlet/skills")).expect("workspace skills dir");
    fs::copy(
        fixture_workspace.join(".orchlet/skills/skill-links.json"),
        workspace_root.join(".orchlet/skills/skill-links.json"),
    )
    .expect("workspace skill links copied");
    fs::create_dir_all(workspace_root.join(".orchlet/roadmap")).expect("workspace roadmap dir");
    fs::copy(
        fixture_workspace.join(".orchlet/roadmap/tasks.json"),
        workspace_root.join(".orchlet/roadmap/tasks.json"),
    )
    .expect("workspace roadmap tasks copied");
    fs::copy(
        fixture_workspace.join(".orchlet/roadmap/goals.json"),
        workspace_root.join(".orchlet/roadmap/goals.json"),
    )
    .expect("workspace roadmap goals copied");
    let metadata: WorkspaceMetadata = read_fixture(
        "../fixtures/data-integrity/valid-json-stores/workspace/.orchlet/workspace.json",
    );
    initialize_members(&app_data, &metadata.project_id).expect("members initialized");

    load_workspace_registry(&app_data).expect("registry fixture loads");
    load_workspace_fallbacks(&app_data).expect("fallback fixture loads");
    load_app_preferences(&app_data).expect("app preferences fixture loads");
    load_shortcut_preferences(&app_data).expect("shortcut preferences fixture loads");
    load_notification_preferences(&app_data).expect("notification preferences fixture loads");
    load_profile_settings(&app_data).expect("profile settings fixture loads");

    let report = validate_data_integrity(app_data, None, Some(workspace_root));

    assert_eq!(report.total_checks, 21);
    assert_eq!(report.failed_checks, 0);
    assert_eq!(report.skipped_checks, 0);
    assert!(report
        .checks
        .iter()
        .all(|check| check.status == DataIntegrityStatus::Passed));
}

#[test]
fn invalid_registry_fixture_exercises_failure_path_without_hiding_other_checks() {
    let app_data = fixture_path("../fixtures/data-integrity/invalid-registry/app-data");
    let report = validate_data_integrity(app_data, None, None);

    assert_eq!(report.total_checks, 21);
    assert_eq!(report.failed_checks, 1);
    assert_eq!(report.skipped_checks, 11);
    assert!(report.has_failures);
}

#[test]
fn data_integrity_report_fixtures_have_consistent_counts() {
    let passed: DataIntegrityReport =
        read_fixture("../fixtures/data-integrity/reports/passed-report.json");
    let failed: DataIntegrityReport =
        read_fixture("../fixtures/data-integrity/reports/failed-registry-report.json");

    assert_report_counts(&passed);
    assert_report_counts(&failed);
    assert!(!passed.has_failures);
    assert!(failed.has_failures);
}

#[test]
fn sqlite_schema_fixture_tracks_workspace_sqlite_stores() {
    let fixture: SqliteSchemaFixture =
        read_fixture("../fixtures/schema/sqlite-workspace-v1/schema-manifest.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.status, "implemented");
    assert_eq!(fixture.database_scope, "workspace");
    assert_eq!(
        fixture.database_file,
        "workspaces/<workspaceId>/orchlet.sqlite"
    );
    assert_eq!(
        fixture.tables,
        vec![
            "schema_migrations",
            "members",
            "conversations",
            "conversation_members",
            "messages",
            "message_mentions",
            "conversation_read_positions",
            "terminal_tabs"
        ]
    );
    assert_eq!(
        fixture.migration_files,
        vec![
            "202605112300__members.sql",
            "202605120930__member_permissions.sql",
            "202605121210__private_conversations.sql",
            "202605121300__conversation_list_groups.sql",
            "202605121430__messages_read_positions.sql",
            "202605121600__conversation_management.sql",
            "202605121700__message_mentions.sql",
            "202605121900__terminal_tabs.sql"
        ]
    );
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("exactly one owner")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("default channel")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("conversation_members")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("is_muted")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("messages records")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("message_mentions")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("conversation_read_positions")));
    assert!(fixture
        .validation_paths
        .iter()
        .any(|path| path.contains("terminal_tabs")));
    assert!(fixture
        .owned_by_future_stories
        .iter()
        .any(|domain| domain == "notification"));
}

#[test]
fn member_profile_fixture_covers_owner_and_invited_assistant() {
    let fixture: MemberProfilesFixture =
        read_fixture("../fixtures/schema/members-v1/member-profiles.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.workspace_id, "01K00000000000000000000000");
    assert_eq!(fixture.members.len(), 4);
    assert!(fixture
        .members
        .iter()
        .any(|member| member.role == orchlet_lib::contracts::MemberRole::Owner));
    assert!(fixture.members.iter().any(
        |member| member.runtime.kind == orchlet_lib::contracts::MemberRuntimeKind::BuiltInAiCli
    ));
    assert!(fixture
        .members
        .iter()
        .filter(|member| member.role == orchlet_lib::contracts::MemberRole::Assistant)
        .all(|member| member.permissions.can_remove && member.isolation.sandboxed));
    assert!(fixture
        .members
        .iter()
        .any(|member| member.role == orchlet_lib::contracts::MemberRole::Admin));
}

#[test]
fn contact_profile_fixture_covers_global_admin_contact() {
    let fixture: ContactProfilesFixture =
        read_fixture("../fixtures/schema/contacts-v1/contact-profiles.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.database_scope, "global");
    assert_eq!(fixture.database_file, "global/orchlet.sqlite");
    assert_eq!(fixture.contacts.len(), 1);
    assert_eq!(
        fixture.contacts[0].contact_kind,
        orchlet_lib::contracts::ContactKind::Administrator
    );
    assert_eq!(fixture.contacts[0].display_name, "External Admin");
}

#[test]
fn conversation_list_fixture_covers_channel_group_private_and_membership() {
    let fixture: ConversationListFixture =
        read_fixture("../fixtures/schema/conversations-v1/conversation-list.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.workspace_id, "01K00000000000000000000000");
    assert_eq!(fixture.conversations.len(), 3);
    assert_eq!(
        fixture
            .conversations
            .iter()
            .filter(|conversation| {
                conversation.kind == ConversationKind::Channel && conversation.is_default
            })
            .count(),
        1
    );
    assert!(fixture.conversations.iter().any(|conversation| {
        conversation.kind == ConversationKind::Group
            && conversation.unread_count > 0
            && conversation.is_muted
            && !conversation.members.is_empty()
    }));
    assert!(fixture.conversations.iter().any(|conversation| {
        conversation.kind == ConversationKind::Private && conversation.participant_id.is_some()
    }));
    assert_eq!(fixture.conversation_members.len(), 1);
    assert_eq!(
        fixture.conversation_members[0].conversation_id,
        "01K00000000000000000000051"
    );
    assert_eq!(
        fixture.conversation_members[0].workspace_id,
        fixture.workspace_id
    );
    assert!(fixture.conversation_members[0].created_at_ms > 0);
    assert!(fixture.conversation_members[0].member_id.starts_with("01K"));
    assert!(fixture.ordering_rule.contains("pinned"));
    assert!(!fixture
        .excluded_future_tables
        .iter()
        .any(|table| table == "messages"));
}

#[test]
fn message_history_fixture_covers_status_pagination_and_read_position() {
    let fixture: MessageHistoryFixture =
        read_fixture("../fixtures/schema/messages-v1/message-history.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.workspace_id, "01K00000000000000000000000");
    assert_eq!(fixture.conversation_id, "01K00000000000000000000050");
    assert_eq!(fixture.messages.len(), 3);
    assert!(fixture
        .messages
        .iter()
        .any(|message| message.status == ChatMessageStatus::Sent));
    assert!(fixture
        .messages
        .iter()
        .any(|message| !message.mentioned_member_ids.is_empty()));
    assert!(fixture
        .messages
        .iter()
        .any(|message| message.status == ChatMessageStatus::Failed));
    assert!(fixture
        .messages
        .windows(2)
        .all(|window| window[0].created_at_ms <= window[1].created_at_ms));
    assert_eq!(fixture.read_positions.len(), 1);
    assert_eq!(
        fixture.read_positions[0].last_read_message_id,
        "01K00000000000000000000070"
    );
    assert!(fixture.pagination_rule.contains("beforeMessageId"));
    assert_eq!(fixture.message_mentions.len(), 1);
    assert_eq!(
        fixture.message_mentions[0].workspace_id,
        fixture.workspace_id
    );
    assert_eq!(
        fixture.message_mentions[0].conversation_id,
        fixture.conversation_id
    );
    assert_eq!(
        fixture.message_mentions[0].message_id,
        "01K00000000000000000000071"
    );
    assert_eq!(
        fixture.message_mentions[0].member_id,
        "01K00000000000000000000031"
    );
    assert!(fixture.message_mentions[0].created_at_ms > 0);
    assert!(fixture
        .excluded_future_tables
        .iter()
        .any(|table| table == "terminal_dispatches"));
}

#[test]
fn terminal_tabs_fixture_covers_ordering_restore_metadata_and_excluded_payloads() {
    let fixture: TerminalTabsFixture =
        read_fixture("../fixtures/schema/terminal-tabs-v1/terminal-tabs.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.workspace_id, "01K00000000000000000000000");
    assert_eq!(fixture.tabs.len(), 2);
    assert!(fixture
        .tabs
        .iter()
        .any(|tab| tab.status == TerminalTabStatus::Open && tab.is_pinned));
    assert!(fixture
        .tabs
        .iter()
        .any(|tab| { tab.status == TerminalTabStatus::Closed && tab.closed_at_ms.is_some() }));
    assert!(fixture
        .tabs
        .iter()
        .all(|tab| tab.workspace_id == fixture.workspace_id));
    assert!(fixture.ordering_rule.contains("Pinned"));
    assert!(fixture
        .excluded_payloads
        .iter()
        .any(|payload| payload.contains("output")));
    assert!(fixture
        .excluded_payloads
        .iter()
        .any(|payload| payload.contains("scrollback")));
}

#[test]
fn skill_library_fixture_covers_local_import_records() {
    let fixture: SkillLibraryFixture =
        read_fixture("../fixtures/schema/skills-v1/skill-library.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.skills.len(), 1);
    assert_eq!(fixture.skills[0].name, "Local Review");
    assert_eq!(
        fixture.skills[0].source,
        orchlet_lib::contracts::SkillSource::LocalFolder
    );
    assert!(fixture.skills[0].manifest_path.ends_with("SKILL.md"));
    assert!(fixture
        .duplicate_policy
        .as_deref()
        .unwrap_or_default()
        .contains("updates"));
    assert!(fixture
        .excluded_payloads
        .unwrap_or_default()
        .iter()
        .any(|payload| payload.contains("contents")));
}

#[test]
fn workspace_skill_links_fixture_covers_manifest_fallback_records() {
    let fixture: WorkspaceSkillLinksFixture =
        read_fixture("../fixtures/schema/skills-v1/workspace-skill-links.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.skills.len(), 1);
    assert_eq!(fixture.skills[0].name, "Local Review");
    assert_eq!(
        fixture.skills[0].link_mode,
        WorkspaceSkillLinkMode::Manifest
    );
    assert!(fixture.skills[0].unavailable_reason.is_some());
    assert!(fixture
        .duplicate_policy
        .as_deref()
        .unwrap_or_default()
        .contains("unique"));
    assert!(fixture
        .fallback_policy
        .as_deref()
        .unwrap_or_default()
        .contains("manifest"));
    assert!(fixture
        .excluded_payloads
        .unwrap_or_default()
        .iter()
        .any(|payload| payload.contains("contents")));
}

#[test]
fn roadmap_tasks_fixture_covers_status_and_ordering_metadata() {
    let fixture: RoadmapTasksFixture =
        read_fixture("../fixtures/schema/roadmap-v1/roadmap-tasks.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.tasks.len(), 2);
    assert_eq!(fixture.tasks[0].title, "Ship MVP");
    assert_eq!(fixture.tasks[0].status, RoadmapTaskStatus::Pending);
    assert_eq!(fixture.tasks[0].sort_order, 0);
    assert_eq!(fixture.tasks[1].status, RoadmapTaskStatus::InProgress);
    assert!(fixture
        .tasks
        .windows(2)
        .all(|window| window[0].sort_order < window[1].sort_order));
    assert!(fixture.ordering_rule.contains("sortOrder"));
    assert!(fixture
        .excluded_future_fields
        .iter()
        .any(|field| field.contains("dependencies") || field.contains("remote sync")));
}

#[test]
fn roadmap_goals_fixture_covers_related_tasks_and_progress_policy() {
    let fixture: RoadmapGoalsFixture =
        read_fixture("../fixtures/schema/roadmap-v1/roadmap-goals.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.goals.len(), 1);
    assert_eq!(fixture.goals[0].title, "Launch beta");
    assert_eq!(fixture.goals[0].task_ids.len(), 2);
    assert_eq!(fixture.goals[0].sort_order, 0);
    assert!(fixture.ordering_rule.contains("sortOrder"));
    assert!(fixture.progress_rule.contains("derived"));
}

#[test]
fn profile_settings_fixture_covers_local_identity_status_and_message() {
    let fixture: ProfileSettingsFixture =
        read_fixture("../fixtures/schema/settings-v1/profile-settings.json");
    let snapshot: ProfileSettingsSnapshot =
        read_fixture("../fixtures/schema/settings-v1/profile-settings.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.display_name, "Dana");
    assert_eq!(fixture.timezone, "Asia/Shanghai");
    assert_eq!(fixture.status, ProfileStatus::Working);
    assert_eq!(
        fixture.status_message.as_deref(),
        Some("Reviewing Story 7.2")
    );
    assert_eq!(fixture.avatar.kind, ProfileAvatarKind::Uploaded);
    assert_eq!(
        fixture.avatar.library_relative_path.as_deref(),
        Some("avatars/uploads/01KAVATARUPLOAD000000000001.png")
    );
    assert!(fixture.updated_at_ms >= fixture.created_at_ms);
    assert_eq!(snapshot.status, ProfileStatus::Working);
    assert_eq!(
        snapshot.avatar.as_ref().expect("avatar").kind,
        ProfileAvatarKind::Uploaded
    );
}

#[test]
fn app_preferences_fixture_covers_theme_and_language() {
    let fixture: AppPreferencesFixture =
        read_fixture("../fixtures/schema/settings-v1/app-preferences.json");
    let snapshot: AppPreferencesSettingsSnapshot =
        read_fixture("../fixtures/schema/settings-v1/app-preferences.json");

    assert_eq!(fixture.schema_version, 1);
    assert_eq!(fixture.theme, AppTheme::Dark);
    assert_eq!(fixture.language, AppLanguage::EnUs);
    assert!(fixture.updated_at_ms >= fixture.created_at_ms);
    assert_eq!(snapshot.theme, AppTheme::Dark);
    assert_eq!(snapshot.language, AppLanguage::EnUs);
}

#[test]
fn shortcut_preferences_fixture_covers_profile_actions_and_unavailable_state() {
    let fixture: ShortcutPreferencesFixture =
        read_fixture("../fixtures/schema/settings-v1/shortcut-preferences.json");
    let preferences = fixture.preferences;

    assert_eq!(preferences.schema_version, 1);
    assert_eq!(preferences.profile, ShortcutKeymapProfile::Default);
    assert!(preferences.shortcuts_enabled);
    assert!(preferences.shortcut_hints_enabled);
    assert_eq!(preferences.disabled_action_ids, vec!["chat.send"]);
    assert_eq!(preferences.bindings.len(), 13);
    assert!(preferences
        .bindings
        .iter()
        .any(|binding| binding.action_id == "chat.send" && !binding.enabled));
    assert!(preferences.bindings.iter().any(|binding| {
        binding.action_id == "app.globalOpenSettings"
            && !binding.available
            && binding.unavailable_reason.is_some()
    }));
    assert!(preferences.updated_at_ms >= preferences.created_at_ms);
}

#[test]
fn notification_preferences_fixture_covers_local_notification_controls() {
    let fixture: NotificationPreferencesFixture =
        read_fixture("../fixtures/schema/settings-v1/notification-preferences.json");
    let preferences = fixture.preferences;

    assert_eq!(preferences.schema_version, 1);
    assert!(preferences.desktop_notifications_enabled);
    assert!(!preferences.sound_enabled);
    assert!(preferences.mentions_only);
    assert!(!preferences.message_preview_enabled);
    assert!(preferences.dnd_enabled);
    assert_eq!(preferences.dnd_start_minutes, 1260);
    assert_eq!(preferences.dnd_end_minutes, 450);
    assert_eq!(
        preferences.permission.state,
        orchlet_lib::contracts::NotificationPermissionState::Unavailable
    );
    assert!(preferences.updated_at_ms >= preferences.created_at_ms);
}

#[test]
fn terminal_stream_fixtures_rebuild_expected_snapshots_by_sequence() {
    for relative_path in [
        "../fixtures/terminal-streams/ordered-output.json",
        "../fixtures/terminal-streams/out-of-order-arrival.json",
        "../fixtures/terminal-streams/snapshot-recovery.json",
    ] {
        let mut fixture: TerminalStreamFixture = read_fixture(relative_path);

        assert_eq!(fixture.schema_version, 1);
        assert!(!fixture.case.trim().is_empty());
        fixture.events.sort_by_key(|event| event.seq);

        let mut text = fixture
            .base_snapshot
            .as_ref()
            .map(|snapshot| snapshot.text.clone())
            .unwrap_or_default();
        let mut last_seq = fixture
            .base_snapshot
            .as_ref()
            .map(|snapshot| snapshot.last_seq)
            .unwrap_or_default();
        let session_id = fixture.expected_snapshot.session_id.clone();

        for event in &fixture.events {
            assert_eq!(event.schema_version, 1);
            assert_eq!(event.session_id, session_id);
            assert_eq!(event.seq, last_seq + 1);
            assert!(matches!(
                event.kind.as_str(),
                "stdout" | "stderr" | "system"
            ));
            assert!(event.emitted_at_ms > 0);

            text.push_str(&event.chunk);
            last_seq = event.seq;
        }

        assert_eq!(fixture.expected_snapshot.last_seq, last_seq);
        assert_eq!(fixture.expected_snapshot.text, text);
    }
}

fn assert_report_counts(report: &DataIntegrityReport) {
    let passed = report
        .checks
        .iter()
        .filter(|check| check.status == DataIntegrityStatus::Passed)
        .count() as u32;
    let failed = report
        .checks
        .iter()
        .filter(|check| check.status == DataIntegrityStatus::Failed)
        .count() as u32;
    let skipped = report
        .checks
        .iter()
        .filter(|check| check.status == DataIntegrityStatus::Skipped)
        .count() as u32;

    assert_eq!(report.total_checks, report.checks.len() as u32);
    assert_eq!(report.passed_checks, passed);
    assert_eq!(report.failed_checks, failed);
    assert_eq!(report.skipped_checks, skipped);
    assert_eq!(report.has_failures, failed > 0);
}

fn read_fixture<T: DeserializeOwned>(relative_path: &str) -> T {
    let path = fixture_path(relative_path);
    let raw = fs::read_to_string(&path).unwrap_or_else(|error| {
        panic!("failed to read fixture {}: {}", path.display(), error);
    });

    serde_json::from_str(&raw).unwrap_or_else(|error| {
        panic!(
            "failed to deserialize fixture {}: {}",
            path.display(),
            error
        );
    })
}

fn fixture_path(relative_path: &str) -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join(relative_path)
}
