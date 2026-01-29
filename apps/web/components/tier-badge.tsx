import { cn } from "@/lib/utils";
import { getTierColor, getTierName } from "@/lib/tiers";

interface TierBadgeProps {
  tier: number | null;
  size?: "sm" | "md" | "lg";
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const label = getTierName(tier);
  const color = getTierColor(tier);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold text-white whitespace-nowrap",
        size === "sm" && "h-5 px-2 text-2xs",
        size === "md" && "h-6 px-2.5 text-xs",
        size === "lg" && "h-8 px-3 text-sm",
      )}
      style={{ backgroundColor: color }}
      title={label}
    >
      {label}
    </span>
  );
}
