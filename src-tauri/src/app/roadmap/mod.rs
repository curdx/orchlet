use std::{collections::HashSet, path::Path};

use ulid::Ulid;

use crate::{
    contracts::{
        AppError, CreateRoadmapGoalRequest, CreateRoadmapGoalResult, CreateRoadmapTaskRequest,
        CreateRoadmapTaskResult, DeleteRoadmapGoalRequest, DeleteRoadmapGoalResult,
        DeleteRoadmapTaskRequest, DeleteRoadmapTaskResult, ListRoadmapGoalsRequest,
        ListRoadmapGoalsResult, ListRoadmapTasksRequest, ListRoadmapTasksResult, RoadmapGoalEntry,
        RoadmapTaskEntry, UpdateRoadmapGoalRequest, UpdateRoadmapGoalResult,
        UpdateRoadmapTaskRequest, UpdateRoadmapTaskResult,
    },
    domain::roadmap::{
        normalize_goal_title, normalize_task_detail, normalize_task_title,
        ROADMAP_GOAL_SCHEMA_VERSION, ROADMAP_TASK_SCHEMA_VERSION,
    },
    infrastructure::{
        filesystem::canonicalize_existing_directory,
        persistence::{
            json_store::workspace_registry_store::now_ms,
            json_store::workspace_roadmap_store::{
                load_workspace_roadmap_goals, load_workspace_roadmap_tasks,
                save_workspace_roadmap_goals, save_workspace_roadmap_tasks,
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
    let mut goals_document = load_workspace_roadmap_goals(&workspace_root)?;
    let index = document
        .tasks
        .iter()
        .position(|task| task.task_id == request.task_id)
        .ok_or_else(|| roadmap_task_not_found_error(&request.task_id))?;
    let removed = document.tasks.remove(index);
    let timestamp = now_ms();
    let mut goals_changed = false;

    for goal in &mut goals_document.goals {
        let previous_len = goal.task_ids.len();
        goal.task_ids.retain(|task_id| task_id != &removed.task_id);

        if goal.task_ids.len() != previous_len {
            goal.updated_at_ms = timestamp.max(goal.updated_at_ms + 1);
            goals_changed = true;
        }
    }

    compact_sort_order(&mut document.tasks);
    save_workspace_roadmap_tasks(&workspace_root, &document)?;
    if goals_changed {
        save_workspace_roadmap_goals(&workspace_root, &goals_document)?;
    }

    Ok(DeleteRoadmapTaskResult {
        removed_task_id: removed.task_id,
        tasks: sorted_tasks(document.tasks),
    })
}

pub fn list_roadmap_goals(
    request: ListRoadmapGoalsRequest,
) -> Result<ListRoadmapGoalsResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let tasks_document = load_workspace_roadmap_tasks(&workspace_root)?;
    let goals_document = load_workspace_roadmap_goals(&workspace_root)?;

    validate_goal_task_references(&goals_document.goals, &tasks_document.tasks)?;

    Ok(ListRoadmapGoalsResult {
        goals: sorted_goals(goals_document.goals),
    })
}

pub fn create_roadmap_goal(
    request: CreateRoadmapGoalRequest,
) -> Result<CreateRoadmapGoalResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let tasks_document = load_workspace_roadmap_tasks(&workspace_root)?;
    let mut goals_document = load_workspace_roadmap_goals(&workspace_root)?;
    let task_ids = normalize_goal_task_ids(request.task_ids, &tasks_document.tasks)?;
    let timestamp = now_ms();
    let goal = RoadmapGoalEntry {
        schema_version: ROADMAP_GOAL_SCHEMA_VERSION,
        goal_id: Ulid::new().to_string(),
        title: normalize_goal_title(request.title, None),
        task_ids,
        sort_order: next_goal_sort_order(&goals_document.goals),
        created_at_ms: timestamp,
        updated_at_ms: timestamp,
    };

    goals_document.goals.push(goal.clone());
    save_workspace_roadmap_goals(&workspace_root, &goals_document)?;

    Ok(CreateRoadmapGoalResult {
        goal,
        goals: sorted_goals(goals_document.goals),
    })
}

pub fn update_roadmap_goal(
    request: UpdateRoadmapGoalRequest,
) -> Result<UpdateRoadmapGoalResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let tasks_document = load_workspace_roadmap_tasks(&workspace_root)?;
    let mut goals_document = load_workspace_roadmap_goals(&workspace_root)?;
    let timestamp = now_ms();
    let index = goals_document
        .goals
        .iter()
        .position(|goal| goal.goal_id == request.goal_id)
        .ok_or_else(|| roadmap_goal_not_found_error(&request.goal_id))?;

    if let Some(sort_order) = request.sort_order {
        move_goal_to_sort_order(&mut goals_document.goals, index, sort_order);
    }

    let index = goals_document
        .goals
        .iter()
        .position(|goal| goal.goal_id == request.goal_id)
        .ok_or_else(|| roadmap_goal_not_found_error(&request.goal_id))?;

    let normalized_task_ids = match request.task_ids {
        Some(task_ids) => Some(normalize_goal_task_ids(task_ids, &tasks_document.tasks)?),
        None => None,
    };
    let goal = &mut goals_document.goals[index];

    if let Some(title) = request.title {
        goal.title = normalize_goal_title(title, Some(&goal.title));
    }

    if let Some(task_ids) = normalized_task_ids {
        goal.task_ids = task_ids;
    }

    goal.updated_at_ms = timestamp.max(goal.updated_at_ms + 1);
    let updated_goal = goal.clone();
    save_workspace_roadmap_goals(&workspace_root, &goals_document)?;

    Ok(UpdateRoadmapGoalResult {
        goal: updated_goal,
        goals: sorted_goals(goals_document.goals),
    })
}

