import { Badge } from "@/components/ui/badge";
import { getReputationTier, reputationTiers } from "@/lib/reputation";
import { cn } from "@/lib/utils";

interface ReputationBadgeProps {
  reputation: number;
  showScore?: boolean;
  className?: string;
}

export function ReputationBadge({
  reputation,
  showScore = true,
  className,
}: ReputationBadgeProps) {
  const tier = getReputationTier(reputation);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-secondary", className)}
      style={{ backgroundColor: tier.color }}
    >
      <span>{tier.name}</span>
      {showScore && (
        <span className="font-mono text-secondary">({reputation})</span>
      )}
    </Badge>
  );
}

interface ReputationProgressProps {
  reputation: number;
  className?: string;
}

export function ReputationProgress({
  reputation,
  className,
}: ReputationProgressProps) {
  const currentTier = getReputationTier(reputation);
  const currentIndex = reputationTiers.findIndex(
    (t) => t.name === currentTier.name,
  );
  const nextTier = reputationTiers[currentIndex + 1];

  if (!nextTier) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Max reputation tier reached
      </div>
    );
  }

  const progress =
    ((reputation - currentTier.minRep) /
      (nextTier.minRep - currentTier.minRep)) *
    100;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs">
        <span style={{ color: currentTier.color }}>{currentTier.name}</span>
        <span style={{ color: nextTier.color }}>{nextTier.name}</span>
      </div>
      <div className="h-2 bg-muted border border-border">
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.min(100, progress)}%`,
            backgroundColor: currentTier.color,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {nextTier.minRep - reputation} points to {nextTier.name}
      </p>
    </div>
  );
}
