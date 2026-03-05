import { Card, CardContent, CardTitleBar } from "@/components/ui/card";

export default function BrowseLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="grid md:grid-cols-[280px_1fr] gap-4 min-w-0">
        {/* Sidebar skeleton */}
        <div className="space-y-4">
          <Card>
            <CardTitleBar>Search & Filter</CardTitleBar>
            <CardContent className="py-3 space-y-3">
              <div className="h-8 w-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted animate-pulse" />
                <div className="h-8 w-full bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-12 bg-muted animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-full bg-muted animate-pulse" />
                  <div className="h-8 w-full bg-muted animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-20 bg-muted animate-pulse" />
            </CardContent>
          </Card>

          {/* Tier Guide skeleton */}
          <Card size="sm">
            <CardTitleBar>Tier Guide</CardTitleBar>
            <CardContent className="py-3 space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-5 w-full bg-muted animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content skeleton */}
        <div className="space-y-4 min-w-0">
          <Card>
            <CardTitleBar>All Sources</CardTitleBar>
            <CardContent className="py-3 space-y-0">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 border-b border-border-dark/20 py-2 last:border-b-0"
                >
                  <div className="h-5 w-16 bg-muted animate-pulse shrink-0" />
                  <div className="h-4 flex-1 bg-muted animate-pulse" />
                  <div className="h-3 w-14 bg-muted animate-pulse shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
