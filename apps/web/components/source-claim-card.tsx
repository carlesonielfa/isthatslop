"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatTimeAgo } from "@/lib/date";
import { getImpactName, getImpactColor } from "@/lib/impact";
import { getConfidenceName, getConfidenceColor } from "@/lib/confidence";
import type { SourceClaimDTO, ClaimCommentDTO } from "@/data/sources";
import { voteOnClaim } from "@/data/actions";
import { ClaimCommentSection } from "@/components/claim-comment-section";

interface SourceClaimCardProps {
  claim: SourceClaimDTO;
  comments: ClaimCommentDTO[];
}

function MetricBadge({
  label,
  level,
  color,
}: {
  label: string;
  level: number;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        className="inline-flex items-center justify-center min-w-5 h-5 px-1 font-bold text-white"
        style={{ backgroundColor: color }}
        title={`${label} ${level}`}
      >
        {level}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export function SourceClaimCard({ claim, comments }: SourceClaimCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const displayName =
    claim.user.displayUsername || claim.user.username || "Anonymous";
  const profileHref = claim.user.username
    ? `/users/${claim.user.username}`
    : null;

  const handleVote = (isHelpful: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await voteOnClaim({
        claimId: claim.id,
        isHelpful,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to record vote");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div
      className={`p-3 border-b last:border-b-0 ${
        claim.disputeCount > 0
          ? "border-l-4 border-l-destructive bg-destructive/5 border-b-border-dark/30"
          : "border-b-border-dark/30"
      }`}
    >
      <div className="flex gap-3">
        <UserAvatar
          username={displayName}
          avatarUrl={claim.user.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MetricBadge
              label={getImpactName(claim.impact)}
              level={claim.impact}
              color={getImpactColor(claim.impact)}
            />
            <MetricBadge
              label={getConfidenceName(claim.confidence)}
              level={claim.confidence}
              color={getConfidenceColor(claim.confidence)}
            />
            {profileHref ? (
              <Link
                href={profileHref}
                className="text-accent hover:underline text-sm font-medium"
              >
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-medium">{displayName}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(claim.createdAt)}
              {claim.isEdited && " (edited)"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {claim.content}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span title="Helpful votes">+{claim.helpfulVotes} helpful</span>
            <span title="Not helpful votes">
              -{claim.notHelpfulVotes} not helpful
            </span>
            <span>{claim.commentCount} comments</span>
            {claim.disputeCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {claim.disputeCount} disputes
              </Badge>
            )}
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
              {error}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={claim.userVote === true ? "default" : "outline"}
              disabled={isPending}
              onClick={() => handleVote(true)}
            >
              {claim.userVote === true ? "Voted Helpful" : "Helpful"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={claim.userVote === false ? "destructive" : "outline"}
              disabled={isPending}
              onClick={() => handleVote(false)}
            >
              {claim.userVote === false ? "Voted Not helpful" : "Not helpful"}
            </Button>
          </div>
          <details className="border-t border-border-dark/40 pt-3">
            <summary className="text-xs text-accent cursor-pointer">
              View comments ({claim.commentCount})
            </summary>
            <div className="pt-3">
              <ClaimCommentSection claimId={claim.id} comments={comments} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
