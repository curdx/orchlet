use std::path::Path;

use rusqlite::{params, Connection, OpenFlags};
use ulid::Ulid;

use crate::{
    contracts::{
        AppError, InviteMemberRequest, InviteMemberResult, InvitedMemberType, ListMembersResult,
        MemberIsolation, MemberPermissions, MemberProfile, MemberRole, MemberRuntimeKind,
        MemberRuntimeProfile, MemberStatus, RemoveMemberRequest, RemoveMemberResult,
    },
    domain::member::{
        normalize_member_display_name, validate_instance_count, validate_member_id,
        validate_runtime_profile, validate_workspace_id, MEMBER_OWNER_DISPLAY_NAME,
    },
    infrastructure::persistence::{
        json_store::workspace_registry_store::now_ms,
        sqlite::workspace_database::{
            open_workspace_database, sqlite_error, workspace_database_path,
        },
    },
};

const MEMBER_BASE_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605112300__members.sql");
const MEMBER_PERMISSIONS_MIGRATION_SQL: &str =
    include_str!("../../../../migrations/workspace/202605120930__member_permissions.sql");

pub fn initialize_member_store(
    app_data_dir: &Path,
    workspace_id: &str,
) -> Result<ListMembersResult, AppError> {
    let connection = open_workspace_database(app_data_dir, workspace_id)?;
    apply_member_migration(&connection)?;
    ensure_default_owner(&connection, workspace_id)?;
    list_members_from_connection(&connection, workspace_id)
}

pub fn invite_member(
    app_data_dir: &Path,
    request: InviteMemberRequest,
) -> Result<InviteMemberResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    let display_name = normalize_member_display_name(&request.display_name)?;
    validate_runtime_profile(&request.runtime)?;
    let instance_count = validate_instance_count(request.instance_count.unwrap_or(1))?;
    let permissions = request
        .permissions
        .unwrap_or_else(default_invited_permissions);
    let isolation = request.isolation.unwrap_or_else(default_invited_isolation);
    let runtime = normalize_runtime(request.runtime);

    let connection = open_workspace_database(app_data_dir, &request.workspace_id)?;
    apply_member_migration(&connection)?;
    ensure_default_owner(&connection, &request.workspace_id)?;

    let timestamp = now_ms();
    let role = role_from_invited_type(&request.member_type);
    let mut invited_members = Vec::new();

    for instance_index in 1..=instance_count {
        let member = MemberProfile {
            member_id: Ulid::new().to_string(),
            workspace_id: request.workspace_id.clone(),
            role: role.clone(),
            display_name: display_name.clone(),
            instance_index,
            instance_label: instance_label(&display_name, instance_count, instance_index),
            status: MemberStatus::Offline,
            runtime: runtime.clone(),
            permissions: permissions.clone(),
            isolation: isolation.clone(),
            created_at_ms: timestamp,
            updated_at_ms: timestamp,
        };

        insert_member(&connection, &member)?;
        invited_members.push(member);
    }

    let members = list_members_from_connection(&connection, &request.workspace_id)?.members;
    let member = invited_members
        .first()
        .cloned()
        .expect("validated instance count creates at least one member");

    Ok(InviteMemberResult {
        member,
        invited_members,
        members,
    })
}

