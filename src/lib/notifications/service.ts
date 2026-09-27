import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext, type OrganizationContext, type UserRole } from "@/lib/auth/context";
import type {
  CreateNotificationInput,
  NotificationResult,
  NotificationRow,
  NotificationWithDetails,
  WhatChangedItem,
  NotificationType,
} from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Creates and delivers an in-app notification to an active organization member.
 * Strictly enforces organization isolation and recipient membership checks.
 * Deduplicates repeated notifications for the same event.
 */
export async function sendNotification(
  input: CreateNotificationInput
): Promise<NotificationResult<NotificationRow>> {
  // 1. Validate inputs
  if (!input.organizationId || !UUID_REGEX.test(input.organizationId)) {
    return { error: "Valid organization ID is required.", code: "invalid_input" };
  }
  if (!input.recipientId || !UUID_REGEX.test(input.recipientId)) {
    return { error: "Valid recipient user ID is required.", code: "invalid_input" };
  }
  if (!input.title || !input.title.trim()) {
    return { error: "Notification title is required.", code: "invalid_input" };
  }

  // 2. Self-notification suppression: never notify an actor of their own direct actions
  if (input.actorId && input.actorId === input.recipientId) {
    return { success: true, data: null, message: "Self-notification suppressed" };
  }

  const adminClient = createAdminClient();

  // 3. Verify recipient belongs to the target organization and is active
  const { data: recipientMember, error: memberError } = await adminClient
    .from("organization_members")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.recipientId)
    .maybeSingle();

  if (memberError || !recipientMember || recipientMember.status !== "active") {
    return {
      error: "Recipient is not an active member of the specified organization.",
      code: "cross_org_denied",
    };
  }

  // 4. Verify task belongs to target organization if task_id is present
  if (input.taskId) {
    if (!UUID_REGEX.test(input.taskId)) {
      return { error: "Invalid task ID format.", code: "invalid_input" };
    }

    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .select("id, organization_id")
      .eq("id", input.taskId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (taskError || !task) {
      return {
        error: "Referenced task does not belong to the target organization.",
        code: "cross_org_denied",
      };
    }
  }

  // 5. Idempotent Deduplication: Check if identical unread notification exists within last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  let dedupQuery = adminClient
    .from("notifications")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("recipient_id", input.recipientId)
    .eq("type", input.type)
    .eq("is_read", false)
    .gte("created_at", tenMinutesAgo);

  if (input.taskId) {
    dedupQuery = dedupQuery.eq("task_id", input.taskId);
  } else {
    dedupQuery = dedupQuery.is("task_id", null);
  }

  const { data: existingDup } = await dedupQuery.limit(1).maybeSingle();
  if (existingDup) {
    return { success: true, data: existingDup, message: "Deduplicated" };
  }

  // 6. Insert verified notification
  const { data: created, error: insertError } = await adminClient
    .from("notifications")
    .insert({
      organization_id: input.organizationId,
      recipient_id: input.recipientId,
      actor_id: input.actorId || null,
      task_id: input.taskId || null,
      type: input.type,
      title: input.title.trim(),
      body: input.body ? input.body.trim() : null,
      is_read: false,
    })
    .select()
    .single();

  if (insertError || !created) {
    return {
      error: `Failed to create notification: ${insertError?.message || "Unknown error"}`,
      code: "internal_error",
    };
  }

  return { success: true, data: created };
}

/**
 * Retrieves notifications for the currently authenticated user with actor and task details.
 * Strictly respects user privacy (RLS and recipient_id filtering).
 */
