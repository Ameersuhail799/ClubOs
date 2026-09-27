import "server-only";

import { getCurrentOrganizationContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PersonalTodoRow,
  PersonalTodoWithTask,
  PersonalTodoUpdate,
  CreatePersonalTodoInput,
  UpdatePersonalTodoInput,
  TodoResult,
} from "./types";
import type { TaskStatus, TaskPriority } from "@/lib/tasks/types";

/**
 * Validates that a referenced task exists, belongs to caller's organization,
 * and is accessible by the caller.
 */
async function verifyTaskAccessForTodo(
  organizationId: string,
  userId: string,
  taskId: string
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data: task, error } = await adminClient
    .from("tasks")
    .select("id, organization_id, assignee_id, assigned_head_id, created_by, is_volunteer_pool, primary_group_id")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !task) return false;

  // Direct assignee, head, or creator
  if (
    task.assignee_id === userId ||
    task.assigned_head_id === userId ||
    task.created_by === userId
  ) {
    return true;
  }

  // Check explicit task_access
  const { data: access } = await adminClient
    .from("task_access")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  if (access) return true;

  return false;
}

/**
 * Fetches all personal todos for the authenticated user.
 * Strictly scoped to auth.uid() == user_id.
 */
export async function getPersonalTodos(): Promise<TodoResult<PersonalTodoWithTask[]>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "User is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: rawTodos, error: todosErr } = await adminClient
    .from("personal_todos")
    .select("*")
    .eq("user_id", context.user.id)
    .order("is_completed", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (todosErr || !rawTodos) {
    return { error: `Failed to load personal todos: ${todosErr?.message}`, code: "internal_error" };
  }

  // Resolve linked tasks if any
  const taskIds = Array.from(new Set(rawTodos.map((t) => t.task_id).filter((id): id is string => Boolean(id))));
  let taskMap = new Map<string, { id: string; taskCode: string; title: string; status: TaskStatus; priority: TaskPriority }>();

  if (taskIds.length > 0) {
    const { data: tasks } = await adminClient
      .from("tasks")
      .select("id, task_code, title, status, priority")
      .eq("organization_id", organizationId)
      .in("id", taskIds);

    for (const t of tasks || []) {
      taskMap.set(t.id, {
        id: t.id,
        taskCode: t.task_code,
        title: t.title,
        status: t.status,
        priority: t.priority,
      });
    }
  }

  const enrichedTodos: PersonalTodoWithTask[] = rawTodos.map((todo) => ({
    ...todo,
    task: todo.task_id ? taskMap.get(todo.task_id) || null : null,
  }));

  return { success: true, data: enrichedTodos };
}

/**
 * Creates a new private personal todo for the authenticated user.
 */
export async function createPersonalTodo(
  input: CreatePersonalTodoInput
): Promise<TodoResult<PersonalTodoWithTask>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "User is not bound to a valid organization.", code: "unauthorized" };
  }

  const cleanTitle = (input.title || "").trim();
  if (!cleanTitle || cleanTitle.length < 1) {
    return { error: "Todo title cannot be empty.", code: "invalid_input" };
  }

  if (cleanTitle.length > 255) {
    return { error: "Todo title cannot exceed 255 characters.", code: "invalid_input" };
  }

  let validatedTaskId: string | null = null;
  if (input.taskId) {
    const hasAccess = await verifyTaskAccessForTodo(
      organizationId,
      context.user.id,
      input.taskId
    );
    if (!hasAccess) {
      return {
        error: "Invalid task reference: you do not have permission to link this task.",
        code: "forbidden",
      };
    }
    validatedTaskId = input.taskId;
  }

  const adminClient = createAdminClient();

  const { data: newTodo, error: insertErr } = await adminClient
    .from("personal_todos")
    .insert({
      organization_id: organizationId,
      user_id: context.user.id,
      title: cleanTitle,
      due_date: input.dueDate ? new Date(input.dueDate).toISOString() : null,
      task_id: validatedTaskId,
      is_completed: false,
      position: 0,
    })
    .select()
    .single();

  if (insertErr || !newTodo) {
    return { error: `Failed to create todo: ${insertErr?.message}`, code: "internal_error" };
  }

  let taskInfo = null;
  if (validatedTaskId) {
    const { data: t } = await adminClient
      .from("tasks")
      .select("id, task_code, title, status, priority")
      .eq("id", validatedTaskId)
      .maybeSingle();

    if (t) {
      taskInfo = {
        id: t.id,
        taskCode: t.task_code,
        title: t.title,
        status: t.status,
        priority: t.priority,
      };
    }
  }

  return {
    success: true,
    data: {
      ...newTodo,
      task: taskInfo,
    },
  };
}

