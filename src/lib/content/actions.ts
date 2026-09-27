"use server";

import { revalidatePath } from "next/cache";
import {
  createEvent,
  updateEvent,
  setEventStatus,
  deleteEvent,
  saveAnnouncement,
  deleteAnnouncement,
  savePublicContent,
  deletePublicContent,
  uploadPublicAsset,
} from "./service";
import type {
  EventCreateInput,
  EventUpdateInput,
  EventStatus,
  AnnouncementInput,
  PublicContentInput,
  ContentActionResult,
} from "./types";

/**
 * Creates a new event.
 */
export async function createEventAction(formData: FormData): Promise<ContentActionResult> {
  try {
    const title = formData.get("title") as string;
    const slug = (formData.get("slug") as string) || undefined;
    const abstract = (formData.get("abstract") as string) || undefined;
    const content = (formData.get("content") as string) || undefined;
    const banner_url = (formData.get("banner_url") as string) || undefined;
    const location = (formData.get("location") as string) || undefined;
    const starts_at = formData.get("starts_at") as string;
    const ends_at = formData.get("ends_at") as string;
    const status = (formData.get("status") as EventStatus) || "draft";

    let agenda: any = null;
    const rawAgenda = formData.get("agenda") as string;
    if (rawAgenda) {
      try {
        agenda = JSON.parse(rawAgenda);
      } catch {
        agenda = [{ item: rawAgenda }];
      }
    }

    let prerequisites: any = null;
    const rawPrereqs = formData.get("prerequisites") as string;
    if (rawPrereqs) {
      try {
        prerequisites = JSON.parse(rawPrereqs);
      } catch {
        prerequisites = [{ item: rawPrereqs }];
      }
    }

    const input: EventCreateInput = {
      title,
      slug,
      abstract,
      content,
      banner_url,
      location,
      starts_at,
      ends_at,
      status,
      agenda,
      prerequisites,
    };

    const newEvent = await createEvent(input);

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/workspace/admin/content");

    return { success: true, data: newEvent };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create event." };
  }
}

/**
 * Updates an existing event.
 */
export async function updateEventAction(formData: FormData): Promise<ContentActionResult> {
  try {
    const id = formData.get("id") as string;
    if (!id) return { success: false, error: "Event ID is required." };

    const title = formData.get("title") as string;
    const slug = (formData.get("slug") as string) || undefined;
    const abstract = (formData.get("abstract") as string) || undefined;
    const content = (formData.get("content") as string) || undefined;
    const banner_url = (formData.get("banner_url") as string) || undefined;
    const location = (formData.get("location") as string) || undefined;
    const starts_at = (formData.get("starts_at") as string) || undefined;
    const ends_at = (formData.get("ends_at") as string) || undefined;
    const status = (formData.get("status") as EventStatus) || undefined;

    let agenda: any = undefined;
    const rawAgenda = formData.get("agenda") as string;
    if (rawAgenda !== null && rawAgenda !== undefined) {
      try {
        agenda = JSON.parse(rawAgenda);
      } catch {
        agenda = [{ item: rawAgenda }];
      }
    }

    let prerequisites: any = undefined;
    const rawPrereqs = formData.get("prerequisites") as string;
    if (rawPrereqs !== null && rawPrereqs !== undefined) {
      try {
        prerequisites = JSON.parse(rawPrereqs);
      } catch {
        prerequisites = [{ item: rawPrereqs }];
      }
    }

    const input: EventUpdateInput = {
      id,
      title,
      slug,
      abstract,
      content,
      banner_url,
      location,
      starts_at,
      ends_at,
      status,
      agenda,
      prerequisites,
    };

    const updated = await updateEvent(input);

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/events/${updated.slug}`);
    revalidatePath("/workspace/admin/content");

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update event." };
  }
}

/**
 * Transitions an event's publication status.
 */
export async function setEventStatusAction(
  eventId: string,
  newStatus: EventStatus
): Promise<ContentActionResult> {
  try {
    const updated = await setEventStatus(eventId, newStatus);

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/events/${updated.slug}`);
    revalidatePath("/workspace/admin/content");

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to transition event status." };
  }
}

/**
 * Deletes an event.
 */
export async function deleteEventAction(eventId: string): Promise<ContentActionResult> {
  try {
    await deleteEvent(eventId);

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/workspace/admin/content");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete event." };
  }
}

/**
 * Saves (creates or updates) an announcement.
 */
export async function saveAnnouncementAction(formData: FormData): Promise<ContentActionResult> {
  try {
    const id = (formData.get("id") as string) || undefined;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const is_public = formData.get("is_public") === "true";
    const target_group_id = (formData.get("target_group_id") as string) || null;

    const input: AnnouncementInput = {
      id,
      title,
      content,
      is_public,
      target_group_id,
    };

    const res = await saveAnnouncement(input);

    revalidatePath("/");
    revalidatePath("/workspace/admin/content");

    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save announcement." };
  }
}

/**
 * Deletes an announcement.
 */
export async function deleteAnnouncementAction(announcementId: string): Promise<ContentActionResult> {
  try {
    await deleteAnnouncement(announcementId);

    revalidatePath("/");
    revalidatePath("/workspace/admin/content");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete announcement." };
  }
}

/**
 * Saves a public content item (Hero, About, Program, Gallery).
 */
export async function savePublicContentAction(
  input: PublicContentInput
): Promise<ContentActionResult> {
  try {
    const res = await savePublicContent(input);

    revalidatePath("/");
    revalidatePath("/workspace/admin/content");

    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save content item." };
  }
}

/**
 * Deletes a public content item.
 */
export async function deletePublicContentAction(contentId: string): Promise<ContentActionResult> {
  try {
    await deletePublicContent(contentId);

    revalidatePath("/");
    revalidatePath("/workspace/admin/content");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete content item." };
  }
}

/**
 * Uploads a public media asset.
 */
export async function uploadPublicAssetAction(formData: FormData): Promise<ContentActionResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided for upload." };
    }

    const res = await uploadPublicAsset(file);
    return { success: true, data: res };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload public asset." };
  }
}
