import type { Metadata } from "next";
import { Card, CardTitleBar, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { getPendingFlagsDTO } from "@/data/moderation";
import { FlagActionButtons } from "./flag-action-buttons";

export const metadata: Metadata = {
  title: "Flagged Items - Moderation - IsThatSlop",
};

interface FlagsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function FlagsPage({ searchParams }: FlagsPageProps) {
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getPendingFlagsDTO(page);

  return (
    <Card>
      <CardTitleBar>
        Flagged Items Queue
        <span className="ml-2 text-xs font-normal">
          ({result.total} pending)
        </span>
      </CardTitleBar>
      <CardContent className="py-3 space-y-3">
        {result.flags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No pending flags. Queue is clear.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#c0c0c0] border border-border-dark">
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Type
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Target ID
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Reason
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Flagged By
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Date
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.flags.map((flag, idx) => (
                  <tr
                    key={flag.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-[#f0f0f0]"}
                  >
                    <td className="px-2 py-1.5 border border-border-dark/20 capitalize">
                      {flag.targetType}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 font-mono text-muted-foreground">
                      {flag.targetId.slice(0, 8)}…
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 capitalize">
                      {flag.reason.replace(/_/g, " ")}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20">
                      {flag.flaggerUsername ?? (
                        <span className="text-muted-foreground italic">
                          unknown
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 text-muted-foreground whitespace-nowrap">
                      {flag.createdAt}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20">
                      <FlagActionButtons
                        flagId={flag.id}
                        targetType={
                          flag.targetType as "claim" | "source" | "comment"
                        }
                        targetId={flag.targetId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={result.page}
          totalPages={result.totalPages}
          basePath="/mod/flags"
        />
      </CardContent>
    </Card>
  );
}
