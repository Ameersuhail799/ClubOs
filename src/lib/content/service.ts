import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext } from "@/lib/auth/context";
import type {
  EventRow,
  EventCreateInput,
  EventUpdateInput,
  EventUpdate,
  EventStatus,
  AnnouncementRow,
  AnnouncementInput,
  PublicContentRow,
  PublicContentInput,
  PublicContentType,
  PublicAssetUploadResult,
} from "./types";

/**
 * Helper to slugify a string safely
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================================================
// PUBLIC CONSUMPTION (Safe, zero-leak queries)
// ============================================================================

/**
 * Resolves the primary organization for public visitors (defaults to first active org if no slug specified).
 */
export async function getPublicOrganization(orgSlug?: string) {
  const supabase = await createClient();
  let query = supabase.from("organizations").select("id, name, slug");
  if (orgSlug) {
    query = query.eq("slug", orgSlug);
  }
  const { data } = await query.limit(1).maybeSingle();
  return data;
}

/**
 * Retrieves public homepage data.
 * Pure server-side query returning ONLY published public records.
 */
export async function getPublicHomeData(orgSlug?: string) {
  const org = await getPublicOrganization(orgSlug);
  if (!org) {
    return {
      organization: null,
      hero: null,
      upcomingEvents: [],
      announcements: [],
      programs: [],
      gallery: [],
      about: null,
    };
  }

  const supabase = await createClient();

  // 1. Fetch Hero Content
  const { data: heroRows } = await supabase
    .from("public_content")
    .select("*")
    .eq("organization_id", org.id)
    .eq("content_type", "hero")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(1);

  // 2. Fetch Upcoming Published Events
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title, slug, abstract, location, starts_at, ends_at, banner_url, status")
    .eq("organization_id", org.id)
    .eq("is_public", true)
    .eq("status", "published")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(4);

  // 3. Fetch Published Announcements
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, content, published_at, created_at")
    .eq("organization_id", org.id)
    .eq("is_public", true)
    .order("published_at", { ascending: false })
    .limit(3);

  // 4. Fetch Published Programs / Divisions
  const { data: programs } = await supabase
    .from("public_content")
    .select("*")
    .eq("organization_id", org.id)
    .eq("content_type", "program")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  // 5. Fetch Published Gallery items
  const { data: gallery } = await supabase
    .from("public_content")
    .select("*")
    .eq("organization_id", org.id)
    .eq("content_type", "gallery")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .limit(6);

  // 6. Fetch About section
  const { data: aboutRows } = await supabase
    .from("public_content")
    .select("*")
    .eq("organization_id", org.id)
    .eq("content_type", "about")
    .eq("status", "published")
    .limit(1);

  return {
    organization: org,
    hero: heroRows?.[0] || null,
    upcomingEvents: upcomingEvents || [],
    announcements: announcements || [],
    programs: programs || [],
    gallery: gallery || [],
    about: aboutRows?.[0] || null,
  };
}

/**
 * Retrieves public events with filtering for Upcoming vs Past Archive.
 */
export async function getPublicEvents(options?: {
  orgSlug?: string;
  tab?: "upcoming" | "archive" | "all";
  search?: string;
}) {
  const org = await getPublicOrganization(options?.orgSlug);
  if (!org) return { organization: null, events: [] };

  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("events")
    .select("id, title, slug, abstract, location, starts_at, ends_at, banner_url, status, is_public")
    .eq("organization_id", org.id)
    .eq("is_public", true)
    .in("status", ["published", "archived"]);

  if (options?.tab === "upcoming") {
    query = query.eq("status", "published").gte("ends_at", now).order("starts_at", { ascending: true });
  } else if (options?.tab === "archive") {
    query = query.or(`status.eq.archived,ends_at.lt.${now}`).order("ends_at", { ascending: false });
  } else {
    query = query.order("starts_at", { ascending: false });
  }

  if (options?.search && options.search.trim()) {
    query = query.ilike("title", `%${options.search.trim()}%`);
  }

  const { data: events, error } = await query;
  if (error) {
    console.error("Error fetching public events:", error.message);
    return { organization: org, events: [] };
  }

  return { organization: org, events: events || [] };
}

