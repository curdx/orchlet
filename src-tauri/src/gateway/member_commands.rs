use crate::{
    app::members::{invite_workspace_member, list_members, remove_workspace_member},
    contracts::{
        AppError, InviteMemberRequest, InviteMemberResult, ListMembersRequest, ListMembersResult,
        RemoveMemberRequest, RemoveMemberResult,
    },
};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn members_list(
    app: AppHandle,
    request: ListMembersRequest,
) -> Result<ListMembersResult, AppError> {
    list_members(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn member_invite(
    app: AppHandle,
    request: InviteMemberRequest,
) -> Result<InviteMemberResult, AppError> {
    invite_workspace_member(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn member_remove(
    app: AppHandle,
    request: RemoveMemberRequest,
) -> Result<RemoveMemberResult, AppError> {
    remove_workspace_member(app_data_dir(&app)?, request)
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "member.appDataDirFailed",
            "无法定位应用数据目录。",
            "成员数据未加载；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
