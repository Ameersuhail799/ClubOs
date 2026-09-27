"use server";

/**
 * ClubOS — WhatsApp Handoff Server Actions
 * Build 02.15
 */

import {
  getWhatsAppHandoffContext,
  prepareWhatsAppHandoffUrl,
} from "./service";
import type {
  WhatsAppHandoffContext,
  PrepareWhatsAppUrlInput,
  PrepareWhatsAppUrlResult,
  WhatsAppResult,
} from "./types";

/**
 * Server Action: Loads the authorized WhatsApp handoff context for a task.
 */
export async function getWhatsAppHandoffContextAction(
  taskId: string
): Promise<WhatsAppResult<WhatsAppHandoffContext>> {
  try {
    return await getWhatsAppHandoffContext(taskId);
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "An unexpected error occurred while loading WhatsApp handoff context.",
      code: "server_error",
    };
  }
}

/**
 * Server Action: Validates recipient, sanitizes user-edited message, and returns the safe click-to-chat URL.
 */
export async function prepareWhatsAppUrlAction(
  input: PrepareWhatsAppUrlInput
): Promise<WhatsAppResult<PrepareWhatsAppUrlResult>> {
  try {
    return await prepareWhatsAppHandoffUrl(input);
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "An unexpected error occurred while generating the WhatsApp handoff link.",
      code: "server_error",
    };
  }
}
