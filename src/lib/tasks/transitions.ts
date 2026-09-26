import type { TaskStatus } from "./types";
import type { UserRole } from "@/lib/auth/context";

/**
 * Authoritative Task Status State Machine Graph.
 * Terminal states (completed, cancelled) cannot transition to any other status.
 */
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ["assigned", "cancelled"],
  assigned: ["accepted", "in_progress", "cancelled"],
  accepted: ["in_progress", "cancelled", "completed"],
  in_progress: ["ready_for_review", "blocked", "cancelled", "completed"],
  ready_for_review: ["completed", "in_progress"],
  blocked: ["in_progress", "cancelled"],
  completed: [], // Terminal
  cancelled: [], // Terminal
};

/**
 * Validates whether a state transition is topologically permitted by the state machine.
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true; // Idempotent
  const allowedNext = ALLOWED_TRANSITIONS[from];
  return Boolean(allowedNext && allowedNext.includes(to));
}

export interface TransitionAuthContext {
  userId: string;
  role: UserRole;
  primaryGroupId: string | null;
  task: {
    id: string;
    organization_id: string;
    primary_group_id: string;
    assigned_head_id: string | null;
    assignee_id: string | null;
    status: TaskStatus;
    parent_task_id: string | null;
  };
}

export interface TransitionValidationResult {
  allowed: boolean;
  code?: "invalid_transition" | "forbidden" | "unauthorized" | "task_completed" | "task_cancelled";
  reason?: string;
}

/**
 * Validates both graph legality and caller role authority for a proposed status transition.
 */
export function validateStatusTransition(
  targetStatus: TaskStatus,
  context: TransitionAuthContext
): TransitionValidationResult {
  const { task, role, userId, primaryGroupId } = context;
  const currentStatus = task.status;

  // 1. Check idempotency (transition to same status is safely allowed)
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  // 2. Terminal state protection
  if (currentStatus === "completed") {
    return {
      allowed: false,
      code: "task_completed",
      reason: "Completed tasks cannot be modified or moved back to active states.",
    };
  }

  if (currentStatus === "cancelled") {
    return {
      allowed: false,
      code: "task_cancelled",
      reason: "Cancelled tasks cannot be resumed.",
    };
  }

  // 3. Graph transition validation
  if (!isValidTransition(currentStatus, targetStatus)) {
    return {
      allowed: false,
      code: "invalid_transition",
      reason: `Illegal status transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  // 4. Role authority checks
  const isMainHead = role === "main_head";
  const isGroupHead = role === "group_head";
  const isMember = role === "member";

  const isAssignedHead = task.assigned_head_id === userId;
  const isAssignee = task.assignee_id === userId;
  const isOwnGroup = primaryGroupId === task.primary_group_id;

  // Main Head has universal authority within the organization
  if (isMainHead) {
    return { allowed: true };
  }

  // Specific transition rules for Group Head & Member:

  // TRANSITION: assigned -> accepted
  if (targetStatus === "accepted") {
    if (task.assigned_head_id && !isAssignedHead) {
      return {
        allowed: false,
        code: "forbidden",
        reason: "Only the assigned Group Head may accept this task.",
      };
    }
    if (!task.assigned_head_id && task.assignee_id && !isAssignee) {
      return {
        allowed: false,
        code: "forbidden",
        reason: "Only the assigned member may accept this child task.",
      };
    }
    return { allowed: true };
  }

  // TRANSITION: accepted / assigned / blocked -> in_progress (start task / unblock)
  if (targetStatus === "in_progress") {
    if (isGroupHead && (isAssignedHead || (isOwnGroup && !task.assigned_head_id))) {
      return { allowed: true };
    }
    if (isMember && isAssignee) {
      return { allowed: true };
    }
    if (currentStatus === "blocked" && (isAssignee || isAssignedHead || (isGroupHead && isOwnGroup))) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: "forbidden",
      reason: "Only the assigned executor or responsible Group Head may start or unblock work on this task.",
    };
  }

  // TRANSITION: in_progress -> ready_for_review
  if (targetStatus === "ready_for_review") {
    if (isAssignee || isAssignedHead || (isGroupHead && isOwnGroup)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: "forbidden",
      reason: "Only the active executor or responsible head may submit this task for review.",
    };
  }

  // TRANSITION: ready_for_review -> completed (Review and approval)
  if (targetStatus === "completed") {
    // CRITICAL SECURITY RULE: Members cannot complete tasks / cannot self-approve
    if (isMember) {
      return {
        allowed: false,
        code: "forbidden",
        reason: "Members cannot mark tasks completed. Work must be reviewed and approved by a Group Head.",
      };
    }

    if (isGroupHead && (isAssignedHead || isOwnGroup)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      code: "forbidden",
      reason: "Only an authorized Group Head or Main Head may complete this task.",
    };
  }

  // TRANSITION: in_progress -> blocked
  if (targetStatus === "blocked") {
    if (isAssignee || isAssignedHead || (isGroupHead && isOwnGroup)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: "forbidden",
      reason: "Only authorized assignees or heads may adjust the blocked state of this task.",
    };
  }

  // TRANSITION: -> cancelled
  if (targetStatus === "cancelled") {
    if (isGroupHead && isOwnGroup) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: "forbidden",
      reason: "Only authorized Group Heads or Main Heads may cancel a task.",
    };
  }

  return {
    allowed: false,
    code: "forbidden",
    reason: "Operation not permitted by your institutional role or task assignment.",
  };
}
