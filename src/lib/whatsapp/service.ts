/**
 * ClubOS — WhatsApp Handoff Service
 * Build 02.15
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import type {
  WhatsAppHandoffContext,
  WhatsAppRecipient,
  WhatsAppResult,
  PrepareWhatsAppUrlInput,
  PrepareWhatsAppUrlResult,
  WhatsAppRecipientRole,
} from "./types";
import {
  normalizePhoneNumber,
  maskPhoneNumber,
  sanitizeWhatsAppMessage,
  formatWhatsAppMessage,
  buildWhatsAppUrl,
} from "./message";

/**
 * Checks whether the current user is authorized to read and interact with the task.
 */
async function verifyUserTaskAccess({
  taskId,
  organizationId,
  userId,
  userRole,
}: {
  taskId: string;
  organizationId: string;
  userId: string;
  userRole: string;
}) {
  const adminClient = createAdminClient();

  const { data: task, error: taskError } = await adminClient
    .from("tasks")
    .select(`
      id,
      task_code,
      title,
      status,
      priority,
      deadline,
      organization_id,
      primary_group_id,
      assigned_head_id,
      assignee_id,
      created_by
    `)
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (taskError || !task) {
    return { authorized: false, task: null, reason: "task_not_found" as const };
  }

  // 1. Main Head has full organization authority
  if (userRole === "main_head") {
    return { authorized: true, task };
  }

  // 2. Creator or Assignee or Assigned Group Head always has access
  if (
    task.created_by === userId ||
    task.assignee_id === userId ||
    task.assigned_head_id === userId
  ) {
    return { authorized: true, task };
  }

  // 3. Group Head check for tasks belonging to their primary group
  if (userRole === "group_head" && task.primary_group_id) {
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("primary_group_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (membership?.primary_group_id === task.primary_group_id) {
      return { authorized: true, task };
    }
  }

  // 4. Explicit task-level collaboration grant
  const { data: explicitAccess } = await adminClient
    .from("task_access")
    .select("id")
    .eq("task_id", taskId)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (explicitAccess) {
    return { authorized: true, task };
  }

  return { authorized: false, task: null, reason: "unauthorized" as const };
}

/**
 * Loads the authorized WhatsApp handoff context for a task, resolving
 * only eligible, verified task participants and formatting default messages.
 */
