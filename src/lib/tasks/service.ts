import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext, type UserRole } from "@/lib/auth/context";
import type { Database } from "@/types/database.types";
import { validateStatusTransition, type TransitionAuthContext } from "./transitions";
import {
  validateTitle,
  validateDeadline,
  validatePriority,
  generateDeterministicTaskCode,
} from "./validation";
import type {
  TaskRow,
  TaskAccessRow,
  TaskResult,
  CreateTaskInput,
  DelegateTaskInput,
  ReassignTaskInput,
  UpdateTaskParametersInput,
  GrantTaskAccessInput,
  TaskFilterOptions,
  TaskWithDetails,
  TaskStatus,
} from "./types";

/**
 * Creates an immutable administrative audit record for task lifecycle events.
 */
async function recordTaskAudit({
  organizationId,
  actorId,
  taskId,
  action,
  previousState,
  newState,
  metadata,
}: {
  organizationId: string;
  actorId: string;
  taskId: string;
  action: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}) {
  const adminClient = createAdminClient();
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: actorId,
    task_id: taskId,
    entity_type: "task",
    entity_id: taskId,
    action,
    previous_state: previousState || null,
    new_state: newState || null,
    metadata: metadata || null,
  });
}

/**
 * Creates a top-level institutional directive task.
 * Authority: Only active Main Heads may issue top-level organizational tasks.
 */
export async function createTask(input: CreateTaskInput): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  // 1. Authoritative caller verification
  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  // Top-level task creation rule: Main Head only
  if (context.role !== "main_head") {
    return {
      error: "Access Denied: Only Main Heads may create top-level organizational tasks.",
      code: "forbidden",
    };
  }

  // 2. Validate input fields
  const titleVal = validateTitle(input.title);
  if (!titleVal.valid) {
    return { error: titleVal.error, code: "forbidden" };
  }

  const deadlineVal = validateDeadline(input.deadline);
  if (!deadlineVal.valid) {
    return { error: deadlineVal.error, code: "deadline_invalid" };
  }

  const { cleanPriority } = validatePriority(input.priority);

  const adminClient = createAdminClient();

  // 3. Verify primary group belongs to caller's organization
  const { data: primaryGroup, error: groupErr } = await adminClient
    .from("groups")
    .select("id, name, slug")
    .eq("id", input.primaryGroupId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (groupErr || !primaryGroup) {
    return { error: "Selected primary group does not belong to your organization.", code: "invalid_group" };
  }

  // 4. Validate assigned Group Head
  if (input.assignedHeadId) {
    const { data: headMember } = await adminClient
      .from("organization_members")
      .select("id, user_id, role, primary_group_id, status")
      .eq("organization_id", organizationId)
      .eq("user_id", input.assignedHeadId)
      .eq("status", "active")
      .maybeSingle();

    if (!headMember) {
      return {
        error: "Assigned Group Head is not an active member of your organization.",
        code: "invalid_assignee",
      };
    }

    if (headMember.primary_group_id !== input.primaryGroupId) {
      return {
        error: "Assigned Group Head does not belong to the task's primary group.",
        code: "invalid_assignee",
      };
    }
  }

  // 5. Generate deterministic task code
  const taskCode = await generateDeterministicTaskCode(organizationId, primaryGroup.slug);

  // 6. Insert task record
  const initialStatus: TaskStatus = "assigned";
  const { data: newTask, error: insertErr } = await adminClient
    .from("tasks")
    .insert({
      organization_id: organizationId,
      task_code: taskCode,
      title: titleVal.cleanTitle!,
      description: input.description?.trim() || null,
      primary_group_id: input.primaryGroupId,
      created_by: context.user.id,
      assigned_head_id: input.assignedHeadId || null,
      assignee_id: input.assigneeId || null,
      status: initialStatus,
      priority: cleanPriority,
      deadline: deadlineVal.cleanDeadline,
      is_volunteer_pool: Boolean(input.isVolunteerPool),
      parent_task_id: null,
    })
    .select("*")
    .single();

  if (insertErr || !newTask) {
    return { error: `Failed to create task: ${insertErr?.message}`, code: "internal_error" };
  }

  // 7. Audit log creation & assignment
  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId: newTask.id,
    action: "task_created",
    previousState: null,
    newState: {
      id: newTask.id,
      task_code: newTask.task_code,
      title: newTask.title,
      status: newTask.status,
      priority: newTask.priority,
      primary_group_id: newTask.primary_group_id,
      assigned_head_id: newTask.assigned_head_id,
    },
    metadata: {
      group_name: primaryGroup.name,
      deadline: newTask.deadline,
    },
  });

  if (newTask.assigned_head_id) {
    await recordTaskAudit({
      organizationId,
      actorId: context.user.id,
      taskId: newTask.id,
      action: "task_assigned",
      previousState: null,
      newState: { assigned_head_id: newTask.assigned_head_id },
      metadata: { target_head_id: newTask.assigned_head_id },
    });
  }

  return { success: true, data: newTask };
}

