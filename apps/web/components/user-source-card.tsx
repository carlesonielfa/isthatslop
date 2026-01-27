import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { tiers } from "@/data/sources";
import type { UserSourceDTO } from "@/data/users";
import { formatTimeAgo } from "@/lib/date";

interface UserSourceCardProps {
  source: UserSourceDTO;
}

function TierBadge({ tier }: { tier: number | null }) {
  if (tier === null) {
    return (
      <span
        className="inline-flex items-center justify-center min-w-5 h-5 px-1 font-bold text-white text-xs bg-muted-foreground"
        title="No reviews yet"
      >
        ?
      </span>
    );
  }
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

export function UserSourceCard({ source }: UserSourceCardProps) {
  return (
    <div className="p-2 space-y-1.5">
      {/* Header: Source name and tier */}
      <div className="flex items-center gap-2">
        <TierBadge tier={source.tier} />
        <Link
          href={`/sources/${source.slug}`}
          className="text-accent hover:underline font-medium text-sm flex-1 truncate"
        >
          {source.name}
        </Link>
        {source.type && <Badge variant="secondary">{source.type}</Badge>}
      </div>

      {/* Footer: Review count and date */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{source.reviewCount} reviews</span>
        <span>Added {formatTimeAgo(source.createdAt)}</span>
      </div>
    </div>
  );
}
