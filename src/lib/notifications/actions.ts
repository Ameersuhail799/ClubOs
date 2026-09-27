"use server";

import { revalidatePath } from "next/cache";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getWhatChangedFeed,
} from "./service";
import type {
  NotificationResult,
  NotificationWithDetails,
  WhatChangedItem,
  NotificationRow,
} from "./types";

/**
 * Server action to fetch current user's notifications.
 */
export async function getNotificationsAction(
  filter: "all" | "unread" = "all"
): Promise<NotificationResult<NotificationWithDetails[]>> {
  return await getNotifications(undefined, { status: filter });
}

/**
 * Server action to fetch unread notification count.
 */
export async function getUnreadNotificationCountAction(): Promise<NotificationResult<number>> {
  return await getUnreadNotificationCount();
}

/**
 * Server action to mark a specific notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<NotificationResult<NotificationRow>> {
  const result = await markNotificationAsRead(notificationId);
  if (result.success) {
    revalidatePath("/workspace/notifications");
    revalidatePath("/workspace");
  }
  return result;
}

/**
 * Server action to mark all notifications as read for current user.
 */
export async function markAllNotificationsReadAction(): Promise<
  NotificationResult<{ updatedCount: number }>
> {
  const result = await markAllNotificationsAsRead();
  if (result.success) {
    revalidatePath("/workspace/notifications");
    revalidatePath("/workspace");
  }
  return result;
}

/**
 * Server action to fetch role-specific What Changed feed.
 */
export async function getWhatChangedFeedAction(
  limit: number = 30
): Promise<NotificationResult<WhatChangedItem[]>> {
  return await getWhatChangedFeed(undefined, { limit });
}