/**
 * Delegates a child task under an existing parent task.
 * Authority: Responsible Group Head (or Main Head).
 * Assignee must be an active member in the SAME primary group.
 */
export async function delegateTask(input: DelegateTaskInput): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  // 1. Fetch and validate parent task
  const { data: parentTask, error: parentErr } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", input.parentTaskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (parentErr || !parentTask) {
    return { error: "Parent task not found in your organization.", code: "invalid_parent" };
  }

  if (parentTask.status === "completed") {
    return { error: "Cannot delegate subtasks under a completed task.", code: "task_completed" };
  }

  if (parentTask.status === "cancelled") {
    return { error: "Cannot delegate subtasks under a cancelled task.", code: "task_cancelled" };
  }

  // Role delegation check
  const isMainHead = context.role === "main_head";
  const isGroupHead = context.role === "group_head";

  if (!isMainHead && !isGroupHead) {
    return {
      error: "Access Denied: Only Group Heads or Main Heads may delegate tasks.",
      code: "forbidden",
    };
  }

  if (isGroupHead && parentTask.primary_group_id !== context.primaryGroup?.id) {
    return {
      error: "Group Head can only delegate subtasks within their own primary group.",
      code: "forbidden",
    };
  }

  // 2. Validate delegate assignee (must be active member of same primary group & org)
  const { data: assigneeMember, error: memErr } = await adminClient
    .from("organization_members")
    .select("id, user_id, role, primary_group_id, status")
    .eq("organization_id", organizationId)
    .eq("user_id", input.assigneeId)
    .eq("status", "active")
    .maybeSingle();

  if (memErr || !assigneeMember) {
    return {
      error: "Target delegate is not an active member of your organization.",
      code: "invalid_assignee",
    };
  }

  if (assigneeMember.primary_group_id !== parentTask.primary_group_id) {
    return {
      error: "Group Head can only delegate to active members within their own primary group.",
      code: "invalid_assignee",
    };
  }

  // 3. Validate input parameters
  const titleVal = validateTitle(input.title);
  if (!titleVal.valid) {
    return { error: titleVal.error, code: "forbidden" };
  }

  const deadlineVal = validateDeadline(input.deadline);
  if (!deadlineVal.valid) {
    return { error: deadlineVal.error, code: "deadline_invalid" };
  }

  const { cleanPriority } = validatePriority(input.priority || parentTask.priority);

  // 4. Fetch group details for task code generation
  const { data: group } = await adminClient
    .from("groups")
    .select("slug")
    .eq("id", parentTask.primary_group_id)
    .single();

  const taskCode = await generateDeterministicTaskCode(organizationId, group?.slug || "sub");

  // 5. Insert child task
  const initialStatus: TaskStatus = "assigned";
  const { data: childTask, error: insertErr } = await adminClient
    .from("tasks")
    .insert({
      organization_id: organizationId,
      task_code: taskCode,
      title: titleVal.cleanTitle!,
      description: input.description?.trim() || null,
      primary_group_id: parentTask.primary_group_id,
      created_by: context.user.id,
      assigned_head_id: parentTask.assigned_head_id || (isGroupHead ? context.user.id : null),
      assignee_id: input.assigneeId,
      status: initialStatus,
      priority: cleanPriority,
      deadline: deadlineVal.cleanDeadline || parentTask.deadline,
      is_volunteer_pool: false,
      parent_task_id: parentTask.id,
    })
    .select("*")
    .single();

  if (insertErr || !childTask) {
    return { error: `Failed to delegate task: ${insertErr?.message}`, code: "internal_error" };
  }

  // 6. Record audit logs
  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId: childTask.id,
    action: "task_delegated",
    previousState: null,
    newState: {
      id: childTask.id,
      parent_task_id: parentTask.id,
      assignee_id: childTask.assignee_id,
      assigned_head_id: childTask.assigned_head_id,
    },
    metadata: {
      parent_task_code: parentTask.task_code,
      child_task_code: childTask.task_code,
    },
  });

  return { success: true, data: childTask };
}

