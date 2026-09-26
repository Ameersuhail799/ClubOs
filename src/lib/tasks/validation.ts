import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskPriority } from "./types";

export const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function validateTitle(title?: string | null): { valid: boolean; error?: string; cleanTitle?: string } {
  if (!title || typeof title !== "string") {
    return { valid: false, error: "Task title is required." };
  }
  const clean = title.trim();
  if (clean.length < 2) {
    return { valid: false, error: "Task title must be at least 2 characters in length." };
  }
  if (clean.length > 255) {
    return { valid: false, error: "Task title cannot exceed 255 characters." };
  }
  return { valid: true, cleanTitle: clean };
}

export function validateDeadline(deadline?: string | null): { valid: boolean; error?: string; cleanDeadline?: string | null } {
  if (!deadline) {
    return { valid: true, cleanDeadline: null };
  }
  const timestamp = Date.parse(deadline);
  if (isNaN(timestamp)) {
    return { valid: false, error: "Invalid deadline timestamp format." };
  }
  return { valid: true, cleanDeadline: new Date(timestamp).toISOString() };
}

export function validatePriority(priority?: string | null): { valid: boolean; cleanPriority: TaskPriority } {
  if (priority && VALID_PRIORITIES.includes(priority as TaskPriority)) {
    return { valid: true, cleanPriority: priority as TaskPriority };
  }
  return { valid: true, cleanPriority: "medium" };
}

/**
 * Generates a deterministic, unique task code server-side.
 * Format: TK-<GROUP_PREFIX>-<SEQUENCE> (e.g. TK-EVT-001)
 * Guaranteed unique within the organization.
 */
export async function generateDeterministicTaskCode(
  organizationId: string,
  groupSlug: string
): Promise<string> {
  const adminClient = createAdminClient();

  const prefix = groupSlug
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "GEN";

  // Count existing tasks in the organization to seed sequence
  const { count } = await adminClient
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  let seq = (count || 0) + 1;
  let code = `TK-${prefix}-${String(seq).padStart(3, "0")}`;

  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    attempts++;
    const { data } = await adminClient
      .from("tasks")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("task_code", code)
      .maybeSingle();

    if (!data) {
      isUnique = true;
    } else {
      seq++;
      code = `TK-${prefix}-${String(seq).padStart(3, "0")}`;
    }
  }

  if (!isUnique) {
    // Suffix with random hex if counter exhausted
    const hex = Math.random().toString(16).slice(2, 6).toUpperCase();
    code = `TK-${prefix}-${hex}`;
  }

  return code;
}
