"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { TierInfo } from "@/data/sources";

// Sentinel value for "no filter" since Radix Select doesn't allow empty string
const ALL_VALUE = "__all__";

interface BrowseFiltersProps {
  sourceTypes: string[];
  tiers: readonly TierInfo[];
  initialFilters: {
    query?: string;
    type?: string;
    tierMin?: number;
    tierMax?: number;
  };
}

export function BrowseFilters({
  sourceTypes,
  tiers,
  initialFilters,
}: BrowseFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [type, setType] = useState(initialFilters.type ?? ALL_VALUE);
  const [tierMin, setTierMin] = useState(
    initialFilters.tierMin?.toString() ?? ALL_VALUE,
  );
  const [tierMax, setTierMax] = useState(
    initialFilters.tierMax?.toString() ?? ALL_VALUE,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type && type !== ALL_VALUE) params.set("type", type);
    if (tierMin && tierMin !== ALL_VALUE) params.set("tierMin", tierMin);
    if (tierMax && tierMax !== ALL_VALUE) params.set("tierMax", tierMax);

    startTransition(() => {
      router.push(`/browse?${params.toString()}`);
    });
  }

  function clearFilters() {
    setQuery("");
    setType(ALL_VALUE);
    setTierMin(ALL_VALUE);
    setTierMax(ALL_VALUE);
    startTransition(() => {
      router.push("/browse");
    });
  }

  const hasFilters =
    query ||
    (type && type !== ALL_VALUE) ||
    (tierMin && tierMin !== ALL_VALUE) ||
    (tierMax && tierMax !== ALL_VALUE);

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {/* Search */}
        <Field>
          <FieldLabel htmlFor="browse-search">Search</FieldLabel>
          <Input
            id="browse-search"
            type="search"
            placeholder="Search sources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>

        {/* Type filter */}
        <Field>
          <FieldLabel htmlFor="browse-type">Type</FieldLabel>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="browse-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All types</SelectItem>
              {sourceTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Tier range */}
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor="browse-tier-min">Min Tier</FieldLabel>
            <Select value={tierMin} onValueChange={setTierMin}>
              <SelectTrigger id="browse-tier-min">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Any</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.tier} value={t.tier.toString()}>
                    {t.tier} - {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="browse-tier-max">Max Tier</FieldLabel>
            <Select value={tierMax} onValueChange={setTierMax}>
              <SelectTrigger id="browse-tier-max">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Any</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.tier} value={t.tier.toString()}>
                    {t.tier} - {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Searching..." : "Search"}
          </Button>
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={isPending}
            >
              Clear
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
