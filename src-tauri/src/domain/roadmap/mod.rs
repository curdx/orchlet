use std::collections::HashSet;

use ulid::Ulid;

use crate::contracts::{AppError, RoadmapTaskEntry};

pub const ROADMAP_TASK_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_ROADMAP_DIR_NAME: &str = "roadmap";
pub const WORKSPACE_ROADMAP_TASKS_FILE_NAME: &str = "tasks.json";

pub fn normalize_task_title(title: impl AsRef<str>) -> String {
    let trimmed = title.as_ref().trim();

    if trimmed.is_empty() {
        "新任务".to_owned()
    } else {
        trimmed.to_owned()
    }
}

pub fn normalize_task_detail(detail: Option<String>) -> Option<String> {
    detail.and_then(|value| {
        let trimmed = value.trim();

        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

pub fn validate_roadmap_task(task: &RoadmapTaskEntry) -> Result<(), AppError> {
    if task.schema_version != ROADMAP_TASK_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "roadmap.task.invalidRecordVersion",
            "路线图任务记录版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份该工作区路线图文件。",
            Some(format!(
                "taskId={} schemaVersion={} expected={}",
                task.task_id, task.schema_version, ROADMAP_TASK_SCHEMA_VERSION
            )),
        ));
    }

    if task.task_id.parse::<Ulid>().is_err() {
        return Err(AppError::recoverable_error(
            "roadmap.task.invalidTaskId",
            "路线图任务标识无效。",
            "请修复 .orchlet/roadmap/tasks.json 中的 taskId 后重试。",
            Some(format!("taskId must be a ULID string: {}", task.task_id)),
        ));
    }

    if task.title.trim().is_empty() {
        return Err(AppError::recoverable_error(
            "roadmap.task.invalidTitle",
            "路线图任务标题无效。",
            "请修复 .orchlet/roadmap/tasks.json 中的 title 后重试。",
            Some(format!("taskId={} title must not be empty", task.task_id)),
        ));
    }

    if task.created_at_ms == 0 || task.updated_at_ms < task.created_at_ms {
        return Err(AppError::recoverable_error(
            "roadmap.task.invalidTimestamp",
            "路线图任务时间戳无效。",
            "请修复 .orchlet/roadmap/tasks.json 中的时间戳后重试。",
            Some(format!("taskId={}", task.task_id)),
        ));
    }

    Ok(())
}

pub fn validate_unique_task_ids_and_order(tasks: &[RoadmapTaskEntry]) -> Result<(), AppError> {
    let mut task_ids = HashSet::new();
    let mut sort_orders = HashSet::new();

    for task in tasks {
        validate_roadmap_task(task)?;

        if !task_ids.insert(task.task_id.clone()) {
            return Err(AppError::recoverable_error(
                "roadmap.tasks.duplicateTaskId",
                "路线图存在重复任务。",
                "请修复重复 taskId 后重试。",
                Some(task.task_id.clone()),
            ));
        }

        if !sort_orders.insert(task.sort_order) {
            return Err(AppError::recoverable_error(
                "roadmap.tasks.duplicateSortOrder",
                "路线图任务排序数据重复。",
                "请修复重复 sortOrder 后重试。",
                Some(format!("sortOrder={}", task.sort_order)),
            ));
        }
    }

    Ok(())
}
