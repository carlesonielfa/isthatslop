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

// Tier configuration based on MVP.md
const tiers = [
  { tier: 0, name: "Pure Artisanal", icon: "sparkle", color: "#006400" },
  { tier: 1, name: "AI-Inspired", icon: "lightbulb", color: "#008000" },
  { tier: 2, name: "AI-Polished", icon: "check", color: "#90EE90" },
  { tier: 3, name: "Co-Created", icon: "handshake", color: "#FFD700" },
  { tier: 4, name: "Human-Guided", icon: "target", color: "#FF8C00" },
  { tier: 5, name: "Light Edit", icon: "magnifying-glass", color: "#FF4500" },
  { tier: 6, name: "Pure Slop", icon: "robot", color: "#FF0000" },
] as const;

// Mock data for demonstration
const recentSources = [
  {
    id: 1,
    rank: 1,
    name: "r/Art",
    type: "Subreddit",
    tier: 2,
    reviews: 72,
    addedBy: "artlover42",
    timeAgo: "2h",
  },
  {
    id: 2,
    rank: 2,
    name: "Medium.com",
    type: "Platform",
    tier: 4,
    reviews: 156,
    addedBy: "truthseeker",
    timeAgo: "3h",
  },
  {
    id: 3,
    rank: 3,
    name: "ChatGPT",
    type: "Application",
    tier: 6,
    reviews: 892,
    addedBy: "admin",
    timeAgo: "5h",
  },
  {
    id: 4,
    rank: 4,
    name: "r/WritingPrompts",
    type: "Subreddit",
    tier: 1,
    reviews: 88,
    addedBy: "writerfan",
    timeAgo: "6h",
  },
  {
    id: 5,
    rank: 5,
    name: "Cyberpunk 2077",
    type: "Video Game",
    tier: 3,
    reviews: 234,
    addedBy: "gamer99",
    timeAgo: "8h",
  },
  {
    id: 6,
    rank: 6,
    name: "BuzzFeed",
    type: "Website",
    tier: 5,
    reviews: 445,
    addedBy: "newswatch",
    timeAgo: "12h",
  },
  {
    id: 7,
    rank: 7,
    name: "DALL-E",
    type: "Application",
    tier: 6,
    reviews: 567,
    addedBy: "aitracker",
    timeAgo: "14h",
  },
  {
    id: 8,
    rank: 8,
    name: "The New Yorker",
    type: "Publication",
    tier: 0,
    reviews: 189,
    addedBy: "journalist",
    timeAgo: "1d",
  },
];

const hallOfFame = [
  { name: "The Atlantic", tier: 0, reviews: 156 },
  { name: "Ars Technica", tier: 1, reviews: 203 },
  { name: "r/Photography", tier: 0, reviews: 89 },
];

const hallOfShame = [
  { name: "AI Content Farm #47", tier: 6, reviews: 234 },
  { name: "Spam Blog Network", tier: 6, reviews: 178 },
  { name: "AutoNews Generator", tier: 5, reviews: 145 },
];

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

function SourceRankItem({
  source,
}: {
  source: (typeof recentSources)[number];
}) {
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

function SourceRankItemCompact({
  source,
}: {
  source: (typeof hallOfFame)[number];
}) {
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

export default function HomePage() {
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
                    <div className="text-xl font-bold text-accent">1,234</div>
                    <div className="text-xs text-muted-foreground">Sources</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">5,678</div>
                    <div className="text-xs text-muted-foreground">Reviews</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">892</div>
                    <div className="text-xs text-muted-foreground">Users</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-accent">42</div>
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
