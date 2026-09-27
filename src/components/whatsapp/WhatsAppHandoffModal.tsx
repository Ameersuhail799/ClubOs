"use client";

/**
 * ClubOS — WhatsApp Handoff Modal
 * Build 02.15
 */

import React, { useState, useEffect, useTransition } from "react";
import {
  HeadlineSm,
  BodyMd,
  BodySm,
  LabelCaps,
  LabelCode,
} from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getWhatsAppHandoffContextAction,
  prepareWhatsAppUrlAction,
} from "@/lib/whatsapp/actions";
import type {
  WhatsAppHandoffContext,
  WhatsAppIntent,
  WhatsAppRecipient,
} from "@/lib/whatsapp/types";

interface WhatsAppHandoffModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  initialRecipientId?: string;
  initialIntent?: WhatsAppIntent;
}

const INTENT_PRESETS: Array<{ id: WhatsAppIntent; label: string }> = [
  { id: "general", label: "General Directive" },
  { id: "clarification", label: "Clarification" },
  { id: "progress_check", label: "Progress Check" },
  { id: "reminder", label: "Reminder" },
  { id: "review_request", label: "Review Request" },
  { id: "delegation", label: "Delegation" },
];

export function WhatsAppHandoffModal({
  taskId,
  isOpen,
  onClose,
  initialRecipientId,
  initialIntent = "general",
}: WhatsAppHandoffModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [context, setContext] = useState<WhatsAppHandoffContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [selectedIntent, setSelectedIntent] = useState<WhatsAppIntent>(initialIntent);
  const [message, setMessage] = useState<string>("");
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Load context whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      setContext(null);
      setContextError(null);
      setDispatchError(null);
      setMessage("");
      return;
    }

    let isMounted = true;
    setIsLoadingContext(true);
    setContextError(null);
    setDispatchError(null);

    getWhatsAppHandoffContextAction(taskId)
      .then((res) => {
        if (!isMounted) return;
        setIsLoadingContext(false);
        if (!res.success) {
          setContextError(res.error || "Unable to load task WhatsApp handoff.");
        } else {
          setContext(res.data);
          const defaultId =
            initialRecipientId ||
            res.data.defaultRecipientId ||
            res.data.recipients[0]?.userId ||
            "";
          setSelectedRecipientId(defaultId);
          setSelectedIntent(initialIntent);
          setMessage(res.data.suggestedMessages[initialIntent] || "");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoadingContext(false);
        setContextError(err?.message || "Failed to load handoff context.");
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, taskId, initialRecipientId, initialIntent]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentRecipient: WhatsAppRecipient | undefined = context?.recipients.find(
    (r) => r.userId === selectedRecipientId
  );

  const handleIntentChange = (intent: WhatsAppIntent) => {
    setSelectedIntent(intent);
    if (context?.suggestedMessages[intent]) {
      setMessage(context.suggestedMessages[intent]);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!selectedRecipientId || !message.trim()) return;
    setDispatchError(null);

    startTransition(async () => {
      const res = await prepareWhatsAppUrlAction({
        taskId,
        recipientId: selectedRecipientId,
        message: message.trim(),
        intent: selectedIntent,
      });

      if (!res.success) {
        setDispatchError(res.error);
      } else {
        // Open the authoritative click-to-chat URL safely in a new browser tab
        window.open(res.data.whatsappUrl, "_blank", "noopener,noreferrer");
        onClose();
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-lg bg-surface-container-lowest border border-outline-variant shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant flex items-start justify-between gap-4 bg-surface-container-low/40">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <LabelCaps className="text-primary font-bold">
                External Communication Relay
              </LabelCaps>
              <span className="text-outline-variant">•</span>
              <LabelCode size="sm" className="text-secondary font-mono">
                OUT-OF-BAND SYNC
              </LabelCode>
            </div>
            <HeadlineSm id="whatsapp-modal-title" className="text-on-surface font-sans text-lg sm:text-xl font-bold">
              Message on WhatsApp
            </HeadlineSm>
            <BodySm className="text-secondary">
              Review and dispatch an authoritative task brief directly to an authorized collaborator.
            </BodySm>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-colors font-mono text-base"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col gap-4 text-on-surface">
          {isLoadingContext && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <BodySm className="text-secondary">Resolving task contacts and permissions...</BodySm>
            </div>
          )}

          {contextError && (
            <div className="p-4 rounded bg-error-container border border-error/20 text-on-error-container flex flex-col gap-2">
              <span className="font-semibold text-body-sm">Access Restricted</span>
              <BodySm>{contextError}</BodySm>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!isLoadingContext && !contextError && context && (
            <>
              {/* Task Reference Card */}
              <div className="p-3.5 rounded bg-surface-container-low border border-outline-variant flex flex-col gap-1.5 font-sans">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <LabelCode size="sm" className="text-primary font-bold">
                      {context.task.taskCode}
                    </LabelCode>
                    <StatusBadge variant="neutral" size="sm">
                      {context.task.status.replace(/_/g, " ").toUpperCase()}
                    </StatusBadge>
                  </div>
                  {context.task.deadline && (
                    <span className="font-mono text-[11px] text-secondary">
                      Due: {new Date(context.task.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <span className="font-medium text-body-sm text-on-surface truncate">
                  {context.task.title}
                </span>
              </div>

              {/* Recipient Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-secondary font-mono text-[11px] uppercase tracking-wider font-semibold">
                  Authorized Recipient
                </label>

                {context.recipients.length === 0 ? (
                  <div className="p-3 rounded bg-surface-container border border-outline-variant text-secondary text-body-sm italic">
                    No active collaborators or assignees are registered on this task.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {context.recipients.map((recipient) => {
                      const isSelected = recipient.userId === selectedRecipientId;
                      return (
                        <button
                          key={recipient.userId}
                          type="button"
                          onClick={() => {
                            setSelectedRecipientId(recipient.userId);
                            setDispatchError(null);
                          }}
                          className={`p-2.5 rounded border text-left flex flex-col gap-0.5 transition-all ${
                            isSelected
                              ? "bg-surface-container-high border-primary ring-1 ring-primary/40 shadow-sm"
                              : "bg-surface-container-low border-outline-variant hover:bg-surface-container hover:border-outline"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-body-sm text-on-surface truncate">
                              {recipient.fullName}
                            </span>
                            <span className="font-mono text-[10px] text-secondary uppercase shrink-0">
                              {recipient.role}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                            <span className="text-secondary">{recipient.roleLabel}</span>
                            {recipient.isPhoneAvailable ? (
                              <span className="text-primary font-medium">
                                {recipient.maskedPhone || "Phone ready"}
                              </span>
                            ) : (
                              <span className="text-secondary italic">No phone</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Phone Status Notice */}
              {currentRecipient && !currentRecipient.isPhoneAvailable && (
                <div className="p-3 rounded bg-surface-container border border-outline-variant text-secondary text-body-sm flex items-start gap-2">
                  <span className="text-base leading-none">ℹ</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-on-surface text-body-sm">
                      WhatsApp number not available
                    </span>
                    <span>
                      {currentRecipient.fullName} has not recorded a valid mobile phone number in their ClubOS profile. Please communicate via task comments.
                    </span>
                  </div>
                </div>
              )}

              {/* Template / Intent Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-secondary font-mono text-[11px] uppercase tracking-wider font-semibold">
                  Message Purpose / Preset
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {INTENT_PRESETS.map((preset) => {
                    const isSelected = preset.id === selectedIntent;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleIntentChange(preset.id)}
                        className={`px-2.5 py-1 rounded text-body-sm font-sans font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-on-primary font-semibold"
                            : "bg-surface-container border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-high"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Message Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="whatsapp-message-box"
                    className="text-secondary font-mono text-[11px] uppercase tracking-wider font-semibold"
                  >
                    Editable Message Brief
                  </label>
                  <span className="text-secondary font-mono text-[10px]">
                    {message.length} / 1200 characters
                  </span>
                </div>

                <textarea
                  id="whatsapp-message-box"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={1200}
                  className="w-full p-3 rounded bg-surface-container-lowest border border-outline-variant font-mono text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y leading-relaxed"
                  placeholder="Review the generated briefing message..."
                />
              </div>

              {/* Dispatch Error Banner */}
              {dispatchError && (
                <div className="p-3 rounded bg-error-container border border-error/20 text-on-error-container text-body-sm flex items-start justify-between gap-2">
                  <span>{dispatchError}</span>
                  <button
                    type="button"
                    onClick={() => setDispatchError(null)}
                    className="font-bold text-xs hover:opacity-75"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Source of Truth Disclaimer Banner */}
              <div className="p-3 rounded bg-surface-container-low border border-outline-variant flex items-start gap-2.5">
                <span className="text-primary text-sm leading-none mt-0.5">✦</span>
                <p className="text-body-sm text-secondary font-sans leading-snug">
                  <strong className="text-on-surface font-semibold">Institutional Notice:</strong> WhatsApp is exclusively an external communication relay. Official status changes, reviews, approvals, and files remain authoritatively recorded in ClubOS.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-outline-variant flex items-center justify-between gap-3 bg-surface-container-low/40">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenWhatsApp}
            disabled={
              isPending ||
              isLoadingContext ||
              !!contextError ||
              !selectedRecipientId ||
              !currentRecipient?.isPhoneAvailable ||
              !message.trim()
            }
            isLoading={isPending}
            className="flex items-center gap-1.5"
          >
            <span>Open WhatsApp</span>
            <span className="font-mono text-xs opacity-80">↗</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
