use std::path::Path;

use crate::{
    app::diagnostics::{best_effort_event, record_workspace_diagnostics_event_best_effort},
    contracts::{
        AppError, DiagnosticsCorrelationIds, DiagnosticsEventScope, DiagnosticsEventSeverity,
        DiagnosticsMetadataEntry, InviteMemberRequest, InviteMemberResult, ListMembersRequest,
        ListMembersResult, RemoveMemberRequest, RemoveMemberResult, UpdateMemberProfileRequest,
        UpdateMemberProfileResult, UpdateMemberStatusRequest, UpdateMemberStatusResult,
    },
    infrastructure::persistence::sqlite::member_repository::{
        initialize_member_store, invite_member, remove_member, update_member_profile,
        update_member_status,
    },
};

pub fn initialize_members(
    app_data_dir: impl AsRef<Path>,
    workspace_id: &str,
) -> Result<ListMembersResult, AppError> {
    initialize_member_store(app_data_dir.as_ref(), workspace_id)
}

pub fn list_members(
    app_data_dir: impl AsRef<Path>,
    request: ListMembersRequest,
) -> Result<ListMembersResult, AppError> {
    initialize_member_store(app_data_dir.as_ref(), &request.workspace_id)
}

pub fn invite_workspace_member(
    app_data_dir: impl AsRef<Path>,
    request: InviteMemberRequest,
) -> Result<InviteMemberResult, AppError> {
    let result = invite_member(app_data_dir.as_ref(), request)?;
    record_workspace_diagnostics_event_best_effort(
        app_data_dir.as_ref(),
        best_effort_event(
            &result.member.workspace_id,
            DiagnosticsEventScope::Member,
            "member.invited",
            DiagnosticsEventSeverity::Info,
            DiagnosticsCorrelationIds {
                workspace_id: Some(result.member.workspace_id.clone()),
                member_id: Some(result.member.member_id.clone()),
                ..DiagnosticsCorrelationIds::default()
            },
            vec![DiagnosticsMetadataEntry {
                key: "role".to_owned(),
                value: format!("{:?}", result.member.role),
            }],
        ),
    );

    Ok(result)
}

pub fn remove_workspace_member(
    app_data_dir: impl AsRef<Path>,
    request: RemoveMemberRequest,
) -> Result<RemoveMemberResult, AppError> {
    remove_member(app_data_dir.as_ref(), request)
}

pub fn update_workspace_member_status(
    app_data_dir: impl AsRef<Path>,
    request: UpdateMemberStatusRequest,
) -> Result<UpdateMemberStatusResult, AppError> {
    update_member_status(app_data_dir.as_ref(), request)
}

