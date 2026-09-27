import type { UploadFileValidationResult } from "./types";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Explicit allowlist of permissible file extensions and their accepted MIME types.
 * Any extension outside this allowlist is strictly rejected.
 */
export const ALLOWED_EXTENSIONS_MAP: Record<string, string[]> = {
  // Standard document deliverables
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
  ],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/octet-stream",
  ],
  txt: ["text/plain"],

  // Image assets
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
};

/**
 * Explicit blocklist of executable and script extensions.
 */
export const FORBIDDEN_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "msi", "vbs", "ps1", "com", "scr", "pif", "dll", "so", "app",
  "js", "mjs", "cjs", "ts", "php", "py", "rb", "pl", "cgi", "html", "htm", "svg", "xml",
]);

/**
 * Sanitizes an untrusted filename to prevent path traversal and filesystem manipulation.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "attachment";
  }

  // Strip path traversal attempts and directories
  let clean = filename
    .replace(/^.*[\\\/]/, "") // Remove directory components
    .replace(/\.\.+/g, ".")   // Collapse consecutive dots
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove control characters
    .replace(/[^\w\.\-\s]/gi, "_") // Replace dangerous special characters
    .trim();

  // Remove leading/trailing dots and spaces
  clean = clean.replace(/^[\.\s]+|[\.\s]+$/g, "");

  if (!clean || clean === ".") {
    clean = "attachment";
  }

  // Prevent excessively long filenames
  if (clean.length > 120) {
    const extIndex = clean.lastIndexOf(".");
    if (extIndex > 0) {
      const ext = clean.slice(extIndex);
      const base = clean.slice(0, 120 - ext.length);
      clean = base + ext;
    } else {
      clean = clean.slice(0, 120);
    }
  }

  return clean;
}

/**
 * Validates uploaded file size, filename, extension, and MIME type.
 */
export function validateUploadFile(
  fileName: string,
  fileSize: number,
  clientMimeType?: string
): UploadFileValidationResult {
  // 1. File size checks
  if (fileSize <= 0) {
    return {
      valid: false,
      error: "Uploaded file is empty.",
      code: "invalid_file",
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 25 MB (file size: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).`,
      code: "file_too_large",
    };
  }

  // 2. Filename sanitization
  const sanitized = sanitizeFilename(fileName);
  if (!sanitized) {
    return {
      valid: false,
      error: "Invalid filename provided.",
      code: "invalid_filename",
    };
  }

  // 3. Extract and check extension
  const extParts = sanitized.split(".");
  if (extParts.length < 2) {
    return {
      valid: false,
      error: "File must have a valid extension (e.g., .pdf, .png, .docx).",
      code: "unsupported_type",
    };
  }

  const ext = extParts[extParts.length - 1].toLowerCase();

  // Check forbidden extensions
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type '.${ext}' is prohibited for security reasons.`,
      code: "unsupported_type",
    };
  }

  // Check allowlist
  const allowedMimes = ALLOWED_EXTENSIONS_MAP[ext];
  if (!allowedMimes) {
    return {
      valid: false,
      error: `File extension '.${ext}' is not supported. Permitted types: PDF, PNG, JPEG, WebP, DOCX, XLSX, PPTX, TXT.`,
      code: "unsupported_type",
    };
  }

  // Determine authoritative MIME type
  let authoritativeMime = allowedMimes[0];
  if (clientMimeType && allowedMimes.includes(clientMimeType.toLowerCase())) {
    authoritativeMime = clientMimeType.toLowerCase();
  }

  return {
    valid: true,
    sanitizedFilename: sanitized,
    mimeType: authoritativeMime,
    fileSize,
  };
}

/**
 * Builds the deterministic storage path for task attachments.
 * Hierarchy: organization/{organization_id}/tasks/{task_id}/{file_id}-{sanitized_filename}
 */
export function buildTaskStoragePath(
  organizationId: string,
  taskId: string,
  fileId: string,
  sanitizedFilename: string
): string {
  return `organization/${organizationId}/tasks/${taskId}/${fileId}-${sanitizedFilename}`;
}