pub fn create_local_admin_member(
    app_data_dir: &Path,
    workspace_id: &str,
    display_name: &str,
) -> Result<MemberProfile, AppError> {
    validate_workspace_id(workspace_id)?;
    let display_name = normalize_member_display_name(display_name)?;

    let connection = open_workspace_database(app_data_dir, workspace_id)?;
    apply_member_migration(&connection)?;
    ensure_default_owner(&connection, workspace_id)?;

    let timestamp = now_ms();
    let member = MemberProfile {
        member_id: Ulid::new().to_string(),
        workspace_id: workspace_id.to_owned(),
        role: MemberRole::Admin,
        display_name: display_name.clone(),
        instance_index: 1,
        instance_label: display_name,
        status: MemberStatus::Offline,
        runtime: MemberRuntimeProfile {
            kind: MemberRuntimeKind::None,
            runtime_id: None,
            label: None,
            command: None,
        },
        permissions: default_invited_permissions(),
        isolation: default_invited_isolation(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    insert_member(&connection, &member)?;

    Ok(member)
}

pub fn remove_member(
    app_data_dir: &Path,
    request: RemoveMemberRequest,
) -> Result<RemoveMemberResult, AppError> {
    validate_workspace_id(&request.workspace_id)?;
    validate_member_id(&request.member_id)?;

    let connection = open_workspace_database(app_data_dir, &request.workspace_id)?;
    apply_member_migration(&connection)?;
    ensure_default_owner(&connection, &request.workspace_id)?;

    let member = member_by_id(&connection, &request.workspace_id, &request.member_id)?;

    if member.role == MemberRole::Owner || !member.permissions.can_remove {
        return Err(AppError::recoverable_error(
            "member.remove.forbidden",
            "该成员不能被移除。",
            "Owner 或不可移除成员不能通过当前操作删除。",
            Some(format!(
                "workspaceId={} memberId={} role={:?} canRemove={}",
                request.workspace_id, request.member_id, member.role, member.permissions.can_remove
            )),
        ));
    }

    let deleted = connection
        .execute(
            "DELETE FROM members WHERE workspace_id = ?1 AND id = ?2 AND role <> 'owner'",
            params![request.workspace_id, request.member_id],
        )
        .map_err(sqlite_error("member.remove.failed"))?;

    if deleted == 0 {
        return Err(AppError::recoverable_error(
            "member.remove.notFound",
            "未找到可移除的成员。",
            "请刷新成员列表后重试。",
            Some(format!("memberId={}", request.member_id)),
        ));
    }

    let members = list_members_from_connection(&connection, &request.workspace_id)?.members;

    Ok(RemoveMemberResult {
        removed_member_id: request.member_id,
        members,
    })
}

pub fn validate_member_store(app_data_dir: &Path, workspace_id: &str) -> Result<(), AppError> {
    validate_workspace_id(workspace_id)?;
    let database_path = workspace_database_path(app_data_dir, workspace_id);

    if !database_path.exists() {
        return Err(AppError::recoverable_error(
            "member.database.missing",
            "工作区成员数据库不存在。",
            "请重新打开工作区以初始化默认 owner 成员。",
            Some(database_path.display().to_string()),
        ));
    }

    let connection = Connection::open_with_flags(&database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| {
            AppError::recoverable_error(
                "member.database.readOnlyOpenFailed",
                "无法读取工作区成员数据库。",
                "请检查应用数据目录权限；如果问题持续，请运行数据验证。",
                Some(format!("{}: {}", database_path.display(), error)),
            )
        })?;
    let members = list_members_from_connection(&connection, workspace_id)?;
    let owner_count = members
        .members
        .iter()
        .filter(|member| member.role == MemberRole::Owner)
        .count();

    if owner_count != 1 {
        return Err(AppError::recoverable_error(
            "member.owner.invalidCount",
            "工作区 owner 成员数量不正确。",
            "请重新打开工作区以补齐 owner；如果问题持续，请运行数据修复。",
            Some(format!("ownerCount={}", owner_count)),
        ));
    }

    Ok(())
}

fn apply_member_migration(connection: &Connection) -> Result<(), AppError> {
    connection
        .execute_batch(MEMBER_BASE_MIGRATION_SQL)
        .map_err(sqlite_error("member.migration.failed"))?;

    if !member_column_exists(connection, "instance_label")? {
        connection
            .execute_batch(MEMBER_PERMISSIONS_MIGRATION_SQL)
            .map_err(sqlite_error("member.permissionsMigration.failed"))?;
    } else {
        record_migration(connection, "202605120930__member_permissions")?;
    }

    Ok(())
}

fn ensure_default_owner(
    connection: &Connection,
    workspace_id: &str,
) -> Result<MemberProfile, AppError> {
    validate_workspace_id(workspace_id)?;

    let owners = members_by_role(connection, workspace_id, MemberRole::Owner)?;

    if owners.len() > 1 {
        return Err(AppError::recoverable_error(
            "member.owner.duplicate",
            "工作区存在多个 owner 成员。",
            "请先备份工作区数据库，然后运行后续数据修复工具。",
            Some(format!(
                "workspaceId={} ownerCount={}",
                workspace_id,
                owners.len()
            )),
        ));
    }

    if let Some(owner) = owners.into_iter().next() {
        return Ok(owner);
    }

    let timestamp = now_ms();
    let owner = MemberProfile {
        member_id: Ulid::new().to_string(),
        workspace_id: workspace_id.to_owned(),
        role: MemberRole::Owner,
        display_name: MEMBER_OWNER_DISPLAY_NAME.to_owned(),
        instance_index: 1,
        instance_label: MEMBER_OWNER_DISPLAY_NAME.to_owned(),
        status: MemberStatus::Online,
        runtime: MemberRuntimeProfile {
            kind: MemberRuntimeKind::None,
            runtime_id: None,
            label: None,
            command: None,
        },
        permissions: owner_permissions(),
        isolation: owner_isolation(),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    insert_member(connection, &owner)?;

    Ok(owner)
}

fn list_members_from_connection(
    connection: &Connection,
    workspace_id: &str,
) -> Result<ListMembersResult, AppError> {
    validate_workspace_id(workspace_id)?;

    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, role, display_name, instance_index, instance_label, status, runtime_type, runtime_id, runtime_label, runtime_command, can_mention, can_remove, sandboxed, unlimited_access, created_at_ms, updated_at_ms
             FROM members
             WHERE workspace_id = ?1
             ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'assistant' THEN 2 ELSE 3 END, created_at_ms, instance_index, instance_label",
        )
        .map_err(sqlite_error("member.list.prepareFailed"))?;
    let members = statement
        .query_map(params![workspace_id], member_from_row)
        .map_err(sqlite_error("member.list.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("member.list.decodeFailed"))?;

    Ok(ListMembersResult { members })
}

fn members_by_role(
    connection: &Connection,
    workspace_id: &str,
    role: MemberRole,
) -> Result<Vec<MemberProfile>, AppError> {
    let role_value = role_to_str(&role);
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, role, display_name, instance_index, instance_label, status, runtime_type, runtime_id, runtime_label, runtime_command, can_mention, can_remove, sandboxed, unlimited_access, created_at_ms, updated_at_ms
             FROM members
             WHERE workspace_id = ?1 AND role = ?2
             ORDER BY created_at_ms",
        )
        .map_err(sqlite_error("member.owner.prepareFailed"))?;

    let members = statement
        .query_map(params![workspace_id, role_value], member_from_row)
        .map_err(sqlite_error("member.owner.queryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("member.owner.decodeFailed"))?;

    Ok(members)
}

fn member_by_id(
    connection: &Connection,
    workspace_id: &str,
    member_id: &str,
) -> Result<MemberProfile, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, workspace_id, role, display_name, instance_index, instance_label, status, runtime_type, runtime_id, runtime_label, runtime_command, can_mention, can_remove, sandboxed, unlimited_access, created_at_ms, updated_at_ms
             FROM members
             WHERE workspace_id = ?1 AND id = ?2",
        )
        .map_err(sqlite_error("member.get.prepareFailed"))?;

    statement
        .query_row(params![workspace_id, member_id], member_from_row)
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::recoverable_error(
                "member.get.notFound",
                "未找到成员。",
                "请刷新成员列表后重试。",
                Some(format!(
                    "workspaceId={} memberId={}",
                    workspace_id, member_id
                )),
            ),
            _ => sqlite_error("member.get.queryFailed")(error),
        })
}

fn insert_member(connection: &Connection, member: &MemberProfile) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT INTO members (
                id, workspace_id, role, display_name, instance_index, instance_label, status,
                runtime_type, runtime_id, runtime_label, runtime_command, can_mention,
                can_remove, sandboxed, unlimited_access, created_at_ms, updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                member.member_id,
                member.workspace_id,
                role_to_str(&member.role),
                member.display_name,
                member.instance_index as i64,
                member.instance_label,
                status_to_str(&member.status),
                runtime_kind_to_str(&member.runtime.kind),
                member.runtime.runtime_id,
                member.runtime.label,
                member.runtime.command,
                bool_to_sql(member.permissions.can_mention),
                bool_to_sql(member.permissions.can_remove),
                bool_to_sql(member.isolation.sandboxed),
                bool_to_sql(member.isolation.unlimited_access),
                member.created_at_ms as i64,
                member.updated_at_ms as i64
            ],
        )
        .map(|_| ())
        .map_err(sqlite_error("member.insert.failed"))
}

