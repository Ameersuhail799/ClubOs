import type { Database } from "@/types/database.types";
import type { TaskPriority, TaskStatus } from "@/lib/tasks/types";

export type PersonalTodoRow = Database["public"]["Tables"]["personal_todos"]["Row"];
export type PersonalTodoInsert = Database["public"]["Tables"]["personal_todos"]["Insert"];
export type PersonalTodoUpdate = Database["public"]["Tables"]["personal_todos"]["Update"];

export interface PersonalTodoWithTask extends PersonalTodoRow {
  task?: {
    id: string;
    taskCode: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
  } | null;
}

export interface CreatePersonalTodoInput {
  title: string;
  dueDate?: string | null;
  taskId?: string | null;
}

export interface UpdatePersonalTodoInput {
  todoId: string;
  title?: string;
  dueDate?: string | null;
  isCompleted?: boolean;
  taskId?: string | null;
}

export interface TodoResult<T = PersonalTodoRow> {
  success?: boolean;
  data?: T | null;
  error?: string | null;
  code?: "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "internal_error";
}
