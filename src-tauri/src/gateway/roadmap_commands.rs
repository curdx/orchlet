use crate::{
    app::roadmap::{
        create_roadmap_task, delete_roadmap_task, list_roadmap_tasks, update_roadmap_task,
    },
    contracts::{
        AppError, CreateRoadmapTaskRequest, CreateRoadmapTaskResult, DeleteRoadmapTaskRequest,
        DeleteRoadmapTaskResult, ListRoadmapTasksRequest, ListRoadmapTasksResult,
        UpdateRoadmapTaskRequest, UpdateRoadmapTaskResult,
    },
};

#[tauri::command]
pub fn roadmap_tasks_list(
    request: ListRoadmapTasksRequest,
) -> Result<ListRoadmapTasksResult, AppError> {
    list_roadmap_tasks(request)
}

#[tauri::command]
pub fn roadmap_task_create(
    request: CreateRoadmapTaskRequest,
) -> Result<CreateRoadmapTaskResult, AppError> {
    create_roadmap_task(request)
}

#[tauri::command]
pub fn roadmap_task_update(
    request: UpdateRoadmapTaskRequest,
) -> Result<UpdateRoadmapTaskResult, AppError> {
    update_roadmap_task(request)
}

#[tauri::command]
pub fn roadmap_task_delete(
    request: DeleteRoadmapTaskRequest,
) -> Result<DeleteRoadmapTaskResult, AppError> {
    delete_roadmap_task(request)
}
