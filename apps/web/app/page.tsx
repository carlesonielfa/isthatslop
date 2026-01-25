import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardTitleBar,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "@/components/hero-section";
import {
  tiers,
  getRecentSourcesDTO,
  getHallOfFameDTO,
  getHallOfShameDTO,
  getSiteStatsDTO,
  type SourceDTO,
  type SourceCompactDTO,
} from "@/data/sources";

function TierBadge({ tier }: { tier: number }) {
  const tierInfo = tiers[tier];
  return (
    <span
      className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 font-bold text-white text-xs"
      style={{ backgroundColor: tierInfo?.color }}
      title={tierInfo?.name}
    >
      {tier}
    </span>
  );
}

function SourceRankItem({ source }: { source: SourceDTO }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border-dark/30 last:border-b-0">
      <span className="w-5 text-right text-xs">{source.rank}.</span>
      <TierBadge tier={source.tier} />
      <div className="flex-1 min-w-0">
        <a href="#" className="text-accent hover:underline font-medium">
          {source.name}
        </a>
        <span className="text-xs ml-1">({source.type})</span>
      </div>
      <span className="text-xs whitespace-nowrap">
        {source.reviews} reviews
      </span>
    </div>
  );
}

function SourceRankItemCompact({ source }: { source: SourceCompactDTO }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <TierBadge tier={source.tier} />
      <a href="#" className="text-accent hover:underline text-xs flex-1">
        {source.name}
      </a>
      <span className="text-muted-foreground text-xs">{source.reviews}</span>
    </div>
  );
}

export default async function HomePage() {
  const [recentSources, hallOfFame, hallOfShame, stats] = await Promise.all([
    getRecentSourcesDTO(),
    getHallOfFameDTO(),
    getHallOfShameDTO(),
    getSiteStatsDTO(),
  ]);

  return (
    <>
      {/* Letterboxd-style Hero Section */}
      <HeroSection />

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Tier Legend Card */}
        <Card className="mb-4">
          <CardTitleBar>Slop Tier Guide</CardTitleBar>
          <CardContent className="py-4">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {tiers.map((t) => (
                <div key={t.tier} className="flex items-center gap-1.5">
                  <TierBadge tier={t.tier} />
                  <span className="text-xs">{t.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout - HN list + MySpace sidebar */}
        <div className="grid md:grid-cols-[1fr_280px] gap-4">
          {/* Main Column - Source Rankings (HN-inspired) */}
          <div className="space-y-4">
            <Card>
              <CardTitleBar>Recent Sources</CardTitleBar>
              <CardContent className="py-2">
                {recentSources.map((source) => (
                  <SourceRankItem key={source.id} source={source} />
                ))}
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="ghost" size="sm" className="px-0">
                  More...
                </Button>
                <div className="flex gap-2 text-xs">
                  <span>Sort:</span>
                  <a href="#" className="hover:underline">
                    Recent
                  </a>
                  <span>|</span>
                  <a href="#" className="hover:underline">
                    Top
                  </a>
                  <span>|</span>
                  <a href="#" className="hover:underline">
                    Controversial
                  </a>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar - MySpace inspired */}
          <div className="space-y-4">
            {/* Stats Panel */}
            <Card size="sm">
              <CardTitleBar>Site Stats</CardTitleBar>
              <CardContent className="py-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold text-accent">
                      {stats.sources.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Sources</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">
                      {stats.reviews.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Reviews</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">
                      {stats.users.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Users</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">-</div>
                    <div className="text-xs text-muted-foreground">Online</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card size="sm">
              <CardTitleBar>Quick Actions</CardTitleBar>
              <CardContent className="py-3 space-y-2">
                <Button className="w-full" size="sm">
                  + Add New Source
                </Button>
                <Button className="w-full" size="sm">
                  Submit Review
                </Button>
                <Button className="w-full" size="sm">
                  Get Browser Extension
                </Button>
              </CardContent>
            </Card>

            {/* Hall of Fame */}
            <Card size="sm">
              <CardTitleBar>Hall of Fame</CardTitleBar>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Pure human creativity
                </p>
                {hallOfFame.map((source) => (
                  <SourceRankItemCompact key={source.name} source={source} />
                ))}
                <a
                  href="#"
                  className="text-xs text-accent hover:underline mt-2 block"
                >
                  View all...
                </a>
              </CardContent>
            </Card>

            {/* Hall of Shame */}
            <Card size="sm">
              <CardTitleBar>Hall of Shame</CardTitleBar>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Pure AI slop detected
                </p>
                {hallOfShame.map((source) => (
                  <SourceRankItemCompact key={source.name} source={source} />
                ))}
                <a
                  href="#"
                  className="text-xs text-accent hover:underline mt-2 block"
                >
                  View all...
                </a>
              </CardContent>
            </Card>

            {/* Browse by Type */}
            <Card size="sm">
              <CardTitleBar>Browse by Type</CardTitleBar>
              <CardContent className="py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">Platforms</Badge>
                  <Badge variant="secondary">Websites</Badge>
                  <Badge variant="secondary">Subreddits</Badge>
                  <Badge variant="secondary">Publications</Badge>
                  <Badge variant="secondary">Applications</Badge>
                  <Badge variant="secondary">Video Games</Badge>
                  <Badge variant="secondary">YouTube</Badge>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  IsThatSlop.com is a community-driven database that helps users
                  identify AI-generated content. Inspired by ProtonDB. Built
                  with love for the human internet.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
