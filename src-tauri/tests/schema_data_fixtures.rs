use std::{fs, path::Path};

use orchlet_lib::{
    app::data_integrity::validate_data_integrity,
    app::members::initialize_members,
    contracts::{
        ContactProfile, ConversationKind, ConversationProfile, DataIntegrityReport,
        DataIntegrityStatus, MemberProfile, WorkspaceMetadata,
    },
    domain::workspace::validate_workspace_metadata,
    infrastructure::persistence::json_store::{
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
    fs::copy(
        fixture_workspace.join(".orchlet/workspace.json"),
        workspace_root.join(".orchlet/workspace.json"),
    )
    .expect("metadata copied");
    let metadata: WorkspaceMetadata = read_fixture(
        "../fixtures/data-integrity/valid-json-stores/workspace/.orchlet/workspace.json",
    );
    initialize_members(&app_data, &metadata.project_id).expect("members initialized");

    load_workspace_registry(&app_data).expect("registry fixture loads");
    load_workspace_fallbacks(&app_data).expect("fallback fixture loads");

    let report = validate_data_integrity(app_data, None, Some(workspace_root));

    assert_eq!(report.total_checks, 8);
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

    assert_eq!(report.total_checks, 8);
    assert_eq!(report.failed_checks, 1);
    assert_eq!(report.skipped_checks, 4);
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
            "conversation_members"
        ]
    );
    assert_eq!(
        fixture.migration_files,
        vec![
            "202605112300__members.sql",
            "202605120930__member_permissions.sql",
            "202605121210__private_conversations.sql",
            "202605121300__conversation_list_groups.sql"
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
        .owned_by_future_stories
        .iter()
        .any(|domain| domain == "messages"));
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
    assert!(fixture
        .excluded_future_tables
        .iter()
        .any(|table| table == "messages"));
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