/**
 * Accepts an assigned task.
 * Only the designated Group Head (for top-level tasks) or assigned member (for subtasks) may accept.
 */
export async function acceptTask(taskId: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  // Idempotency: If already accepted, return cleanly
  if (task.status === "accepted") {
    return { success: true, data: task, message: "Task is already accepted." };
  }

  // Validate state transition & authority
  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("accepted", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to accept task: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_accepted",
    previousState: { status: task.status },
    newState: { status: "accepted" },
  });

  return { success: true, data: updatedTask };
}

/**
 * Starts execution on an assigned or accepted task (moves status to in_progress).
 */
export async function startTask(taskId: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  // Idempotent: If already in_progress, return cleanly
  if (task.status === "in_progress") {
    return { success: true, data: task, message: "Task is already in progress." };
  }

  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("in_progress", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to start task: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_started",
    previousState: { status: task.status },
    newState: { status: "in_progress" },
  });

  return { success: true, data: updatedTask };
}

/**
 * Submits in-progress work for review (moves status to ready_for_review).
 */
export async function submitTaskForReview(taskId: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (task.status === "ready_for_review") {
    return { success: true, data: task, message: "Task is already ready for review." };
  }

  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("ready_for_review", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "ready_for_review", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to submit task for review: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_submitted_for_review",
    previousState: { status: task.status },
    newState: { status: "ready_for_review" },
  });

  return { success: true, data: updatedTask };
}

/**
 * Reviews and completes a task.
 * Rule: Only Group Heads or Main Heads can mark tasks completed.
 * Members are strictly forbidden from self-approving or marking tasks completed.
 */
