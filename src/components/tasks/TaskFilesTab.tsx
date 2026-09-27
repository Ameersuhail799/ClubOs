"use client";

import React, { useState, useRef, useTransition } from "react";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import type { TaskWithFullDetails, TaskFile } from "@/lib/tasks/types";
import {
  uploadTaskFileAction,
  getTaskFileDownloadUrlAction,
  deleteTaskFileAction,
} from "@/lib/files/actions";
import {
  ALLOWED_EXTENSIONS_MAP,
  FORBIDDEN_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/files/validation";

interface TaskFilesTabProps {
  task: TaskWithFullDetails;
  onRefresh?: () => void;
}

export function TaskFilesTab({ task, onRefresh }: TaskFilesTabProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const validateClientFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size <= 0) {
      return { valid: false, error: "The selected file is empty." };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds the 25 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      };
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext) {
      return { valid: false, error: "The file must have an extension." };
    }
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      return { valid: false, error: `File type .${ext} is prohibited for security reasons.` };
    }
    if (!ALLOWED_EXTENSIONS_MAP[ext]) {
      return {
        valid: false,
        error: `File type .${ext} is not supported. Allowed formats: PDF, PNG, JPG, WebP, DOCX, XLSX, PPTX, TXT.`,
      };
    }
    return { valid: true };
  };

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const clientValidation = validateClientFile(file);
    if (!clientValidation.valid) {
      setErrorMsg(clientValidation.error || "File validation failed.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("taskId", task.id);
      formData.append("file", file);

      const res = await uploadTaskFileAction(formData);

      if (!res.success) {
        setErrorMsg(res.error || "Failed to upload file.");
      } else {
        setSuccessMsg(`File "${file.name}" attached successfully.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDownload = async (file: TaskFile) => {
    setErrorMsg(null);
    setDownloadingId(file.id);
    try {
      const res = await getTaskFileDownloadUrlAction(file.id);
      if (!res.success || !res.data?.signedUrl) {
        setErrorMsg(res.error || "Failed to retrieve secure download link.");
      } else {
        // Open download in new window/tab or trigger browser download
        const link = document.createElement("a");
        link.href = res.data.signedUrl;
        link.download = res.data.fileName || file.fileName;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingId(fileId);
    try {
      const res = await deleteTaskFileAction(fileId, task.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete attachment.");
      } else {
        setSuccessMsg("Attachment deleted permanently.");
        setConfirmDeleteId(null);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete attachment.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Files Header & Architecture Note */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-2">
        <LabelCaps className="text-secondary font-semibold">Attached Files & Specifications</LabelCaps>
        <span className="text-body-sm text-secondary">
          Secure private attachments for task deliverables, specifications, schematics, and design assets.
          Files are encrypted at rest and accessed only via short-lived authenticated URLs.
        </span>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded bg-error-container text-on-error-container text-body-sm border border-error/20 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded bg-primary/10 text-primary text-body-sm border border-primary/20 flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-6 rounded border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 text-center ${
          dragActive
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-outline-variant bg-surface-container-lowest hover:border-outline"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileInputChange}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-1.5">
          <span className="font-sans text-body-md text-on-surface font-semibold">
            {isUploading ? "Uploading file to secure storage..." : "Attach a file or document to this task"}
          </span>
          <span className="text-body-sm text-secondary max-w-lg">
            Drag and drop your file here, or click the button below. Permitted formats: PDF, PNG, JPG, WebP, DOCX, XLSX, PPTX, TXT (up to 25 MB).
          </span>
        </div>

        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isUploading}
            isLoading={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? "Uploading..." : "Select File"}
          </Button>
        </div>
      </div>

      {/* Files Ledger Table */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <LabelCaps className="text-secondary font-semibold">
            Attached Deliverables ({task.files.length})
          </LabelCaps>
        </div>

        {task.files.length > 0 ? (
          <div className="border border-outline-variant rounded overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container border-b border-outline-variant text-label-caps text-secondary">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">File Name</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Size</th>
                  <th className="py-2.5 px-4 font-semibold">Uploader</th>
                  <th className="py-2.5 px-4 font-semibold">Uploaded Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-mono text-label-code-sm">
                {task.files.map((file) => (
                  <tr key={file.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-on-surface">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                        <span className="truncate max-w-xs">{file.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-secondary uppercase text-[11px]">
                      {file.mimeType || "Binary"}
                    </td>
                    <td className="py-3 px-4 text-secondary">
                      {formatFileSize(file.fileSize)}
                    </td>
                    <td className="py-3 px-4 text-on-surface font-sans">
                      {file.uploaderName}
                    </td>
                    <td className="py-3 px-4 text-secondary">
                      {new Date(file.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={downloadingId === file.id || deletingId === file.id}
                          isLoading={downloadingId === file.id}
                          onClick={() => handleDownload(file)}
                          className="h-6 px-2 text-[11px]"
                        >
                          Download
                        </Button>

                        {/* Delete button (role & uploader aware) */}
                        {file.canDelete && (
                          <>
                            {confirmDeleteId === file.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={deletingId === file.id}
                                  isLoading={deletingId === file.id}
                                  onClick={() => handleDelete(file.id)}
                                  className="h-6 px-2 text-[11px]"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deletingId === file.id}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-6 px-1.5 text-[11px]"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === file.id || downloadingId === file.id}
                                onClick={() => setConfirmDeleteId(file.id)}
                                className="h-6 px-2 text-[11px] text-error hover:bg-error/10 hover:text-error"
                              >
                                Delete
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded bg-surface-container-low border border-dashed border-outline-variant text-center flex flex-col items-center gap-1.5">
            <span className="font-sans text-body-md text-on-surface font-medium">
              No files or attachments recorded for this task yet.
            </span>
            <span className="text-body-sm text-secondary max-w-md">
              Use the upload area above to attach documentation, specs, assets, or deliverables.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
