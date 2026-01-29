"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { TierBadge } from "@/components/tier-badge";
import { cn } from "@/lib/utils";
import { searchSources, type SearchSourcesResult } from "@/data/actions";

const DEBOUNCE_DELAY_MS = 300;
interface SourceSearchProps {
  value: SearchSourcesResult | null;
  onChange: (source: SearchSourcesResult | null) => void;
  onCreateNew?: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SourceSearch({
  value,
  onChange,
  onCreateNew,
  disabled,
  placeholder = "Search for a source...",
}: SourceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSourcesResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchSources(searchQuery, 10);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setHighlightedIndex(-1);

    // Clear selected value when user types
    if (value) {
      onChange(null);
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newQuery.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        performSearch(newQuery);
      }, DEBOUNCE_DELAY_MS);
    } else {
      setResults([]);
      setIsSearching(false);
    }
  };

  const handleSelect = (source: SearchSourcesResult) => {
    onChange(source);
    setQuery(source.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleCreateNew = () => {
    if (onCreateNew && query.trim().length >= 2) {
      onCreateNew(query.trim());
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const hasCreateOption = onCreateNew && query.trim().length >= 2;

    if (!isOpen) {
      if (e.key === "ArrowDown" && (results.length > 0 || hasCreateOption)) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    const totalItems = results.length + (hasCreateOption ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (hasCreateOption) {
          // Index 0 is create new, rest are results
          if (highlightedIndex === 0) {
            handleCreateNew();
          } else if (
            highlightedIndex > 0 &&
            highlightedIndex <= results.length
          ) {
            handleSelect(results[highlightedIndex - 1]!);
          }
        } else {
          // No create option, indices map directly to results
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            handleSelect(results[highlightedIndex]!);
          }
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    // Always open dropdown on focus if we have content to show or could show create option
    if (query.trim().length >= 2 || results.length > 0) {
      setIsOpen(true);
    }
  };

  // Open dropdown when results arrive or query becomes long enough
  useEffect(() => {
    if (query.trim().length >= 2 && (results.length > 0 || onCreateNew)) {
      setIsOpen(true);
    }
  }, [results, query, onCreateNew]);

  const handleBlur = () => {
    // Delay closing to allow click events on results
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Update query when value changes externally
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const showDropdown =
    isOpen && (results.length > 0 || (onCreateNew && query.trim().length >= 2));

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />
      {isSearching && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          Searching...
        </div>
      )}

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border-dark shadow-md"
          role="listbox"
        >
          {/* Create new option - always at top when available */}
          {onCreateNew && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={handleCreateNew}
              onMouseEnter={() => setHighlightedIndex(0)}
              className={cn(
                "w-full px-3 py-2 text-left flex items-center gap-2 text-accent border-b border-border-dark bg-muted/30",
                highlightedIndex === 0 && "bg-muted",
              )}
              role="option"
              aria-selected={highlightedIndex === 0}
            >
              <span className="text-lg font-bold">+</span>
              <span className="text-sm font-medium">
                Create &quot;{query.trim()}&quot; as new source
              </span>
            </button>
          )}

          {/* Search results */}
          <div className="max-h-48 overflow-auto">
            {results.map((source, index) => {
              const adjustedIndex =
                onCreateNew && query.trim().length >= 2 ? index + 1 : index;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => handleSelect(source)}
                  onMouseEnter={() => setHighlightedIndex(adjustedIndex)}
                  className={cn(
                    "w-full px-3 py-2 text-left flex items-center gap-2 border-b border-border-dark/30 last:border-b-0",
                    highlightedIndex === adjustedIndex && "bg-muted",
                  )}
                  role="option"
                  aria-selected={highlightedIndex === adjustedIndex}
                >
                  <TierBadge tier={source.tier} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{source.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {source.type && <span>{source.type} · </span>}
                      {source.claimCount} claims
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {results.length === 0 &&
            !isSearching &&
            query.trim().length >= 2 &&
            !onCreateNew && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No sources found
              </div>
            )}
        </div>
      )}
    </div>
  );
}
