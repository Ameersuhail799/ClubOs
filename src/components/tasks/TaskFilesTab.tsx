"use client";

import React from "react";
import { LabelCaps, LabelCode } from "@/components/ui/Typography";
import type { TaskWithFullDetails } from "@/lib/tasks/types";

interface TaskFilesTabProps {
  task: TaskWithFullDetails;
}

export function TaskFilesTab({ task }: TaskFilesTabProps) {
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Files Header & Architecture Note */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-2">
        <LabelCaps className="text-secondary font-semibold">Attached Files & Specifications</LabelCaps>
        <span className="text-body-sm text-secondary">
          Read-only metadata ledger for attached design assets, schematics, API specs, and deliverable documents.
        </span>
      </div>

      {/* Files Ledger Table */}
      <div className="p-6 rounded bg-surface-container-lowest border border-outline-variant flex flex-col gap-4">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-mono text-label-code-sm">
                {task.files.map((file) => (
                  <tr key={file.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-on-surface">
                      {file.fileName}
                    </td>
                    <td className="py-3 px-4 text-secondary uppercase text-[11px]">
                      {file.mimeType || "Binary"}
                    </td>
                    <td className="py-3 px-4 text-secondary">
                      {formatFileSize(file.fileSize)}
                    </td>
                    <td className="py-3 px-4 text-on-surface">
                      {file.uploaderName}
                    </td>
                    <td className="py-3 px-4 text-secondary">
                      {new Date(file.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
              File upload and cloud storage integration will be connected in a future release.
              Existing file metadata is displayed when registered in the file ledger.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
