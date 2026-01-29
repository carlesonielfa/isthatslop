import {
  getSourcesForBrowseDTO,
  getSourceTypesDTO,
  tiers,
} from "@/data/sources";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { TierBadge } from "@/components/tier-badge";
import { SourceTree } from "./source-tree";
import { BrowseFilters } from "./browse-filters";

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    tierMin?: string;
    tierMax?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const filters = {
    query: params.q,
    type: params.type,
    tierMin: params.tierMin ? parseInt(params.tierMin, 10) : undefined,
    tierMax: params.tierMax ? parseInt(params.tierMax, 10) : undefined,
  };

  const [sources, sourceTypes] = await Promise.all([
    getSourcesForBrowseDTO(filters),
    getSourceTypesDTO(),
  ]);

  const hasFilters =
    filters.query ||
    filters.type ||
    filters.tierMin !== undefined ||
    filters.tierMax !== undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="grid md:grid-cols-[280px_1fr] gap-4 min-w-0">
        {/* Sidebar - Filters */}
        <div className="space-y-4">
          <Card>
            <CardTitleBar>Search & Filter</CardTitleBar>
            <CardContent className="py-3">
              <BrowseFilters
                sourceTypes={sourceTypes}
                tiers={tiers}
                initialFilters={filters}
              />
            </CardContent>
          </Card>

          {/* Tier Legend */}
          <Card size="sm">
            <CardTitleBar>Tier Guide</CardTitleBar>
            <CardContent className="py-3">
              <div className="space-y-1">
                {tiers.map((t) => (
                  <div key={t.tier} className="flex items-center gap-2">
                    <TierBadge tier={t.tier} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Tree View */}
        <div className="space-y-4 min-w-0">
          <Card>
            <CardTitleBar>
              {hasFilters ? "Search Results" : "All Sources"}
              <span className="ml-2 text-xs font-normal">
                ({sources.length} sources)
              </span>
            </CardTitleBar>
            <CardContent className="py-3">
              {sources.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm">No sources found.</p>
                  {hasFilters && (
                    <p className="text-xs mt-1">
                      Try adjusting your search or filters.
                    </p>
                  )}
                </div>
              ) : (
                <SourceTree sources={sources} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
