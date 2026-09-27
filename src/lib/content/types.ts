import type { Database } from "@/types/database.types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
export type EventStatus = Database["public"]["Enums"]["event_status"];

export type AnnouncementRow = Database["public"]["Tables"]["announcements"]["Row"];
export type AnnouncementInsert = Database["public"]["Tables"]["announcements"]["Insert"];
export type AnnouncementUpdate = Database["public"]["Tables"]["announcements"]["Update"];

export type PublicContentRow = Database["public"]["Tables"]["public_content"]["Row"];
export type PublicContentInsert = Database["public"]["Tables"]["public_content"]["Insert"];
export type PublicContentUpdate = Database["public"]["Tables"]["public_content"]["Update"];

export type PublicContentType = "hero" | "about" | "program" | "gallery";
export type ContentStatus = "draft" | "published" | "archived";

export interface EventCreateInput {
  title: string;
  slug?: string;
  abstract?: string;
  content?: string;
  banner_url?: string;
  location?: string;
  starts_at: string;
  ends_at: string;
  is_public?: boolean;
  status?: EventStatus;
  agenda?: any;
  prerequisites?: any;
}

export interface EventUpdateInput extends Partial<EventCreateInput> {
  id: string;
}

export interface AnnouncementInput {
  id?: string;
  title: string;
  content: string;
  is_public?: boolean;
  target_group_id?: string | null;
  published_at?: string | null;
}

export interface PublicContentInput {
  id?: string;
  content_type: PublicContentType;
  title: string;
  slug?: string | null;
  summary?: string | null;
  body?: string | null;
  media_url?: string | null;
  metadata?: Record<string, any>;
  sort_order?: number;
  status?: ContentStatus;
}

export interface PublicAssetUploadResult {
  url: string;
  path: string;
  filename: string;
  fileSize: number;
  mimeType: string;
}

export interface ContentActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
