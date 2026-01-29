"use client";

import { cn } from "@/lib/utils";
import { confidenceLevels, getConfidenceColor } from "@/lib/confidence";

interface ConfidenceSelectorProps {
  value: number | null;
  onChange: (confidence: number) => void;
  disabled?: boolean;
}

export function ConfidenceSelector({
  value,
  onChange,
  disabled,
}: ConfidenceSelectorProps) {
  return (
    <div className="space-y-2">
      {confidenceLevels.map((confidence) => {
        const isSelected = value === confidence.level;
        return (
          <label
            key={confidence.level}
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
              name="confidence"
              value={confidence.level}
              checked={isSelected}
              onChange={() => onChange(confidence.level)}
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
              style={{ backgroundColor: getConfidenceColor(confidence.level) }}
            >
              {confidence.level}
            </span>
            <div className="min-w-0">
              <div className={cn("text-sm", isSelected && "font-medium")}>
                {confidence.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {confidence.description}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
