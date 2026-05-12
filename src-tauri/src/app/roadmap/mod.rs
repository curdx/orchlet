use std::path::Path;

use ulid::Ulid;

use crate::{
    contracts::{
        AppError, CreateRoadmapTaskRequest, CreateRoadmapTaskResult, DeleteRoadmapTaskRequest,
        DeleteRoadmapTaskResult, ListRoadmapTasksRequest, ListRoadmapTasksResult, RoadmapTaskEntry,
        UpdateRoadmapTaskRequest, UpdateRoadmapTaskResult,
    },
    domain::roadmap::{normalize_task_detail, normalize_task_title, ROADMAP_TASK_SCHEMA_VERSION},
    infrastructure::{
        filesystem::canonicalize_existing_directory,
        persistence::{
            json_store::workspace_registry_store::now_ms,
            json_store::workspace_roadmap_store::{
                load_workspace_roadmap_tasks, save_workspace_roadmap_tasks,
            },
        },
    },
};

pub fn list_roadmap_tasks(
    request: ListRoadmapTasksRequest,
) -> Result<ListRoadmapTasksResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let document = load_workspace_roadmap_tasks(&workspace_root)?;

    Ok(ListRoadmapTasksResult {
        tasks: sorted_tasks(document.tasks),
    })
}

pub fn create_roadmap_task(
    request: CreateRoadmapTaskRequest,
) -> Result<CreateRoadmapTaskResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let mut document = load_workspace_roadmap_tasks(&workspace_root)?;
    let timestamp = now_ms();
    let task = RoadmapTaskEntry {
        schema_version: ROADMAP_TASK_SCHEMA_VERSION,
        task_id: Ulid::new().to_string(),
        title: normalize_task_title(request.title),
        detail: normalize_task_detail(request.detail),
        status: request.status,
        sort_order: next_sort_order(&document.tasks),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    document.tasks.push(task.clone());
    save_workspace_roadmap_tasks(&workspace_root, &document)?;

    Ok(CreateRoadmapTaskResult {
        task,
        tasks: sorted_tasks(document.tasks),
    })
}

pub fn update_roadmap_task(
    request: UpdateRoadmapTaskRequest,
) -> Result<UpdateRoadmapTaskResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let mut document = load_workspace_roadmap_tasks(&workspace_root)?;
    let timestamp = now_ms();
    let index = document
        .tasks
        .iter()
        .position(|task| task.task_id == request.task_id)
        .ok_or_else(|| roadmap_task_not_found_error(&request.task_id))?;

    if let Some(sort_order) = request.sort_order {
        move_task_to_sort_order(&mut document.tasks, index, sort_order);
    }

    let index = document
        .tasks
        .iter()
        .position(|task| task.task_id == request.task_id)
        .ok_or_else(|| roadmap_task_not_found_error(&request.task_id))?;
    let task = &mut document.tasks[index];

    if let Some(title) = request.title {
        task.title = normalize_task_title(title);
    }

    if let Some(detail) = request.detail {
        task.detail = normalize_task_detail(Some(detail));
    }

    if let Some(status) = request.status {
        task.status = status;
    }

    task.updated_at_ms = timestamp.max(task.updated_at_ms + 1);
    let updated_task = task.clone();
    save_workspace_roadmap_tasks(&workspace_root, &document)?;

    Ok(UpdateRoadmapTaskResult {
        task: updated_task,
        tasks: sorted_tasks(document.tasks),
    })
}

pub fn delete_roadmap_task(
    request: DeleteRoadmapTaskRequest,
) -> Result<DeleteRoadmapTaskResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let mut document = load_workspace_roadmap_tasks(&workspace_root)?;
    let index = document
        .tasks
        .iter()
        .position(|task| task.task_id == request.task_id)
        .ok_or_else(|| roadmap_task_not_found_error(&request.task_id))?;
    let removed = document.tasks.remove(index);

    compact_sort_order(&mut document.tasks);
    save_workspace_roadmap_tasks(&workspace_root, &document)?;

    Ok(DeleteRoadmapTaskResult {
        removed_task_id: removed.task_id,
        tasks: sorted_tasks(document.tasks),
    })
}

pub fn validate_workspace_roadmap_task_store(
    workspace_root: impl AsRef<Path>,
) -> Result<(), AppError> {
    load_workspace_roadmap_tasks(workspace_root.as_ref()).map(|_| ())
}

fn roadmap_task_not_found_error(task_id: &str) -> AppError {
    AppError::recoverable_error(
        "roadmap.task.notFound",
        "路线图中找不到该任务。",
        "请刷新路线图后重新选择任务。",
        Some(task_id.to_owned()),
    )
}

fn next_sort_order(tasks: &[RoadmapTaskEntry]) -> u32 {
    tasks
        .iter()
        .map(|task| task.sort_order)
        .max()
        .map(|sort_order| sort_order.saturating_add(1))
        .unwrap_or(0)
}

fn move_task_to_sort_order(tasks: &mut Vec<RoadmapTaskEntry>, index: usize, sort_order: u32) {
    let task = tasks.remove(index);
    let target_index = (sort_order as usize).min(tasks.len());
    let mut sorted = sorted_tasks(std::mem::take(tasks));

    sorted.insert(target_index, task);
    compact_sort_order(&mut sorted);
    *tasks = sorted;
}

