/**
 * ClubOS — WhatsApp Handoff Message Utilities & Security Sanitization
 * Build 02.15
 */

import type { WhatsAppIntent } from "./types";

/**
 * Normalizes a phone number for the WhatsApp wa.me click-to-chat URL.
 * Strictly adheres to ITU-T E.164 international numbering standards (7-15 digits).
 * Never invents or silently transforms invalid input into an incorrect recipient.
 */
export function normalizePhoneNumber(rawPhone: string | null | undefined): {
  success: boolean;
  normalized?: string;
  error?: "phone_not_available" | "invalid_phone";
} {
  if (!rawPhone || !rawPhone.trim()) {
    return { success: false, error: "phone_not_available" };
  }

  const trimmed = rawPhone.trim();

  // Reject alphabetic characters or suspicious input
  if (/[a-zA-Z]/.test(trimmed)) {
    return { success: false, error: "invalid_phone" };
  }

  // Reject forbidden symbols
  if (/[!@#$%^&*~`|\\?<>=_{}\[\]:;"']/.test(trimmed)) {
    return { success: false, error: "invalid_phone" };
  }

  // Strip allowed formatting characters: spaces, hyphens, parentheses, dots
  let cleaned = trimmed.replace(/[\s\-\(\)\.]/g, "");

  // Strip leading international prefixes '+' or '00'
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  // Ensure only digits remain
  if (!/^\d+$/.test(cleaned)) {
    return { success: false, error: "invalid_phone" };
  }

  // Standard E.164: minimum 7 digits, maximum 15 digits
  if (cleaned.length < 7 || cleaned.length > 15) {
    return { success: false, error: "invalid_phone" };
  }

  return { success: true, normalized: cleaned };
}

/**
 * Masks a phone number to prevent full contact exposure in client inspections
 * while giving the authorized user visual reassurance that a number is present.
 * Example: "+91 98765 43210" -> "+91 ••••• ••210"
 */
export function maskPhoneNumber(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 5) return "••••";

  const prefix = digits.length > 10 ? digits.slice(0, 2) : digits.slice(0, 1);
  const suffix = digits.slice(-3);
  return `+${prefix} ••••• ••${suffix}`;
}

/**
 * Sensitive credential patterns strictly prohibited from external WhatsApp messages.
 */
const FORBIDDEN_SECRET_PATTERNS: Array<{ regex: RegExp; description: string }> = [
  // Passwords
  { regex: /(?:password|passwd|temp_password|pwd)\s*[:=]\s*\S+/i, description: "password" },
  { regex: /\bpassword\s+is\s+\S+/i, description: "password" },

  // Tokens & Keys
  { regex: /(?:access_token|refresh_token|id_token)\s*[:=]\s*\S+/i, description: "auth token" },
  { regex: /\bbearer\s+[a-zA-Z0-9_\-\.]{16,}/i, description: "bearer token" },
  { regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, description: "JWT credential" },
  { regex: /sbp_[a-zA-Z0-9]{20,}/, description: "Supabase personal token" },
  { regex: /\bservice_role\b/i, description: "Supabase service role credential" },
  { regex: /\banon_key\b/i, description: "Supabase key credential" },

  // Invitation & recovery tokens
  { regex: /(?:invite_token|invitation_token|reset_token)\s*[:=]\s*[a-zA-Z0-9_\-]+/i, description: "invitation token" },
  { regex: /(?:token|secret)\s*[:=]\s*[a-zA-Z0-9_\-]{20,}/i, description: "secret token" },

  // Database credentials & connection strings
  { regex: /postgres(?:ql)?:\/\/[^\s]+/i, description: "database connection URI" },
];

/**
 * Validates and sanitizes a WhatsApp message against credential leakage.
 */
export function sanitizeWhatsAppMessage(content: string): {
  safe: boolean;
  sanitized?: string;
  error?: string;
} {
  if (!content || !content.trim()) {
    return { safe: false, error: "Message cannot be empty." };
  }

  const trimmed = content.trim();

  // Enforce reasonable length boundary for WhatsApp URLs (max 1200 characters)
  if (trimmed.length > 1200) {
    return {
      safe: false,
      error: "Message exceeds maximum allowed length of 1200 characters.",
    };
  }

  // Scan against forbidden credential patterns
  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return {
        safe: false,
        error: `Message contains prohibited security data (${pattern.description}). Credentials and authentication tokens must never be sent externally.`,
      };
    }
  }

  return { safe: true, sanitized: trimmed };
}

/**
 * Generates an authoritative, editable WhatsApp message based on institutional task state.
 */
export function formatWhatsAppMessage({
  taskTitle,
  taskCode,
  status,
  deadline,
  intent = "general",
  recipientName,
}: {
  taskTitle: string;
  taskCode: string;
  status: string;
  deadline?: string | null;
  intent?: WhatsAppIntent;
  recipientName?: string;
}): string {
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No set deadline";

  const statusLabel = status.replace(/_/g, " ").toUpperCase();
  const greeting = recipientName ? `Hi ${recipientName}, ` : "";

  switch (intent) {
    case "clarification":
      return [
        `ClubOS — Clarification on [${taskCode}]: ${taskTitle}`,
        `Status: ${statusLabel} | Deadline: ${formattedDeadline}`,
        ``,
        `${greeting}could you please provide an update or clarification on this task?`,
        `Please post your response directly in ClubOS for the institutional record.`,
      ].join("\n");

    case "progress_check":
      return [
        `ClubOS — Progress Check: [${taskCode}] ${taskTitle}`,
        `Status: ${statusLabel} | Deadline: ${formattedDeadline}`,
        ``,
        `${greeting}checking in on your progress for this directive.`,
        `Please update your workbench or leave a task comment in ClubOS.`,
      ].join("\n");

    case "reminder":
      return [
        `ClubOS — Reminder: [${taskCode}] ${taskTitle}`,
        `Deadline: ${formattedDeadline} | Status: ${statusLabel}`,
        ``,
        `${greeting}friendly reminder regarding the upcoming deadline for this task.`,
        `Please check ClubOS for the full scope and requirements.`,
      ].join("\n");

    case "review_request":
      return [
        `ClubOS — Review Request: [${taskCode}] ${taskTitle}`,
        `Status: READY FOR REVIEW`,
        ``,
        `${greeting}this task has been submitted for review.`,
        `Please inspect the deliverables and complete the review in ClubOS.`,
      ].join("\n");

    case "delegation":
      return [
        `ClubOS — New Delegation: [${taskCode}] ${taskTitle}`,
        `Deadline: ${formattedDeadline}`,
        ``,
        `${greeting}a new task directive has been delegated to you in ClubOS.`,
        `Please review the scope and accept the task in your ClubOS workbench.`,
      ].join("\n");

    case "general":
    default:
      return [
        `ClubOS — Task: ${taskTitle}`,
        `Task: ${taskCode}`,
        `Deadline: ${formattedDeadline}`,
        `Current status: ${statusLabel}`,
        ``,
        `Please check ClubOS for the full task context and update the task there.`,
      ].join("\n");
  }
}

/**
 * Builds the official WhatsApp click-to-chat URL.
 */
export function buildWhatsAppUrl(normalizedPhone: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}