export async function getWhatsAppHandoffContext(
  taskId: string
): Promise<WhatsAppResult<WhatsAppHandoffContext>> {
  const context = await getCurrentOrganizationContext();
  const organizationId = context.organization?.id || context.membership?.organization_id;
  if (!organizationId || !context.user) {
    return {
      success: false,
      error: "Authentication required to access task handoff.",
      code: "unauthorized",
    };
  }

  const { authorized, task, reason } = await verifyUserTaskAccess({
    taskId,
    organizationId,
    userId: context.user.id,
    userRole: context.role || "member",
  });

  if (!authorized || !task) {
    return {
      success: false,
      error:
        reason === "task_not_found"
          ? "Task not found within this organization."
          : "You do not have permission to view or message participants for this task.",
      code: reason || "unauthorized",
    };
  }

  const adminClient = createAdminClient();

  // Fetch primary group name for task context
  let primaryGroupName: string | null = null;
  if (task.primary_group_id) {
    const { data: group } = await adminClient
      .from("groups")
      .select("name")
      .eq("id", task.primary_group_id)
      .maybeSingle();
    primaryGroupName = group?.name || null;
  }

  // Identify candidate participant user IDs
  const candidateMap = new Map<string, { role: WhatsAppRecipientRole; roleLabel: string }>();

  // 1. Assignee (Delegatee)
  if (task.assignee_id && task.assignee_id !== context.user.id) {
    candidateMap.set(task.assignee_id, {
      role: "assignee",
      roleLabel: "Delegatee / Assignee",
    });
  }

  // 2. Assigned Group Head
  if (task.assigned_head_id && task.assigned_head_id !== context.user.id) {
    candidateMap.set(task.assigned_head_id, {
      role: "group_head",
      roleLabel: "Responsible Group Head",
    });
  }

  // 3. Directive Creator (Main Head / Lead)
  if (task.created_by && task.created_by !== context.user.id && !candidateMap.has(task.created_by)) {
    candidateMap.set(task.created_by, {
      role: "creator",
      roleLabel: "Directive Originator",
    });
  }

  // 4. Explicit Collaborators
  const { data: collaborators } = await adminClient
    .from("task_access")
    .select("user_id")
    .eq("task_id", taskId)
    .eq("organization_id", organizationId)
    .not("user_id", "is", null);

  if (collaborators) {
    for (const collab of collaborators) {
      if (collab.user_id && collab.user_id !== context.user.id && !candidateMap.has(collab.user_id)) {
        candidateMap.set(collab.user_id, {
          role: "collaborator",
          roleLabel: "Task Collaborator",
        });
      }
    }
  }

  const candidateIds = Array.from(candidateMap.keys());
  const recipients: WhatsAppRecipient[] = [];

  if (candidateIds.length > 0) {
    // Verify each candidate is an ACTIVE member of the organization
    const { data: activeMembers } = await adminClient
      .from("organization_members")
      .select("user_id, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("user_id", candidateIds);

    const activeUserIds = new Set((activeMembers || []).map((m) => m.user_id));

    // Fetch profile details for active candidates
    const validCandidateIds = candidateIds.filter((id) => activeUserIds.has(id));

    if (validCandidateIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", validCandidateIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      for (const userId of validCandidateIds) {
        const profile = profileMap.get(userId);
        const meta = candidateMap.get(userId);
        if (profile && meta) {
          const normResult = normalizePhoneNumber(profile.phone);
          recipients.push({
            userId,
            fullName: profile.full_name || "ClubOS Member",
            role: meta.role,
            roleLabel: meta.roleLabel,
            isPhoneAvailable: normResult.success,
            maskedPhone: normResult.success ? maskPhoneNumber(profile.phone) : null,
          });
        }
      }
    }
  }

  // Determine smart default recipient
  let defaultRecipientId: string | null = null;
  if (context.role === "group_head") {
    // Group Head typically messages assignee first
    const assignee = recipients.find((r) => r.role === "assignee" && r.isPhoneAvailable);
    defaultRecipientId = assignee?.userId || recipients[0]?.userId || null;
  } else if (context.role === "main_head") {
    // Main Head typically messages Group Head first
    const head = recipients.find((r) => r.role === "group_head" && r.isPhoneAvailable);
    defaultRecipientId = head?.userId || recipients[0]?.userId || null;
  } else {
    // Member messages Group Head or Creator first
    const target =
      recipients.find((r) => (r.role === "group_head" || r.role === "creator") && r.isPhoneAvailable) ||
      recipients[0];
    defaultRecipientId = target?.userId || null;
  }

  const defaultRecipient = recipients.find((r) => r.userId === defaultRecipientId);
  const recipientName = defaultRecipient?.fullName;

  // Prepare suggested messages
  const suggestedMessages = {
    general: formatWhatsAppMessage({
      taskTitle: task.title,
      taskCode: task.task_code,
      status: task.status,
      deadline: task.deadline,
      intent: "general",
      recipientName,
    }),
    clarification: formatWhatsAppMessage({
      taskTitle: task.title,
      taskCode: task.task_code,
      status: task.status,
      deadline: task.deadline,
      intent: "clarification",
      recipientName,
    }),
    progress_check: formatWhatsAppMessage({
      taskTitle: task.title,
      taskCode: task.task_code,
      status: task.status,
      deadline: task.deadline,
      intent: "progress_check",
      recipientName,
    }),
    reminder: formatWhatsAppMessage({
      taskTitle: task.title,
      taskCode: task.task_code,
      status: task.status,
      deadline: task.deadline,
      intent: "reminder",
      recipientName,
    }),
    review_request: formatWhatsAppMessage({
      taskTitle: task.title,
      taskCode: task.task_code,
      status: task.status,
      deadline: task.deadline,
      intent: "review_request",
      recipientName,
    }),
    delegation: formatWhatsAppMessage({
      taskTitle: task.title,
      taskCode: task.task_code,
      status: task.status,
      deadline: task.deadline,
      intent: "delegation",
      recipientName,
    }),
  };

  return {
    success: true,
    data: {
      task: {
        id: task.id,
        taskCode: task.task_code,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        primaryGroupName,
      },
      recipients,
      defaultRecipientId,
      suggestedMessages,
    },
  };
}

