import type { Database } from "@/types/database.types";
import type { UserRole } from "@/lib/auth/context";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type ActivityRecordRow = Database["public"]["Tables"]["activity_records"]["Row"];

export type NotificationErrorCode =
  | "unauthorized"
  | "forbidden"
  | "notification_not_found"
  | "invalid_input"
  | "cross_org_denied"
  | "internal_error";

export interface NotificationResult<T = any> {
  success?: boolean;
  data?: T | null;
  error?: string | null;
  code?: NotificationErrorCode;
  message?: string | null;
}

export interface CreateNotificationInput {
  organizationId: string;
  recipientId: string;
  actorId?: string | null;
  taskId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  dedupKey?: string;
}

export interface NotificationWithDetails {
  id: string;
  organizationId: string;
  recipientId: string;
  actorId: string | null;
  taskId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actorName?: string | null;
  actorRole?: UserRole | null;
  taskCode?: string | null;
  taskTitle?: string | null;
  targetUrl: string;
}

export interface WhatChangedItem {
  id: string;
  action: string;
  createdAt: string;
  taskId: string | null;
  taskCode?: string | null;
  taskTitle?: string | null;
  actorId: string | null;
  actorName: string;
  actorRole?: UserRole | null;
  description: string;
  details?: string | null;
  metadata?: Record<string, any> | null;
  targetUrl?: string | null;
}

export interface NotificationCenterData {
  notifications: NotificationWithDetails[];
  unreadCount: number;
}
