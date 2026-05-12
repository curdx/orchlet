use crate::{
    app::contacts::{
        create_global_contact, delete_global_contact, list_global_contacts, update_global_contact,
    },
    contracts::{
        AppError, CreateContactRequest, CreateContactResult, DeleteContactRequest,
        DeleteContactResult, ListContactsRequest, ListContactsResult, UpdateContactRequest,
        UpdateContactResult,
    },
};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn contacts_list(
    app: AppHandle,
    request: ListContactsRequest,
) -> Result<ListContactsResult, AppError> {
    list_global_contacts(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn contact_create(
    app: AppHandle,
    request: CreateContactRequest,
) -> Result<CreateContactResult, AppError> {
    create_global_contact(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn contact_update(
    app: AppHandle,
    request: UpdateContactRequest,
) -> Result<UpdateContactResult, AppError> {
    update_global_contact(app_data_dir(&app)?, request)
}

#[tauri::command]
pub fn contact_delete(
    app: AppHandle,
    request: DeleteContactRequest,
) -> Result<DeleteContactResult, AppError> {
    delete_global_contact(app_data_dir(&app)?, request)
}

fn app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    app.path().app_data_dir().map_err(|error| {
        AppError::recoverable_error(
            "contact.appDataDirFailed",
            "无法定位应用数据目录。",
            "联系人数据未加载；请检查系统应用数据目录权限后重试。",
            Some(error.to_string()),
        )
    })
}