/**
 * Retrieves a single published or archived event by its public slug.
 * Zero private fields exposed.
 */
export async function getPublicEventBySlug(slug: string, orgSlug?: string) {
  const org = await getPublicOrganization(orgSlug);
  if (!org) return null;

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, slug, abstract, content, location, starts_at, ends_at, banner_url, status, agenda, prerequisites")
    .eq("organization_id", org.id)
    .eq("slug", slug)
    .eq("is_public", true)
    .in("status", ["published", "archived"])
    .maybeSingle();

  if (error || !event) {
    return null;
  }

  return {
    ...event,
    organization: org,
  };
}

// ============================================================================
// MAIN HEAD MANAGEMENT MUTATIONS & QUERIES
// ============================================================================

/**
 * Helper to ensure caller is authenticated Main Head of the organization.
 */
async function assertMainHeadContext() {
  const context = await getCurrentOrganizationContext();
  if (!context || !context.user || context.status !== "active") {
    throw new Error("Authentication required.");
  }
  if (context.role !== "main_head") {
    throw new Error("Forbidden: Main Head executive authority required.");
  }
  if (!context.organization) {
    throw new Error("No active organization found in context.");
  }
  return context;
}

/**
 * Retrieves all events for Main Head management.
 */
export async function getMainHeadEvents(): Promise<EventRow[]> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("events")
    .select("*")
    .eq("organization_id", context.organization!.id)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Creates a new event directive (starts as draft or published).
 */
export async function createEvent(input: EventCreateInput): Promise<EventRow> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  if (!input.title || input.title.trim().length < 2) {
    throw new Error("Event title is required (minimum 2 characters).");
  }
  if (!input.starts_at || !input.ends_at) {
    throw new Error("Start and End times are required.");
  }
  if (new Date(input.ends_at).getTime() < new Date(input.starts_at).getTime()) {
    throw new Error("Event end time cannot be before start time.");
  }

  const generatedSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  const status: EventStatus = input.status || "draft";
  const is_public = status === "published" || status === "archived";

  // Check unique slug within organization
  const { data: existing } = await adminClient
    .from("events")
    .select("id")
    .eq("organization_id", context.organization!.id)
    .eq("slug", generatedSlug)
    .maybeSingle();

  const finalSlug = existing ? `${generatedSlug}-${Date.now().toString(36)}` : generatedSlug;

  const { data: newEvent, error } = await adminClient
    .from("events")
    .insert({
      organization_id: context.organization!.id,
      title: input.title.trim(),
      slug: finalSlug,
      abstract: input.abstract?.trim() || null,
      content: input.content?.trim() || null,
      banner_url: input.banner_url?.trim() || null,
      location: input.location?.trim() || null,
      starts_at: new Date(input.starts_at).toISOString(),
      ends_at: new Date(input.ends_at).toISOString(),
      status,
      is_public,
      agenda: input.agenda || null,
      prerequisites: input.prerequisites || null,
      created_by: context.user.id,
    })
    .select()
    .single();

  if (error || !newEvent) {
    throw new Error(error?.message || "Failed to create event.");
  }

  // Audit log
  await adminClient.from("activity_records").insert({
    organization_id: context.organization!.id,
    actor_id: context.user.id,
    action: "event_created",
    entity_type: "event",
    entity_id: newEvent.id,
    new_state: { title: newEvent.title, slug: newEvent.slug, status: newEvent.status },
  });

  return newEvent;
}

/**
 * Updates an event.
 */
