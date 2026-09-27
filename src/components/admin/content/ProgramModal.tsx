"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { LabelCaps } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { useFocusTrap } from "@/lib/ui/useFocusTrap";
import { savePublicContentAction } from "@/lib/content/actions";
import type { PublicContentRow, ContentStatus } from "@/lib/content/types";

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  programToEdit?: PublicContentRow | null;
  onSaved?: (item: PublicContentRow) => void;
}

export function ProgramModal({
  isOpen,
  onClose,
  programToEdit,
  onSaved,
}: ProgramModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [trackBadge, setTrackBadge] = useState("");
  const [status, setStatus] = useState<ContentStatus>("published");
  const [sortOrder, setSortOrder] = useState(0);

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const trapRef = useFocusTrap({
    isOpen,
    onClose: () => {
      if (!isPending) onClose();
    },
    initialFocusRef: titleInputRef,
  });

  useEffect(() => {
    if (isOpen) {
      if (programToEdit) {
        setTitle(programToEdit.title || "");
        setSlug(programToEdit.slug || "");
        setSummary(programToEdit.summary || "");
        setBody(programToEdit.body || "");
        setTrackBadge(
          (programToEdit.metadata as any)?.badge || ""
        );
        setStatus((programToEdit.status as ContentStatus) || "published");
        setSortOrder(programToEdit.sort_order || 0);
      } else {
        setTitle("");
        setSlug("");
        setSummary("");
        setBody("");
        setTrackBadge("");
        setStatus("published");
        setSortOrder(0);
      }
      setErrorMsg(null);
    }
  }, [isOpen, programToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg("Program title is required.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await savePublicContentAction({
        id: programToEdit?.id,
        content_type: "program",
        title: title.trim(),
        slug: slug.trim() || undefined,
        summary: summary.trim() || null,
        body: body.trim() || null,
        status,
        sort_order: sortOrder,
        metadata: {
          badge: trackBadge.trim() || "CORE TRACK",
        },
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to save program.");
      } else {
        if (onSaved) onSaved(res.data);
        onClose();
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="program-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      ref={trapRef}
    >
      <div className="w-full max-w-lg rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <LabelCaps className="text-primary font-bold">Curate Public Space</LabelCaps>
            <h3 id="program-modal-title" className="font-sans font-bold text-headline-sm text-on-surface">
              {programToEdit ? "Edit Program Division" : "Add Program Division"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded text-secondary hover:text-on-surface font-mono"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 rounded bg-error-container text-on-error-container text-body-sm">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="prog-title">
              Division / Program Title <span className="text-primary">*</span>
            </label>
            <input
              id="prog-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Engineering & Prototyping"
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="prog-badge">
                Focus Badge
              </label>
              <input
                id="prog-badge"
                type="text"
                value={trackBadge}
                onChange={(e) => setTrackBadge(e.target.value)}
                placeholder="e.g., HARDWARE LAB"
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary uppercase text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="prog-status">
                Status
              </label>
              <select
                id="prog-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="published">Published</option>
                <option value="draft">Draft (Hidden)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="prog-summary">
              Public Executive Summary
            </label>
            <textarea
              id="prog-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Briefing on what this program produces, research domains, tools used..."
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
              {programToEdit ? "Update Program" : "Save Program"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
