import type { Metadata } from "next";
import { Card, CardTitleBar, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { getModerationLogsDTO } from "@/data/moderation";

export const metadata: Metadata = {
  title: "Action Log - Moderation - IsThatSlop",
};

interface LogsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ModLogsPage({ searchParams }: LogsPageProps) {
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getModerationLogsDTO(page);

  return (
    <Card>
      <CardTitleBar>
        Moderation Action Log
        <span className="ml-2 text-xs font-normal">({result.total} total)</span>
      </CardTitleBar>
      <CardContent className="py-3 space-y-3">
        {result.logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No moderation actions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#c0c0c0] border border-border-dark">
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Action
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Target Type
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Target ID
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Moderator
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Reason
                  </th>
                  <th className="text-left px-2 py-1 border border-border-dark/40 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-[#f0f0f0]"}
                  >
                    <td className="px-2 py-1.5 border border-border-dark/20 font-medium capitalize">
                      {log.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 capitalize">
                      {log.targetType}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 font-mono text-muted-foreground">
                      {log.targetId.slice(0, 8)}…
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20">
                      {log.moderatorUsername ?? (
                        <span className="text-muted-foreground italic">
                          unknown
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 text-muted-foreground max-w-[160px]">
                      {log.reason ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-2 py-1.5 border border-border-dark/20 text-muted-foreground whitespace-nowrap">
                      {log.createdAt}
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
          basePath="/mod/logs"
        />
      </CardContent>
    </Card>
  );
}
