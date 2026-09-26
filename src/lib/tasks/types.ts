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

export interface TaskComment {
  id: string;
  taskId: string;
  organizationId: string;
  authorId: string;
  authorName: string;
  authorRole?: UserRole | null;
  authorEmail?: string | null;
  content: string;
  isInternalNote: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFile {
  id: string;
  taskId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string | null;
  actorName: string;
  actorRole?: UserRole | null;
  action: string;
  previousState: Record<string, any> | null;
  newState: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface TaskAccessDetail {
  id: string;
  taskId: string;
  userId: string | null;
  groupId: string | null;
  permission: TaskPermission;
  targetName: string;
  targetEmail?: string | null;
  isGroup: boolean;
  grantedByName?: string | null;
  createdAt: string;
}

export interface EligibleAssignee {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  primaryGroupId: string | null;
  primaryGroupName: string | null;
}

export interface TaskWithFullDetails extends TaskWithDetails {
  comments: TaskComment[];
  files: TaskFile[];
  activities: TaskActivity[];
  collaborators: TaskAccessDetail[];
  parentTaskDetail?: {
    id: string;
    taskCode: string;
    title: string;
    status: TaskStatus;
    canAccess: boolean;
  } | null;
  subtasks: Array<{
    id: string;
    taskCode: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    deadline: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    canAccess: boolean;
  }>;
  eligibleAssignees?: EligibleAssignee[];
  currentUserRole: UserRole;
  currentUserId: string;
  isCurrentAssignee: boolean;
  isCurrentAssignedHead: boolean;
  canPerformActions: {
    canAccept: boolean;
    canStart: boolean;
    canSubmitForReview: boolean;
    canComplete: boolean;
    canRequestChanges: boolean;
    canBlock: boolean;
    canUnblock: boolean;
    canCancel: boolean;
    canReassign: boolean;
    canUpdateParameters: boolean;
    canManageAccess: boolean;
    canComment: boolean;
  };
}
