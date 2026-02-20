"use client";

import { useEffect, useRef, useState } from "react";
import { flagContent } from "@/data/moderation-actions";
import type { FlagTargetType, FlagReason } from "@/data/moderation-actions";

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

/**
 * Inline flag button with a Win95-styled dropdown for selecting a reason.
 * Handles auth, rate-limit, self-flag, and duplicate-flag error messages.
 */
export function FlagButton({ targetType, targetId }: FlagButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setError(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setError(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setError(null);
        }}
        title="Flag this content"
        aria-label="Flag this content"
        aria-expanded={open}
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

      {open && (
        <div
          role="menu"
          className="absolute z-50"
          style={{
            top: "100%",
            left: 0,
            marginTop: "2px",
            background: "#c0c0c0",
            border: "2px solid",
            borderColor: "#fff #808080 #808080 #fff",
            boxShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            minWidth: "140px",
            padding: "2px",
            fontFamily: "var(--font-win95)",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              background: "#000080",
              color: "#fff",
              padding: "2px 4px",
              marginBottom: "2px",
              fontSize: "11px",
            }}
          >
            Flag reason
          </div>

          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => handleReasonClick(r.value)}
              className="block w-full text-left hover:bg-blue-700 hover:text-white disabled:opacity-50"
              style={{
                padding: "3px 8px",
                cursor: pending ? "wait" : "pointer",
                fontFamily: "var(--font-win95)",
                fontSize: "11px",
              }}
            >
              {r.label}
            </button>
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
              }}
            >
              Submitting...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