/**
 * Updates an existing personal todo.
 * Strictly verifies ownership (user_id === context.user.id).
 */
export async function updatePersonalTodo(
  input: UpdatePersonalTodoInput
): Promise<TodoResult<PersonalTodoWithTask>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "User is not bound to a valid organization.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  // Verify ownership
  const { data: existing, error: fetchErr } = await adminClient
    .from("personal_todos")
    .select("*")
    .eq("id", input.todoId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { error: "Todo not found.", code: "not_found" };
  }

  if (existing.user_id !== context.user.id) {
    return { error: "Access Denied: You do not own this todo.", code: "forbidden" };
  }

  const updates: PersonalTodoUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    const cleanTitle = input.title.trim();
    if (!cleanTitle || cleanTitle.length < 1) {
      return { error: "Todo title cannot be empty.", code: "invalid_input" };
    }
    updates.title = cleanTitle;
  }

  if (input.isCompleted !== undefined) {
    updates.is_completed = input.isCompleted;
  }

  if (input.dueDate !== undefined) {
    updates.due_date = input.dueDate ? new Date(input.dueDate).toISOString() : null;
  }

  if (input.taskId !== undefined) {
    if (input.taskId) {
      const hasAccess = await verifyTaskAccessForTodo(
        organizationId,
        context.user.id,
        input.taskId
      );
      if (!hasAccess) {
        return {
          error: "Invalid task reference: you do not have permission to link this task.",
          code: "forbidden",
        };
      }
      updates.task_id = input.taskId;
    } else {
      updates.task_id = null;
    }
  }

  const { data: updated, error: updateErr } = await adminClient
    .from("personal_todos")
    .update(updates)
    .eq("id", input.todoId)
    .eq("user_id", context.user.id)
    .select()
    .single();

  if (updateErr || !updated) {
    return { error: `Failed to update todo: ${updateErr?.message}`, code: "internal_error" };
  }

  let taskInfo = null;
  if (updated.task_id) {
    const { data: t } = await adminClient
      .from("tasks")
      .select("id, task_code, title, status, priority")
      .eq("id", updated.task_id)
      .maybeSingle();

    if (t) {
      taskInfo = {
        id: t.id,
        taskCode: t.task_code,
        title: t.title,
        status: t.status,
        priority: t.priority,
      };
    }
  }

  return {
    success: true,
    data: {
      ...updated,
      task: taskInfo,
    },
  };
}

/**
 * Toggles completion status of a personal todo.
 */
export async function togglePersonalTodo(
  todoId: string,
  isCompleted: boolean
): Promise<TodoResult<PersonalTodoRow>> {
  return updatePersonalTodo({ todoId, isCompleted });
}

/**
 * Deletes a personal todo. Strictly verifies user ownership.
 */
export async function deletePersonalTodo(todoId: string): Promise<TodoResult<void>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("personal_todos")
    .select("user_id")
    .eq("id", todoId)
    .maybeSingle();

  if (!existing) {
    return { error: "Todo not found.", code: "not_found" };
  }

  if (existing.user_id !== context.user.id) {
    return { error: "Access Denied: You cannot delete another user's todo.", code: "forbidden" };
  }

  const { error: delErr } = await adminClient
    .from("personal_todos")
    .delete()
    .eq("id", todoId)
    .eq("user_id", context.user.id);

  if (delErr) {
    return { error: `Failed to delete todo: ${delErr.message}`, code: "internal_error" };
  }

  return { success: true };
}

/**
 * Clears all completed todos for the authenticated user.
 */
export async function clearCompletedPersonalTodos(): Promise<TodoResult<void>> {
  const context = await getCurrentOrganizationContext();

  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const adminClient = createAdminClient();

  const { error: delErr } = await adminClient
    .from("personal_todos")
    .delete()
    .eq("user_id", context.user.id)
    .eq("is_completed", true);

  if (delErr) {
    return { error: `Failed to clear completed todos: ${delErr.message}`, code: "internal_error" };
  }

  return { success: true };
}
