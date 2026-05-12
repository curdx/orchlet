use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use ulid::Ulid;

use crate::{
    contracts::{AppError, RoadmapGoalEntry, RoadmapTaskEntry},
    domain::{
        roadmap::{
            validate_unique_goal_ids_and_order, validate_unique_task_ids_and_order,
            WORKSPACE_ROADMAP_DIR_NAME, WORKSPACE_ROADMAP_GOALS_FILE_NAME,
            WORKSPACE_ROADMAP_TASKS_FILE_NAME,
        },
        workspace::WORKSPACE_DIR_NAME,
    },
};

pub const WORKSPACE_ROADMAP_TASKS_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_ROADMAP_GOALS_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRoadmapTasksDocument {
    pub schema_version: u32,
    pub tasks: Vec<RoadmapTaskEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRoadmapGoalsDocument {
    pub schema_version: u32,
    pub goals: Vec<RoadmapGoalEntry>,
}

impl Default for WorkspaceRoadmapTasksDocument {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_ROADMAP_TASKS_SCHEMA_VERSION,
            tasks: Vec::new(),
        }
    }
}

impl Default for WorkspaceRoadmapGoalsDocument {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_ROADMAP_GOALS_SCHEMA_VERSION,
            goals: Vec::new(),
        }
    }
}

pub fn workspace_roadmap_dir(workspace_root: &Path) -> PathBuf {
    workspace_root
        .join(WORKSPACE_DIR_NAME)
        .join(WORKSPACE_ROADMAP_DIR_NAME)
}

pub fn workspace_roadmap_tasks_path(workspace_root: &Path) -> PathBuf {
    workspace_roadmap_dir(workspace_root).join(WORKSPACE_ROADMAP_TASKS_FILE_NAME)
}

pub fn workspace_roadmap_goals_path(workspace_root: &Path) -> PathBuf {
    workspace_roadmap_dir(workspace_root).join(WORKSPACE_ROADMAP_GOALS_FILE_NAME)
}

pub fn load_workspace_roadmap_tasks(
    workspace_root: &Path,
) -> Result<WorkspaceRoadmapTasksDocument, AppError> {
    let tasks_path = workspace_roadmap_tasks_path(workspace_root);

    if !tasks_path.exists() {
        return Ok(WorkspaceRoadmapTasksDocument::default());
    }

    let raw = fs::read_to_string(&tasks_path).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.tasks.readFailed",
            "无法读取工作区路线图任务。",
            "路线图未更新；请检查 .orchlet/roadmap/tasks.json 权限后重试。",
            Some(format!("{}: {}", tasks_path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.tasks.invalidJson",
            "工作区路线图任务不是有效 JSON。",
            "请先备份或修复 .orchlet/roadmap/tasks.json 后重试。",
            Some(format!("{}: {}", tasks_path.display(), error)),
        )
    })?;
    let document: WorkspaceRoadmapTasksDocument =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "roadmap.tasks.invalidFields",
                format!("工作区路线图任务字段无效：{}。", error),
                "请先备份或修复 .orchlet/roadmap/tasks.json 后重试。",
                Some(format!("{}: {}", tasks_path.display(), error)),
            )
        })?;

    validate_workspace_roadmap_tasks(&document)?;

    Ok(document)
}

pub fn save_workspace_roadmap_tasks(
    workspace_root: &Path,
    document: &WorkspaceRoadmapTasksDocument,
) -> Result<(), AppError> {
    validate_workspace_roadmap_tasks(document)?;

    let tasks_path = workspace_roadmap_tasks_path(workspace_root);
    let tasks_dir = tasks_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "roadmap.tasks.invalidPath",
            "无法定位工作区路线图目录。",
            "路线图未更新；请检查工作区路径后重试。",
            Some(tasks_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(tasks_dir).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.tasks.createDirFailed",
            "无法创建工作区路线图目录。",
            "路线图未更新；请检查工作区权限后重试。",
            Some(format!("{}: {}", tasks_dir.display(), error)),
        )
    })?;

    write_workspace_roadmap_tasks_atomic(&tasks_path, document)
}

pub fn load_workspace_roadmap_goals(
    workspace_root: &Path,
) -> Result<WorkspaceRoadmapGoalsDocument, AppError> {
    let goals_path = workspace_roadmap_goals_path(workspace_root);

    if !goals_path.exists() {
        return Ok(WorkspaceRoadmapGoalsDocument::default());
    }

    let raw = fs::read_to_string(&goals_path).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.goals.readFailed",
            "无法读取工作区路线图目标。",
            "路线图目标未更新；请检查 .orchlet/roadmap/goals.json 权限后重试。",
            Some(format!("{}: {}", goals_path.display(), error)),
        )
    })?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.goals.invalidJson",
            "工作区路线图目标不是有效 JSON。",
            "请先备份或修复 .orchlet/roadmap/goals.json 后重试。",
            Some(format!("{}: {}", goals_path.display(), error)),
        )
    })?;
    let document: WorkspaceRoadmapGoalsDocument =
        serde_json::from_value(value).map_err(|error| {
            AppError::recoverable_error(
                "roadmap.goals.invalidFields",
                format!("工作区路线图目标字段无效：{}。", error),
                "请先备份或修复 .orchlet/roadmap/goals.json 后重试。",
                Some(format!("{}: {}", goals_path.display(), error)),
            )
        })?;

    validate_workspace_roadmap_goals(&document)?;

    Ok(document)
}

