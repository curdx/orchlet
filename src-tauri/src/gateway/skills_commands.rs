use crate::{
    app::skills::{
        delete_skill, import_local_skill_folder, link_workspace_skill, list_skill_library,
        list_workspace_skill_links, open_skill_folder, unlink_workspace_skill,
    },
    contracts::{
        AppError, DeleteSkillRequest, DeleteSkillResult, ImportLocalSkillFolderRequest,
        ImportLocalSkillFolderResult, LinkWorkspaceSkillRequest, LinkWorkspaceSkillResult,
        ListWorkspaceSkillLinksRequest, ListWorkspaceSkillLinksResult, OpenSkillFolderRequest,
        OpenSkillFolderResult, SkillLibraryListRequest, SkillLibraryListResult,
        UnlinkWorkspaceSkillRequest, UnlinkWorkspaceSkillResult,
    },
};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

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
pub fn skills_open_folder(
    app: AppHandle,
    request: OpenSkillFolderRequest,
) -> Result<OpenSkillFolderResult, AppError> {
    open_skill_folder(app_data_dir(&app)?, request, |path| {
        app.opener()
            .open_path(path.to_string_lossy().into_owned(), None::<&str>)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn skills_delete(
    app: AppHandle,
    request: DeleteSkillRequest,
) -> Result<DeleteSkillResult, AppError> {
    delete_skill(app_data_dir(&app)?, request)
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
