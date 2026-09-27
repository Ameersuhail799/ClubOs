"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { LabelCaps } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { useFocusTrap } from "@/lib/ui/useFocusTrap";
import { saveAnnouncementAction } from "@/lib/content/actions";
import type { AnnouncementRow } from "@/lib/content/types";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementToEdit?: AnnouncementRow | null;
  onSaved?: (item: AnnouncementRow) => void;
}

export function AnnouncementModal({
  isOpen,
  onClose,
  announcementToEdit,
  onSaved,
}: AnnouncementModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);

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
      if (announcementToEdit) {
        setTitle(announcementToEdit.title || "");
        setContent(announcementToEdit.content || "");
        setIsPublic(announcementToEdit.is_public ?? true);
      } else {
        setTitle("");
        setContent("");
        setIsPublic(true);
      }
      setErrorMsg(null);
    }
  }, [isOpen, announcementToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg("Title and content are required.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      if (announcementToEdit) formData.set("id", announcementToEdit.id);
      formData.set("title", title.trim());
      formData.set("content", content.trim());
      formData.set("is_public", isPublic ? "true" : "false");

      const res = await saveAnnouncementAction(formData);
      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to save announcement.");
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
      aria-labelledby="announcement-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      ref={trapRef}
    >
      <div className="w-full max-w-lg rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <LabelCaps className="text-primary font-bold">Public Broadcast</LabelCaps>
            <h3 id="announcement-modal-title" className="font-sans font-bold text-headline-sm text-on-surface">
              {announcementToEdit ? "Edit Public Announcement" : "Post Broadcast Announcement"}
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
            <label className="text-label-caps text-secondary font-semibold" htmlFor="ann-title">
              Announcement Headline <span className="text-primary">*</span>
            </label>
            <input
              id="ann-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Spring 2027 Cohort Registrations Open"
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="ann-content">
              Dispatch Message Body <span className="text-primary">*</span>
            </label>
            <textarea
              id="ann-content"
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide briefing details, instructions, or links..."
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="ann-public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="ann-public" className="text-body-sm text-on-surface cursor-pointer select-none">
              Publish to public homepage announcements ticker
            </label>
          </div>

          <div className="pt-3 border-t border-outline-variant flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
              {announcementToEdit ? "Update Announcement" : "Post Broadcast"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
