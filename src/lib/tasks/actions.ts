"use server";

import { revalidatePath } from "next/cache";
import {
  createTask,
  delegateTask,
  acceptTask,
  startTask,
  submitTaskForReview,
  completeTask,
  requestChanges,
  blockTask,
  unblockTask,
  cancelTask,
  reassignTask,
  updateTaskParameters,
  grantTaskAccess,
  revokeTaskAccess,
  addComment,
  getEligibleAssignees,
  getEligibleGroupHeads,
  getTaskCreationContext,
  getOrganizationDirectives,
  getGroupWorkspaceData,
} from "./service";
import type {
  TaskRow,
  TaskAccessRow,
  TaskResult,
  CreateTaskInput,
  DelegateTaskInput,
  ReassignTaskInput,
  UpdateTaskParametersInput,
  GrantTaskAccessInput,
  TaskPriority,
  TaskComment,
  EligibleAssignee,
  EligibleGroupHead,
  TaskWithDetails,
  GroupWorkspaceData,
} from "./types";

/**
 * Server Action for Main Head to create top-level task.
 */
export async function createTaskAction(
  prevState: TaskResult<TaskRow> | null,
  formDataOrInput: FormData | CreateTaskInput
): Promise<TaskResult<TaskRow>> {
  let input: CreateTaskInput;

  if (formDataOrInput instanceof FormData) {
    input = {
      title: (formDataOrInput.get("title") as string) || "",
      description: (formDataOrInput.get("description") as string) || undefined,
      primaryGroupId: (formDataOrInput.get("primaryGroupId") as string) || "",
      assignedHeadId: (formDataOrInput.get("assignedHeadId") as string) || undefined,
      deadline: (formDataOrInput.get("deadline") as string) || undefined,
      priority: (formDataOrInput.get("priority") as TaskPriority) || "medium",
      isVolunteerPool: formDataOrInput.get("isVolunteerPool") === "true",
      clientSubmissionId: (formDataOrInput.get("clientSubmissionId") as string) || undefined,
    };
  } else {
    input = formDataOrInput;
  }

  const result = await createTask(input);

  if (result.success && result.data) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/command-center");
    revalidatePath(`/workspace/tasks/${result.data.id}`);
  }

  return result;
}

/**
 * Server Action to load eligible active Group Heads for task creation.
 */
export async function getEligibleGroupHeadsAction(
  groupId?: string
): Promise<TaskResult<EligibleGroupHead[]>> {
  return getEligibleGroupHeads(groupId);
}

/**
 * Server Action to load group and Group Head context for task creation drawer.
 */
export async function getTaskCreationContextAction(): Promise<
  TaskResult<{
    groups: Array<{ id: string; name: string; slug: string; description: string | null }>;
    groupHeads: EligibleGroupHead[];
  }>
> {
  return getTaskCreationContext();
}

/**
 * Server Action to retrieve top-level directives for Command Center.
 */
export async function getOrganizationDirectivesAction(): Promise<
  TaskResult<TaskWithDetails[]>
> {
  return getOrganizationDirectives();
}

/**
 * Server Action for Group Head to delegate a child task to a group member.
 */
export async function delegateTaskAction(
  prevState: TaskResult<TaskRow> | null,
  formDataOrInput: FormData | DelegateTaskInput
): Promise<TaskResult<TaskRow>> {
  let input: DelegateTaskInput;

  if (formDataOrInput instanceof FormData) {
    input = {
      parentTaskId: (formDataOrInput.get("parentTaskId") as string) || "",
      title: (formDataOrInput.get("title") as string) || "",
      description: (formDataOrInput.get("description") as string) || undefined,
      assigneeId: (formDataOrInput.get("assigneeId") as string) || "",
      deadline: (formDataOrInput.get("deadline") as string) || undefined,
      priority: (formDataOrInput.get("priority") as TaskPriority) || undefined,
    };
  } else {
    input = formDataOrInput;
  }

  const result = await delegateTask(input);

  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    if (input.parentTaskId) {
      revalidatePath(`/workspace/tasks/${input.parentTaskId}`);
    }
  }

  return result;
}

/**
 * Server Action to load group workspace dataset.
 */
export async function getGroupWorkspaceDataAction(
  targetGroupId?: string
): Promise<TaskResult<GroupWorkspaceData>> {
  return getGroupWorkspaceData(targetGroupId);
}

/**
 * Server Action to accept an assigned task.
 */
export async function acceptTaskAction(taskId: string): Promise<TaskResult<TaskRow>> {
  const result = await acceptTask(taskId);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to start work on a task.
 */
export async function startTaskAction(taskId: string): Promise<TaskResult<TaskRow>> {
  const result = await startTask(taskId);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to submit in-progress work for review.
 */
export async function submitTaskForReviewAction(taskId: string): Promise<TaskResult<TaskRow>> {
  const result = await submitTaskForReview(taskId);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action for Group Head / Main Head to review and complete a task.
 */
export async function completeTaskAction(taskId: string): Promise<TaskResult<TaskRow>> {
  const result = await completeTask(taskId);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action for Group Head / Main Head to request changes on submitted work.
 */
export async function requestChangesAction(
  taskId: string,
  feedback?: string
): Promise<TaskResult<TaskRow>> {
  const result = await requestChanges(taskId, feedback);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to block a task.
 */
export async function blockTaskAction(
  taskId: string,
  reason?: string
): Promise<TaskResult<TaskRow>> {
  const result = await blockTask(taskId, reason);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to unblock a blocked task.
 */
export async function unblockTaskAction(taskId: string): Promise<TaskResult<TaskRow>> {
  const result = await unblockTask(taskId);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to cancel a task.
 */
export async function cancelTaskAction(
  taskId: string,
  reason?: string
): Promise<TaskResult<TaskRow>> {
  const result = await cancelTask(taskId, reason);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to reassign a task.
 */
export async function reassignTaskAction(
  taskId: string,
  input: ReassignTaskInput
): Promise<TaskResult<TaskRow>> {
  const result = await reassignTask(taskId, input);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to update task parameters (deadline/priority).
 */
export async function updateTaskParametersAction(
  taskId: string,
  input: UpdateTaskParametersInput
): Promise<TaskResult<TaskRow>> {
  const result = await updateTaskParameters(taskId, input);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to grant task access.
 */
export async function grantTaskAccessAction(
  input: GrantTaskAccessInput
): Promise<TaskResult<TaskAccessRow>> {
  const result = await grantTaskAccess(input);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath(`/workspace/tasks/${input.taskId}`);
  }
  return result;
}

/**
 * Server Action to revoke task access.
 */
export async function revokeTaskAccessAction(
  taskId: string,
  taskAccessId: string
): Promise<TaskResult<void>> {
  const result = await revokeTaskAccess(taskAccessId);
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to add a comment to a task.
 */
export async function addCommentAction(
  taskId: string,
  content: string,
  isInternalNote: boolean = false
): Promise<TaskResult<TaskComment>> {
  const result = await addComment({ taskId, content, isInternalNote });
  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath(`/workspace/tasks/${taskId}`);
  }
  return result;
}

/**
 * Server Action to fetch eligible assignees for reassigning a task.
 */
export async function getEligibleAssigneesAction(
  taskId: string
): Promise<TaskResult<EligibleAssignee[]>> {
  return getEligibleAssignees(taskId);
}
