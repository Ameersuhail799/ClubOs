"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Display,
  HeadlineMd,
  BodyMd,
  BodySm,
  LabelCaps,
  LabelCode,
} from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EventDrawer } from "./EventDrawer";
import { AnnouncementModal } from "./AnnouncementModal";
import { ProgramModal } from "./ProgramModal";
import { GalleryModal } from "./GalleryModal";
import {
  setEventStatusAction,
  deleteEventAction,
  deleteAnnouncementAction,
  deletePublicContentAction,
  savePublicContentAction,
} from "@/lib/content/actions";
import type {
  EventRow,
  AnnouncementRow,
  PublicContentRow,
  EventStatus,
} from "@/lib/content/types";

interface ContentManagerClientProps {
  organizationName: string;
  initialEvents: EventRow[];
  initialAnnouncements: AnnouncementRow[];
  initialContent: PublicContentRow[];
}

export function ContentManagerClient({
  organizationName,
  initialEvents,
  initialAnnouncements,
  initialContent,
}: ContentManagerClientProps) {
  const [activeTab, setActiveTab] = useState<
    "events" | "announcements" | "programs" | "gallery" | "about"
  >("events");

  // Local state
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>(initialAnnouncements);
  const [contentItems, setContentItems] = useState<PublicContentRow[]>(initialContent);

  // Modals & Drawers
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<EventRow | null>(null);

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [selectedAnnToEdit, setSelectedAnnToEdit] = useState<AnnouncementRow | null>(null);

  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [selectedProgramToEdit, setSelectedProgramToEdit] = useState<PublicContentRow | null>(null);

  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [selectedPhotoToEdit, setSelectedPhotoToEdit] = useState<PublicContentRow | null>(null);

  // Transitions & Feedback
  const [isPending, startTransition] = useTransition();
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtered public content
  const heroContent = contentItems.find((c) => c.content_type === "hero");
  const aboutContent = contentItems.find((c) => c.content_type === "about");
  const programItems = contentItems.filter((c) => c.content_type === "program");
  const galleryItems = contentItems.filter((c) => c.content_type === "gallery");

  // Hero & About Form state
  const [heroTitle, setHeroTitle] = useState(
    heroContent?.title || "Building a culture of autonomous making, engineering curiosity, and shared ownership."
  );
  const [heroSummary, setHeroSummary] = useState(
    heroContent?.summary ||
      "Tinkers Hub is a technical community dedicated to hardware prototyping, open-source engineering, and collaborative student initiatives."
  );
  const [aboutBody, setAboutBody] = useState(
    aboutContent?.body ||
      "Founded to bridge the chasm between textbook engineering and physical prototyping. Tinkers Hub provides workbench facilities, component repositories, and an autonomous peer-led project hierarchy."
  );
  const [aboutLocation, setAboutLocation] = useState(
    (aboutContent?.metadata as any)?.location || "Engineering Block B, Studio 402, Campus Makerspace"
  );
  const [aboutHours, setAboutHours] = useState(
    (aboutContent?.metadata as any)?.hours || "Monday - Saturday: 09:00 - 21:00 IST"
  );
  const [aboutContact, setAboutContact] = useState(
    (aboutContent?.metadata as any)?.contact || "lead@tinkershub.internal"
  );

  // Event handlers
  const handleEventStatusChange = (eventId: string, newStatus: EventStatus) => {
    setActionMsg(null);
    startTransition(async () => {
      const res = await setEventStatusAction(eventId, newStatus);
      if (!res.success || !res.data) {
        setActionMsg({ type: "error", text: res.error || "Failed to update event status." });
      } else {
        setEvents(events.map((e) => (e.id === eventId ? res.data : e)));
        setActionMsg({ type: "success", text: `Event updated to ${newStatus}.` });
      }
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!confirm("Are you sure you want to permanently delete this event?")) return;
    setActionMsg(null);
    startTransition(async () => {
      const res = await deleteEventAction(eventId);
      if (!res.success) {
        setActionMsg({ type: "error", text: res.error || "Failed to delete event." });
      } else {
        setEvents(events.filter((e) => e.id !== eventId));
        setActionMsg({ type: "success", text: "Event deleted successfully." });
      }
    });
  };

  const handleDeleteAnnouncement = (annId: string) => {
    if (!confirm("Are you sure you want to remove this announcement?")) return;
    setActionMsg(null);
    startTransition(async () => {
      const res = await deleteAnnouncementAction(annId);
      if (!res.success) {
        setActionMsg({ type: "error", text: res.error || "Failed to delete announcement." });
      } else {
        setAnnouncements(announcements.filter((a) => a.id !== annId));
        setActionMsg({ type: "success", text: "Announcement deleted." });
      }
    });
  };

  const handleDeleteContent = (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content item?")) return;
    setActionMsg(null);
    startTransition(async () => {
      const res = await deletePublicContentAction(contentId);
      if (!res.success) {
        setActionMsg({ type: "error", text: res.error || "Failed to delete content." });
      } else {
        setContentItems(contentItems.filter((c) => c.id !== contentId));
        setActionMsg({ type: "success", text: "Item removed from public space." });
      }
    });
  };

  const handleSaveAboutHero = (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);
    startTransition(async () => {
      // 1. Save Hero
      const heroRes = await savePublicContentAction({
        id: heroContent?.id,
        content_type: "hero",
        title: heroTitle.trim(),
        summary: heroSummary.trim(),
        status: "published",
      });

      // 2. Save About
      const aboutRes = await savePublicContentAction({
        id: aboutContent?.id,
        content_type: "about",
        title: "About Tinkers Hub",
        body: aboutBody.trim(),
        status: "published",
        metadata: {
          location: aboutLocation.trim(),
          hours: aboutHours.trim(),
          contact: aboutContact.trim(),
        },
      });

      if (!heroRes.success || !aboutRes.success) {
        setActionMsg({
          type: "error",
          text: heroRes.error || aboutRes.error || "Failed to save Overview.",
        });
      } else {
        // Update local items
        const updated = [...contentItems];
        const hIdx = updated.findIndex((c) => c.content_type === "hero");
        if (hIdx >= 0) updated[hIdx] = heroRes.data;
        else updated.push(heroRes.data);

        const aIdx = updated.findIndex((c) => c.content_type === "about");
        if (aIdx >= 0) updated[aIdx] = aboutRes.data;
        else updated.push(aboutRes.data);

        setContentItems(updated);
        setActionMsg({ type: "success", text: "Hero & About overview updated successfully." });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      {/* Top Banner & Scope */}
      <div className="p-6 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <LabelCaps className="text-primary font-bold">Executive Management</LabelCaps>
            <span className="text-outline-variant">•</span>
            <LabelCode size="sm" className="text-secondary">
              {organizationName.toUpperCase()}
            </LabelCode>
          </div>
          <HeadlineMd className="text-on-surface">Public Club Space Curation</HeadlineMd>
          <BodyMd className="text-secondary max-w-2xl">
            Control the public presentation of events, workshops, programs, announcements, and authentic photography for Tinkers Hub.
          </BodyMd>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="md" className="gap-1.5">
              <span>View Live Public Space</span>
              <span className="text-xs font-mono">↗</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded border text-body-sm flex items-center justify-between animate-fade-in ${
            actionMsg.type === "success"
              ? "bg-surface-container-high border-primary/30 text-on-surface"
              : "bg-error-container border-error/30 text-on-error-container"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button
            type="button"
            onClick={() => setActionMsg(null)}
            className="text-xs font-bold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 rounded text-body-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "events"
              ? "bg-primary text-on-primary"
              : "text-secondary hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span>Events & Workshops</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
            {events.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("announcements")}
          className={`px-4 py-2 rounded text-body-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "announcements"
              ? "bg-primary text-on-primary"
              : "text-secondary hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span>Broadcast Announcements</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
            {announcements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("programs")}
          className={`px-4 py-2 rounded text-body-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "programs"
              ? "bg-primary text-on-primary"
              : "text-secondary hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span>Program Divisions</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
            {programItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gallery")}
          className={`px-4 py-2 rounded text-body-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "gallery"
              ? "bg-primary text-on-primary"
              : "text-secondary hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span>Workshop Gallery</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
            {galleryItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("about")}
          className={`px-4 py-2 rounded text-body-sm font-semibold transition-colors ${
            activeTab === "about"
              ? "bg-primary text-on-primary"
              : "text-secondary hover:text-on-surface hover:bg-surface-container"
          }`}
        >
          <span>Hero & About Manifesto</span>
        </button>
      </div>

      {/* TAB 1: Events & Workshops */}
      {activeTab === "events" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <HeadlineMd>Public Events & Symposiums</HeadlineMd>
              <BodySm className="text-secondary">
                Configure published workshops, technical agendas, and public archive listings.
              </BodySm>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedEventToEdit(null);
                setEventDrawerOpen(true);
              }}
            >
              + Create Event Directive
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center gap-3">
              <LabelCaps>No Public Events Formatted</LabelCaps>
              <BodyMd className="text-secondary max-w-sm">
                No events currently configured for public exposure. Create an event directive to broadcast workshops.
              </BodyMd>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-5 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1.5 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge
                        variant={
                          ev.status === "published"
                            ? "active"
                            : ev.status === "archived"
                            ? "group"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {ev.status.toUpperCase()}
                      </StatusBadge>
                      <span className="text-outline-variant">•</span>
                      <LabelCode size="sm" className="text-secondary">
                        {new Date(ev.starts_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </LabelCode>
                      {ev.location && (
                        <>
                          <span className="text-outline-variant">•</span>
                          <span className="text-xs text-secondary truncate max-w-xs">
                            📍 {ev.location}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="font-sans font-bold text-headline-sm text-on-surface">
                      {ev.title}
                    </h4>
                    {ev.abstract && (
                      <p className="text-body-sm text-secondary line-clamp-2">{ev.abstract}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Live Preview Button */}
                    {ev.status === "published" || ev.status === "archived" ? (
                      <Link href={`/events/${ev.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" title="Preview public event page">
                          Preview ↗
                        </Button>
                      </Link>
                    ) : null}

                    {/* Status Toggle Buttons */}
                    {ev.status === "draft" && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isPending}
                        onClick={() => handleEventStatusChange(ev.id, "published")}
                      >
                        Publish Now
                      </Button>
                    )}

                    {ev.status === "published" && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={isPending}
                          onClick={() => handleEventStatusChange(ev.id, "archived")}
                          title="Move to public historical archive"
                        >
                          Archive
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={isPending}
                          onClick={() => handleEventStatusChange(ev.id, "draft")}
                          title="Unpublish back to private draft"
                        >
                          Unpublish
                        </Button>
                      </>
                    )}

                    {ev.status === "archived" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={isPending}
                        onClick={() => handleEventStatusChange(ev.id, "published")}
                      >
                        Restore to Active
                      </Button>
                    )}

                    {/* Edit Drawer Trigger */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEventToEdit(ev);
                        setEventDrawerOpen(true);
                      }}
                    >
                      Edit
                    </Button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 text-secondary hover:text-error text-xs font-mono transition-colors"
                      title="Delete event"
                      aria-label={`Delete event ${ev.title}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Announcements */}
      {activeTab === "announcements" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <HeadlineMd>Public Broadcast Announcements</HeadlineMd>
              <BodySm className="text-secondary">
                Broadcast official club updates, call for registrations, and institutional alerts.
              </BodySm>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedAnnToEdit(null);
                setAnnouncementModalOpen(true);
              }}
            >
              + New Broadcast
            </Button>
          </div>

          {announcements.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center gap-3">
              <LabelCaps>No Announcements</LabelCaps>
              <BodyMd className="text-secondary max-w-sm">
                No active announcements found. Create a broadcast to display on the public home ticker.
              </BodyMd>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={ann.is_public ? "active" : "neutral"} size="sm">
                        {ann.is_public ? "PUBLIC TICKER" : "INTERNAL ONLY"}
                      </StatusBadge>
                      <span className="text-outline-variant">•</span>
                      <LabelCode size="sm" className="text-secondary">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </LabelCode>
                    </div>
                    <h4 className="font-sans font-bold text-headline-sm text-on-surface">
                      {ann.title}
                    </h4>
                    <p className="text-body-sm text-secondary line-clamp-2">{ann.content}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAnnToEdit(ann);
                        setAnnouncementModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-2 text-secondary hover:text-error text-xs font-mono transition-colors"
                      title="Delete announcement"
                      aria-label={`Delete announcement ${ann.title}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Program Divisions */}
      {activeTab === "programs" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <HeadlineMd>Program Divisions & Tracks</HeadlineMd>
              <BodySm className="text-secondary">
                Curate the public descriptions for Tinkers Hub core engineering branches.
              </BodySm>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedProgramToEdit(null);
                setProgramModalOpen(true);
              }}
            >
              + Add Program Division
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programItems.map((prog) => (
              <div
                key={prog.id}
                className="p-5 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col justify-between gap-4 shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <LabelCode size="sm" className="text-primary font-bold">
                      {(prog.metadata as any)?.badge || "PROGRAM DIVISION"}
                    </LabelCode>
                    <StatusBadge variant={prog.status === "published" ? "active" : "neutral"} size="sm">
                      {prog.status.toUpperCase()}
                    </StatusBadge>
                  </div>
                  <h4 className="font-sans font-bold text-headline-sm text-on-surface">
                    {prog.title}
                  </h4>
                  <p className="text-body-sm text-secondary">{prog.summary}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProgramToEdit(prog);
                      setProgramModalOpen(true);
                    }}
                  >
                    Edit Description
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDeleteContent(prog.id)}
                    className="p-1.5 text-secondary hover:text-error text-xs font-mono"
                    aria-label={`Delete program ${prog.title}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Workshop Gallery */}
      {activeTab === "gallery" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <HeadlineMd>Authentic Workshop Photography</HeadlineMd>
              <BodySm className="text-secondary">
                Documentary photos of students designing, soldering, prototyping, and testing.
              </BodySm>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSelectedPhotoToEdit(null);
                setGalleryModalOpen(true);
              }}
            >
              + Add Workshop Photo
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((photo) => (
              <div
                key={photo.id}
                className="rounded-lg bg-surface-container-lowest border border-outline-variant overflow-hidden flex flex-col shadow-sm"
              >
                <div className="relative h-44 w-full bg-surface-container-low overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.media_url || ""}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/60 text-white backdrop-blur-sm">
                      {(photo.metadata as any)?.year || "2026"}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                  <div>
                    <LabelCode size="sm" className="text-primary font-bold">
                      {(photo.metadata as any)?.tag || "ENGINEERING"}
                    </LabelCode>
                    <h5 className="font-sans font-bold text-body-md text-on-surface line-clamp-1">
                      {photo.title}
                    </h5>
                    {photo.summary && (
                      <p className="text-body-sm text-secondary line-clamp-2 mt-1">
                        {photo.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPhotoToEdit(photo);
                        setGalleryModalOpen(true);
                      }}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Edit Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteContent(photo.id)}
                      className="text-xs text-secondary hover:text-error font-mono p-1"
                      aria-label={`Delete photo ${photo.title}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Hero & About Manifesto */}
      {activeTab === "about" && (
        <form onSubmit={handleSaveAboutHero} className="p-6 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col gap-6">
          <div className="border-b border-outline-variant pb-4">
            <HeadlineMd>Public Hero & About Manifesto</HeadlineMd>
            <BodySm className="text-secondary">
              Configure the primary institutional mission, foundational philosophy, and makerspace coordinates.
            </BodySm>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="hero-title">
                Homepage Hero Headline
              </label>
              <textarea
                id="hero-title"
                rows={2}
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-md focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="hero-summary">
                Sub-Headline & Executive Mission
              </label>
              <textarea
                id="hero-summary"
                rows={3}
                value={heroSummary}
                onChange={(e) => setHeroSummary(e.target.value)}
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant">
              <label className="text-label-caps text-secondary font-semibold" htmlFor="about-body">
                Foundational Manifesto & Origin
              </label>
              <textarea
                id="about-body"
                rows={4}
                value={aboutBody}
                onChange={(e) => setAboutBody(e.target.value)}
                className="w-full p-2.5 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-outline-variant">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-secondary font-semibold" htmlFor="about-loc">
                  Physical Lab Coordinates
                </label>
                <input
                  id="about-loc"
                  type="text"
                  value={aboutLocation}
                  onChange={(e) => setAboutLocation(e.target.value)}
                  className="w-full p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-secondary font-semibold" htmlFor="about-hours">
                  Open Workbench Hours
                </label>
                <input
                  id="about-hours"
                  type="text"
                  value={aboutHours}
                  onChange={(e) => setAboutHours(e.target.value)}
                  className="w-full p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-caps text-secondary font-semibold" htmlFor="about-contact">
                  Institutional Contact
                </label>
                <input
                  id="about-contact"
                  type="text"
                  value={aboutContact}
                  onChange={(e) => setAboutContact(e.target.value)}
                  className="w-full p-2 rounded border border-outline-variant bg-background text-on-surface text-body-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant flex items-center justify-end">
            <Button type="submit" variant="primary" size="md" isLoading={isPending}>
              Save Overview & Manifesto
            </Button>
          </div>
        </form>
      )}

      {/* Modals & Drawers with focus traps */}
      <EventDrawer
        isOpen={eventDrawerOpen}
        onClose={() => setEventDrawerOpen(false)}
        eventToEdit={selectedEventToEdit}
        onSaved={(saved) => {
          const idx = events.findIndex((e) => e.id === saved.id);
          if (idx >= 0) {
            const copy = [...events];
            copy[idx] = saved;
            setEvents(copy);
          } else {
            setEvents([saved, ...events]);
          }
          setActionMsg({ type: "success", text: `Event '${saved.title}' saved successfully.` });
        }}
      />

      <AnnouncementModal
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        announcementToEdit={selectedAnnToEdit}
        onSaved={(saved) => {
          const idx = announcements.findIndex((a) => a.id === saved.id);
          if (idx >= 0) {
            const copy = [...announcements];
            copy[idx] = saved;
            setAnnouncements(copy);
          } else {
            setAnnouncements([saved, ...announcements]);
          }
          setActionMsg({ type: "success", text: "Broadcast announcement posted." });
        }}
      />

      <ProgramModal
        isOpen={programModalOpen}
        onClose={() => setProgramModalOpen(false)}
        programToEdit={selectedProgramToEdit}
        onSaved={(saved) => {
          const idx = contentItems.findIndex((c) => c.id === saved.id);
          if (idx >= 0) {
            const copy = [...contentItems];
            copy[idx] = saved;
            setContentItems(copy);
          } else {
            setContentItems([...contentItems, saved]);
          }
          setActionMsg({ type: "success", text: "Program division updated." });
        }}
      />

      <GalleryModal
        isOpen={galleryModalOpen}
        onClose={() => setGalleryModalOpen(false)}
        photoToEdit={selectedPhotoToEdit}
        onSaved={(saved) => {
          const idx = contentItems.findIndex((c) => c.id === saved.id);
          if (idx >= 0) {
            const copy = [...contentItems];
            copy[idx] = saved;
            setContentItems(copy);
          } else {
            setContentItems([...contentItems, saved]);
          }
          setActionMsg({ type: "success", text: "Photo added to gallery." });
        }}
      />
    </div>
  );
}
