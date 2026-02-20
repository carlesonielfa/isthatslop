"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveSource, rejectSource } from "@/data/moderation-actions";

interface SourceApprovalButtonsProps {
  sourceId: string;
}

export function SourceApprovalButtons({
  sourceId,
}: SourceApprovalButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  async function handleApprove() {
    setPending("approve");
    setMessage(null);
    const result = await approveSource(sourceId);
    if (result.success) {
      setMessage({ text: "Approved", type: "success" });
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Error", type: "error" });
    }
    setPending(null);
  }

  async function handleReject() {
    setPending("reject");
    setMessage(null);
    const result = await rejectSource(sourceId);
    if (result.success) {
      setMessage({ text: "Rejected", type: "success" });
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Error", type: "error" });
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
        onClick={handleApprove}
        disabled={pending !== null}
        className="text-xs px-2 py-0.5 h-auto"
      >
        {pending === "approve" ? "..." : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleReject}
        disabled={pending !== null}
        className="text-xs px-2 py-0.5 h-auto"
      >
        {pending === "reject" ? "..." : "Reject"}
      </Button>
    </div>
  );
}
