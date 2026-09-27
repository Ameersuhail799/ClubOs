import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationContext, type OrganizationContext, type UserRole } from "@/lib/auth/context";
import { canUserAccessTask } from "@/lib/tasks/service";
import {
  validateUploadFile,
  buildTaskStoragePath,
} from "./validation";
import type {
  FileResult,
  TaskFileAttachment,
  FileMetadataRow,
} from "./types";

export const STORAGE_BUCKET = "clubos-files";
export const SIGNED_URL_EXPIRES_IN = 300; // 5 minutes

/**
 * Creates an immutable administrative audit record for file attachment events.
 */
async function recordFileAudit({
  organizationId,
  actorId,
  taskId,
  action,
  previousState,
  newState,
  metadata,
}: {
  organizationId: string;
  actorId: string;
  taskId: string;
  action: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}) {
  const adminClient = createAdminClient();
  await adminClient.from("activity_records").insert({
    organization_id: organizationId,
    actor_id: actorId,
    task_id: taskId,
    entity_type: "task",
    entity_id: taskId,
    action,
    previous_state: previousState || null,
    new_state: newState || null,
    metadata: metadata || null,
  });
}

export interface UploadFileInput {
  taskId: string;
  file: {
    name: string;
    size: number;
    type?: string;
    arrayBuffer: () => Promise<ArrayBuffer> | ArrayBuffer;
  };
  callerContext?: OrganizationContext;
}

/**
 * Securely uploads an attachment for a task to the private Supabase Storage bucket,
 * registers metadata in the database, and creates an audit record.
 */
export async function uploadTaskAttachment(
  input: UploadFileInput
): Promise<FileResult<TaskFileAttachment>> {
  const context = input.callerContext || (await getCurrentOrganizationContext());

  // 1. Authoritative caller verification
  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  // 2. Validate task ID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input.taskId || !uuidRegex.test(input.taskId)) {
    return { error: "Invalid task identifier provided.", code: "task_not_found" };
  }

  // 3. Validate uploaded file attributes
  if (!input.file || typeof input.file.size !== "number" || !input.file.name) {
    return { error: "A valid file is required.", code: "invalid_file" };
  }

  const validation = validateUploadFile(
    input.file.name,
    input.file.size,
    input.file.type
  );

  if (!validation.valid) {
    return {
      error: validation.error || "File validation failed.",
      code: validation.code || "invalid_file",
    };
  }

  const adminClient = createAdminClient();

  // 4. Verify task exists within the caller's organization
  const { data: task, error: taskFetchError } = await adminClient
    .from("tasks")
    .select("id, organization_id, primary_group_id, title, status")
    .eq("id", input.taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (taskFetchError || !task) {
    return {
      error: "Task does not exist in your organization or access is denied.",
      code: "task_not_found",
    };
  }

  // 5. Verify caller has read/access permissions to this task
  const userRole = context.role || "member";
  const userGroupId = context.primaryGroup?.id || null;
  const hasAccess = await canUserAccessTask(
    task.id,
    context.user.id,
    userRole,
    userGroupId,
    organizationId
  );

  if (!hasAccess) {
    return {
      error: "Access Denied: You do not have permission to attach files to this task.",
      code: "forbidden",
    };
  }

  // 6. Generate identifier & deterministic storage path
  const fileId = crypto.randomUUID();
  const storagePath = buildTaskStoragePath(
    organizationId,
    task.id,
    fileId,
    validation.sanitizedFilename!
  );

  // 7. Read file buffer
  let fileBuffer: Buffer;
  try {
    const ab = await input.file.arrayBuffer();
    fileBuffer = Buffer.from(ab);
  } catch (err: any) {
    return {
      error: `Failed to read file payload: ${err.message || "Unknown error"}`,
      code: "invalid_file",
    };
  }

  // 8. Upload to private Supabase Storage bucket
  const { error: storageError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (storageError) {
    return {
      error: `Storage upload failed: ${storageError.message}`,
      code: "storage_error",
    };
  }

  // 9. Insert metadata into file_metadata ledger
  const { data: fileRow, error: metadataError } = await adminClient
    .from("file_metadata")
    .insert({
      id: fileId,
      organization_id: organizationId,
      task_id: task.id,
      bucket_id: STORAGE_BUCKET,
      file_path: storagePath,
      file_name: validation.sanitizedFilename!,
      file_size: validation.fileSize!,
      mime_type: validation.mimeType!,
      uploader_id: context.user.id,
    })
    .select()
    .single();

  if (metadataError || !fileRow) {
    // Rollback orphaned storage object
    await adminClient.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return {
      error: `Failed to register file metadata: ${metadataError?.message || "Unknown error"}`,
      code: "internal_error",
    };
  }

  // 10. Audit log the upload event
  await recordFileAudit({
    organizationId,
    actorId: context.user.id,
    taskId: task.id,
    action: "file_uploaded",
    metadata: {
      fileId,
      fileName: validation.sanitizedFilename,
      fileSize: validation.fileSize,
      mimeType: validation.mimeType,
      filePath: storagePath,
    },
  });

  const attachment: TaskFileAttachment = {
    id: fileRow.id,
    taskId: fileRow.task_id || task.id,
    organizationId: fileRow.organization_id,
    fileName: fileRow.file_name,
    filePath: fileRow.file_path,
    fileSize: Number(fileRow.file_size) || 0,
    mimeType: fileRow.mime_type,
    bucketId: fileRow.bucket_id || STORAGE_BUCKET,
    uploaderId: fileRow.uploader_id,
    uploaderName: context.profile?.full_name || "Unknown",
    uploaderRole: userRole,
    createdAt: fileRow.created_at,
    canDelete: true, // uploader can delete their own upload
  };

  return {
    success: true,
    data: attachment,
  };
}

/**
 * Generates a short-lived secure signed download URL for an authorized attachment.
 */
export async function getTaskFileSignedUrl(
  fileId: string,
  callerContext?: OrganizationContext
): Promise<FileResult<{ signedUrl: string; fileName: string; fileSize: number }>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  // 1. Authoritative caller verification
  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!fileId || !uuidRegex.test(fileId)) {
    return { error: "Invalid file identifier.", code: "file_not_found" };
  }

  const adminClient = createAdminClient();

  // 2. Query file metadata within the caller's organization
  const { data: file, error: fetchError } = await adminClient
    .from("file_metadata")
    .select("*")
    .eq("id", fileId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError || !file) {
    return { error: "File not found or access denied.", code: "file_not_found" };
  }

  // 3. Verify task access if file is bound to a task
  if (file.task_id) {
    const userRole = context.role || "member";
    const userGroupId = context.primaryGroup?.id || null;
    const hasAccess = await canUserAccessTask(
      file.task_id,
      context.user.id,
      userRole,
      userGroupId,
      organizationId
    );

    if (!hasAccess) {
      return {
        error: "Access Denied: You do not have permission to view attachments for this task.",
        code: "forbidden",
      };
    }
  }

  // 4. Generate signed URL with Supabase Storage
  const bucket = file.bucket_id || STORAGE_BUCKET;
  const { data: signedData, error: signError } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(file.file_path, SIGNED_URL_EXPIRES_IN, {
      download: file.file_name,
    });

  if (signError || !signedData?.signedUrl) {
    return {
      error: `Failed to create secure download link: ${signError?.message || "Unknown error"}`,
      code: "storage_error",
    };
  }

  return {
    success: true,
    data: {
      signedUrl: signedData.signedUrl,
      fileName: file.file_name,
      fileSize: Number(file.file_size) || 0,
    },
  };
}

