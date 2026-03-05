import { Card, CardContent, CardTitleBar } from "@/components/ui/card";

export default function SourceLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        {/* Source Overview Card */}
        <Card>
          <CardTitleBar>Source Overview</CardTitleBar>
          <CardContent className="py-4 space-y-4">
            {/* Breadcrumb placeholder */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-muted animate-pulse" />
              <div className="h-3 w-2 bg-muted animate-pulse" />
              <div className="h-3 w-24 bg-muted animate-pulse" />
            </div>
            {/* Title row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 bg-muted animate-pulse" />
                  <div className="h-6 w-40 bg-muted animate-pulse" />
                  <div className="h-5 w-16 bg-muted animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="h-3 w-16 bg-muted animate-pulse" />
                  <div className="h-3 w-20 bg-muted animate-pulse" />
                  <div className="h-3 w-14 bg-muted animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-28 bg-muted animate-pulse" />
            </div>
            {/* Description placeholder */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse" />
              <div className="h-3 w-3/4 bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Tier Ladder Card */}
        <Card className="h-fit">
          <CardTitleBar>Tier Ladder</CardTitleBar>
          <CardContent className="py-3 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1">
                <div className="h-5 w-20 bg-muted animate-pulse" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Claims Card */}
      <Card>
        <CardTitleBar>Claims</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-muted animate-pulse" />
            <div className="h-3 w-20 bg-muted animate-pulse" />
          </div>
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 border-b border-border-dark/30 last:border-b-0"
              >
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-4 w-12 bg-muted animate-pulse" />
                      <div className="h-4 w-12 bg-muted animate-pulse" />
                      <div className="h-4 w-20 bg-muted animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-full bg-muted animate-pulse" />
                      <div className="h-3 w-5/6 bg-muted animate-pulse" />
                      <div className="h-3 w-4/6 bg-muted animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-7 w-20 bg-muted animate-pulse" />
                      <div className="h-7 w-24 bg-muted animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