fn member_from_row(row: &rusqlite::Row<'_>) -> Result<MemberProfile, rusqlite::Error> {
    let runtime_type: String = row.get(7)?;

    Ok(MemberProfile {
        member_id: row.get(0)?,
        workspace_id: row.get(1)?,
        role: role_from_str(row.get::<_, String>(2)?.as_str()),
        display_name: row.get(3)?,
        instance_index: row.get::<_, i64>(4)? as u32,
        instance_label: row.get(5)?,
        status: status_from_str(row.get::<_, String>(6)?.as_str()),
        runtime: MemberRuntimeProfile {
            kind: runtime_kind_from_str(&runtime_type),
            runtime_id: row.get(8)?,
            label: row.get(9)?,
            command: row.get(10)?,
        },
        permissions: MemberPermissions {
            can_mention: sql_bool(row.get::<_, i64>(11)?),
            can_remove: sql_bool(row.get::<_, i64>(12)?),
        },
        isolation: MemberIsolation {
            sandboxed: sql_bool(row.get::<_, i64>(13)?),
            unlimited_access: sql_bool(row.get::<_, i64>(14)?),
        },
        created_at_ms: row.get::<_, i64>(15)? as u64,
        updated_at_ms: row.get::<_, i64>(16)? as u64,
    })
}