pub fn delete_roadmap_goal(
    request: DeleteRoadmapGoalRequest,
) -> Result<DeleteRoadmapGoalResult, AppError> {
    let workspace_root = canonicalize_existing_directory(request.workspace_root)?;
    let mut goals_document = load_workspace_roadmap_goals(&workspace_root)?;
    let index = goals_document
        .goals
        .iter()
        .position(|goal| goal.goal_id == request.goal_id)
        .ok_or_else(|| roadmap_goal_not_found_error(&request.goal_id))?;
    let removed = goals_document.goals.remove(index);

    compact_goal_sort_order(&mut goals_document.goals);
    save_workspace_roadmap_goals(&workspace_root, &goals_document)?;

    Ok(DeleteRoadmapGoalResult {
        removed_goal_id: removed.goal_id,
        goals: sorted_goals(goals_document.goals),
    })
}

pub fn validate_workspace_roadmap_task_store(
    workspace_root: impl AsRef<Path>,
) -> Result<(), AppError> {
    load_workspace_roadmap_tasks(workspace_root.as_ref()).map(|_| ())
}

pub fn validate_workspace_roadmap_goal_store(
    workspace_root: impl AsRef<Path>,
) -> Result<(), AppError> {
    let workspace_root = workspace_root.as_ref();
    let tasks_document = load_workspace_roadmap_tasks(workspace_root)?;
    let goals_document = load_workspace_roadmap_goals(workspace_root)?;

    validate_goal_task_references(&goals_document.goals, &tasks_document.tasks)
}

fn roadmap_task_not_found_error(task_id: &str) -> AppError {
    AppError::recoverable_error(
        "roadmap.task.notFound",
        "路线图中找不到该任务。",
        "请刷新路线图后重新选择任务。",
        Some(task_id.to_owned()),
    )
}

fn roadmap_goal_not_found_error(goal_id: &str) -> AppError {
    AppError::recoverable_error(
        "roadmap.goal.notFound",
        "路线图中找不到该目标。",
        "请刷新路线图后重新选择目标。",
        Some(goal_id.to_owned()),
    )
}

fn invalid_goal_task_reference_error(goal_id: Option<&str>, task_id: &str) -> AppError {
    AppError::recoverable_error(
        "roadmap.goal.invalidRelatedTask",
        "路线图目标关联了不存在的任务。",
        "请重新选择目标关联任务后重试。",
        Some(match goal_id {
            Some(goal_id) => format!("goalId={} taskId={}", goal_id, task_id),
            None => format!("taskId={}", task_id),
        }),
    )
}

