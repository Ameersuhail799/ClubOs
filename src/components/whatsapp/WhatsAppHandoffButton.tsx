"use client";

/**
 * ClubOS — WhatsApp Handoff Trigger Button
 * Build 02.15
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsAppHandoffModal } from "./WhatsAppHandoffModal";
import type { WhatsAppIntent } from "@/lib/whatsapp/types";

interface WhatsAppHandoffButtonProps {
  taskId: string;
  recipientId?: string;
  intent?: WhatsAppIntent;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function WhatsAppHandoffButton({
  taskId,
  recipientId,
  intent = "general",
  variant = "outline",
  size = "sm",
  label = "Message on WhatsApp",
  className,
}: WhatsAppHandoffButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
        title="Open safe WhatsApp task handoff"
      >
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[11px] opacity-70 font-mono">↗</span>
        </span>
      </Button>

      <WhatsAppHandoffModal
        taskId={taskId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialRecipientId={recipientId}
        initialIntent={intent}
      />
    </>
  );
}
