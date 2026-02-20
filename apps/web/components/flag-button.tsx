"use client";

import { useState } from "react";
import { flagContent } from "@/data/moderation-actions";
import type { FlagTargetType, FlagReason } from "@/data/moderation-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REASONS: { value: FlagReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abuse" },
  { value: "incorrect_info", label: "Incorrect Info" },
  { value: "duplicate", label: "Duplicate" },
];

interface FlagButtonProps {
  targetType: FlagTargetType;
  targetId: string;
}

export function FlagButton({ targetType, targetId }: FlagButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReasonClick(reason: FlagReason) {
    if (pending) return;
    setPending(true);
    setError(null);

    const result = await flagContent({ targetType, targetId, reason });

    setPending(false);
    if (result.success) {
      setSubmitted(true);
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to submit flag");
    }
  }

  if (submitted) {
    return (
      <span
        className="text-xs text-green-700"
        style={{ fontFamily: "var(--font-win95)" }}
        title="Content flagged for review"
      >
        &#10003; Flagged
      </span>
    );
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Flag this content"
          aria-label="Flag this content"
          className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          style={{
            fontFamily: "var(--font-win95)",
            cursor: "pointer",
            border: "2px solid",
            borderColor: "#fff #808080 #808080 #fff",
            background: "#c0c0c0",
            padding: "1px 4px",
            fontSize: "11px",
            lineHeight: 1.2,
          }}
        >
          &#9873;
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="min-w-35 p-0.5 rounded-none"
        style={{
          background: "#c0c0c0",
          border: "2px solid",
          borderColor: "#fff #808080 #808080 #fff",
          boxShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          fontFamily: "var(--font-win95)",
          fontSize: "11px",
        }}
      >
        <DropdownMenuLabel
          className="text-white px-1 py-0.5 mb-0.5 text-[11px]"
          style={{ background: "#000080" }}
        >
          Flag reason
        </DropdownMenuLabel>

        {REASONS.map((r) => (
          <DropdownMenuItem
            key={r.value}
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              void handleReasonClick(r.value);
            }}
            className="text-[11px] px-2 py-1 rounded-none hover:bg-blue-700 hover:text-white focus:bg-blue-700 focus:text-white"
            style={{
              fontFamily: "var(--font-win95)",
              cursor: pending ? "wait" : "pointer",
            }}
          >
            {r.label}
          </DropdownMenuItem>
        ))}

        {error && (
          <div
            style={{
              color: "#c00",
              padding: "3px 8px",
              borderTop: "1px solid #808080",
              marginTop: "2px",
              fontSize: "10px",
              wordBreak: "break-word",
              fontFamily: "var(--font-win95)",
            }}
          >
            {error}
          </div>
        )}

        {pending && (
          <div
            style={{
              color: "#555",
              padding: "3px 8px",
              fontSize: "10px",
              fontFamily: "var(--font-win95)",
            }}
          >
            Submitting...
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
