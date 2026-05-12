import type {
  CreateRoadmapGoalResult,
  CreateRoadmapTaskResult,
  DeleteRoadmapGoalResult,
  DeleteRoadmapTaskResult,
  ListRoadmapGoalsResult,
  ListRoadmapTasksResult,
  RoadmapTaskStatus,
  UpdateRoadmapGoalResult,
  UpdateRoadmapTaskResult,
} from "../../contracts/generated/roadmap";
import { invokeCommand } from "./client";

export type CreateRoadmapTaskInput = {
  title: string;
  detail: string | null;
  status: RoadmapTaskStatus;
};

export type UpdateRoadmapTaskInput = {
  title?: string | null;
  detail?: string | null;
  status?: RoadmapTaskStatus | null;
  sortOrder?: number | null;
};

export type CreateRoadmapGoalInput = {
  title: string;
  taskIds: string[];
};

export type UpdateRoadmapGoalInput = {
  title?: string | null;
  taskIds?: string[] | null;
  sortOrder?: number | null;
};

export type RoadmapApi = {
  listTasks: (workspaceRoot: string) => Promise<ListRoadmapTasksResult>;
  createTask: (
    workspaceRoot: string,
    input: CreateRoadmapTaskInput,
  ) => Promise<CreateRoadmapTaskResult>;
  updateTask: (
    workspaceRoot: string,
    taskId: string,
    input: UpdateRoadmapTaskInput,
  ) => Promise<UpdateRoadmapTaskResult>;
  deleteTask: (workspaceRoot: string, taskId: string) => Promise<DeleteRoadmapTaskResult>;
  listGoals: (workspaceRoot: string) => Promise<ListRoadmapGoalsResult>;
  createGoal: (
    workspaceRoot: string,
    input: CreateRoadmapGoalInput,
  ) => Promise<CreateRoadmapGoalResult>;
  updateGoal: (
    workspaceRoot: string,
    goalId: string,
    input: UpdateRoadmapGoalInput,
  ) => Promise<UpdateRoadmapGoalResult>;
  deleteGoal: (workspaceRoot: string, goalId: string) => Promise<DeleteRoadmapGoalResult>;
};

export const roadmapApi: RoadmapApi = {
  listTasks(workspaceRoot) {
    return invokeCommand<ListRoadmapTasksResult>("roadmap_tasks_list", {
      request: { workspaceRoot },
    });
  },

  createTask(workspaceRoot, input) {
    return invokeCommand<CreateRoadmapTaskResult>("roadmap_task_create", {
      request: {
        workspaceRoot,
        title: input.title,
        detail: input.detail,
        status: input.status,
      },
    });
  },

  updateTask(workspaceRoot, taskId, input) {
    return invokeCommand<UpdateRoadmapTaskResult>("roadmap_task_update", {
      request: {
        workspaceRoot,
        taskId,
        title: input.title ?? null,
        detail: input.detail ?? null,
        status: input.status ?? null,
        sortOrder: input.sortOrder ?? null,
      },
    });
  },

  deleteTask(workspaceRoot, taskId) {
    return invokeCommand<DeleteRoadmapTaskResult>("roadmap_task_delete", {
      request: { workspaceRoot, taskId },
    });
  },

  listGoals(workspaceRoot) {
    return invokeCommand<ListRoadmapGoalsResult>("roadmap_goals_list", {
      request: { workspaceRoot },
    });
  },

  createGoal(workspaceRoot, input) {
    return invokeCommand<CreateRoadmapGoalResult>("roadmap_goal_create", {
      request: {
        workspaceRoot,
        title: input.title,
        taskIds: input.taskIds,
      },
    });
  },

  updateGoal(workspaceRoot, goalId, input) {
    return invokeCommand<UpdateRoadmapGoalResult>("roadmap_goal_update", {
      request: {
        workspaceRoot,
        goalId,
        title: input.title ?? null,
        taskIds: input.taskIds ?? null,
        sortOrder: input.sortOrder ?? null,
      },
    });
  },

  deleteGoal(workspaceRoot, goalId) {
    return invokeCommand<DeleteRoadmapGoalResult>("roadmap_goal_delete", {
      request: { workspaceRoot, goalId },
    });
  },
};