fn duplicate_goal_task_reference_error(task_id: &str) -> AppError {
    AppError::recoverable_error(
        "roadmap.goal.duplicateTaskId",
        "路线图目标存在重复关联任务。",
        "请移除重复任务后重试。",
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

fn next_goal_sort_order(goals: &[RoadmapGoalEntry]) -> u32 {
    goals
        .iter()
        .map(|goal| goal.sort_order)
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

fn move_goal_to_sort_order(goals: &mut Vec<RoadmapGoalEntry>, index: usize, sort_order: u32) {
    let goal = goals.remove(index);
    let target_index = (sort_order as usize).min(goals.len());
    let mut sorted = sorted_goals(std::mem::take(goals));

    sorted.insert(target_index, goal);
    compact_goal_sort_order(&mut sorted);
    *goals = sorted;
}

fn compact_goal_sort_order(goals: &mut [RoadmapGoalEntry]) {
    goals.sort_by(|left, right| {
        left.sort_order
            .cmp(&right.sort_order)
            .then_with(|| left.created_at_ms.cmp(&right.created_at_ms))
            .then_with(|| left.goal_id.cmp(&right.goal_id))
    });

    for (index, goal) in goals.iter_mut().enumerate() {
        goal.sort_order = index as u32;
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

fn sorted_goals(mut goals: Vec<RoadmapGoalEntry>) -> Vec<RoadmapGoalEntry> {
    goals.sort_by(|left, right| {
        left.sort_order
            .cmp(&right.sort_order)
            .then_with(|| left.created_at_ms.cmp(&right.created_at_ms))
            .then_with(|| left.goal_id.cmp(&right.goal_id))
    });
    goals
}

fn normalize_goal_task_ids(
    task_ids: Vec<String>,
    tasks: &[RoadmapTaskEntry],
) -> Result<Vec<String>, AppError> {
    let existing_task_ids = tasks
        .iter()
        .map(|task| task.task_id.as_str())
        .collect::<HashSet<_>>();
    let mut seen = HashSet::new();
    let mut normalized = Vec::with_capacity(task_ids.len());

    for task_id in task_ids {
        let task_id = task_id.trim().to_owned();

        if !seen.insert(task_id.clone()) {
            return Err(duplicate_goal_task_reference_error(&task_id));
        }

        if !existing_task_ids.contains(task_id.as_str()) {
            return Err(invalid_goal_task_reference_error(None, &task_id));
        }

        normalized.push(task_id);
    }

    Ok(normalized)
}

fn validate_goal_task_references(
    goals: &[RoadmapGoalEntry],
    tasks: &[RoadmapTaskEntry],
) -> Result<(), AppError> {
    let existing_task_ids = tasks
        .iter()
        .map(|task| task.task_id.as_str())
        .collect::<HashSet<_>>();

    for goal in goals {
        for task_id in &goal.task_ids {
            if !existing_task_ids.contains(task_id.as_str()) {
                return Err(invalid_goal_task_reference_error(
                    Some(&goal.goal_id),
                    task_id,
                ));
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::{
        create_roadmap_goal, create_roadmap_task, delete_roadmap_goal, delete_roadmap_task,
        list_roadmap_goals, list_roadmap_tasks, update_roadmap_goal, update_roadmap_task,
    };
    use crate::{
        contracts::{
            CreateRoadmapGoalRequest, CreateRoadmapTaskRequest, DeleteRoadmapGoalRequest,
            DeleteRoadmapTaskRequest, ListRoadmapGoalsRequest, ListRoadmapTasksRequest,
            RoadmapGoalEntry, RoadmapTaskEntry, RoadmapTaskStatus, UpdateRoadmapGoalRequest,
            UpdateRoadmapTaskRequest,
        },
        domain::roadmap::{ROADMAP_GOAL_SCHEMA_VERSION, ROADMAP_TASK_SCHEMA_VERSION},
        infrastructure::persistence::json_store::workspace_roadmap_store::{
            save_workspace_roadmap_goals, save_workspace_roadmap_tasks,
            WorkspaceRoadmapGoalsDocument, WorkspaceRoadmapTasksDocument,
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

    #[test]
    fn creates_edits_lists_and_deletes_roadmap_goals() {
        let workspace = tempdir().expect("workspace");
        let task = create_roadmap_task(CreateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "Ship MVP".to_owned(),
            detail: None,
            status: RoadmapTaskStatus::Pending,
        })
        .expect("create task")
        .task;

        let created = create_roadmap_goal(CreateRoadmapGoalRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "  First release  ".to_owned(),
            task_ids: vec![task.task_id.clone()],
        })
        .expect("create goal");

        assert_eq!(created.goal.title, "First release");
        assert_eq!(created.goal.task_ids, vec![task.task_id.clone()]);
        assert_eq!(created.goal.sort_order, 0);

        let updated = update_roadmap_goal(UpdateRoadmapGoalRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            goal_id: created.goal.goal_id.clone(),
            title: Some(" ".to_owned()),
            task_ids: Some(Vec::new()),
            sort_order: None,
        })
        .expect("update goal");

        assert_eq!(updated.goal.title, "First release");
        assert!(updated.goal.task_ids.is_empty());

        let listed = list_roadmap_goals(ListRoadmapGoalsRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("list goals");
        assert_eq!(listed.goals.len(), 1);

        let deleted = delete_roadmap_goal(DeleteRoadmapGoalRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            goal_id: created.goal.goal_id,
        })
        .expect("delete goal");

        assert!(deleted.goals.is_empty());
    }

    #[test]
    fn goal_related_tasks_must_exist() {
        let workspace = tempdir().expect("workspace");

        let error = create_roadmap_goal(CreateRoadmapGoalRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "Launch".to_owned(),
            task_ids: vec!["01K00000000000000000000999".to_owned()],
        })
        .expect_err("missing related task");

        assert_eq!(error.code, "roadmap.goal.invalidRelatedTask");
    }

    #[test]
    fn deleting_task_removes_goal_reference() {
        let workspace = tempdir().expect("workspace");
        let task = create_roadmap_task(CreateRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "Ship MVP".to_owned(),
            detail: None,
            status: RoadmapTaskStatus::Pending,
        })
        .expect("create task")
        .task;
        let goal = create_roadmap_goal(CreateRoadmapGoalRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            title: "First release".to_owned(),
            task_ids: vec![task.task_id.clone()],
        })
        .expect("create goal")
        .goal;

        delete_roadmap_task(DeleteRoadmapTaskRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
            task_id: task.task_id,
        })
        .expect("delete task");

        let listed = list_roadmap_goals(ListRoadmapGoalsRequest {
            workspace_root: workspace.path().to_string_lossy().into_owned(),
        })
        .expect("list goals");

        assert_eq!(listed.goals[0].goal_id, goal.goal_id);
        assert!(listed.goals[0].task_ids.is_empty());
    }

    #[test]
    fn roadmap_goal_store_rejects_duplicate_sort_order() {
        let workspace = tempdir().expect("workspace");
        fs::create_dir_all(workspace.path()).expect("workspace dir");
        let goal = RoadmapGoalEntry {
            schema_version: ROADMAP_GOAL_SCHEMA_VERSION,
            goal_id: "01K00000000000000000000300".to_owned(),
            title: "Duplicate".to_owned(),
            task_ids: Vec::new(),
            sort_order: 0,
            created_at_ms: 1_760_000_030_000,
            updated_at_ms: 1_760_000_030_000,
        };
        let document = WorkspaceRoadmapGoalsDocument {
            schema_version: 1,
            goals: vec![
                goal.clone(),
                RoadmapGoalEntry {
                    goal_id: "01K00000000000000000000301".to_owned(),
                    ..goal
                },
            ],
        };

        let error = save_workspace_roadmap_goals(workspace.path(), &document)
            .expect_err("duplicate sort order");

        assert_eq!(error.code, "roadmap.goals.duplicateSortOrder");
    }
}