export async function updateEvent(input: EventUpdateInput): Promise<EventRow> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const { data: existing, error: fetchErr } = await adminClient
    .from("events")
    .select("*")
    .eq("id", input.id)
    .eq("organization_id", context.organization!.id)
    .single();

  if (fetchErr || !existing) {
    throw new Error("Event not found or belongs to another organization.");
  }

  const updates: EventUpdate = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.slug !== undefined) updates.slug = slugify(input.slug);
  if (input.abstract !== undefined) updates.abstract = input.abstract.trim();
  if (input.content !== undefined) updates.content = input.content.trim();
  if (input.banner_url !== undefined) updates.banner_url = input.banner_url.trim();
  if (input.location !== undefined) updates.location = input.location.trim();
  if (input.starts_at !== undefined) updates.starts_at = new Date(input.starts_at).toISOString();
  if (input.ends_at !== undefined) updates.ends_at = new Date(input.ends_at).toISOString();
  if (input.status !== undefined) {
    updates.status = input.status;
    updates.is_public = input.status === "published" || input.status === "archived";
  }
  if (input.agenda !== undefined) updates.agenda = input.agenda;
  if (input.prerequisites !== undefined) updates.prerequisites = input.prerequisites;

  const { data: updated, error: updateErr } = await adminClient
    .from("events")
    .update(updates)
    .eq("id", input.id)
    .eq("organization_id", context.organization!.id)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(updateErr?.message || "Failed to update event.");
  }

  // Audit log
  await adminClient.from("activity_records").insert({
    organization_id: context.organization!.id,
    actor_id: context.user.id,
    action: "event_updated",
    entity_type: "event",
    entity_id: updated.id,
    previous_state: { title: existing.title, status: existing.status },
    new_state: { title: updated.title, status: updated.status },
  });

  return updated;
}

/**
 * Sets an event's publication status.
 */
export async function setEventStatus(eventId: string, newStatus: EventStatus): Promise<EventRow> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const isPublic = newStatus === "published" || newStatus === "archived";

  const { data: updated, error } = await adminClient
    .from("events")
    .update({
      status: newStatus,
      is_public: isPublic,
    })
    .eq("id", eventId)
    .eq("organization_id", context.organization!.id)
    .select()
    .single();

  if (error || !updated) {
    throw new Error(error?.message || "Failed to update event status.");
  }

  await adminClient.from("activity_records").insert({
    organization_id: context.organization!.id,
    actor_id: context.user.id,
    action: `event_${newStatus}`,
    entity_type: "event",
    entity_id: updated.id,
    new_state: { status: newStatus, is_public: isPublic },
  });

  return updated;
}

/**
 * Deletes an event.
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", context.organization!.id);

  if (error) throw new Error(error.message);

  await adminClient.from("activity_records").insert({
    organization_id: context.organization!.id,
    actor_id: context.user.id,
    action: "event_deleted",
    entity_type: "event",
    entity_id: eventId,
  });

  return true;
}

/**
 * Retrieves all announcements for Main Head management.
 */
export async function getMainHeadAnnouncements(): Promise<AnnouncementRow[]> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("announcements")
    .select("*")
    .eq("organization_id", context.organization!.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Creates or updates a public broadcast announcement.
 */
export async function saveAnnouncement(input: AnnouncementInput): Promise<AnnouncementRow> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  if (!input.title || input.title.trim().length < 2) {
    throw new Error("Announcement title is required.");
  }
  if (!input.content || input.content.trim().length < 2) {
    throw new Error("Announcement content is required.");
  }

  const isPublic = input.is_public !== undefined ? input.is_public : true;
  const publishedAt = isPublic ? input.published_at || new Date().toISOString() : null;

  if (input.id) {
    const { data: updated, error } = await adminClient
      .from("announcements")
      .update({
        title: input.title.trim(),
        content: input.content.trim(),
        is_public: isPublic,
        target_group_id: input.target_group_id || null,
        published_at: publishedAt,
      })
      .eq("id", input.id)
      .eq("organization_id", context.organization!.id)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || "Failed to update announcement.");
    return updated;
  }

  const { data: created, error } = await adminClient
    .from("announcements")
    .insert({
      organization_id: context.organization!.id,
      title: input.title.trim(),
      content: input.content.trim(),
      is_public: isPublic,
      target_group_id: input.target_group_id || null,
      published_at: publishedAt,
      created_by: context.user.id,
    })
    .select()
    .single();

  if (error || !created) throw new Error(error?.message || "Failed to create announcement.");
  return created;
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", context.organization!.id);

  if (error) throw new Error(error.message);
  return true;
}

