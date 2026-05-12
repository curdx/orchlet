use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub enum RoadmapTaskStatus {
    Pending,
    InProgress,
    Done,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct RoadmapTaskEntry {
    pub schema_version: u32,
    pub task_id: String,
    pub title: String,
    pub detail: Option<String>,
    pub status: RoadmapTaskStatus,
    pub sort_order: u32,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct RoadmapGoalEntry {
    pub schema_version: u32,
    pub goal_id: String,
    pub title: String,
    pub task_ids: Vec<String>,
    pub sort_order: u32,
    #[ts(type = "number")]
    pub created_at_ms: u64,
    #[ts(type = "number")]
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct ListRoadmapTasksRequest {
    pub workspace_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct ListRoadmapTasksResult {
    pub tasks: Vec<RoadmapTaskEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct CreateRoadmapTaskRequest {
    pub workspace_root: String,
    pub title: String,
    pub detail: Option<String>,
    pub status: RoadmapTaskStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct CreateRoadmapTaskResult {
    pub task: RoadmapTaskEntry,
    pub tasks: Vec<RoadmapTaskEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct UpdateRoadmapTaskRequest {
    pub workspace_root: String,
    pub task_id: String,
    pub title: Option<String>,
    pub detail: Option<String>,
    pub status: Option<RoadmapTaskStatus>,
    pub sort_order: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct UpdateRoadmapTaskResult {
    pub task: RoadmapTaskEntry,
    pub tasks: Vec<RoadmapTaskEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct DeleteRoadmapTaskRequest {
    pub workspace_root: String,
    pub task_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct DeleteRoadmapTaskResult {
    pub removed_task_id: String,
    pub tasks: Vec<RoadmapTaskEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct ListRoadmapGoalsRequest {
    pub workspace_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct ListRoadmapGoalsResult {
    pub goals: Vec<RoadmapGoalEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct CreateRoadmapGoalRequest {
    pub workspace_root: String,
    pub title: String,
    pub task_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct CreateRoadmapGoalResult {
    pub goal: RoadmapGoalEntry,
    pub goals: Vec<RoadmapGoalEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct UpdateRoadmapGoalRequest {
    pub workspace_root: String,
    pub goal_id: String,
    pub title: Option<String>,
    pub task_ids: Option<Vec<String>>,
    pub sort_order: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct UpdateRoadmapGoalResult {
    pub goal: RoadmapGoalEntry,
    pub goals: Vec<RoadmapGoalEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct DeleteRoadmapGoalRequest {
    pub workspace_root: String,
    pub goal_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "roadmap.ts")]
pub struct DeleteRoadmapGoalResult {
    pub removed_goal_id: String,
    pub goals: Vec<RoadmapGoalEntry>,
}