export async function getNotifications(
  callerContext?: OrganizationContext,
  options?: { status?: "all" | "unread"; limit?: number }
): Promise<NotificationResult<NotificationWithDetails[]>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "No active organization found.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();
  const limit = options?.limit || 50;

  // 1. Query recipient's notifications
  let query = adminClient
    .from("notifications")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("recipient_id", context.user.id);

  if (options?.status === "unread") {
    query = query.eq("is_read", false);
  }

  const { data: rows, error: fetchError } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fetchError) {
    return { error: fetchError.message, code: "internal_error" };
  }

  const notifications = rows || [];

  // 2. Batch fetch actors and tasks
  const actorIds = Array.from(new Set(notifications.map((n) => n.actor_id).filter(Boolean))) as string[];
  const taskIds = Array.from(new Set(notifications.map((n) => n.task_id).filter(Boolean))) as string[];

  const profileMap = new Map<string, string>();
  const roleMap = new Map<string, UserRole>();
  const taskMap = new Map<string, { code: string; title: string }>();

  if (actorIds.length > 0) {
    const [profilesRes, membersRes] = await Promise.all([
      adminClient.from("profiles").select("id, full_name").in("id", actorIds),
      adminClient
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .in("user_id", actorIds),
    ]);

    (profilesRes.data || []).forEach((p) => profileMap.set(p.id, p.full_name || "Club Member"));
    (membersRes.data || []).forEach((m) => roleMap.set(m.user_id, m.role as UserRole));
  }

  if (taskIds.length > 0) {
    const { data: tasks } = await adminClient
      .from("tasks")
      .select("id, task_code, title")
      .in("id", taskIds);

    (tasks || []).forEach((t) => taskMap.set(t.id, { code: t.task_code, title: t.title }));
  }

  // 3. Assemble enriched notification objects
  const enriched: NotificationWithDetails[] = notifications.map((n) => {
    const actorName = n.actor_id ? profileMap.get(n.actor_id) || "ClubOS" : "ClubOS System";
    const actorRole = n.actor_id ? roleMap.get(n.actor_id) || null : null;
    const taskInfo = n.task_id ? taskMap.get(n.task_id) : null;

    let targetUrl = "/workspace/notifications";
    if (n.task_id) {
      targetUrl = `/workspace/tasks/${n.task_id}`;
    } else if (n.type === "system_alert") {
      targetUrl = "/workspace/profile";
    }

    return {
      id: n.id,
      organizationId: n.organization_id,
      recipientId: n.recipient_id,
      actorId: n.actor_id,
      taskId: n.task_id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.is_read,
      readAt: n.read_at,
      createdAt: n.created_at,
      actorName,
      actorRole,
      taskCode: taskInfo?.code || null,
      taskTitle: taskInfo?.title || null,
      targetUrl,
    };
  });

  return { success: true, data: enriched };
}

/**
 * Returns the unread notification count for the current user.
 */
export async function getUnreadNotificationCount(
  callerContext?: OrganizationContext
): Promise<NotificationResult<number>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "No active organization found.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { count, error } = await adminClient
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("recipient_id", context.user.id)
    .eq("is_read", false);

  if (error) {
    return { error: error.message, code: "internal_error" };
  }

  return { success: true, data: count || 0 };
}

/**
 * Marks a single notification as read by its recipient.
 */
export async function markNotificationAsRead(
  notificationId: string,
  callerContext?: OrganizationContext
): Promise<NotificationResult<NotificationRow>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "No active organization found.", code: "unauthorized" };
  }

  if (!notificationId || !UUID_REGEX.test(notificationId)) {
    return { error: "Invalid notification ID.", code: "invalid_input" };
  }

  const adminClient = createAdminClient();

  // Find notification and verify ownership
  const { data: notif, error: fetchError } = await adminClient
    .from("notifications")
    .select("id, recipient_id, organization_id, is_read")
    .eq("id", notificationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError || !notif) {
    return { error: "Notification not found.", code: "notification_not_found" };
  }

  if (notif.recipient_id !== context.user.id) {
    return { error: "Access Denied: Cannot modify another user's notifications.", code: "forbidden" };
  }

  if (notif.is_read) {
    return { success: true, data: notif as NotificationRow };
  }

  const { data: updated, error: updateError } = await adminClient
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("recipient_id", context.user.id)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (updateError || !updated) {
    return { error: updateError?.message || "Failed to mark as read.", code: "internal_error" };
  }

  return { success: true, data: updated };
}

