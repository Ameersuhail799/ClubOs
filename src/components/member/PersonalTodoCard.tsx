"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import {
  createPersonalTodoAction,
  updatePersonalTodoAction,
  togglePersonalTodoAction,
  deletePersonalTodoAction,
  clearCompletedPersonalTodosAction,
} from "@/lib/todos/actions";
import type { PersonalTodoWithTask } from "@/lib/todos/types";
import type { TaskWithDetails } from "@/lib/tasks/types";

interface PersonalTodoCardProps {
  todos: PersonalTodoWithTask[];
  availableTasks?: TaskWithDetails[];
  onRefresh?: () => void;
}

export function PersonalTodoCard({
  todos,
  availableTasks = [],
  onRefresh,
}: PersonalTodoCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick add states
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTaskId, setNewTaskId] = useState("");
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false);

  // Edit states
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTaskId, setEditTaskId] = useState("");

  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createPersonalTodoAction({
        title,
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        taskId: newTaskId || undefined,
      });

      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setNewTitle("");
        setNewDueDate("");
        setNewTaskId("");
        setShowAdvancedAdd(false);
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleToggle = (todoId: string, currentStatus: boolean) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await togglePersonalTodoAction(todoId, !currentStatus);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleDelete = (todoId: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await deletePersonalTodoAction(todoId);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        if (onRefresh) onRefresh();
      }
    });
  };

  const handleClearCompleted = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await clearCompletedPersonalTodosAction();
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        if (onRefresh) onRefresh();
      }
    });
  };

  const startEditing = (todo: PersonalTodoWithTask) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(
      todo.due_date ? new Date(todo.due_date).toISOString().split("T")[0] : ""
    );
    setEditTaskId(todo.task_id || "");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodoId) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await updatePersonalTodoAction({
        todoId: editingTodoId,
        title: editTitle.trim(),
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        taskId: editTaskId || null,
      });

      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setEditingTodoId(null);
        if (onRefresh) onRefresh();
      }
    });
  };

  const completedCount = todos.filter((t) => t.is_completed).length;

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LabelCaps className="text-secondary font-bold uppercase">
            Private Scratchpad
          </LabelCaps>
          <span className="text-label-code-xs bg-surface-container px-2 py-0.5 rounded text-secondary border border-outline-variant">
            Strictly Private
          </span>
        </div>
        <span className="font-mono text-label-code-sm text-secondary">
          {todos.length} items
        </span>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded bg-error/10 border border-error/30 text-error text-body-sm">
          ⚠ {errorMsg}
        </div>
      )}

      {/* Quick Add Form */}
      <form onSubmit={handleCreateTodo} className="flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant px-3 py-1.5 rounded">
          <span className="text-secondary font-bold">+</span>
          <input
            type="text"
            placeholder="Add personal todo or scratchpad item (Press Enter)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isPending}
            className="w-full bg-transparent font-sans text-body-sm text-on-surface placeholder:text-secondary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowAdvancedAdd(!showAdvancedAdd)}
            title="Optional due date or task link"
            className="text-label-code-xs text-secondary hover:text-primary px-1.5 py-0.5 rounded border border-outline-variant/60"
          >
            {showAdvancedAdd ? "Simple" : "Options"}
          </button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!newTitle.trim() || isPending}
          >
            Add
          </Button>
        </div>

        {/* Optional Add Fields */}
        {showAdvancedAdd && (
          <div className="p-3 rounded bg-surface-container border border-outline-variant grid grid-cols-1 sm:grid-cols-2 gap-3 text-label-code-sm">
            <div className="flex flex-col gap-1">
              <label className="text-secondary font-semibold">Optional Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                disabled={isPending}
                className="h-8 px-2 rounded bg-surface border border-outline text-on-surface text-label-code-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-secondary font-semibold">Link to Authorized Task</label>
              <select
                value={newTaskId}
                onChange={(e) => setNewTaskId(e.target.value)}
                disabled={isPending}
                className="h-8 px-2 rounded bg-surface border border-outline text-on-surface text-label-code-sm"
              >
                <option value="">— None (Independent Todo) —</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.task_code}] {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </form>

      {/* Todo Items List */}
      <div className="flex flex-col gap-1.5">
        {todos.length === 0 ? (
          <div className="py-6 text-center text-label-code-sm text-secondary bg-surface-container-lowest border border-outline-variant/60 rounded">
            No personal scratchpad items yet. Add quick thoughts or checklist items above.
          </div>
        ) : (
          todos.map((todo) => {
            const isEditing = editingTodoId === todo.id;

            if (isEditing) {
              return (
                <form
                  key={todo.id}
                  onSubmit={handleSaveEdit}
                  className="p-3 rounded bg-surface-container-lowest border border-primary/40 flex flex-col gap-2"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full px-2 py-1 rounded bg-surface border border-outline text-body-sm text-on-surface font-sans"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-label-code-sm">
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-7 px-2 rounded bg-surface border border-outline text-on-surface text-label-code-sm"
                    />
                    <select
                      value={editTaskId}
                      onChange={(e) => setEditTaskId(e.target.value)}
                      className="h-7 px-2 rounded bg-surface border border-outline text-on-surface text-label-code-sm"
                    >
                      <option value="">— No task link —</option>
                      {availableTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.task_code}] {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTodoId(null)}
                      className="text-label-code-sm text-secondary hover:text-on-surface px-2 py-1"
                    >
                      Cancel
                    </button>
                    <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                      Save
                    </Button>
                  </div>
                </form>
              );
            }

            return (
              <div
                key={todo.id}
                className="group flex items-center justify-between p-2.5 rounded bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-high transition-colors gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={todo.is_completed}
                    onChange={() => handleToggle(todo.id, todo.is_completed)}
                    disabled={isPending}
                    className="w-4 h-4 accent-primary rounded cursor-pointer flex-shrink-0"
                  />
                  <span
                    className={`font-sans text-body-sm truncate ${
                      todo.is_completed
                        ? "line-through text-secondary"
                        : "text-on-surface"
                    }`}
                  >
                    {todo.title}
                  </span>

                  {/* Linked Task Pill */}
                  {todo.task && (
                    <Link
                      href={`/workspace/tasks/${todo.task.id}`}
                      className="font-mono text-label-code-xs bg-surface-container px-1.5 py-0.5 rounded text-primary border border-outline-variant hover:underline flex-shrink-0"
                    >
                      {todo.task.taskCode}
                    </Link>
                  )}

                  {/* Optional Due Date */}
                  {todo.due_date && (
                    <span className="font-mono text-label-code-xs text-secondary flex-shrink-0 hidden sm:inline-block">
                      {new Date(todo.due_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditing(todo)}
                    disabled={isPending}
                    className="p-1 text-secondary hover:text-on-surface text-label-code-xs"
                    title="Edit todo"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    disabled={isPending}
                    className="p-1 text-secondary hover:text-error text-label-code-xs"
                    title="Delete todo"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-label-code-sm text-secondary">
        <span>{completedCount} completed</span>
        {completedCount > 0 && (
          <button
            type="button"
            onClick={handleClearCompleted}
            disabled={isPending}
            className="text-primary hover:underline font-semibold"
          >
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}
