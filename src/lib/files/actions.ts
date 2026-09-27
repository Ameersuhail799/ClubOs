"use server";

import { revalidatePath } from "next/cache";
import {
  uploadTaskAttachment,
  getTaskFileSignedUrl,
  deleteTaskAttachment,
} from "./service";
import type { FileResult, TaskFileAttachment } from "./types";

/**
 * Server action to securely upload a task file attachment.
 */
export async function uploadTaskFileAction(
  formData: FormData
): Promise<FileResult<TaskFileAttachment>> {
  const taskId = formData.get("taskId") as string;
  const file = formData.get("file") as File | null;

  if (!taskId || !file) {
    return {
      success: false,
      error: "Task ID and file payload are required.",
      code: "invalid_file",
    };
  }

  const result = await uploadTaskAttachment({
    taskId,
    file,
  });

  if (result.success) {
    revalidatePath(`/workspace/tasks/${taskId}`);
    revalidatePath("/workspace/tasks");
    revalidatePath("/workspace/group");
    revalidatePath("/workspace/my-day");
  }

  return result;
}

/**
 * Server action to generate short-lived signed download URL for an attachment.
 */
export async function getTaskFileDownloadUrlAction(
  fileId: string
): Promise<FileResult<{ signedUrl: string; fileName: string; fileSize: number }>> {
  if (!fileId) {
    return {
      success: false,
      error: "File ID is required.",
      code: "file_not_found",
    };
  }

  return await getTaskFileSignedUrl(fileId);
}

/**
 * Server action to permanently delete an authorized attachment.
 */
export async function deleteTaskFileAction(
  fileId: string,
  taskId?: string
): Promise<FileResult<{ deletedId: string }>> {
  if (!fileId) {
    return {
      success: false,
      error: "File ID is required.",
      code: "file_not_found",
    };
  }

  const result = await deleteTaskAttachment(fileId);

  if (result.success && taskId) {
    revalidatePath(`/workspace/tasks/${taskId}`);
    revalidatePath("/workspace/tasks");
    revalidatePath("/workspace/group");
    revalidatePath("/workspace/my-day");
  }

  return result;
}