/**
 * Permanently deletes a task attachment from storage and metadata ledger,
 * subject to strict authorization rules:
 * - Main Head: can delete any attachment within the organization.
 * - Group Head: can delete attachments on tasks belonging to their primary group.
 * - Member: can delete only attachments they uploaded.
 */
export async function deleteTaskAttachment(
  fileId: string,
  callerContext?: OrganizationContext
): Promise<FileResult<{ deletedId: string }>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  // 1. Authoritative caller verification
  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!fileId || !uuidRegex.test(fileId)) {
    return { error: "Invalid file identifier.", code: "file_not_found" };
  }

  const adminClient = createAdminClient();

  // 2. Query file metadata within caller's organization
  const { data: file, error: fetchError } = await adminClient
    .from("file_metadata")
    .select("*")
    .eq("id", fileId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError || !file) {
    return { error: "File not found or access denied.", code: "file_not_found" };
  }

  // 3. Evaluate delete authority
  const userRole = context.role || "member";
  const userId = context.user.id;
  let canDelete = false;

  if (userRole === "main_head") {
    // Main Head has organization-wide deletion authority
    canDelete = true;
  } else if (file.uploader_id === userId) {
    // Any active member can delete their own uploads
    canDelete = true;
  } else if (userRole === "group_head" && file.task_id && context.primaryGroup?.id) {
    // Group Head can delete on tasks assigned to their primary group
    const { data: task } = await adminClient
      .from("tasks")
      .select("primary_group_id")
      .eq("id", file.task_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (task && task.primary_group_id === context.primaryGroup.id) {
      canDelete = true;
    }
  }

  if (!canDelete) {
    return {
      error: "Access Denied: You do not have permission to delete this attachment.",
      code: "forbidden",
    };
  }

  // 4. Remove object from storage bucket
  const bucket = file.bucket_id || STORAGE_BUCKET;
  const { error: removeError } = await adminClient.storage
    .from(bucket)
    .remove([file.file_path]);

  if (removeError) {
    return {
      error: `Failed to remove file from storage: ${removeError.message}`,
      code: "storage_error",
    };
  }

  // 5. Delete metadata row
  const { error: deleteRowError } = await adminClient
    .from("file_metadata")
    .delete()
    .eq("id", fileId)
    .eq("organization_id", organizationId);

  if (deleteRowError) {
    return {
      error: `Failed to remove file metadata: ${deleteRowError.message}`,
      code: "internal_error",
    };
  }

  // 6. Audit log deletion
  if (file.task_id) {
    await recordFileAudit({
      organizationId,
      actorId: userId,
      taskId: file.task_id,
      action: "file_deleted",
      metadata: {
        fileId,
        fileName: file.file_name,
        filePath: file.file_path,
        fileSize: file.file_size,
      },
    });
  }

  return {
    success: true,
    data: { deletedId: fileId },
  };
}

