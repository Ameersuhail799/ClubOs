/**
 * ClubOS — WhatsApp Handoff Domain Types
 * Build 02.15
 */

export type WhatsAppIntent =
  | "general"
  | "clarification"
  | "progress_check"
  | "reminder"
  | "review_request"
  | "delegation";

export type WhatsAppRecipientRole = "group_head" | "assignee" | "creator" | "collaborator";

export interface WhatsAppRecipient {
  userId: string;
  fullName: string;
  role: WhatsAppRecipientRole;
  roleLabel: string;
  isPhoneAvailable: boolean;
  maskedPhone: string | null;
}

export interface WhatsAppTaskReference {
  id: string;
  taskCode: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  primaryGroupName: string | null;
}

export interface WhatsAppHandoffContext {
  task: WhatsAppTaskReference;
  recipients: WhatsAppRecipient[];
  defaultRecipientId: string | null;
  suggestedMessages: Record<WhatsAppIntent, string>;
}

export interface PrepareWhatsAppUrlInput {
  taskId: string;
  recipientId: string;
  message: string;
  intent?: WhatsAppIntent;
}

export interface PrepareWhatsAppUrlResult {
  whatsappUrl: string;
  recipientName: string;
  taskCode: string;
}

export type WhatsAppServiceError =
  | "unauthorized"
  | "task_not_found"
  | "recipient_not_found"
  | "recipient_inactive"
  | "phone_not_available"
  | "invalid_phone"
  | "sanitization_error"
  | "empty_message"
  | "server_error";

export type WhatsAppResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string; code: WhatsAppServiceError };
