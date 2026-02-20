"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveFlag, removeContent } from "@/data/moderation-actions";

interface FlagActionButtonsProps {
  flagId: string;
  targetType: "claim" | "source" | "comment";
  targetId: string;
}

export function FlagActionButtons({
  flagId,
  targetType,
  targetId,
}: FlagActionButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<
    "dismiss" | "remove_and_resolve" | null
  >(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  async function handleDismiss() {
    setPending("dismiss");
    setMessage(null);
    const result = await resolveFlag(flagId, "dismiss");
    if (result.success) {
      setMessage({ text: "Dismissed", type: "success" });
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Error", type: "error" });
    }
    setPending(null);
  }

  async function handleRemoveAndResolve() {
    setPending("remove_and_resolve");
    setMessage(null);
    const removeResult = await removeContent(targetType, targetId);
    if (!removeResult.success) {
      setMessage({
        text: removeResult.error ?? "Error removing",
        type: "error",
      });
      setPending(null);
      return;
    }
    const resolveResult = await resolveFlag(flagId, "approve");
    if (resolveResult.success) {
      setMessage({ text: "Removed & resolved", type: "success" });
      router.refresh();
    } else {
      setMessage({
        text: resolveResult.error ?? "Error resolving",
        type: "error",
      });
    }
    setPending(null);
  }

  if (message) {
    return (
      <span
        className={
          message.type === "success"
            ? "text-xs text-green-700 font-medium"
            : "text-xs text-destructive font-medium"
        }
      >
        {message.text}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleDismiss}
        disabled={pending !== null}
        className="text-xs px-2 py-0.5 h-auto"
      >
        {pending === "dismiss" ? "..." : "Dismiss"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleRemoveAndResolve}
        disabled={pending !== null}
        className="text-xs px-2 py-0.5 h-auto"
      >
        {pending === "remove_and_resolve" ? "..." : "Remove"}
      </Button>
    </div>
  );
}