/**
 * Validates target recipient, sanitizes user-edited message, resolves authorized phone number,
 * logs a neutral audit event, and returns the safe click-to-chat URL.
 */
export async function prepareWhatsAppHandoffUrl(
  input: PrepareWhatsAppUrlInput
): Promise<WhatsAppResult<PrepareWhatsAppUrlResult>> {
  const context = await getCurrentOrganizationContext();
  const organizationId = context.organization?.id || context.membership?.organization_id;
  if (!organizationId || !context.user) {
    return {
      success: false,
      error: "Authentication required to generate WhatsApp handoff.",
      code: "unauthorized",
    };
  }

  // 1. Verify caller has read/interaction access to this task
  const { authorized, task, reason } = await verifyUserTaskAccess({
    taskId: input.taskId,
    organizationId,
    userId: context.user.id,
    userRole: context.role || "member",
  });

  if (!authorized || !task) {
    return {
      success: false,
      error:
        reason === "task_not_found"
          ? "Task not found within this organization."
          : "You do not have permission to generate WhatsApp handoffs for this task.",
      code: reason || "unauthorized",
    };
  }

  const adminClient = createAdminClient();

  // 2. Verify target recipient is a valid stakeholder of this task
  const isAssignee = task.assignee_id === input.recipientId;
  const isGroupHead = task.assigned_head_id === input.recipientId;
  const isCreator = task.created_by === input.recipientId;

  let isCollaborator = false;
  if (!isAssignee && !isGroupHead && !isCreator) {
    const { data: collab } = await adminClient
      .from("task_access")
      .select("id")
      .eq("task_id", input.taskId)
      .eq("organization_id", organizationId)
      .eq("user_id", input.recipientId)
      .maybeSingle();

    isCollaborator = !!collab;
  }

  if (!isAssignee && !isGroupHead && !isCreator && !isCollaborator) {
    return {
      success: false,
      error: "Specified recipient is not an authorized participant of this task.",
      code: "recipient_not_found",
    };
  }

  // 3. Verify recipient is an active member in this organization
  const { data: memberRecord } = await adminClient
    .from("organization_members")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("user_id", input.recipientId)
    .maybeSingle();

  if (!memberRecord || memberRecord.status !== "active") {
    return {
      success: false,
      error: "Target recipient is not an active member of this organization.",
      code: "recipient_inactive",
    };
  }

  // 4. Sanitize and validate message against secrets and credential leakage
  const sanitizeResult = sanitizeWhatsAppMessage(input.message);
  if (!sanitizeResult.safe || !sanitizeResult.sanitized) {
    return {
      success: false,
      error: sanitizeResult.error || "Message validation failed.",
      code: "sanitization_error",
    };
  }

  // 5. Fetch and normalize phone number from profiles
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", input.recipientId)
    .maybeSingle();

  if (!profile) {
    return {
      success: false,
      error: "Recipient profile could not be found.",
      code: "recipient_not_found",
    };
  }

  const normResult = normalizePhoneNumber(profile.phone);
  if (!normResult.success || !normResult.normalized) {
    return {
      success: false,
      error:
        normResult.error === "phone_not_available"
          ? "WhatsApp number not available for this recipient."
          : "Invalid phone number recorded for this recipient.",
      code: normResult.error || "phone_not_available",
    };
  }

  // 6. Record neutral audit event (handoff opened, NOT delivered or sent)
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: context.user.id,
    task_id: input.taskId,
    entity_type: "task",
    entity_id: input.taskId,
    action: "whatsapp_handoff_opened",
    metadata: {
      recipient_id: input.recipientId,
      intent: input.intent || "general",
    },
  });

  // 7. Build authoritative WhatsApp click-to-chat URL
  const whatsappUrl = buildWhatsAppUrl(normResult.normalized, sanitizeResult.sanitized);

  return {
    success: true,
    data: {
      whatsappUrl,
      recipientName: profile.full_name || "ClubOS Member",
      taskCode: task.task_code,
    },
  };
}
