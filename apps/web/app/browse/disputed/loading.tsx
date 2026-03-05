import { Card, CardContent, CardTitleBar } from "@/components/ui/card";

export default function DisputedLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <Card>
        <CardTitleBar>Disputed Sources</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="h-3 w-20 bg-muted animate-pulse" />
          <div className="space-y-0">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 border-b border-border-dark/20 py-1.5 last:border-b-0"
              >
                <div className="h-5 w-16 bg-muted animate-pulse shrink-0" />
                <div className="h-4 flex-1 bg-muted animate-pulse" />
                <div className="h-3 w-14 bg-muted animate-pulse shrink-0" />
                <div className="h-3 w-12 bg-muted animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
