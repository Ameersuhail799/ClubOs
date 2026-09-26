import type { Database } from "@/types/database.types";
import type { UserRole } from "@/lib/auth/context";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskPermission = Database["public"]["Enums"]["task_permission"];

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskAccessRow = Database["public"]["Tables"]["task_access"]["Row"];

export type TaskErrorCode =
  | "unauthorized"
  | "forbidden"
  | "task_not_found"
  | "invalid_transition"
  | "invalid_assignee"
  | "invalid_group"
  | "invalid_parent"
  | "inactive_member"
  | "deadline_invalid"
  | "task_completed"
  | "task_cancelled"
  | "conflict"
  | "internal_error";

export interface TaskResult<T = TaskRow> {
  success?: boolean;
  data?: T | null;
  error?: string | null;
  code?: TaskErrorCode;
  message?: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  primaryGroupId: string;
  assignedHeadId?: string | null;
  assigneeId?: string | null;
  deadline?: string | null;
  priority?: TaskPriority;
  isVolunteerPool?: boolean;
  parentTaskId?: string | null;
}

export interface DelegateTaskInput {
  parentTaskId: string;
  title: string;
  description?: string | null;
  assigneeId: string;
  deadline?: string | null;
  priority?: TaskPriority;
}

export interface ReassignTaskInput {
  assignedHeadId?: string | null;
  assigneeId?: string | null;
  primaryGroupId?: string;
}

export interface UpdateTaskParametersInput {
  deadline?: string | null;
  priority?: TaskPriority;
}

export interface GrantTaskAccessInput {
  taskId: string;
  userId?: string | null;
  groupId?: string | null;
  permission?: TaskPermission;
}

export interface TaskFilterOptions {
  primaryGroupId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  assignedHeadId?: string;
  parentTaskId?: string | null;
  isVolunteerPool?: boolean;
}

export interface TaskWithDetails extends TaskRow {
  primaryGroup?: { id: string; name: string; slug: string } | null;
  assignedHeadProfile?: { id: string; fullName: string; email: string } | null;
  assigneeProfile?: { id: string; fullName: string; email: string } | null;
  creatorProfile?: { id: string; fullName: string; email: string } | null;
  parentTask?: { id: string; taskCode: string; title: string; status: TaskStatus } | null;
  childTasks?: TaskRow[];
  taskAccess?: Array<{
    id: string;
    userId: string | null;
    groupId: string | null;
    permission: TaskPermission;
    userName?: string | null;
    groupName?: string | null;
  }>;
}
