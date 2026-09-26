import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext, type UserRole } from "@/lib/auth/context";
import type { Database } from "@/types/database.types";
import { validateStatusTransition, type TransitionAuthContext } from "./transitions";
import {
  validateTitle,
  validateDescription,
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
  TaskPriority,
  TaskComment,
  TaskFile,
  TaskActivity,
  TaskAccessDetail,
  EligibleAssignee,
  EligibleGroupHead,
  TaskWithFullDetails,
  GroupWorkspaceData,
  GroupMemberWorkload,
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

  const descVal = validateDescription(input.description);
  if (!descVal.valid) {
    return { error: descVal.error, code: "forbidden" };
  }

  const deadlineVal = validateDeadline(input.deadline);
  if (!deadlineVal.valid) {
    return { error: deadlineVal.error, code: "deadline_invalid" };
  }

  const { cleanPriority } = validatePriority(input.priority);

  const adminClient = createAdminClient();

  // 3. Verify primary group belongs to caller's organization
  if (!input.primaryGroupId || typeof input.primaryGroupId !== "string" || !input.primaryGroupId.trim()) {
    return { error: "Primary group is required.", code: "invalid_group" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input.primaryGroupId)) {
    return { error: "Invalid primary group ID format.", code: "invalid_group" };
  }

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
  if (!input.assignedHeadId || typeof input.assignedHeadId !== "string" || !input.assignedHeadId.trim()) {
    return { error: "Responsible Group Head is required.", code: "invalid_assignee" };
  }

  if (!uuidRegex.test(input.assignedHeadId)) {
    return { error: "Invalid Group Head ID format.", code: "invalid_assignee" };
  }

  // Query organization_members for assignedHeadId
  const { data: headMember } = await adminClient
    .from("organization_members")
    .select("id, user_id, role, primary_group_id, status")
    .eq("organization_id", organizationId)
    .eq("user_id", input.assignedHeadId)
    .maybeSingle();

  if (!headMember) {
    return {
      error: "Assigned Group Head does not belong to your organization.",
      code: "invalid_assignee",
    };
  }

  if (headMember.status === "deactivated" || headMember.status !== "active") {
    return {
      error: `Assigned Group Head account is ${headMember.status} (must be active).`,
      code: "inactive_member",
    };
  }

  if (headMember.role !== "group_head") {
    return {
      error: "Assigned head must have the Group Head role.",
      code: "invalid_assignee",
    };
  }

  if (headMember.primary_group_id !== input.primaryGroupId) {
    return {
      error: "Assigned Group Head does not belong to the task's primary group.",
      code: "invalid_assignee",
    };
  }

  // 5. Double-submission protection: check if identical task was created by caller within 10 seconds
  const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
  const { data: recentDuplicate } = await adminClient
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("created_by", context.user.id)
    .eq("primary_group_id", input.primaryGroupId)
    .eq("title", titleVal.cleanTitle!)
    .gte("created_at", tenSecondsAgo)
    .maybeSingle();

  if (recentDuplicate) {
    return {
      success: true,
      data: recentDuplicate,
      message: "Duplicate submission ignored; existing task returned.",
    };
  }

  // 6. Generate deterministic task code
  const taskCode = await generateDeterministicTaskCode(organizationId, primaryGroup.slug);

  // 7. Insert task record
  const initialStatus: TaskStatus = "assigned";
  const { data: newTask, error: insertErr } = await adminClient
    .from("tasks")
    .insert({
      organization_id: organizationId,
      task_code: taskCode,
      title: titleVal.cleanTitle!,
      description: descVal.cleanDescription,
      primary_group_id: input.primaryGroupId,
      created_by: context.user.id,
      assigned_head_id: input.assignedHeadId,
      assignee_id: null,
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
    .maybeSingle();

  if (memErr || !assigneeMember) {
    return {
      error: "Target delegate does not belong to your organization.",
      code: "invalid_assignee",
    };
  }

  if (assigneeMember.status === "deactivated" || assigneeMember.status !== "active") {
    return {
      error: `Target delegate account is ${assigneeMember.status} (must be active).`,
      code: "inactive_member",
    };
  }

  if (assigneeMember.role !== "member") {
    return {
      error: "Subtasks must be delegated to members.",
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

  const descVal = validateDescription(input.description);
  if (!descVal.valid) {
    return { error: descVal.error, code: "forbidden" };
  }

  const deadlineVal = validateDeadline(input.deadline);
  if (!deadlineVal.valid) {
    return { error: deadlineVal.error, code: "deadline_invalid" };
  }

  const { cleanPriority } = validatePriority(input.priority || parentTask.priority);

  // 4. Double-submission protection: check if identical child task was created by caller within 10 seconds
  const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
  const { data: recentDuplicate } = await adminClient
    .from("tasks")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("created_by", context.user.id)
    .eq("parent_task_id", parentTask.id)
    .eq("assignee_id", input.assigneeId)
    .eq("title", titleVal.cleanTitle!)
    .gte("created_at", tenSecondsAgo)
    .maybeSingle();

  if (recentDuplicate) {
    return {
      success: true,
      data: recentDuplicate,
      message: "Duplicate delegation ignored; existing subtask returned.",
    };
  }

  // 5. Fetch group details for task code generation
  const { data: group } = await adminClient
    .from("groups")
    .select("slug")
    .eq("id", parentTask.primary_group_id)
    .single();

  const taskCode = await generateDeterministicTaskCode(organizationId, group?.slug || "sub");

  // 6. Insert child task
  const initialStatus: TaskStatus = "assigned";
  const { data: childTask, error: insertErr } = await adminClient
    .from("tasks")
    .insert({
      organization_id: organizationId,
      task_code: taskCode,
      title: titleVal.cleanTitle!,
      description: descVal.cleanDescription,
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

/**
 * Evaluates whether a user is authorized to read a task, matching the PostgreSQL
 * private.can_read_task(task_id) function exactly.
 * Includes recursive parent boundary check.
 */
export async function canUserAccessTask(
  taskId: string,
  userId: string,
  role: UserRole,
  userGroupId: string | null,
  organizationId: string
): Promise<boolean> {
  const adminClient = createAdminClient();

  // Fetch task
  const { data: task } = await adminClient
    .from("tasks")
    .select("id, organization_id, primary_group_id, parent_task_id, assignee_id, assigned_head_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.organization_id !== organizationId) {
    return false;
  }

  // Parent task boundary check: If parent_task_id is set, caller must ALSO be authorized to read parent
  if (task.parent_task_id) {
    const parentAllowed = await canUserAccessTask(
      task.parent_task_id,
      userId,
      role,
      userGroupId,
      organizationId
    );
    if (!parentAllowed) {
      return false;
    }
  }

  // Role authority checks
  if (role === "main_head") {
    return true;
  }

  if (task.primary_group_id && task.primary_group_id === userGroupId) {
    return true;
  }

  if (task.assignee_id === userId || task.assigned_head_id === userId) {
    return true;
  }

  // Check explicit task_access
  const { data: explicit } = await adminClient
    .from("task_access")
    .select("id")
    .eq("task_id", taskId)
    .or(`user_id.eq.${userId},group_id.eq.${userGroupId || "00000000-0000-0000-0000-000000000000"}`)
    .maybeSingle();

  return Boolean(explicit);
}

/**
 * Retrieves full task details for the shared Task Inspector.
 * Strictly verifies tenant boundary, role visibility, parent task boundaries,
 * and fetches comments, files, activity records, subtasks, and collaborators.
 */
export async function getTaskFullDetails(
  taskId: string
): Promise<TaskResult<TaskWithFullDetails>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  // 1. Fetch task in organization
  const { data: task, error: taskErr } = await adminClient
    .from("tasks")
    .select("*, primary_group:groups(id, name, slug)")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (taskErr || !task) {
    return { error: "Task not found in your organization.", code: "task_not_found" };
  }

  const role = context.role || "member";
  const userId = context.user.id;
  const userGroupId = context.primaryGroup?.id || null;

  // 2. Authorization check (matching RLS private.can_read_task)
  const isAuthorized = await canUserAccessTask(
    taskId,
    userId,
    role,
    userGroupId,
    organizationId
  );

  if (!isAuthorized) {
    return { error: "Access Denied: You do not have permission to view this task.", code: "forbidden" };
  }

  // 3. Concurrently fetch related records for performance
  const [
    rawCommentsRes,
    rawFilesRes,
    rawActivitiesRes,
    rawChildrenRes,
    rawAccessRes,
  ] = await Promise.all([
    adminClient
      .from("comments")
      .select("*")
      .eq("task_id", taskId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    adminClient
      .from("file_metadata")
      .select("*")
      .eq("task_id", taskId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("activity_records")
      .select("*")
      .eq("task_id", taskId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    adminClient
      .from("tasks")
      .select("*")
      .eq("parent_task_id", taskId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    adminClient
      .from("task_access")
      .select("*")
      .eq("task_id", taskId)
      .eq("organization_id", organizationId),
  ]);

  const rawComments = rawCommentsRes.data || [];
  const rawFiles = rawFilesRes.data || [];
  const rawActivities = rawActivitiesRes.data || [];
  const rawChildren = rawChildrenRes.data || [];
  const rawAccess = rawAccessRes.data || [];

  // 4. Collect user IDs to batch fetch profiles & member roles
  const userIdsToFetch = Array.from(
    new Set(
      [
        task.created_by,
        task.assigned_head_id,
        task.assignee_id,
        ...rawComments.map((c) => c.author_id),
        ...rawFiles.map((f) => f.uploader_id),
        ...rawActivities.map((a) => a.actor_id),
        ...rawAccess.map((ta) => ta.user_id),
        ...rawAccess.map((ta) => ta.granted_by),
        ...rawChildren.map((ch) => ch.assignee_id),
      ].filter(Boolean) as string[]
    )
  );

  const profileMap = new Map<string, { id: string; fullName: string; email: string; avatarUrl: string | null }>();
  if (userIdsToFetch.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIdsToFetch);

    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, {
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          avatarUrl: p.avatar_url,
        });
      }
    }
  }

  const memberRoleMap = new Map<string, UserRole>();
  if (userIdsToFetch.length > 0) {
    const { data: orgMembers } = await adminClient
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .in("user_id", userIdsToFetch);

    if (orgMembers) {
      for (const m of orgMembers) {
        memberRoleMap.set(m.user_id, m.role);
      }
    }
  }

  // Group map for task_access target groups
  const groupIdsToFetch = Array.from(
    new Set(
      [
        task.primary_group_id,
        ...rawAccess.map((ta) => ta.group_id),
      ].filter(Boolean) as string[]
    )
  );

  const groupMap = new Map<string, { id: string; name: string; slug: string }>();
  if (groupIdsToFetch.length > 0) {
    const { data: groups } = await adminClient
      .from("groups")
      .select("id, name, slug")
      .in("id", groupIdsToFetch);

    if (groups) {
      for (const g of groups) {
        groupMap.set(g.id, g);
      }
    }
  }

  // 5. Parent Task Resolution
  let parentTaskDetail = null;
  if (task.parent_task_id) {
    const { data: parent } = await adminClient
      .from("tasks")
      .select("id, task_code, title, status, organization_id")
      .eq("id", task.parent_task_id)
      .maybeSingle();

    if (parent && parent.organization_id === organizationId) {
      const parentCanAccess = await canUserAccessTask(
        parent.id,
        userId,
        role,
        userGroupId,
        organizationId
      );
      if (parentCanAccess) {
        parentTaskDetail = {
          id: parent.id,
          taskCode: parent.task_code,
          title: parent.title,
          status: parent.status,
          canAccess: true,
        };
      }
    }
  }

  // 6. Subtasks with access check
  const subtasks = [];
  for (const child of rawChildren) {
    const canChildAccess = await canUserAccessTask(
      child.id,
      userId,
      role,
      userGroupId,
      organizationId
    );
    if (canChildAccess) {
      const assigneeProf = child.assignee_id ? profileMap.get(child.assignee_id) : null;
      subtasks.push({
        id: child.id,
        taskCode: child.task_code,
        title: child.title,
        status: child.status,
        priority: child.priority,
        deadline: child.deadline,
        assigneeId: child.assignee_id,
        assigneeName: assigneeProf?.fullName || null,
        canAccess: true,
      });
    }
  }

  // 7. Comments
  const comments: TaskComment[] = [];
  for (const c of rawComments) {
    if (role === "member" && c.is_internal_note) {
      continue; // Filter internal head notes for regular members
    }
    const authorProf = profileMap.get(c.author_id);
    comments.push({
      id: c.id,
      taskId: c.task_id,
      organizationId: c.organization_id,
      authorId: c.author_id,
      authorName: authorProf?.fullName || "ClubOS Contributor",
      authorRole: memberRoleMap.get(c.author_id) || "member",
      authorEmail: authorProf?.email || null,
      content: c.content,
      isInternalNote: c.is_internal_note,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    });
  }

  // 8. Files
  const files: TaskFile[] = rawFiles.map((f) => {
    const uploaderProf = profileMap.get(f.uploader_id);
    return {
      id: f.id,
      taskId: f.task_id || task.id,
      fileName: f.file_name,
      filePath: f.file_path,
      fileSize: Number(f.file_size) || 0,
      mimeType: f.mime_type,
      uploaderId: f.uploader_id,
      uploaderName: uploaderProf?.fullName || "Unknown",
      createdAt: f.created_at,
    };
  });

  // 9. Activities
  const activities: TaskActivity[] = rawActivities.map((a) => {
    const actorProf = a.actor_id ? profileMap.get(a.actor_id) : null;
    return {
      id: a.id,
      taskId: a.task_id || task.id,
      actorId: a.actor_id,
      actorName: actorProf?.fullName || "System Engine",
      actorRole: a.actor_id ? memberRoleMap.get(a.actor_id) || null : null,
      action: a.action,
      previousState: (a.previous_state as Record<string, any>) || null,
      newState: (a.new_state as Record<string, any>) || null,
      metadata: (a.metadata as Record<string, any>) || null,
      createdAt: a.created_at,
    };
  });

  // 10. Collaborators (task_access)
  const collaborators: TaskAccessDetail[] = rawAccess.map((ta) => {
    const targetProf = ta.user_id ? profileMap.get(ta.user_id) : null;
    const targetGrp = ta.group_id ? groupMap.get(ta.group_id) : null;
    const granterProf = profileMap.get(ta.granted_by);
    return {
      id: ta.id,
      taskId: ta.task_id,
      userId: ta.user_id,
      groupId: ta.group_id,
      permission: ta.permission,
      targetName: ta.user_id ? (targetProf?.fullName || "User") : (targetGrp?.name || "Group"),
      targetEmail: targetProf?.email || null,
      isGroup: Boolean(ta.group_id),
      grantedByName: granterProf?.fullName || null,
      createdAt: ta.created_at,
    };
  });

  // 11. Eligible Assignees (for Heads reassigning)
  let eligibleAssignees: EligibleAssignee[] = [];
  if (role === "main_head" || role === "group_head") {
    let memberQuery = adminClient
      .from("organization_members")
      .select("id, user_id, role, primary_group_id, groups(id, name, slug), profiles!inner(id, full_name, email)")
      .eq("organization_id", organizationId)
      .eq("status", "active");

    if (role === "group_head") {
      memberQuery = memberQuery.eq("primary_group_id", task.primary_group_id);
    }

    const { data: activeMems } = await memberQuery;
    if (activeMems) {
      eligibleAssignees = activeMems.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        fullName: m.profiles?.full_name || "Unknown",
        email: m.profiles?.email || "",
        role: m.role,
        primaryGroupId: m.primary_group_id,
        primaryGroupName: m.groups?.name || null,
      }));
    }
  }

  // 12. Permissions calculation
  const isCurrentAssignee = task.assignee_id === userId;
  const isCurrentAssignedHead = task.assigned_head_id === userId;
  const isOwnGroup = task.primary_group_id === userGroupId;
  const isTerminal = task.status === "completed" || task.status === "cancelled";

  const canPerformActions = {
    canAccept: !isTerminal && task.status === "assigned" && (
      role === "main_head" ||
      (role === "group_head" && (isCurrentAssignedHead || (isOwnGroup && !task.assigned_head_id))) ||
      (role === "member" && isCurrentAssignee && !task.assigned_head_id)
    ),
    canStart: !isTerminal && (task.status === "accepted" || task.status === "assigned") && (
      role === "main_head" ||
      (role === "group_head" && (isCurrentAssignedHead || isOwnGroup)) ||
      (role === "member" && isCurrentAssignee)
    ),
    canSubmitForReview: !isTerminal && task.status === "in_progress" && (
      role === "main_head" ||
      isCurrentAssignee ||
      (role === "group_head" && isOwnGroup)
    ),
    canComplete: !isTerminal && (task.status === "ready_for_review" || task.status === "in_progress") && (
      role === "main_head" ||
      (role === "group_head" && isOwnGroup)
    ),
    canRequestChanges: !isTerminal && task.status === "ready_for_review" && (
      role === "main_head" ||
      (role === "group_head" && isOwnGroup)
    ),
    canBlock: !isTerminal && task.status === "in_progress" && (
      role === "main_head" ||
      isCurrentAssignee ||
      (role === "group_head" && isOwnGroup)
    ),
    canUnblock: !isTerminal && task.status === "blocked" && (
      role === "main_head" ||
      isCurrentAssignee ||
      (role === "group_head" && isOwnGroup)
    ),
    canCancel: !isTerminal && (
      role === "main_head" ||
      (role === "group_head" && isOwnGroup)
    ),
    canReassign: !isTerminal && (
      role === "main_head" ||
      (role === "group_head" && isOwnGroup)
    ),
    canUpdateParameters: !isTerminal && (
      role === "main_head" ||
      (role === "group_head" && isOwnGroup)
    ),
    canManageAccess: (
      role === "main_head" ||
      (role === "group_head" && isOwnGroup)
    ),
    canComment: true,
  };

  const creatorProf = task.created_by ? profileMap.get(task.created_by) : null;
  const assignedHeadProf = task.assigned_head_id ? profileMap.get(task.assigned_head_id) : null;
  const assigneeProf = task.assignee_id ? profileMap.get(task.assignee_id) : null;

  return {
    success: true,
    data: {
      ...task,
      primaryGroup: task.primary_group as any,
      creatorProfile: creatorProf || null,
      assignedHeadProfile: assignedHeadProf || null,
      assigneeProfile: assigneeProf || null,
      parentTaskDetail,
      childTasks: rawChildren,
      subtasks,
      comments,
      files,
      activities,
      collaborators,
      eligibleAssignees,
      currentUserRole: role,
      currentUserId: userId,
      isCurrentAssignee,
      isCurrentAssignedHead,
      canPerformActions,
    },
  };
}

/**
 * Adds a new comment to a task.
 * Strictly verifies caller has authorization to view and comment on the task.
 */
export async function addComment({
  taskId,
  content,
  isInternalNote = false,
}: {
  taskId: string;
  content: string;
  isInternalNote?: boolean;
}): Promise<TaskResult<TaskComment>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const trimmedContent = content?.trim();
  if (!trimmedContent) {
    return { error: "Comment content cannot be empty.", code: "forbidden" };
  }

  if (trimmedContent.length > 5000) {
    return { error: "Comment content exceeds maximum allowed length of 5000 characters.", code: "forbidden" };
  }

  const role = context.role || "member";
  const userId = context.user.id;
  const userGroupId = context.primaryGroup?.id || null;

  // Authorization check (matching RLS can_read_task)
  const isAuthorized = await canUserAccessTask(
    taskId,
    userId,
    role,
    userGroupId,
    organizationId
  );

  if (!isAuthorized) {
    return { error: "Access Denied: You do not have permission to comment on this task.", code: "forbidden" };
  }

  // Only heads may post internal notes
  const effectiveInternalNote = Boolean(isInternalNote && (role === "main_head" || role === "group_head"));

  const adminClient = createAdminClient();

  const { data: newComment, error: insertErr } = await adminClient
    .from("comments")
    .insert({
      organization_id: organizationId,
      task_id: taskId,
      author_id: userId,
      content: trimmedContent,
      is_internal_note: effectiveInternalNote,
    })
    .select("*")
    .single();

  if (insertErr || !newComment) {
    return { error: `Failed to post comment: ${insertErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: userId,
    taskId,
    action: "task_comment_added",
    metadata: {
      comment_id: newComment.id,
      is_internal_note: effectiveInternalNote,
    },
  });

  return {
    success: true,
    data: {
      id: newComment.id,
      taskId: newComment.task_id,
      organizationId: newComment.organization_id,
      authorId: newComment.author_id,
      authorName: context.profile?.full_name || context.user.email || "Unknown",
      authorRole: role,
      authorEmail: context.user.email || null,
      content: newComment.content,
      isInternalNote: newComment.is_internal_note,
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
    },
  };
}

/**
 * Requests changes on a task that has been submitted for review.
 * Moves task from ready_for_review back to in_progress.
 * Only Group Heads or Main Heads can request changes.
 */
export async function requestChanges(
  taskId: string,
  feedback?: string
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
    return { error: "Members cannot request changes on tasks.", code: "forbidden" };
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

  if (context.role === "group_head" && task.primary_group_id !== context.primaryGroup?.id) {
    return { error: "Group Heads can only review tasks within their own primary group.", code: "forbidden" };
  }

  if (task.status !== "ready_for_review") {
    return {
      error: `Cannot request changes on a task with status '${task.status}'. Task must be 'ready_for_review'.`,
      code: "invalid_transition",
    };
  }

  const { data: updatedTask, error: updateErr } = await adminClient
    .from("tasks")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (updateErr || !updatedTask) {
    return { error: `Failed to request changes: ${updateErr?.message}`, code: "internal_error" };
  }

  await recordTaskAudit({
    organizationId,
    actorId: context.user.id,
    taskId,
    action: "task_reviewed",
    previousState: { status: "ready_for_review" },
    newState: { status: "in_progress" },
    metadata: { result: "changes_requested", feedback: feedback?.trim() || null },
  });

  if (feedback && feedback.trim().length > 0) {
    await adminClient.from("comments").insert({
      organization_id: organizationId,
      task_id: taskId,
      author_id: context.user.id,
      content: `[Changes Requested]: ${feedback.trim()}`,
      is_internal_note: false,
    });
  }

  return { success: true, data: updatedTask };
}

/**
 * Retrieves eligible assignees for reassigning a task.
 */
export async function getEligibleAssignees(
  taskId: string
): Promise<TaskResult<EligibleAssignee[]>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: task } = await adminClient
    .from("tasks")
    .select("id, organization_id, primary_group_id")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!task) {
    return { error: "Task not found.", code: "task_not_found" };
  }

  const role = context.role || "member";
  if (role === "member") {
    return { success: true, data: [] };
  }

  let memberQuery = adminClient
    .from("organization_members")
    .select("id, user_id, role, primary_group_id, groups(id, name, slug), profiles!inner(id, full_name, email)")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (role === "group_head") {
    memberQuery = memberQuery.eq("primary_group_id", task.primary_group_id);
  }

  const { data: members, error: memErr } = await memberQuery;
  if (memErr || !members) {
    return { error: `Failed to fetch eligible assignees: ${memErr?.message}`, code: "internal_error" };
  }

  const eligible: EligibleAssignee[] = members.map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    fullName: m.profiles?.full_name || "Unknown",
    email: m.profiles?.email || "",
    role: m.role,
    primaryGroupId: m.primary_group_id,
    primaryGroupName: m.groups?.name || null,
  }));

  return { success: true, data: eligible };
}

/**
 * Retrieves eligible active Group Heads for task assignment.
 * Strictly verifies caller is an active Main Head in their organization.
 * Filters by groupId if specified.
 */
export async function getEligibleGroupHeads(
  groupId?: string
): Promise<TaskResult<EligibleGroupHead[]>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role !== "main_head") {
    return {
      error: "Access Denied: Only Main Heads may query eligible Group Heads.",
      code: "forbidden",
    };
  }

  const adminClient = createAdminClient();

  let query = adminClient
    .from("organization_members")
    .select("user_id, primary_group_id, groups(id, name, slug)")
    .eq("organization_id", organizationId)
    .eq("role", "group_head")
    .eq("status", "active")
    .not("primary_group_id", "is", null);

  if (groupId) {
    query = query.eq("primary_group_id", groupId);
  }

  const { data: members, error: memErr } = await query;

  if (memErr || !members) {
    return { error: `Failed to load Group Heads: ${memErr?.message}`, code: "internal_error" };
  }

  if (members.length === 0) {
    return { success: true, data: [] };
  }

  const userIds = members.map((m) => m.user_id);
  const { data: profiles, error: profErr } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profErr) {
    return { error: `Failed to load profiles: ${profErr.message}`, code: "internal_error" };
  }

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const result: EligibleGroupHead[] = members.map((m) => {
    const prof = profileMap.get(m.user_id);
    const grp = m.groups as { id: string; name: string; slug: string } | null;
    return {
      userId: m.user_id,
      fullName: prof?.full_name || "Unknown",
      email: prof?.email || "",
      primaryGroupId: m.primary_group_id!,
      primaryGroupName: grp?.name || null,
      primaryGroupSlug: grp?.slug || null,
    };
  });

  return { success: true, data: result };
}

/**
 * Loads groups and active Group Heads for Main Head task creation drawer.
 */
export async function getTaskCreationContext(): Promise<
  TaskResult<{
    groups: Array<{ id: string; name: string; slug: string; description: string | null }>;
    groupHeads: EligibleGroupHead[];
  }>
> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role !== "main_head") {
    return {
      error: "Access Denied: Only Main Heads may access task creation context.",
      code: "forbidden",
    };
  }

  const adminClient = createAdminClient();

  const [groupsRes, headsRes] = await Promise.all([
    adminClient
      .from("groups")
      .select("id, name, slug, description")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    getEligibleGroupHeads(),
  ]);

  if (groupsRes.error || !groupsRes.data) {
    return { error: `Failed to load groups: ${groupsRes.error?.message}`, code: "internal_error" };
  }

  return {
    success: true,
    data: {
      groups: groupsRes.data,
      groupHeads: headsRes.data || [],
    },
  };
}

/**
 * Retrieves top-level organizational directives for the Command Center registry.
 */
export async function getOrganizationDirectives(): Promise<TaskResult<TaskWithDetails[]>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  if (context.role !== "main_head") {
    return {
      error: "Access Denied: Only Main Heads may view organizational directives.",
      code: "forbidden",
    };
  }

  const adminClient = createAdminClient();

  const { data: tasks, error } = await adminClient
    .from("tasks")
    .select(`
      *,
      primary_group:groups(id, name, slug)
    `)
    .eq("organization_id", organizationId)
    .is("parent_task_id", null)
    .order("created_at", { ascending: false });

  if (error || !tasks) {
    return { error: `Failed to load directives: ${error?.message}`, code: "internal_error" };
  }

  // Load profiles for assigned heads and creators
  const userIds = Array.from(
    new Set(
      tasks
        .flatMap((t) => [t.assigned_head_id, t.created_by])
        .filter((id): id is string => Boolean(id))
    )
  );

  let profileMap = new Map<string, { id: string; fullName: string; email: string }>();
  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const p of profiles || []) {
      profileMap.set(p.id, { id: p.id, fullName: p.full_name || "Unknown", email: p.email || "" });
    }
  }

  const result: TaskWithDetails[] = tasks.map((t) => {
    const group = t.primary_group as { id: string; name: string; slug: string } | null;
    return {
      ...t,
      primaryGroup: group,
      assignedHeadProfile: t.assigned_head_id ? profileMap.get(t.assigned_head_id) || null : null,
      creatorProfile: t.created_by ? profileMap.get(t.created_by) || null : null,
    };
  });

  return { success: true, data: result };
}

/**
 * Retrieves the comprehensive group workspace dataset for the Group Head workspace.
 * Strictly verifies caller is an active Group Head (or Main Head).
 * Scopes tasks, directives, subtasks, and member roster strictly to the primary group.
 */
export async function getGroupWorkspaceData(
  targetGroupId?: string
): Promise<TaskResult<GroupWorkspaceData>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const role = context.role;
  if (role !== "group_head" && role !== "main_head") {
    return {
      error: "Access Denied: Only Group Heads and Main Heads may access the group workspace.",
      code: "forbidden",
    };
  }

  // Determine authoritative group ID
  let groupId: string | null = null;
  if (role === "group_head") {
    groupId = context.primaryGroup?.id || null;
    if (!groupId) {
      return {
        error: "Your account is not assigned to a primary functional group.",
        code: "invalid_group",
      };
    }
  } else {
    // Main Head can view any group within their organization
    groupId = targetGroupId || null;
  }

  const adminClient = createAdminClient();

  // If Main Head didn't specify a group, pick the first group in the organization
  if (!groupId) {
    const { data: firstGroup } = await adminClient
      .from("groups")
      .select("id")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();

    groupId = firstGroup?.id || null;
  }

  if (!groupId) {
    return { error: "No functional group found in organization.", code: "invalid_group" };
  }

  // 1. Fetch group details
  const { data: group, error: groupErr } = await adminClient
    .from("groups")
    .select("id, name, slug, description")
    .eq("id", groupId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (groupErr || !group) {
    return { error: "Functional group not found.", code: "invalid_group" };
  }

  // 2. Fetch all tasks in this group
  const { data: rawTasks, error: tasksErr } = await adminClient
    .from("tasks")
    .select(`
      *,
      primary_group:groups(id, name, slug)
    `)
    .eq("organization_id", organizationId)
    .eq("primary_group_id", groupId)
    .order("created_at", { ascending: false });

  if (tasksErr || !rawTasks) {
    return { error: `Failed to load group tasks: ${tasksErr?.message}`, code: "internal_error" };
  }

  // 3. Fetch active members of this group
  const { data: members, error: memErr } = await adminClient
    .from("organization_members")
    .select("id, user_id, role, primary_group_id, status")
    .eq("organization_id", organizationId)
    .eq("primary_group_id", groupId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (memErr || !members) {
    return { error: `Failed to load group members: ${memErr?.message}`, code: "internal_error" };
  }

  // 4. Gather user profiles
  const taskUserIds = rawTasks.flatMap((t) => [t.assigned_head_id, t.assignee_id, t.created_by]);
  const memberUserIds = members.map((m) => m.user_id);
  const allUserIds = Array.from(new Set([...taskUserIds, ...memberUserIds].filter((id): id is string => Boolean(id))));

  let profileMap = new Map<string, { id: string; fullName: string; email: string; avatarUrl: string | null }>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", allUserIds);

    for (const p of profiles || []) {
      profileMap.set(p.id, {
        id: p.id,
        fullName: p.full_name || "Unknown",
        email: p.email || "",
        avatarUrl: p.avatar_url || null,
      });
    }
  }

  // 5. Structure tasks with details
  const enrichedTasks: TaskWithDetails[] = rawTasks.map((t) => {
    const grp = t.primary_group as { id: string; name: string; slug: string } | null;
    return {
      ...t,
      primaryGroup: grp,
      assignedHeadProfile: t.assigned_head_id ? profileMap.get(t.assigned_head_id) || null : null,
      assigneeProfile: t.assignee_id ? profileMap.get(t.assignee_id) || null : null,
      creatorProfile: t.created_by ? profileMap.get(t.created_by) || null : null,
    };
  });

  const parentDirectives = enrichedTasks.filter((t) => !t.parent_task_id);
  const subtasks = enrichedTasks.filter((t) => Boolean(t.parent_task_id));

  // Map child subtasks into their parent directives
  const subtasksByParent = new Map<string, TaskRow[]>();
  for (const s of subtasks) {
    if (s.parent_task_id) {
      const list = subtasksByParent.get(s.parent_task_id) || [];
      list.push(s);
      subtasksByParent.set(s.parent_task_id, list);
    }
  }
  for (const p of parentDirectives) {
    p.childTasks = subtasksByParent.get(p.id) || [];
  }

  // 6. Calculate member workload matrix
  const memberWorkloads: GroupMemberWorkload[] = members.map((m) => {
    const prof = profileMap.get(m.user_id);
    const activeTasks = enrichedTasks
      .filter(
        (t) =>
          t.assignee_id === m.user_id &&
          t.status !== "completed" &&
          t.status !== "cancelled"
      )
      .map((t) => ({
        id: t.id,
        taskCode: t.task_code,
        title: t.title,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
      }));

    const count = activeTasks.length;
    let availability: "Available" | "Moderate" | "Busy" = "Available";
    if (count >= 5) {
      availability = "Busy";
    } else if (count >= 3) {
      availability = "Moderate";
    }

    return {
      userId: m.user_id,
      fullName: prof?.fullName || "Group Member",
      email: prof?.email || "",
      role: m.role,
      status: m.status,
      avatarUrl: prof?.avatarUrl || null,
      activeTaskCount: count,
      availability,
      activeTasks,
    };
  });

  // 7. Calculate "Needs Action" count
  const needsActionCount = enrichedTasks.filter((t) => {
    if (t.status === "assigned" && (t.assigned_head_id === context.user.id || role === "main_head")) return true;
    if (t.status === "ready_for_review") return true;
    if (t.status === "blocked") return true;
    return false;
  }).length;

  return {
    success: true,
    data: {
      group,
      tasks: enrichedTasks,
      parentDirectives,
      subtasks,
      members: memberWorkloads,
      needsActionCount,
      currentUserId: context.user.id,
      currentUserRole: role,
    },
  };
}