export async function completeTask(taskId: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  // Idempotency: If already completed, return cleanly
  if (task.status === "completed") {
    return { success: true, data: task, message: "Task is already completed." };
  }

  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("completed", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const now = new Date().toISOString();
  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to complete task: ${updateErr?.message}`, code: "internal_error" };
  }

  if (task.status === "ready_for_review") {
    await recordTaskAudit({
      organizationId,
      actorId: context.user.id,
      taskId,
      action: "task_reviewed",
      previousState: { status: "ready_for_review" },
      newState: { status: "completed" },
    });
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_completed",
    previousState: { status: task.status },
    newState: { status: "completed", completed_at: now },
  });

  return { success: true, data: updatedTask };
}

/**
 * Transitions task to blocked state.
 */
export async function blockTask(taskId: string, reason?: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (task.status === "blocked") {
    return { success: true, data: task, message: "Task is already blocked." };
  }

  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("blocked", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "blocked", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to block task: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_blocked",
    previousState: { status: task.status },
    newState: { status: "blocked" },
    metadata: { reason: reason?.trim() || null },
  });

  return { success: true, data: updatedTask };
}

/**
 * Unblocks a blocked task, returning it to in_progress.
 */
export async function unblockTask(taskId: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (task.status !== "blocked") {
    return { error: `Cannot unblock task with status '${task.status}'.`, code: "invalid_transition" };
  }

  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("in_progress", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to unblock task: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_unblocked",
    previousState: { status: "blocked" },
    newState: { status: "in_progress" },
  });

  return { success: true, data: updatedTask };
}

/**
 * Cancels a task.
 * Members cannot cancel tasks.
 */
export async function cancelTask(taskId: string, reason?: string): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (task.status === "cancelled") {
    return { success: true, data: task, message: "Task is already cancelled." };
  }

  const authContext: TransitionAuthContext = {
    userId: context.user.id,
    role: context.role || "member",
    primaryGroupId: context.primaryGroup?.id || null,
    task,
  };

  const validation = validateStatusTransition("cancelled", authContext);
  if (!validation.allowed) {
    return { error: validation.reason, code: validation.code };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to cancel task: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_cancelled",
    previousState: { status: task.status },
    newState: { status: "cancelled" },
    metadata: { reason: reason?.trim() || null },
  });

  return { success: true, data: updatedTask };
}

/**
 * Reassigns an existing task.
 * Main Head: Can reassign across groups inside the organization.
 * Group Head: Can reassign only within their own primary group.
 * Members: Cannot reassign.
 */
export async function reassignTask(
  taskId: string,
  input: ReassignTaskInput
): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role === "member") {
    return { error: "Members cannot reassign tasks.", code: "forbidden" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (task.status === "completed") {
    return { error: "Cannot reassign completed tasks.", code: "task_completed" };
  }

  if (task.status === "cancelled") {
    return { error: "Cannot reassign cancelled tasks.", code: "task_cancelled" };
  }

  const isMainHead = context.role === "main_head";
  const isGroupHead = context.role === "group_head";

  if (isGroupHead && task.primary_group_id !== context.primaryGroup?.id) {
    return { error: "Group Heads can only reassign tasks within their own primary group.", code: "forbidden" };
  }

  // Validate target assignee
  if (input.assigneeId !== undefined && input.assigneeId !== null) {
    const { data: targetMember } = await adminClient
      .from("organization_members")
      .select("id, primary_group_id, status")
      .eq("organization_id", organizationId)
      .eq("user_id", input.assigneeId)
      .eq("status", "active")
      .maybeSingle();

    if (!targetMember) {
      return { error: "Target assignee is not an active member in your organization.", code: "invalid_assignee" };
    }

    if (isGroupHead && targetMember.primary_group_id !== context.primaryGroup?.id) {
      return {
        error: "Group Head can only assign tasks to active members within their own primary group.",
        code: "invalid_assignee",
      };
    }
  }

  // Validate target assigned head
  if (input.assignedHeadId !== undefined && input.assignedHeadId !== null) {
    const { data: targetHead } = await adminClient
      .from("organization_members")
      .select("id, primary_group_id, status, role")
      .eq("organization_id", organizationId)
      .eq("user_id", input.assignedHeadId)
      .eq("status", "active")
      .maybeSingle();

    if (!targetHead) {
      return { error: "Target Group Head is not active in your organization.", code: "invalid_assignee" };
    }

    if (isGroupHead && targetHead.primary_group_id !== context.primaryGroup?.id) {
      return {
        error: "Group Head can only reassign to heads within their own primary group.",
        code: "invalid_assignee",
      };
    }
  }

  const updates: Database["public"]["Tables"]["tasks"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (input.assigneeId !== undefined) {
    updates.assignee_id = input.assigneeId;
  }
  if (input.assignedHeadId !== undefined) {
    updates.assigned_head_id = input.assignedHeadId;
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to reassign task: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_reassigned",
    previousState: {
      assignee_id: task.assignee_id,
      assigned_head_id: task.assigned_head_id,
    },
    newState: {
      assignee_id: updatedTask.assignee_id,
      assigned_head_id: updatedTask.assigned_head_id,
    },
  });

  return { success: true, data: updatedTask };
}

/**
 * Updates task deadline or priority.
 * Main Head: can update organization-wide.
 * Group Head: can update within their own group.
 * Members: cannot change deadline or priority.
 */
export async function updateTaskParameters(
  taskId: string,
  input: UpdateTaskParametersInput
): Promise<TaskResult<TaskRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role === "member") {
    return { error: "Members cannot modify task deadlines or priority.", code: "forbidden" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (task.status === "completed" || task.status === "cancelled") {
    return { error: "Cannot modify completed or cancelled tasks.", code: "forbidden" };
  }

  if (context.role === "group_head" && task.primary_group_id !== context.primaryGroup?.id) {
    return { error: "Group Heads can only adjust tasks in their own primary group.", code: "forbidden" };
  }

  const updates: Database["public"]["Tables"]["tasks"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (input.deadline !== undefined) {
    const deadlineVal = validateDeadline(input.deadline);
    if (!deadlineVal.valid) {
      return { error: deadlineVal.error, code: "deadline_invalid" };
    }
    updates.deadline = deadlineVal.cleanDeadline;
  }

  if (input.priority !== undefined) {
    const { cleanPriority } = validatePriority(input.priority);
    updates.priority = cleanPriority;
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to update task parameters: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_updated",
    previousState: { deadline: task.deadline, priority: task.priority },
    newState: { deadline: updatedTask.deadline, priority: updatedTask.priority },
  });

  return { success: true, data: updatedTask };
}

/**
 * Grants explicit cross-group task collaboration access (task_access).
 * Only authorized heads may grant task access.
 */
export async function grantTaskAccess(
  input: GrantTaskAccessInput
): Promise<TaskResult<TaskAccessRow>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role === "member") {
    return { error: "Members cannot grant task access.", code: "forbidden" };
  }

  const adminClient = createAdminClient();

  const { data: task, error: taskErr } = await adminClient
    .from("tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (taskErr || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  if (context.role === "group_head" && task.primary_group_id !== context.primaryGroup?.id) {
    return { error: "Group Heads may only manage access for their own group's tasks.", code: "forbidden" };
  }

  // Target validation: Must have either userId or groupId, not both, not neither
  const hasUser = Boolean(input.userId);
  const hasGroup = Boolean(input.groupId);

  if ((hasUser && hasGroup) || (!hasUser && !hasGroup)) {
    return { error: "Must specify either a target user or target group, but not both.", code: "forbidden" };
  }

  if (hasUser) {
    const { data: targetMember } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", input.userId!)
      .eq("status", "active")
      .maybeSingle();

    if (!targetMember) {
      return { error: "Target user is not an active member in your organization.", code: "invalid_assignee" };
    }
  }

  if (hasGroup) {
    const { data: targetGroup } = await adminClient
      .from("groups")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", input.groupId!)
      .maybeSingle();

    if (!targetGroup) {
      return { error: "Target group does not belong to your organization.", code: "invalid_group" };
    }
  }

  const permission = input.permission || "view";

  const { data: grant, error: grantErr } = await adminClient
    .from("task_access")
    .insert({
      organization_id: organizationId,
      task_id: input.taskId,
      user_id: input.userId || null,
      group_id: input.groupId || null,
      permission,
      granted_by: context.user.id,
    })
    .select("*")
    .single();

  if (grantErr || !grant) {
    return { error: `Failed to grant task access: ${grantErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId: input.taskId,
    action: "task_access_granted",
    metadata: {
      target_user_id: input.userId,
      target_group_id: input.groupId,
      permission,
    },
  });

  return { success: true, data: grant };
}