pub fn save_workspace_roadmap_goals(
    workspace_root: &Path,
    document: &WorkspaceRoadmapGoalsDocument,
) -> Result<(), AppError> {
    validate_workspace_roadmap_goals(document)?;

    let goals_path = workspace_roadmap_goals_path(workspace_root);
    let goals_dir = goals_path.parent().ok_or_else(|| {
        AppError::recoverable_error(
            "roadmap.goals.invalidPath",
            "无法定位工作区路线图目标目录。",
            "路线图目标未更新；请检查工作区路径后重试。",
            Some(goals_path.display().to_string()),
        )
    })?;

    fs::create_dir_all(goals_dir).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.goals.createDirFailed",
            "无法创建工作区路线图目标目录。",
            "路线图目标未更新；请检查工作区权限后重试。",
            Some(format!("{}: {}", goals_dir.display(), error)),
        )
    })?;

    write_workspace_roadmap_goals_atomic(&goals_path, document)
}

pub fn validate_workspace_roadmap_tasks(
    document: &WorkspaceRoadmapTasksDocument,
) -> Result<(), AppError> {
    if document.schema_version != WORKSPACE_ROADMAP_TASKS_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "roadmap.tasks.unsupportedSchemaVersion",
            "路线图任务数据版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份该工作区路线图文件。",
            Some(format!(
                "schemaVersion={} expected={}",
                document.schema_version, WORKSPACE_ROADMAP_TASKS_SCHEMA_VERSION
            )),
        ));
    }

    validate_unique_task_ids_and_order(&document.tasks)
}

pub fn validate_workspace_roadmap_goals(
    document: &WorkspaceRoadmapGoalsDocument,
) -> Result<(), AppError> {
    if document.schema_version != WORKSPACE_ROADMAP_GOALS_SCHEMA_VERSION {
        return Err(AppError::recoverable_error(
            "roadmap.goals.unsupportedSchemaVersion",
            "路线图目标数据版本暂不支持。",
            "请使用兼容版本的 orchlet，或先备份该工作区路线图目标文件。",
            Some(format!(
                "schemaVersion={} expected={}",
                document.schema_version, WORKSPACE_ROADMAP_GOALS_SCHEMA_VERSION
            )),
        ));
    }

    validate_unique_goal_ids_and_order(&document.goals)
}

fn write_workspace_roadmap_tasks_atomic(
    path: &Path,
    document: &WorkspaceRoadmapTasksDocument,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(document).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.tasks.serializeFailed",
            "无法序列化工作区路线图任务。",
            "路线图未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        WORKSPACE_ROADMAP_TASKS_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.tasks.writeFailed",
            "无法写入工作区路线图任务。",
            "路线图未更新；请检查工作区权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "roadmap.tasks.renameFailed",
            "无法完成工作区路线图任务写入。",
            "路线图未更新；请检查工作区权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}

fn write_workspace_roadmap_goals_atomic(
    path: &Path,
    document: &WorkspaceRoadmapGoalsDocument,
) -> Result<(), AppError> {
    let serialized = serde_json::to_string_pretty(document).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.goals.serializeFailed",
            "无法序列化工作区路线图目标。",
            "路线图目标未更新；请重试，如果问题持续，请查看诊断信息。",
            Some(error.to_string()),
        )
    })?;
    let temp_path = path.with_file_name(format!(
        "{}.tmp-{}",
        WORKSPACE_ROADMAP_GOALS_FILE_NAME,
        Ulid::new()
    ));

    fs::write(&temp_path, serialized).map_err(|error| {
        AppError::recoverable_error(
            "roadmap.goals.writeFailed",
            "无法写入工作区路线图目标。",
            "路线图目标未更新；请检查工作区权限后重试。",
            Some(format!("{}: {}", temp_path.display(), error)),
        )
    })?;

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        AppError::recoverable_error(
            "roadmap.goals.renameFailed",
            "无法完成工作区路线图目标写入。",
            "路线图目标未更新；请检查工作区权限后重试。",
            Some(format!(
                "{} -> {}: {}",
                temp_path.display(),
                path.display(),
                error
            )),
        )
    })
}