/**
 * Lists all attachments for a task with deletion authority flags calculated per file.
 */
export async function listTaskAttachments(
  taskId: string,
  callerContext?: OrganizationContext
): Promise<FileResult<TaskFileAttachment[]>> {
  const context = callerContext || (await getCurrentOrganizationContext());

  // 1. Authoritative caller verification
  if (!context || !context.user || context.status !== "active") {
    return { error: "Authentication required.", code: "unauthorized" };
  }

  const organizationId = context.organization?.id;
  if (!organizationId) {
    return { error: "Caller is not bound to a valid organization.", code: "unauthorized" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!taskId || !uuidRegex.test(taskId)) {
    return { error: "Invalid task identifier.", code: "task_not_found" };
  }

  const adminClient = createAdminClient();

  // 2. Verify task existence and access
  const { data: task, error: taskError } = await adminClient
    .from("tasks")
    .select("id, organization_id, primary_group_id")
    .eq("id", taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (taskError || !task) {
    return { error: "Task not found.", code: "task_not_found" };
  }

  const userRole = context.role || "member";
  const userGroupId = context.primaryGroup?.id || null;
  const hasAccess = await canUserAccessTask(
    task.id,
    context.user.id,
    userRole,
    userGroupId,
    organizationId
  );

  if (!hasAccess) {
    return { error: "Access Denied: Cannot view task files.", code: "forbidden" };
  }

  // 3. Query files for this task
  const { data: files, error: filesError } = await adminClient
    .from("file_metadata")
    .select("*")
    .eq("task_id", taskId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filesError) {
    return { error: filesError.message, code: "internal_error" };
  }

  const rawFiles: FileMetadataRow[] = files || [];

  // 4. Batch fetch uploader profiles and membership roles
  const uploaderIds = Array.from(new Set(rawFiles.map((f) => f.uploader_id).filter(Boolean)));
  const profileMap = new Map<string, { fullName: string }>();
  const roleMap = new Map<string, UserRole>();

  if (uploaderIds.length > 0) {
    const [profilesRes, membersRes] = await Promise.all([
      adminClient.from("profiles").select("id, full_name").in("id", uploaderIds),
      adminClient
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .in("user_id", uploaderIds),
    ]);

    (profilesRes.data || []).forEach((p) => {
      profileMap.set(p.id, { fullName: p.full_name || "Unknown" });
    });

    (membersRes.data || []).forEach((m) => {
      roleMap.set(m.user_id, m.role as UserRole);
    });
  }

  // 5. Build results with computed canDelete
  const isGroupHeadForTask =
    userRole === "group_head" &&
    Boolean(userGroupId && task.primary_group_id === userGroupId);

  const attachments: TaskFileAttachment[] = rawFiles.map((f) => {
    const canDelete =
      userRole === "main_head" ||
      isGroupHeadForTask ||
      f.uploader_id === context.user.id;

    return {
      id: f.id,
      taskId: f.task_id || task.id,
      organizationId: f.organization_id,
      fileName: f.file_name,
      filePath: f.file_path,
      fileSize: Number(f.file_size) || 0,
      mimeType: f.mime_type,
      bucketId: f.bucket_id || STORAGE_BUCKET,
      uploaderId: f.uploader_id,
      uploaderName: profileMap.get(f.uploader_id)?.fullName || "Unknown",
      uploaderRole: roleMap.get(f.uploader_id) || "member",
      createdAt: f.created_at,
      canDelete,
    };
  });

  return {
    success: true,
    data: attachments,
  };
}
