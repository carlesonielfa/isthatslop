"use client";

import { cn } from "@/lib/utils";
import { tiers } from "@/lib/tiers";
import { TierBadge } from "@/components/tier-badge";

interface TierSelectorProps {
  value: number | null;
  onChange: (tier: number) => void;
  disabled?: boolean;
}

export function TierSelector({ value, onChange, disabled }: TierSelectorProps) {
  return (
    <div className="space-y-1">
      {tiers.map((tier) => {
        const isSelected = value === tier.tier;
        return (
          <label
            key={tier.tier}
            className={cn(
              "flex items-center gap-3 px-3 py-2 border cursor-pointer transition-colors",
              isSelected
                ? "bg-muted border-border-dark"
                : "border-transparent hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name="tier"
              value={tier.tier}
              checked={isSelected}
              onChange={() => onChange(tier.tier)}
              disabled={disabled}
              className="sr-only"
            />
            <span
              className={cn(
                "w-4 h-4 border-2 rounded-full flex items-center justify-center",
                isSelected ? "border-primary" : "border-border-dark",
              )}
            >
              {isSelected && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </span>
            <TierBadge tier={tier.tier} size="sm" />
          </label>
        );
      })}
    </div>
  );
}
