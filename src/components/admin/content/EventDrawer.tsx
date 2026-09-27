"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useFocusTrap } from "@/lib/ui/useFocusTrap";
import { createEventAction, updateEventAction, uploadPublicAssetAction } from "@/lib/content/actions";
import type { EventRow, EventStatus } from "@/lib/content/types";

interface EventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventRow | null;
  onSaved?: (event: EventRow) => void;
}

export function EventDrawer({
  isOpen,
  onClose,
  eventToEdit,
  onSaved,
}: EventDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [abstract, setAbstract] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<EventStatus>("draft");

  // Dynamic agenda items
  const [agendaList, setAgendaList] = useState<Array<{ time: string; topic: string }>>([]);
  const [newAgendaTime, setNewAgendaTime] = useState("");
  const [newAgendaTopic, setNewAgendaTopic] = useState("");

  // Prerequisites items
  const [prereqsList, setPrereqsList] = useState<string[]>([]);
  const [newPrereq, setNewPrereq] = useState("");

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize focus trap hook
  const trapRef = useFocusTrap({
    isOpen,
    onClose: () => {
      if (!isPending) onClose();
    },
    initialFocusRef: titleInputRef,
  });

  // Populate form on edit
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.title || "");
        setSlug(eventToEdit.slug || "");
        setAbstract(eventToEdit.abstract || "");
        setContent(eventToEdit.content || "");
        setLocation(eventToEdit.location || "");
        setBannerUrl(eventToEdit.banner_url || "");
        setStartsAt(
          eventToEdit.starts_at ? new Date(eventToEdit.starts_at).toISOString().slice(0, 16) : ""
        );
        setEndsAt(
          eventToEdit.ends_at ? new Date(eventToEdit.ends_at).toISOString().slice(0, 16) : ""
        );
        setStatus(eventToEdit.status || "draft");

        // Parse agenda
        if (Array.isArray(eventToEdit.agenda)) {
          setAgendaList(eventToEdit.agenda as Array<{ time: string; topic: string }>);
        } else {
          setAgendaList([]);
        }

        // Parse prerequisites
        if (Array.isArray(eventToEdit.prerequisites)) {
          setPrereqsList(eventToEdit.prerequisites as string[]);
        } else {
          setPrereqsList([]);
        }
      } else {
        // Defaults for new event
        setTitle("");
        setSlug("");
        setAbstract("");
        setContent("");
        setLocation("Main Makerspace Lab, Workshop Floor");
        setBannerUrl("");
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 86400000);
        setStartsAt(new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString().slice(0, 16));
        setEndsAt(new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString().slice(0, 16));
        setStatus("draft");
        setAgendaList([]);
        setPrereqsList([]);
      }
      setErrorMsg(null);
    }
  }, [isOpen, eventToEdit]);

  if (!isOpen) return null;

  const handleAddAgenda = () => {
    if (!newAgendaTime.trim() || !newAgendaTopic.trim()) return;
    setAgendaList([...agendaList, { time: newAgendaTime.trim(), topic: newAgendaTopic.trim() }]);
    setNewAgendaTime("");
    setNewAgendaTopic("");
  };

  const handleRemoveAgenda = (idx: number) => {
    setAgendaList(agendaList.filter((_, i) => i !== idx));
  };

  const handleAddPrereq = () => {
    if (!newPrereq.trim()) return;
    setPrereqsList([...prereqsList, newPrereq.trim()]);
    setNewPrereq("");
  };

  const handleRemovePrereq = (idx: number) => {
    setPrereqsList(prereqsList.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await uploadPublicAssetAction(formData);
      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to upload banner image.");
      } else {
        setBannerUrl(res.data.url);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg("Event title is required (minimum 2 characters).");
      return;
    }
    if (!startsAt || !endsAt) {
      setErrorMsg("Start and End times are required.");
      return;
    }
    if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      setErrorMsg("Event end time cannot be earlier than start time.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      if (eventToEdit) {
        formData.set("id", eventToEdit.id);
      }
      formData.set("title", title.trim());
      if (slug.trim()) formData.set("slug", slug.trim());
      if (abstract.trim()) formData.set("abstract", abstract.trim());
      if (content.trim()) formData.set("content", content.trim());
      if (location.trim()) formData.set("location", location.trim());
      if (bannerUrl.trim()) formData.set("banner_url", bannerUrl.trim());
      formData.set("starts_at", new Date(startsAt).toISOString());
      formData.set("ends_at", new Date(endsAt).toISOString());
      formData.set("status", status);
      formData.set("agenda", JSON.stringify(agendaList));
      formData.set("prerequisites", JSON.stringify(prereqsList));

      const res = eventToEdit
        ? await updateEventAction(formData)
        : await createEventAction(formData);

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to save event. Check inputs.");
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
      aria-labelledby="event-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
      ref={trapRef}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={() => {
          if (!isPending) onClose();
        }}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-50 w-full sm:max-w-2xl bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-4 bg-surface-container-lowest">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">Public Space Management</LabelCaps>
              <span className="text-outline-variant">•</span>
              <StatusBadge variant={status === "published" ? "active" : "neutral"} size="sm">
                {status.toUpperCase()}
              </StatusBadge>
            </div>
            <h3 id="event-drawer-title" className="font-sans font-bold text-headline-sm text-on-surface">
              {eventToEdit ? "Edit Public Event Directive" : "Create Public Event Directive"}
            </h3>
            <p className="font-sans text-body-sm text-secondary">
              Curate the public event description, agenda schedule, and prerequisites.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-colors font-mono text-base"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {errorMsg && (
            <div className="p-3 rounded bg-error-container border border-error/20 text-on-error-container text-body-sm flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="font-bold text-xs hover:opacity-75"
              >
                ✕
              </button>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="event-title">
              Event Title <span className="text-primary">*</span>
            </label>
            <input
              id="event-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Maker Conclave & Hardware Prototyping"
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Slug & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="event-slug">
                Custom URL Slug (Optional)
              </label>
              <input
                id="event-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., maker-conclave"
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="event-location">
                Venue Location
              </label>
              <input
                id="event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Makerspace Lab"
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Dates & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="event-start">
                Start Date & Time <span className="text-primary">*</span>
              </label>
              <input
                id="event-start"
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="event-end">
                End Date & Time <span className="text-primary">*</span>
              </label>
              <input
                id="event-end"
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="event-status">
                Publication State
              </label>
              <select
                id="event-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="draft">Draft (Private)</option>
                <option value="published">Published (Public)</option>
                <option value="archived">Archived (Public Archive)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Banner URL with upload button */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="event-banner">
              Event Banner Image
            </label>
            <div className="flex gap-2">
              <input
                id="event-banner"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://... or upload image"
                className="flex-1 p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Asset
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {bannerUrl && (
              <div className="relative h-28 w-full rounded overflow-hidden border border-outline-variant bg-surface-container-low mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Abstract / Short Summary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="event-abstract">
              Summary Abstract
            </label>
            <textarea
              id="event-abstract"
              rows={2}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Concise single-paragraph briefing for cards and listings..."
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {/* Full Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="event-content">
              Detailed Description & Objectives
            </label>
            <textarea
              id="event-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Comprehensive workshop breakdown, technical themes, and learning outcomes..."
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {/* Agenda Builder */}
          <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant">
            <div className="flex items-center justify-between">
              <label className="text-label-caps text-secondary font-semibold">
                Technical Agenda Schedule
              </label>
              <span className="text-xs text-secondary font-mono">{agendaList.length} items</span>
            </div>
            <div className="flex flex-col gap-2">
              {agendaList.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant text-body-sm"
                >
                  <div className="flex items-center gap-2">
                    <LabelCode size="sm" className="text-primary font-bold">
                      {item.time}
                    </LabelCode>
                    <span className="text-on-surface">{item.topic}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAgenda(idx)}
                    className="text-secondary hover:text-error text-xs p-1"
                    aria-label={`Remove agenda item ${item.time}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Day 1: 10:00 AM"
                  value={newAgendaTime}
                  onChange={(e) => setNewAgendaTime(e.target.value)}
                  className="w-1/3 p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm"
                />
                <input
                  type="text"
                  placeholder="e.g., Schematic Capture & Component Selection"
                  value={newAgendaTopic}
                  onChange={(e) => setNewAgendaTopic(e.target.value)}
                  className="flex-1 p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddAgenda}>
                  + Add
                </Button>
              </div>
            </div>
          </div>

          {/* Prerequisites Builder */}
          <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant">
            <div className="flex items-center justify-between">
              <label className="text-label-caps text-secondary font-semibold">
                Workbench Tooling & Prerequisites
              </label>
              <span className="text-xs text-secondary font-mono">{prereqsList.length} items</span>
            </div>
            <div className="flex flex-col gap-2">
              {prereqsList.map((prereq, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant text-body-sm"
                >
                  <span className="text-on-surface">• {prereq}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePrereq(idx)}
                    className="text-secondary hover:text-error text-xs p-1"
                    aria-label={`Remove prerequisite ${prereq}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Laptop with KiCad 8.0 installed"
                  value={newPrereq}
                  onChange={(e) => setNewPrereq(e.target.value)}
                  className="flex-1 p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddPrereq}>
                  + Add
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-outline-variant flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isPending}>
              {eventToEdit ? "Update Event Directive" : "Publish / Save Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
