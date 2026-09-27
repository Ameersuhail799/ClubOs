"use server";

import { revalidatePath } from "next/cache";
import {
  getPersonalTodos,
  createPersonalTodo,
  updatePersonalTodo,
  togglePersonalTodo,
  deletePersonalTodo,
  clearCompletedPersonalTodos,
} from "./service";
import type {
  CreatePersonalTodoInput,
  UpdatePersonalTodoInput,
  PersonalTodoWithTask,
  PersonalTodoRow,
  TodoResult,
} from "./types";

/**
 * Server Action to load all personal todos.
 */
export async function getPersonalTodosAction(): Promise<TodoResult<PersonalTodoWithTask[]>> {
  return getPersonalTodos();
}

/**
 * Server Action to create a personal todo.
 */
export async function createPersonalTodoAction(
  input: CreatePersonalTodoInput
): Promise<TodoResult<PersonalTodoWithTask>> {
  const result = await createPersonalTodo(input);
  if (result.success) {
    revalidatePath("/workspace/my-day");
    revalidatePath("/workspace/todo");
  }
  return result;
}

/**
 * Server Action to update a personal todo.
 */
export async function updatePersonalTodoAction(
  input: UpdatePersonalTodoInput
): Promise<TodoResult<PersonalTodoWithTask>> {
  const result = await updatePersonalTodo(input);
  if (result.success) {
    revalidatePath("/workspace/my-day");
    revalidatePath("/workspace/todo");
  }
  return result;
}

/**
 * Server Action to toggle completion status of a personal todo.
 */
export async function togglePersonalTodoAction(
  todoId: string,
  isCompleted: boolean
): Promise<TodoResult<PersonalTodoRow>> {
  const result = await togglePersonalTodo(todoId, isCompleted);
  if (result.success) {
    revalidatePath("/workspace/my-day");
    revalidatePath("/workspace/todo");
  }
  return result;
}

/**
 * Server Action to delete a personal todo.
 */
export async function deletePersonalTodoAction(
  todoId: string
): Promise<TodoResult<void>> {
  const result = await deletePersonalTodo(todoId);
  if (result.success) {
    revalidatePath("/workspace/my-day");
    revalidatePath("/workspace/todo");
  }
  return result;
}

/**
 * Server Action to clear all completed personal todos.
 */
export async function clearCompletedPersonalTodosAction(): Promise<TodoResult<void>> {
  const result = await clearCompletedPersonalTodos();
  if (result.success) {
    revalidatePath("/workspace/my-day");
    revalidatePath("/workspace/todo");
  }
  return result;
}