/**
 * Revokes explicit task collaboration access.
 */
export async function revokeTaskAccess(taskAccessId: string): Promise<TaskResult<void>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role === "member") {
    return { error: "Members cannot revoke task access.", code: "forbidden" };
  }

  const adminClient = createAdminClient();

  const { data: access, error: accessErr } = await adminClient
    .from("task_access")
    .select("*, task:tasks(*)")
    .eq("id", taskAccessId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (accessErr || !access) {
    return { error: "Task access record not found in your organization.", code: "task_not_found" };
  }

  const task = access.task as TaskRow;
  if (context.role === "group_head" && task.primary_group_id !== context.primaryGroup?.id) {
    return { error: "Group Heads may only manage access for their own group's tasks.", code: "forbidden" };
  }

  const { error: delErr } = await adminClient
    .from("task_access")
    .delete()
    .eq("id", taskAccessId);

  if (delErr) {
    return { error: `Failed to revoke task access: ${delErr.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId: task.id,
    action: "task_access_revoked",
    metadata: {
      target_user_id: access.user_id,
      target_group_id: access.group_id,
    },
  });

  return { success: true };
}

/**
 * Retrieves a single task with relational details.
 * Enforces authorization boundary via server session.
 */
export async function getTaskById(taskId: string): Promise<TaskResult<TaskWithDetails>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("*, primary_group:groups(id, name, slug)")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  // Authorization check for viewing task
  const isMainHead = context.role === "main_head";
  const isOwnGroup = task.primary_group_id === context.primaryGroup?.id;
  const isAssignee = task.assignee_id === context.user.id;
  const isAssignedHead = task.assigned_head_id === context.user.id;

  let hasExplicitAccess = false;
  if (!isMainHead && !isOwnGroup && !isAssignee && !isAssignedHead) {
    const { data: explicit } = await adminClient
      .from("task_access")
      .select("id")
      .eq("task_id", taskId)
      .or(`user_id.eq.${context.user.id},group_id.eq.${context.primaryGroup?.id || "00000000-0000-0000-0000-000000000000"}`)
      .maybeSingle();
    hasExplicitAccess = Boolean(explicit);
  }

  if (!isMainHead && !isOwnGroup && !isAssignee && !isAssignedHead && !hasExplicitAccess) {
    return { error: "Access Denied: You do not have permission to view this task.", code: "forbidden" };
  }

  // Fetch child tasks if any
  const { data: childTasks } = await adminClient
    .from("tasks")
    .select("*")
    .eq("parent_task_id", taskId)
    .order("created_at", { ascending: true });

  // Fetch task access list
  const { data: accessList } = await adminClient
    .from("task_access")
    .select("id, user_id, group_id, permission")
    .eq("task_id", taskId);

  return {
    success: true,
    data: {
      ...task,
      primaryGroup: task.primary_group as any,
      childTasks: childTasks || [],
      taskAccess: (accessList || []).map((a) => ({
        id: a.id,
        userId: a.user_id,
        groupId: a.group_id,
        permission: a.permission,
      })),
    },
  };
}

/**
 * Lists tasks within the organization according to caller's role visibility.
 */
export async function listTasks(filters?: TaskFilterOptions): Promise<TaskResult<TaskWithDetails[]>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  let query = adminClient
    .from("tasks")
    .select("*, primary_group:groups(id, name, slug)")
    .eq("organization_id", organizationId);

  // Role visibility filter:
  // Main Head sees all tasks in organization
  // Group Head / Member see own primary group tasks + explicitly granted tasks
  if (context.role !== "main_head") {
    const groupId = context.primaryGroup?.id;
    if (groupId) {
      query = query.eq("primary_group_id", groupId);
    }
  }

  // Optional caller filters
  if (filters?.primaryGroupId) {
    query = query.eq("primary_group_id", filters.primaryGroupId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.assigneeId) {
    query = query.eq("assignee_id", filters.assigneeId);
  }
  if (filters?.assignedHeadId) {
    query = query.eq("assigned_head_id", filters.assignedHeadId);
  }
  if (filters?.parentTaskId !== undefined) {
    if (filters.parentTaskId === null) {
      query = query.is("parent_task_id", null);
    } else {
      query = query.eq("parent_task_id", filters.parentTaskId);
    }
  }

  const { data: tasks, error } = await query.order("created_at", { ascending: false });

  if (error || !tasks) {
    return { error: `Failed to list tasks: ${error?.message}`, code: "internal_error" };
  }

  const result: TaskWithDetails[] = tasks.map((t) => ({
    ...t,
    primaryGroup: t.primary_group as any,
  }));

  return { success: true, data: result };
}
