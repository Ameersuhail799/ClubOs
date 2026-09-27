"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { LabelCaps } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { useFocusTrap } from "@/lib/ui/useFocusTrap";
import { savePublicContentAction, uploadPublicAssetAction } from "@/lib/content/actions";
import type { PublicContentRow, ContentStatus } from "@/lib/content/types";

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoToEdit?: PublicContentRow | null;
  onSaved?: (item: PublicContentRow) => void;
}

export function GalleryModal({
  isOpen,
  onClose,
  photoToEdit,
  onSaved,
}: GalleryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [divisionTag, setDivisionTag] = useState("Engineering");
  const [status, setStatus] = useState<ContentStatus>("published");

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const trapRef = useFocusTrap({
    isOpen,
    onClose: () => {
      if (!isPending) onClose();
    },
    initialFocusRef: titleInputRef,
  });

  useEffect(() => {
    if (isOpen) {
      if (photoToEdit) {
        setTitle(photoToEdit.title || "");
        setMediaUrl(photoToEdit.media_url || "");
        setCaption(photoToEdit.summary || "");
        setYear((photoToEdit.metadata as any)?.year || new Date().getFullYear().toString());
        setDivisionTag((photoToEdit.metadata as any)?.tag || "Engineering");
        setStatus((photoToEdit.status as ContentStatus) || "published");
      } else {
        setTitle("");
        setMediaUrl("");
        setCaption("");
        setYear(new Date().getFullYear().toString());
        setDivisionTag("Engineering");
        setStatus("published");
      }
      setErrorMsg(null);
    }
  }, [isOpen, photoToEdit]);

  if (!isOpen) return null;

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
        setErrorMsg(res.error || "Failed to upload image.");
      } else {
        setMediaUrl(res.data.url);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    if (!mediaUrl.trim()) {
      setErrorMsg("Photo image URL or file upload is required.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await savePublicContentAction({
        id: photoToEdit?.id,
        content_type: "gallery",
        title: title.trim(),
        media_url: mediaUrl.trim(),
        summary: caption.trim() || null,
        status,
        metadata: {
          year: year.trim(),
          tag: divisionTag.trim(),
        },
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to save photo entry.");
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
      aria-labelledby="gallery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      ref={trapRef}
    >
      <div className="w-full max-w-lg rounded-lg bg-surface-container-lowest border border-outline-variant shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <LabelCaps className="text-primary font-bold">Public Gallery</LabelCaps>
            <h3 id="gallery-modal-title" className="font-sans font-bold text-headline-sm text-on-surface">
              {photoToEdit ? "Edit Gallery Photo" : "Add Authentic Workshop Photo"}
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
            <label className="text-label-caps text-secondary font-semibold" htmlFor="gal-title">
              Photo Title / Scene <span className="text-primary">*</span>
            </label>
            <input
              id="gal-title"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Soldering STM32 Microcontroller Prototypes"
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Media URL / Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="gal-media">
              Image Asset <span className="text-primary">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="gal-media"
                type="url"
                required
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://... or upload photo"
                className="flex-1 p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {mediaUrl && (
              <div className="relative h-32 w-full rounded overflow-hidden border border-outline-variant bg-surface-container-low mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="gal-tag">
                Program Division
              </label>
              <select
                id="gal-tag"
                value={divisionTag}
                onChange={(e) => setDivisionTag(e.target.value)}
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
              >
                <option value="Engineering">Engineering</option>
                <option value="Events">Events</option>
                <option value="Media">Media</option>
                <option value="Outreach">Outreach</option>
                <option value="Community">Community</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="gal-year">
                Year
              </label>
              <input
                id="gal-year"
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026"
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-caps text-secondary font-semibold" htmlFor="gal-caption">
              Caption / Context
            </label>
            <input
              id="gal-caption"
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g., Maker Conclave hands-on hardware workbench session"
              className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
              {photoToEdit ? "Update Entry" : "Add to Gallery"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
