use crate::{
    app::skills::{
        import_local_skill_folder, link_workspace_skill, list_skill_library,
        list_workspace_skill_links, unlink_workspace_skill,
    },
    contracts::{
        AppError, ImportLocalSkillFolderRequest, ImportLocalSkillFolderResult,
        LinkWorkspaceSkillRequest, LinkWorkspaceSkillResult, ListWorkspaceSkillLinksRequest,
        ListWorkspaceSkillLinksResult, SkillLibraryListRequest, SkillLibraryListResult,
        UnlinkWorkspaceSkillRequest, UnlinkWorkspaceSkillResult,
    },
};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn skills_library_list(
    app: AppHandle,
    _request: SkillLibraryListRequest,
) -> Result<SkillLibraryListResult, AppError> {
    list_skill_library(app_data_dir(&app)?)
}

#[tauri::command]
pub fn skills_import_folder(
    app: AppHandle,
    request: ImportLocalSkillFolderRequest,
) -> Result<ImportLocalSkillFolderResult, AppError> {
    import_local_skill_folder(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn workspace_skill_links_list(
    request: ListWorkspaceSkillLinksRequest,
) -> Result<ListWorkspaceSkillLinksResult, AppError> {
    list_workspace_skill_links(request)
}

#[tauri::command]
pub fn workspace_skill_link(
    app: AppHandle,
    request: LinkWorkspaceSkillRequest,
) -> Result<LinkWorkspaceSkillResult, AppError> {
    link_workspace_skill(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn workspace_skill_unlink(
    request: UnlinkWorkspaceSkillRequest,
) -> Result<UnlinkWorkspaceSkillResult, AppError> {
    unlink_workspace_skill(request)
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "skill.library.appDataDirFailed",
            "无法定位应用数据目录。",
            "技能库未更新；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
