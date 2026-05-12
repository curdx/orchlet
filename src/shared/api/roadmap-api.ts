import type {
  CreateRoadmapTaskResult,
  DeleteRoadmapTaskResult,
  ListRoadmapTasksResult,
  RoadmapTaskStatus,
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
};
