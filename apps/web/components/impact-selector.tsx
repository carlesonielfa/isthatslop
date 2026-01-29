"use client";

import { cn } from "@/lib/utils";
import { impacts, getImpactColor } from "@/lib/impact";

interface ImpactSelectorProps {
  value: number | null;
  onChange: (impact: number) => void;
  disabled?: boolean;
}

export function ImpactSelector({
  value,
  onChange,
  disabled,
}: ImpactSelectorProps) {
  return (
    <div className="space-y-2">
      {impacts.map((impact) => {
        const isSelected = value === impact.level;
        return (
          <label
            key={impact.level}
            className={cn(
              "flex gap-3 px-3 py-2 border cursor-pointer transition-colors",
              isSelected
                ? "bg-muted border-border-dark"
                : "border-transparent hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name="impact"
              value={impact.level}
              checked={isSelected}
              onChange={() => onChange(impact.level)}
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
            <span
              className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 font-bold text-white text-xs"
              style={{ backgroundColor: getImpactColor(impact.level) }}
            >
              {impact.level}
            </span>
            <div className="min-w-0">
              <div className={cn("text-sm", isSelected && "font-medium")}>
                {impact.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {impact.description}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