/**
 * Marks all unread notifications for the current authenticated user as read.
 */
export async function markAllNotificationsAsRead(
  callerContext?: OrganizationContext
): Promise<NotificationResult<{ updatedCount: number }>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "No active organization found.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: updated, error } = await adminClient
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("recipient_id", context.user.id)
    .eq("is_read", false)
    .select("id");

  if (error) {
    return { error: error.message, code: "internal_error" };
  }

  return {
    success: true,
    data: { updatedCount: updated?.length || 0 },
  };
}

/**
 * Generates the role-specific "What Changed" operational activity digest.
 * - Main Head: Organization-wide lifecycle changes, assignments, completions, blockers.
 * - Group Head: Primary group directives, delegated subtasks, reviews, blockers.
 * - Member: Tasks assigned to them or explicitly granted access to.
 */
export async function getWhatChangedFeed(
  callerContext?: OrganizationContext,
  options?: { limit?: number }
): Promise<NotificationResult<WhatChangedItem[]>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "No active organization found.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();
  const limit = options?.limit || 30;
  const userRole = context.role || "member";
  const userId = context.user.id;
  const userGroupId = context.primaryGroup?.id || null;

  let activityQuery = adminClient
    .from("activity_records")
    .select("*")
    .eq("organization_id", organizationId);

  // 1. Role-specific task scope calculation
  if (userRole === "main_head") {
    // Main Head sees all institutional task activity
    // Query bounded by limit
  } else if (userRole === "group_head") {
    // Group Head sees tasks in their primary group or explicit task_access
    let groupTaskIds: string[] = [];
    if (userGroupId) {
      const { data: gTasks } = await adminClient
        .from("tasks")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("primary_group_id", userGroupId);

      groupTaskIds = (gTasks || []).map((t) => t.id);
    }

    // Explicit task access
    const { data: explicitAccess } = await adminClient
      .from("task_access")
      .select("task_id")
      .eq("user_id", userId);

    const explicitIds = (explicitAccess || []).map((a) => a.task_id).filter(Boolean) as string[];
    const permittedTaskIds = Array.from(new Set([...groupTaskIds, ...explicitIds]));

    if (permittedTaskIds.length === 0) {
      return { success: true, data: [] };
    }

    activityQuery = activityQuery.in("task_id", permittedTaskIds);
  } else {
    // Member sees tasks assigned to them or explicit task_access
    const { data: assignedTasks } = await adminClient
      .from("tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("assignee_id", userId);

    const { data: explicitAccess } = await adminClient
      .from("task_access")
      .select("task_id")
      .eq("user_id", userId);

    const memberTaskIds = Array.from(
      new Set([
        ...(assignedTasks || []).map((t) => t.id),
        ...(explicitAccess || []).map((a) => a.task_id).filter(Boolean) as string[],
      ])
    );

    if (memberTaskIds.length === 0) {
      return { success: true, data: [] };
    }

    activityQuery = activityQuery.in("task_id", memberTaskIds);
  }

  // 2. Fetch raw activity records
  const { data: rawActivities, error: actError } = await activityQuery
    .order("created_at", { ascending: false })
    .limit(limit);

  if (actError) {
    return { error: actError.message, code: "internal_error" };
  }

  const activities = rawActivities || [];
  if (activities.length === 0) {
    return { success: true, data: [] };
  }

  // 3. Batch fetch actors and tasks
  const actorIds = Array.from(new Set(activities.map((a) => a.actor_id).filter(Boolean))) as string[];
  const taskIds = Array.from(new Set(activities.map((a) => a.task_id).filter(Boolean))) as string[];

  const profileMap = new Map<string, string>();
  const roleMap = new Map<string, UserRole>();
  const taskMap = new Map<string, { code: string; title: string }>();

  if (actorIds.length > 0) {
    const [profilesRes, membersRes] = await Promise.all([
      adminClient.from("profiles").select("id, full_name").in("id", actorIds),
      adminClient
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .in("user_id", actorIds),
    ]);

    (profilesRes.data || []).forEach((p) => profileMap.set(p.id, p.full_name || "Club Member"));
    (membersRes.data || []).forEach((m) => roleMap.set(m.user_id, m.role as UserRole));
  }

  if (taskIds.length > 0) {
    const { data: tasks } = await adminClient
      .from("tasks")
      .select("id, task_code, title")
      .in("id", taskIds);

    (tasks || []).forEach((t) => taskMap.set(t.id, { code: t.task_code, title: t.title }));
  }

  // 4. Formulate editorial descriptions for What Changed
  const feed: WhatChangedItem[] = activities.map((act) => {
    const actorName = act.actor_id ? profileMap.get(act.actor_id) || "ClubOS" : "ClubOS System";
    const actorRole = act.actor_id ? roleMap.get(act.actor_id) || null : null;
    const taskInfo = act.task_id ? taskMap.get(act.task_id) : null;
    const taskLabel = taskInfo?.code ? `[${taskInfo.code}] ${taskInfo.title}` : "Task";

    let description = "";
    let details: string | null = null;

    switch (act.action) {
      case "task_created":
        description = `${actorName} created directive ${taskLabel}`;
        break;
      case "task_assigned":
        description = `${actorName} assigned ${taskLabel}`;
        break;
      case "task_accepted":
        description = `${actorName} accepted responsibility for ${taskLabel}`;
        break;
      case "task_started":
        description = `${actorName} started work on ${taskLabel}`;
        break;
      case "task_delegated":
        description = `${actorName} delegated subtask ${taskLabel}`;
        break;
      case "task_submitted_for_review":
      case "task_submitted":
        description = `${actorName} submitted ${taskLabel} for review`;
        break;
      case "task_reviewed":
        const result = (act.metadata as any)?.result;
        if (result === "changes_requested") {
          description = `${actorName} requested changes on ${taskLabel}`;
          details = (act.metadata as any)?.feedback || null;
        } else {
          description = `${actorName} completed review of ${taskLabel}`;
        }
        break;
      case "task_completed":
        description = `${actorName} marked ${taskLabel} as completed`;
        break;
      case "task_blocked":
        description = `${actorName} reported blocker on ${taskLabel}`;
        details = (act.metadata as any)?.reason || null;
        break;
      case "task_unblocked":
        description = `${actorName} resolved blocker on ${taskLabel}`;
        break;
      case "task_reassigned":
        description = `${actorName} reassigned ${taskLabel}`;
        break;
      case "task_updated":
        description = `${actorName} updated parameters on ${taskLabel}`;
        break;
      case "file_uploaded":
        const fileName = (act.metadata as any)?.fileName || "file";
        description = `${actorName} attached "${fileName}" to ${taskLabel}`;
        break;
      case "file_deleted":
        const delFileName = (act.metadata as any)?.fileName || "file";
        description = `${actorName} removed attachment "${delFileName}" from ${taskLabel}`;
        break;
      default:
        description = `${actorName} updated ${taskLabel}`;
    }

    return {
      id: act.id,
      action: act.action,
      createdAt: act.created_at,
      taskId: act.task_id,
      taskCode: taskInfo?.code || null,
      taskTitle: taskInfo?.title || null,
      actorId: act.actor_id,
      actorName,
      actorRole,
      description,
      details,
      metadata: act.metadata as Record<string, any> | null,
      targetUrl: act.task_id ? `/workspace/tasks/${act.task_id}` : null,
    };
  });

  return { success: true, data: feed };
}
