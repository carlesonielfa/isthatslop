import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getUserByUsernameDTO,
  getUserClaimsDTO,
  getUserSourcesDTO,
} from "@/data/users";
import { UserAvatar } from "@/components/user-avatar";
import { ReputationBadge } from "@/components/reputation-badge";
import { UserClaimCard } from "@/components/user-claim-card";
import { UserSourceCard } from "@/components/user-source-card";
import { Separator } from "@/components/ui/separator";
import { formatMonthYear } from "@/lib/date";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  const user = await getUserByUsernameDTO(username);

  if (!user) {
    return {
      title: "User Not Found - IsThatSlop",
    };
  }

  return {
    title: `@${user.displayUsername} - IsThatSlop`,
    description: `View ${user.displayUsername}'s profile on IsThatSlop. ${user.stats.claimsCount} claims, ${user.stats.sourcesAdded} sources added.`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const user = await getUserByUsernameDTO(username);

  if (!user) {
    notFound();
  }

  const [claims, sources] = await Promise.all([
    getUserClaimsDTO(user.id, 5),
    getUserSourcesDTO(user.id, 5),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Profile Header Card */}
      <Card className="mb-4">
        <CardTitleBar>User Profile - @{user.displayUsername}</CardTitleBar>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Avatar and basic info */}
            <div className="flex flex-col items-center sm:items-start gap-2">
              <UserAvatar
                username={user.displayUsername}
                avatarUrl={user.avatarUrl}
                size="lg"
              />
              <div className="text-center sm:text-left">
                <h1 className="text-lg font-bold">@{user.displayUsername}</h1>
                {user.name !== user.displayUsername && (
                  <p className="text-sm text-muted-foreground">{user.name}</p>
                )}
              </div>
            </div>

            {/* Stats and badges */}
            <div className="flex-1 space-y-3">
              {/* Role and reputation badges */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <ReputationBadge reputation={user.reputation} />
                {user.role !== "member" && (
                  <Badge
                    variant={user.role === "admin" ? "destructive" : "default"}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="ring ring-inset p-2">
                  <div className="text-lg font-bold text-accent">
                    {user.reputation}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reputation
                  </div>
                </div>
                <div className="ring ring-inset p-2">
                  <div className="text-lg font-bold text-accent">
                    {user.stats.claimsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Claims</div>
                </div>
                <div className="ring ring-inset p-2">
                  <div className="text-lg font-bold text-accent">
                    {user.stats.sourcesAdded}
                  </div>
                  <div className="text-xs text-muted-foreground">Sources</div>
                </div>
                <div className="ring ring-inset p-2">
                  <div className="text-lg font-bold text-accent">
                    {user.stats.helpfulVotes}
                  </div>
                  <div className="text-xs text-muted-foreground">Helpful</div>
                </div>
              </div>

              {/* Join date */}
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Member since {formatMonthYear(user.joinedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two column layout for claims and sources */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Claims */}
        <Card>
          <CardTitleBar>Recent Claims ({user.stats.claimsCount})</CardTitleBar>
          <CardContent className="space-y-2">
            {claims.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No claims yet
              </p>
            ) : (
              <>
                {claims.map((claim) => (
                  <div key={claim.id}>
                    <UserClaimCard claim={claim} />
                    <Separator className="my-2" />
                  </div>
                ))}
                {user.stats.claimsCount > 5 && (
                  <Link
                    href={`/users/${user.username}/claims`}
                    className="text-xs text-accent hover:underline block text-center pt-2"
                  >
                    View all {user.stats.claimsCount} claims...
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sources Added */}
        <Card>
          <CardTitleBar>Sources Added ({user.stats.sourcesAdded})</CardTitleBar>
          <CardContent className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No sources added yet
              </p>
            ) : (
              <>
                {sources.map((source) => (
                  <div key={source.id}>
                    <UserSourceCard source={source} />
                    <Separator className="my-2" />
                  </div>
                ))}
                {user.stats.sourcesAdded > 5 && (
                  <Link
                    href={`/users/${user.username}/sources`}
                    className="text-xs text-accent hover:underline block text-center pt-2"
                  >
                    View all {user.stats.sourcesAdded} sources...
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
