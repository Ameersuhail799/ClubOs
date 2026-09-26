"use client";

import React, { useState, useTransition } from "react";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { addCommentAction } from "@/lib/tasks/actions";
import type { TaskWithFullDetails } from "@/lib/tasks/types";

interface TaskConversationTabProps {
  task: TaskWithFullDetails;
  onRefresh?: () => void;
}

export function TaskConversationTab({ task, onRefresh }: TaskConversationTabProps) {
  const [content, setContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isHead = task.currentUserRole === "main_head" || task.currentUserRole === "group_head";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await addCommentAction(task.id, content.trim(), isInternalNote);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      } else {
        setContent("");
        setIsInternalNote(false);
        if (onRefresh) onRefresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Discussion Header */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-1.5">
        <LabelCaps className="text-secondary font-semibold">
          Operational Discussion & Directive Notes
        </LabelCaps>
        <span className="text-body-sm text-secondary">
          Task-contextual discussion ledger. Comments and review notes are permanently recorded with
          author attribution.
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-error-container text-on-error-container text-body-sm border border-error/20">
          {errorMsg}
        </div>
      )}

      {/* Comment Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="p-5 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <label className="text-label-caps text-secondary font-semibold">
            Post an Operational Note or Update
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note, requirement query, or status update..."
            rows={3}
            required
            className="w-full p-3 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {isHead ? (
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-body-sm text-secondary">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
              />
              <span>Mark as Internal Head Note (Hidden from regular members)</span>
            </label>
          ) : (
            <div />
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isPending}
            disabled={!content.trim()}
          >
            Post Note
          </Button>
        </div>
      </form>

      {/* Comments List (Editorial Ledger) */}
      <div className="flex flex-col gap-4">
        {task.comments.length > 0 ? (
          <div className="divide-y divide-outline-variant border border-outline-variant rounded bg-surface-container-lowest overflow-hidden">
            {task.comments.map((comment) => {
              const formattedDate = new Date(comment.createdAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div
                  key={comment.id}
                  className={`p-5 flex flex-col gap-2.5 transition-colors ${
                    comment.isInternalNote
                      ? "bg-surface-container-low border-l-4 border-l-primary"
                      : "bg-surface-container-lowest"
                  }`}
                >
                  {/* Author Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-semibold text-body-md text-on-surface">
                        {comment.authorName}
                      </span>
                      {comment.authorRole && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-outline-variant bg-surface-container text-secondary font-medium">
                          {comment.authorRole.replace("_", " ")}
                        </span>
                      )}
                      {comment.isInternalNote && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-primary/20 bg-primary-fixed text-on-primary-fixed font-semibold">
                          Internal Head Note
                        </span>
                      )}
                    </div>
                    <LabelCode size="sm" className="text-secondary">
                      {formattedDate}
                    </LabelCode>
                  </div>

                  {/* Comment Body */}
                  <div className="font-sans text-body-md text-on-surface whitespace-pre-line leading-relaxed pl-1">
                    {comment.content}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center gap-1.5">
            <span className="font-sans text-body-md text-on-surface font-medium">
              No comments or discussion entries yet.
            </span>
            <span className="text-body-sm text-secondary">
              Use the ledger form above to communicate updates or ask clarification questions.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