/**
 * Retrieves public content items for Main Head management.
 */
export async function getMainHeadPublicContent(type?: PublicContentType): Promise<PublicContentRow[]> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  let query = adminClient
    .from("public_content")
    .select("*")
    .eq("organization_id", context.organization!.id);

  if (type) {
    query = query.eq("content_type", type);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Saves (creates or updates) a public content item (Hero, About, Program, Gallery).
 */
export async function savePublicContent(input: PublicContentInput): Promise<PublicContentRow> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  if (!input.title || input.title.trim().length < 2) {
    throw new Error("Title is required (minimum 2 characters).");
  }

  if (input.id) {
    const { data: updated, error } = await adminClient
      .from("public_content")
      .update({
        content_type: input.content_type,
        title: input.title.trim(),
        slug: input.slug ? slugify(input.slug) : null,
        summary: input.summary?.trim() || null,
        body: input.body?.trim() || null,
        media_url: input.media_url?.trim() || null,
        metadata: input.metadata || {},
        sort_order: input.sort_order ?? 0,
        status: input.status || "published",
      })
      .eq("id", input.id)
      .eq("organization_id", context.organization!.id)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || "Failed to update content item.");
    return updated;
  }

  const { data: created, error } = await adminClient
    .from("public_content")
    .insert({
      organization_id: context.organization!.id,
      content_type: input.content_type,
      title: input.title.trim(),
      slug: input.slug ? slugify(input.slug) : null,
      summary: input.summary?.trim() || null,
      body: input.body?.trim() || null,
      media_url: input.media_url?.trim() || null,
      metadata: input.metadata || {},
      sort_order: input.sort_order ?? 0,
      status: input.status || "published",
      created_by: context.user.id,
    })
    .select()
    .single();

  if (error || !created) throw new Error(error?.message || "Failed to create content item.");
  return created;
}

/**
 * Deletes a public content item.
 */
export async function deletePublicContent(contentId: string): Promise<boolean> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("public_content")
    .delete()
    .eq("id", contentId)
    .eq("organization_id", context.organization!.id);

  if (error) throw new Error(error.message);
  return true;
}

/**
 * Securely uploads a public image asset into the clubos-public-assets bucket.
 * Pure images only: PNG, JPEG, WEBP, SVG. Max 10MB.
 */
export async function uploadPublicAsset(file: File): Promise<PublicAssetUploadResult> {
  const context = await assertMainHeadContext();
  const adminClient = createAdminClient();

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Public media must be smaller than 10 MB.");
  }

  const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!ALLOWED_MIMES.includes(file.type.toLowerCase())) {
    throw new Error("Invalid format. Only PNG, JPEG, WEBP, and SVG images are allowed.");
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "") || "public_asset.png";
  const ext = cleanName.split(".").pop()?.toLowerCase();
  if (ext && ["exe", "bat", "sh", "js", "html", "php"].includes(ext)) {
    throw new Error("Executable or code file types are forbidden.");
  }

  const storagePath = `${context.organization!.id}/public/${Date.now()}_${cleanName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await adminClient.storage
    .from("clubos-public-assets")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(uploadErr.message || "Failed to upload public asset.");
  }

  const { data: publicUrlData } = adminClient.storage
    .from("clubos-public-assets")
    .getPublicUrl(storagePath);

  return {
    url: publicUrlData.publicUrl,
    path: storagePath,
    filename: cleanName,
    fileSize: file.size,
    mimeType: file.type,
  };
}
