import type { Database } from "@/types/database.types";
import type { UserRole } from "@/lib/auth/context";

export type FileMetadataRow = Database["public"]["Tables"]["file_metadata"]["Row"];

export type FileErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_file"
  | "file_too_large"
  | "unsupported_type"
  | "invalid_filename"
  | "task_not_found"
  | "file_not_found"
  | "storage_error"
  | "internal_error";

export interface FileResult<T = any> {
  success?: boolean;
  data?: T | null;
  error?: string | null;
  code?: FileErrorCode;
  message?: string | null;
}

export interface TaskFileAttachment {
  id: string;
  taskId: string;
  organizationId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  bucketId: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole?: UserRole | null;
  createdAt: string;
  canDelete: boolean;
}

export interface UploadFileValidationResult {
  valid: boolean;
  error?: string;
  code?: FileErrorCode;
  sanitizedFilename?: string;
  mimeType?: string;
  fileSize?: number;
}
