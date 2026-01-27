import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { tiers } from "@/data/sources";
import type { UserReviewDTO } from "@/data/users";
import { formatTimeAgo } from "@/lib/date";

interface UserReviewCardProps {
  review: UserReviewDTO;
}

function TierBadge({ tier }: { tier: number }) {
  const tierInfo = tiers[tier];
  return (
    <span
      className="inline-flex items-center justify-center min-w-5 h-5 px-1 font-bold text-white text-xs"
      style={{ backgroundColor: tierInfo?.color }}
      title={tierInfo?.name}
    >
      {tier}
    </span>
  );
}

export function UserReviewCard({ review }: UserReviewCardProps) {
  return (
    <div className="p-2 space-y-1.5">
      {/* Header: Source name and tier */}
      <div className="flex items-center gap-2">
        <TierBadge tier={review.tier} />
        <Link
          href={`/sources/${review.sourceId}`}
          className="text-accent hover:underline font-medium text-sm flex-1 truncate"
        >
          {review.sourceName}
        </Link>
        {review.sourceType && (
          <Badge variant="secondary" className="text-xs">
            {review.sourceType}
          </Badge>
        )}
      </div>

      {/* Review content preview */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {review.content}
      </p>

      {/* Footer: Votes and date */}
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span title="Helpful votes">+{review.helpfulVotes}</span>
          <span title="Not helpful votes">-{review.notHelpfulVotes}</span>
        </div>
        <span>
          {formatTimeAgo(review.createdAt)}
          {review.isEdited && " (edited)"}
        </span>
      </div>
    </div>
  );
}
