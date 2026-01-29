import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/tier-badge";
import type { UserSourceDTO } from "@/data/users";
import { formatTimeAgo } from "@/lib/date";

interface UserSourceCardProps {
  source: UserSourceDTO;
}

export function UserSourceCard({ source }: UserSourceCardProps) {
  return (
    <div className="p-2 space-y-1.5">
      {/* Header: Source name and tier */}
      <div className="flex items-center gap-2">
        <TierBadge tier={source.tier} size="sm" />
        <Link
          href={`/sources/${source.id}/${source.slug}`}
          className="text-accent hover:underline font-medium text-sm flex-1 truncate"
        >
          {source.name}
        </Link>
        {source.type && <Badge variant="secondary">{source.type}</Badge>}
      </div>

      {/* Footer: Claim count and date */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{source.claimCount} claims</span>
        <span>Added {formatTimeAgo(source.createdAt)}</span>
      </div>
    </div>
  );
}