fn compact_sort_order(tasks: &mut [RoadmapTaskEntry]) {
    tasks.sort_by(|left, right| {
        left.sort_order
            .cmp(&right.sort_order)
            .then_with(|| left.created_at_ms.cmp(&right.created_at_ms))
            .then_with(|| left.task_id.cmp(&right.task_id))
    });

    for (index, task) in tasks.iter_mut().enumerate() {
        task.sort_order = index as u32;
    }
}

fn sorted_tasks(mut tasks: Vec<RoadmapTaskEntry>) -> Vec<RoadmapTaskEntry> {
    tasks.sort_by(|left, right| {
        left.sort_order
            .cmp(&right.sort_order)
            .then_with(|| left.created_at_ms.cmp(&right.created_at_ms))
            .then_with(|| left.task_id.cmp(&right.task_id))
    });
    tasks
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        create_roadmap_task, delete_roadmap_task, list_roadmap_tasks, update_roadmap_task,
    };
    use crate::{
        contracts::{
            CreateRoadmapTaskRequest, DeleteRoadmapTaskRequest, ListRoadmapTasksRequest,
            RoadmapTaskEntry, RoadmapTaskStatus, UpdateRoadmapTaskRequest,
        },
        domain::roadmap::ROADMAP_TASK_SCHEMA_VERSION,
        infrastructure::persistence::json_store::workspace_roadmap_store::{
            save_workspace_roadmap_tasks, WorkspaceRoadmapTasksDocument,
        },
    };

    #[test]
    fn creates_edits_lists_and_deletes_roadmap_tasks() {
        let workspace = tempdir().expect("workspace");

        let created = create_roadmap_task(CreateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "  Ship MVP  ".to_owned(),
            detail: Some("  First milestone  ".to_owned()),
            status: RoadmapTaskStatus::Pending,
        })
        .expect("create task");

        assert_eq!(created.task.title, "Ship MVP");
        assert_eq!(created.task.detail.as_deref(), Some("First milestone"));
        assert_eq!(created.task.sort_order, 0);

        let updated = update_roadmap_task(UpdateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            task_id: created.task.task_id.clone(),
            title: Some("Implementation".to_owned()),
            detail: Some("".to_owned()),
            status: Some(RoadmapTaskStatus::InProgress),
            sort_order: None,
        })
        .expect("update task");

        assert_eq!(updated.task.title, "Implementation");
        assert_eq!(updated.task.detail, None);
        assert_eq!(updated.task.status, RoadmapTaskStatus::InProgress);

        let listed = list_roadmap_tasks(ListRoadmapTasksRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("list tasks");
        assert_eq!(listed.tasks.len(), 1);

        let deleted = delete_roadmap_task(DeleteRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            task_id: created.task.task_id,
        })
        .expect("delete task");

        assert!(deleted.tasks.is_empty());
    }

    #[test]
    fn blank_title_falls_back_to_new_task() {
        let workspace = tempdir().expect("workspace");

        let created = create_roadmap_task(CreateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: " ".to_owned(),
            detail: None,
            status: RoadmapTaskStatus::Pending,
        })
        .expect("create task");

        assert_eq!(created.task.title, "新任务");
    }

    #[test]
    fn deletion_compacts_sort_order() {
        let workspace = tempdir().expect("workspace");
        let first = create_roadmap_task(CreateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "First".to_owned(),
            detail: None,
            status: RoadmapTaskStatus::Pending,
        })
        .expect("first");
        create_roadmap_task(CreateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "Second".to_owned(),
            detail: None,
            status: RoadmapTaskStatus::Pending,
        })
        .expect("second");

        let deleted = delete_roadmap_task(DeleteRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            task_id: first.task.task_id,
        })
        .expect("delete");

        assert_eq!(deleted.tasks.len(), 1);
        assert_eq!(deleted.tasks[0].sort_order, 0);
    }

    #[test]
    fn roadmap_store_rejects_duplicate_sort_order() {
        let workspace = tempdir().expect("workspace");
        fs::create_dir_all(workspace.path()).expect("workspace dir");
        let task = RoadmapTaskEntry {
            schema_version: ROADMAP_TASK_SCHEMA_VERSION,
            task_id: "01K00000000000000000000200".to_owned(),
            title: "Duplicate".to_owned(),
            detail: None,
            status: RoadmapTaskStatus::Pending,
            sort_order: 0,
            created_at_ms: 1_760_000_030_000,
            updated_at_ms: 1_760_000_030_000,
        };
        let document = WorkspaceRoadmapTasksDocument {
            schema_version: 1,
            tasks: vec![
                task.clone(),
                RoadmapTaskEntry {
                    task_id: "01K00000000000000000000201".to_owned(),
                    ..task
                },
            ],
        };

        let error = save_workspace_roadmap_tasks(workspace.path(), &document)
            .expect_err("duplicate sort order");

        assert_eq!(error.code, "roadmap.tasks.duplicateSortOrder");
    }
}
