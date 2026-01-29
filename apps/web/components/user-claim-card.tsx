import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/date";
import { getImpactName, getImpactColor } from "@/lib/impact";
import { getConfidenceName, getConfidenceColor } from "@/lib/confidence";
import type { UserClaimDTO } from "@/data/users";

interface UserClaimCardProps {
  claim: UserClaimDTO;
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

export function UserClaimCard({ claim }: UserClaimCardProps) {
  return (
    <div className="p-2 space-y-1.5">
      {/* Header: Source name and claim tags */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <Link
          href={`/sources/${claim.sourceId}/${claim.sourceSlug}`}
          className="text-accent hover:underline font-medium text-sm flex-1 truncate"
        >
          {claim.sourceName}
        </Link>
        {claim.sourceType && (
          <Badge variant="secondary" className="text-xs">
            {claim.sourceType}
          </Badge>
        )}
      </div>

      {/* Claim content preview */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {claim.content}
      </p>

      {/* Footer: Votes and date */}
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span title="Helpful votes">+{claim.helpfulVotes}</span>
          <span title="Not helpful votes">-{claim.notHelpfulVotes}</span>
        </div>
        <span>
          {formatTimeAgo(claim.createdAt)}
          {claim.isEdited && " (edited)"}
        </span>
      </div>
    </div>
  );
}