pub fn update_workspace_member_profile(
    app_data_dir: impl AsRef<Path>,
    request: UpdateMemberProfileRequest,
) -> Result<UpdateMemberProfileResult, AppError> {
    update_member_profile(app_data_dir.as_ref(), request)
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{
        initialize_members, invite_workspace_member, remove_workspace_member,
        update_workspace_member_profile,
    };
    use crate::contracts::{
        InviteMemberRequest, InvitedMemberType, MemberIsolation, MemberPermissions, MemberRole,
        MemberRuntimeKind, MemberRuntimeProfile, MemberStatus, RemoveMemberRequest,
        UpdateMemberProfileRequest,
    };

    #[test]
    fn initializes_default_owner_once_per_workspace() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000";
        let first = initialize_members(app_data.path(), workspace_id).expect("first init");
        let second = initialize_members(app_data.path(), workspace_id).expect("second init");

        assert_eq!(first.members.len(), 1);
        assert_eq!(second.members.len(), 1);
        assert_eq!(first.members[0].member_id, second.members[0].member_id);
        assert_eq!(first.members[0].role, MemberRole::Owner);
        assert_eq!(first.members[0].status, MemberStatus::Online);
    }

    #[test]
    fn invited_member_stores_type_status_and_runtime_without_terminal_session() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let result = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id,
                member_type: InvitedMemberType::Assistant,
                display_name: "Codex Reviewer".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some("codex".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member invited");

        assert_eq!(result.members.len(), 2);
        assert_eq!(result.invited_members.len(), 1);
        assert_eq!(result.member.role, MemberRole::Assistant);
        assert_eq!(result.member.instance_index, 1);
        assert_eq!(result.member.instance_label, "Codex Reviewer");
        assert_eq!(result.member.status, MemberStatus::Offline);
        assert_eq!(result.member.runtime.kind, MemberRuntimeKind::BuiltInAiCli);
        assert_eq!(result.member.runtime.command.as_deref(), Some("codex"));
        assert!(result.member.permissions.can_mention);
        assert!(result.member.permissions.can_remove);
        assert!(result.member.isolation.sandboxed);
        assert!(!result.member.isolation.unlimited_access);
    }

    #[test]
    fn invited_members_store_custom_cli_and_shell_runtime_profiles() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();

        let custom_cli = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Local Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::CustomCli,
                    runtime_id: Some("local-agent --stdio".to_owned()),
                    label: Some("local-agent --stdio".to_owned()),
                    command: Some("local-agent --stdio".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("custom cli member invited");
        let shell = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id,
                member_type: InvitedMemberType::Member,
                display_name: "Shell User".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("shell member invited");

        assert_eq!(custom_cli.member.role, MemberRole::Assistant);
        assert_eq!(custom_cli.member.runtime.kind, MemberRuntimeKind::CustomCli);
        assert_eq!(
            custom_cli.member.runtime.command.as_deref(),
            Some("local-agent --stdio")
        );
        assert_eq!(shell.member.role, MemberRole::Member);
        assert_eq!(shell.member.runtime.kind, MemberRuntimeKind::Shell);
        assert_eq!(shell.member.runtime.command.as_deref(), Some("zsh"));
        assert_eq!(shell.members.len(), 3);
    }

    #[test]
    fn invited_member_instances_store_distinct_labels_permissions_and_isolation() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let result = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id,
                member_type: InvitedMemberType::Assistant,
                display_name: "Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some("codex".to_owned()),
                },
                instance_count: Some(3),
                permissions: Some(MemberPermissions {
                    can_mention: false,
                    can_remove: true,
                }),
                isolation: Some(MemberIsolation {
                    sandboxed: false,
                    unlimited_access: true,
                }),
            },
        )
        .expect("member instances invited");

        assert_eq!(result.invited_members.len(), 3);
        assert_eq!(result.members.len(), 4);
        assert_eq!(result.invited_members[0].instance_label, "Agent 1");
        assert_eq!(result.invited_members[1].instance_label, "Agent 2");
        assert_eq!(result.invited_members[2].instance_label, "Agent 3");
        assert_ne!(
            result.invited_members[0].member_id,
            result.invited_members[1].member_id
        );
        assert!(!result.invited_members[0].permissions.can_mention);
        assert!(result.invited_members[0].permissions.can_remove);
        assert!(!result.invited_members[0].isolation.sandboxed);
        assert!(result.invited_members[0].isolation.unlimited_access);
    }

    #[test]
    fn removing_invited_member_keeps_owner_and_rejects_owner_removal() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let invite = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Member,
                display_name: "Collaborator".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::Shell,
                    runtime_id: Some("zsh".to_owned()),
                    label: Some("zsh".to_owned()),
                    command: Some("zsh".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member invited");
        let owner_id = invite
            .members
            .iter()
            .find(|member| member.role == MemberRole::Owner)
            .expect("owner exists")
            .member_id
            .clone();

        let removed = remove_workspace_member(
            app_data.path(),
            RemoveMemberRequest {
                workspace_id: workspace_id.clone(),
                member_id: invite.member.member_id,
            },
        )
        .expect("member removed");

        assert_eq!(removed.members.len(), 1);
        assert_eq!(removed.members[0].role, MemberRole::Owner);

        let owner_removal = remove_workspace_member(
            app_data.path(),
            RemoveMemberRequest {
                workspace_id,
                member_id: owner_id,
            },
        );

        assert!(owner_removal.is_err());
    }

    #[test]
    fn updates_member_display_name_and_instance_label() {
        let app_data = tempdir().expect("app data");
        let workspace_id = "01K00000000000000000000000".to_owned();
        let invite = invite_workspace_member(
            app_data.path(),
            InviteMemberRequest {
                workspace_id: workspace_id.clone(),
                member_type: InvitedMemberType::Assistant,
                display_name: "Original Agent".to_owned(),
                runtime: MemberRuntimeProfile {
                    kind: MemberRuntimeKind::BuiltInAiCli,
                    runtime_id: Some("codex".to_owned()),
                    label: Some("Codex CLI".to_owned()),
                    command: Some("codex".to_owned()),
                },
                instance_count: None,
                permissions: None,
                isolation: None,
            },
        )
        .expect("member invited");

        let updated = update_workspace_member_profile(
            app_data.path(),
            UpdateMemberProfileRequest {
                workspace_id,
                member_id: invite.member.member_id,
                display_name: "Renamed Agent".to_owned(),
            },
        )
        .expect("member renamed");

        assert_eq!(updated.member.display_name, "Renamed Agent");
        assert_eq!(updated.member.instance_label, "Renamed Agent");
        assert_eq!(updated.members.len(), 2);
    }
}
