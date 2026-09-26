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
} from "./types";

/**
 * Server Action for Main Head to create top-level task.
 */
export async function createTaskAction(
  prevState: TaskResult<TaskRow> | null,
  formData: FormData
): Promise<TaskResult<TaskRow>> {
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;
  const primaryGroupId = formData.get("primaryGroupId") as string;
  const assignedHeadId = (formData.get("assignedHeadId") as string) || undefined;
  const deadline = (formData.get("deadline") as string) || undefined;
  const priority = (formData.get("priority") as TaskPriority) || "medium";
  const isVolunteerPool = formData.get("isVolunteerPool") === "true";

  const result = await createTask({
    title,
    description,
    primaryGroupId,
    assignedHeadId,
    deadline,
    priority,
    isVolunteerPool,
  });

  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/command-center");
  }

  return result;
}

/**
 * Server Action for Group Head to delegate a child task to a group member.
 */
export async function delegateTaskAction(
  prevState: TaskResult<TaskRow> | null,
  formData: FormData
): Promise<TaskResult<TaskRow>> {
  const parentTaskId = formData.get("parentTaskId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;
  const assigneeId = formData.get("assigneeId") as string;
  const deadline = (formData.get("deadline") as string) || undefined;
  const priority = (formData.get("priority") as TaskPriority) || undefined;

  const result = await delegateTask({
    parentTaskId,
    title,
    description,
    assigneeId,
    deadline,
    priority,
  });

  if (result.success) {
    revalidatePath("/workspace");
    revalidatePath("/workspace/group");
    if (parentTaskId) {
      revalidatePath(`/workspace/tasks/${parentTaskId}`);
    }
  }

  return result;
}

/**
 * Server Action to accept an assigned task.
 */
export async function acceptTaskAction(taskId: string): Promise<TaskResult<TaskRow>> {
  const result = await acceptTask(taskId);
  if (result.success) {
    revalidatePath("/workspace");
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