fn member_column_exists(connection: &Connection, column_name: &str) -> Result<bool, AppError> {
    let mut statement = connection
        .prepare("PRAGMA table_info(members)")
        .map_err(sqlite_error("member.migration.tableInfoPrepareFailed"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(sqlite_error("member.migration.tableInfoQueryFailed"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sqlite_error("member.migration.tableInfoDecodeFailed"))?;

    Ok(columns.iter().any(|column| column == column_name))
}

fn record_migration(connection: &Connection, version: &str) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms) VALUES (?1, ?2)",
            params![version, now_ms() as i64],
        )
        .map(|_| ())
        .map_err(sqlite_error("member.migration.recordFailed"))
}

fn role_from_invited_type(member_type: &InvitedMemberType) -> MemberRole {
    match member_type {
        InvitedMemberType::Assistant => MemberRole::Assistant,
        InvitedMemberType::Member => MemberRole::Member,
    }
}

fn normalize_runtime(runtime: MemberRuntimeProfile) -> MemberRuntimeProfile {
    MemberRuntimeProfile {
        kind: runtime.kind,
        runtime_id: runtime.runtime_id.map(|value| value.trim().to_owned()),
        label: runtime.label.map(|value| value.trim().to_owned()),
        command: runtime.command.map(|value| value.trim().to_owned()),
    }
}

fn instance_label(display_name: &str, instance_count: u32, instance_index: u32) -> String {
    if instance_count == 1 {
        return display_name.to_owned();
    }

    format!("{} {}", display_name, instance_index)
}

fn owner_permissions() -> MemberPermissions {
    MemberPermissions {
        can_mention: false,
        can_remove: false,
    }
}

fn owner_isolation() -> MemberIsolation {
    MemberIsolation {
        sandboxed: false,
        unlimited_access: true,
    }
}

fn default_invited_permissions() -> MemberPermissions {
    MemberPermissions {
        can_mention: true,
        can_remove: true,
    }
}

fn default_invited_isolation() -> MemberIsolation {
    MemberIsolation {
        sandboxed: true,
        unlimited_access: false,
    }
}

fn bool_to_sql(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn sql_bool(value: i64) -> bool {
    value != 0
}

fn role_to_str(role: &MemberRole) -> &'static str {
    match role {
        MemberRole::Owner => "owner",
        MemberRole::Admin => "admin",
        MemberRole::Assistant => "assistant",
        MemberRole::Member => "member",
    }
}

fn role_from_str(value: &str) -> MemberRole {
    match value {
        "owner" => MemberRole::Owner,
        "admin" => MemberRole::Admin,
        "assistant" => MemberRole::Assistant,
        "member" => MemberRole::Member,
        _ => MemberRole::Member,
    }
}

fn status_to_str(status: &MemberStatus) -> &'static str {
    match status {
        MemberStatus::Online => "online",
        MemberStatus::Offline => "offline",
        MemberStatus::Working => "working",
        MemberStatus::DoNotDisturb => "doNotDisturb",
    }
}

fn status_from_str(value: &str) -> MemberStatus {
    match value {
        "online" => MemberStatus::Online,
        "offline" => MemberStatus::Offline,
        "working" => MemberStatus::Working,
        "doNotDisturb" => MemberStatus::DoNotDisturb,
        _ => MemberStatus::Offline,
    }
}

fn runtime_kind_to_str(kind: &MemberRuntimeKind) -> &'static str {
    match kind {
        MemberRuntimeKind::None => "none",
        MemberRuntimeKind::BuiltInAiCli => "builtInAiCli",
        MemberRuntimeKind::CustomCli => "customCli",
        MemberRuntimeKind::Shell => "shell",
    }
}

fn runtime_kind_from_str(value: &str) -> MemberRuntimeKind {
    match value {
        "none" => MemberRuntimeKind::None,
        "builtInAiCli" => MemberRuntimeKind::BuiltInAiCli,
        "customCli" => MemberRuntimeKind::CustomCli,
        "shell" => MemberRuntimeKind::Shell,
        _ => MemberRuntimeKind::None,
    }
}
