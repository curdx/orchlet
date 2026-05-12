use crate::{
    app::roadmap::{
        create_roadmap_goal, create_roadmap_task, delete_roadmap_goal, delete_roadmap_task,
        list_roadmap_goals, list_roadmap_tasks, update_roadmap_goal, update_roadmap_task,
    },
    contracts::{
        AppError, CreateRoadmapGoalRequest, CreateRoadmapGoalResult, CreateRoadmapTaskRequest,
        CreateRoadmapTaskResult, DeleteRoadmapGoalRequest, DeleteRoadmapGoalResult,
        DeleteRoadmapTaskRequest, DeleteRoadmapTaskResult, ListRoadmapGoalsRequest,
        ListRoadmapGoalsResult, ListRoadmapTasksRequest, ListRoadmapTasksResult,
        UpdateRoadmapGoalRequest, UpdateRoadmapGoalResult, UpdateRoadmapTaskRequest,
        UpdateRoadmapTaskResult,
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

#[tauri::command]
pub fn roadmap_goals_list(
    request: ListRoadmapGoalsRequest,
) -> Result<ListRoadmapGoalsResult, AppError> {
    list_roadmap_goals(request)
}

#[tauri::command]
pub fn roadmap_goal_create(
    request: CreateRoadmapGoalRequest,
) -> Result<CreateRoadmapGoalResult, AppError> {
    create_roadmap_goal(request)
}

#[tauri::command]
pub fn roadmap_goal_update(
    request: UpdateRoadmapGoalRequest,
) -> Result<UpdateRoadmapGoalResult, AppError> {
    update_roadmap_goal(request)
}

#[tauri::command]
pub fn roadmap_goal_delete(
    request: DeleteRoadmapGoalRequest,
) -> Result<DeleteRoadmapGoalResult, AppError> {
    delete_roadmap_goal(request)
}
